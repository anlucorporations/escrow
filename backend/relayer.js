// =============================================================================
// TrueKeate — Relayer EIP-712 (Ciclo 5, Fase 3)
// Fuente: RepoTecnico/arquitectura_tecnica.md §6
//
// Envía meta-transacciones de particulares a la blockchain asumiendo el gas
// (RF-09.1/09.2), desde la cuenta 1 del anvil (RF-15.2) o la cuenta configurada.
//
// Protecciones (D16 + D29):
//   1. Nonce único EIP-712 por cuenta (anti-replay) — se valida contra la Smart Account
//      (chequeo on-chain opcional) y se lleva un registro local.
//   2. Allowlist: solo intents de Smart Accounts de particulares VERIFICADOS (chequeo on-chain
//      del estado de verificación D28).
//   3. Límite diario: 20 meta-tx por usuario/día (D29).
//   4. Endpoints autenticados + rate-limiting (se aplica en la capa API — C6; el relayer
//      expone `procesarIntent` como función pura).
//   5. Protección adicional: 3 fallos en 10 min → bloqueo temporal del signer por 1 h (D29).
//   6. Fallback (D39): ante indisponibilidad prolongada (>1 h), el usuario paga el gas
//      directamente; la plataforma reembolsa en BRLT si la caída es del operador.
// =============================================================================
import { ethers } from 'ethers';

const LIMITE_DIARIO = parseInt(process.env.LIMITE_METATX_DIARIO || '20', 10);
const UMBRAL_FALLOS = parseInt(process.env.UMBRAL_FALLOS || '3', 10);
const VENTANA_FALLOS_MS = 10 * 60 * 1000;   // 10 min
const BLOQUEO_MS = 60 * 60 * 1000;           // 1 hora
const GAS_MAXIMO = BigInt(process.env.GAS_MAXIMO || '300000');

/**
 * @class RelayerEIP712
 * Gestiona el envío de meta-transacciones con las protecciones anti-abuso.
 * El estado (nonces, límites, bloqueos) se guarda en memoria o en la tabla
 * `auditoria`/estructuras propias; en producción se persiste (C6/PostgreSQL).
 */
export class RelayerEIP712 {
  constructor({ provider, wallet, smartAccountFactory, abiSmartAccount }) {
    this.provider = provider;
    this.wallet = wallet;               // signer que paga el gas (cuenta 1 anvil — RF-15.2)
    this.smartAccountFactory = smartAccountFactory; // dirección de la factory (chequeo de allowlist)
    this.abiSmartAccount = abiSmartAccount;
    this.iface = new ethers.Interface(abiSmartAccount);

    // estado anti-abuso (en memoria para C5; persistir en C6/PostgreSQL)
    this.registro = new Map(); // signer -> {nonceLocal, contadorDia, dia, fallos:[ts], bloqueadoHasta}
    this.enviadas = 0;
    this.rechazadas = { nonce: 0, noVerificado: 0, limite: 0, bloqueado: 0, fallo: 0 };
  }

  // ------------------------------------------------------------------ estado por signer
  _estado(signer) {
    if (!this.registro.has(signer)) {
      this.registro.set(signer, { nonceLocal: -1, contadorDia: 0, dia: null, fallos: [], bloqueadoHasta: 0 });
    }
    return this.registro.get(signer);
  }

  _registrarFallos(signer, ahora) {
    const e = this._estado(signer);
    e.fallos.push(ahora);
    // limpiar fallos fuera de la ventana de 10 min
    e.fallos = e.fallos.filter((t) => ahora - t < VENTANA_FALLOS_MS);
    if (e.fallos.length >= UMBRAL_FALLOS) {
      e.bloqueadoHasta = ahora + BLOQUEO_MS; // 3 fallos en 10 min → bloqueo 1 h (D29)
      this.rechazadas.bloqueado++;
    }
    return e.bloqueadoHasta;
  }

  // ------------------------------------------------------------------ protecciones
  /** Protección 5 (D29): bloqueo temporal por fallos reiterados. */
  _checkBloqueo(signer, ahora) {
    const e = this._estado(signer);
    if (e.bloqueadoHasta > ahora) return e.bloqueadoHasta - ahora;
    return 0;
  }

  /** Protección 3 (D29): límite diario de 20 meta-tx por usuario. */
  _checkLimiteDiario(signer, ahora) {
    const e = this._estado(signer);
    const dia = Math.floor(ahora / 86_400_000);
    if (e.dia !== dia) {
      e.dia = dia;
      e.contadorDia = 0;
    }
    if (e.contadorDia >= LIMITE_DIARIO) return true;
    return false;
  }

  /**
   * Protección 1+2 (D16): valida nonce y que el signer sea una Smart Account de un
   * particular VERIFICADO (chequeo on-chain del estado de verificación D28).
   * Si no hay RPC/factory configurado, se acepta con chequeo local (modo test).
   */
  async _validarCuenta(signer, nonceInt) {
    const e = this._estado(signer);
    if (e.nonceLocal !== -1 && nonceInt <= e.nonceLocal) {
      this.rechazadas.nonce++;
      return { ok: false, motivo: 'nonce repetido (anti-replay D16)' };
    }
    // Chequeo on-chain del estado de verificación: la Smart Account del signer debe existir
    // y estar en estado != INSCRITO (VERIFICADO/CERTIFICADO — D28).
    try {
      const sa = await this._cuentaDe(signer);
      if (!sa) throw new Error('sin smart account');
      const estado = await this.provider.call({ to: sa, data: this.iface.encodeFunctionData('estadoVerificacion') });
      const estadoVal = parseInt(estado, 16);
      if (estadoVal < 1) {
        this.rechazadas.noVerificado++;
        return { ok: false, motivo: 'signer no verificado (D28/D14)' };
      }
    } catch {
      this.rechazadas.noVerificado++;
      return { ok: false, motivo: 'sin smart account verificada (allowlist D16)' };
    }
    return { ok: true };
  }

  /** Resuelve la Smart Account del signer vía la factory (mapping cuentas(owner)). */
  async _cuentaDe(signer) {
    if (!this.smartAccountFactory) return null;
    const factory = new ethers.Contract(
      this.smartAccountFactory,
      ['function cuentas(address) view returns (address)'],
      this.provider
    );
    return factory.cuentas(signer);
  }

  // ------------------------------------------------------------------ envío
  /**
   * Procesa un intent de meta-transacción hacia la Smart Account del signer.
   * @param {object} intent { signer, destino, valor, data, nonce, firma, chainId }
   * @returns {Promise<{ok:boolean, txHash?:string, motivo?:string, costoWei?:string}>}
   */
  async procesarIntent(intent) {
    const ahora = Date.now();
    const { signer, destino, valor, data, nonce, firma, chainId } = intent;

    // protección 4 (D16): dominio con chainId correcto
    const chain = await this.provider.getNetwork();
    if (chainId !== undefined && Number(chainId) !== Number(chain.chainId)) {
      this.rechazadas.nonce++;
      return { ok: false, motivo: `chainId incorrecto (esperado ${chain.chainId})` };
    }

    // protección 5 (D29): bloqueo temporal
    const bloqueadoPor = this._checkBloqueo(signer, ahora);
    if (bloqueadoPor > 0) {
      this.rechazadas.bloqueado++;
      return { ok: false, motivo: `signer bloqueado ${Math.ceil(bloqueadoPor / 60000)} min (D29)` };
    }

    // protección 3 (D29): límite diario
    if (this._checkLimiteDiario(signer, ahora)) {
      this.rechazadas.limite++;
      return { ok: false, motivo: `límite diario de ${LIMITE_DIARIO} meta-tx superado (D29)` };
    }

    // protecciones 1+2 (D16): nonce + allowlist de verificados
    const val = await this._validarCuenta(signer, Number(nonce));
    if (!val.ok) return { ok: false, motivo: val.motivo };

    // enviar a la Smart Account: execute(destino, valor, data, nonce, firma)
    const tx = await this.wallet.sendTransaction({
      to: await this._cuentaDe(signer) ?? signer,
      data: this.iface.encodeFunctionData('execute', [destino, valor, data, nonce, firma]),
      gasLimit: GAS_MAXIMO,
    });
    const rc = await tx.wait();

    if (rc.status === 1) {
      const e = this._estado(signer);
      e.nonceLocal = Number(nonce);
      e.contadorDia++;
      this.enviadas++;
      return { ok: true, txHash: tx.hash, costoWei: rc.gasUsed.toString() };
    }
    // fallo → registrar para bloqueo (D29)
    this._registrarFallos(signer, ahora);
    this.rechazadas.fallo++;
    return { ok: false, motivo: `tx revertida (${tx.hash})` };
  }

  /** Métricas para el dashboard del Owner (D15/RF-18.1, H-17). */
  metricas() {
    return {
      enviadas: this.enviadas,
      rechazadas: this.rechazadas,
      signersActivos: this.registro.size,
    };
  }

  /** Health-check básico (SLA ≥99% — D15): comprueba saldo del wallet y red. */
  async health() {
    const [balance, red] = await Promise.all([
      this.provider.getBalance(this.wallet.address),
      this.provider.getNetwork(),
    ]);
    return {
      ok: true,
      wallet: this.wallet.address,
      saldoWei: balance.toString(),
      chainId: Number(red.chainId),
      saldoBajo: balance < ethers.parseEther('0.5'), // alerta al Owner (D15)
    };
  }
}
