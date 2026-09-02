// =============================================================================
// TrueKeate — Tests del Relayer EIP-712 (Ciclo 5)
// Validan las 4 protecciones anti-abuso (D16) + límite diario y bloqueo (D29).
// El provider y la wallet se simulan (sin red real).
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import { RelayerEIP712 } from '../relayer.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scRoot = join(__dirname, '../../sc');
const abiSmartAccount = JSON.parse(
  readFileSync(join(scRoot, 'out/SmartAccount.sol/SmartAccount.json'), 'utf-8')
).abi;

/** Clave ficticia (no usada en red) para el wallet del relayer. */
const WALLET = new ethers.Wallet('0x' + 'b'.repeat(64));

function proveedorMock({ estadoVerificacion = 1, chainId = 31337, saldo = ethers.parseEther('10') } = {}) {
  return {
    chainId,
    async getNetwork() { return { chainId: BigInt(this.chainId) }; },
    async getBalance() { return saldo; },
    async call({ data }) {
      // estadoVerificacion() devuelve el valor configurado (0=INSCRITO,1=VERIFICADO,2=CERTIFICADO)
      if (data && data.startsWith('0x') && data.length >= 10) {
        return ethers.toBeHex(estadoVerificacion, 32);
      }
      return '0x';
    },
  };
}

function setupRelayer(opts) {
  const provider = proveedorMock(opts);
  const wallet = WALLET.connect(provider);
  const relayer = new RelayerEIP712({
    provider,
    wallet,
    smartAccountFactory: '0x' + '1'.repeat(40),
    abiSmartAccount,
  });
  // mock de la factory: devuelve una smart account "existente"
  relayer._cuentaDe = async () => '0x' + '2'.repeat(40);
  return { provider, wallet, relayer };
}

function intentBasico(signer) {
  return {
    signer,
    destino: '0x' + '3'.repeat(40),
    valor: 0n,
    data: '0x1234',
    nonce: 0,
    firma: '0x' + '0'.repeat(130),
    chainId: 31337,
  };
}

// ---------------------------------------------------------------------------
test('acepta intent de signer VERIFICADO (protecciones D16 ok)', async () => {
  const { wallet, relayer } = setupRelayer({ estadoVerificacion: 1 });
  // mock sendTransaction exitoso
  wallet.sendTransaction = async () => ({ hash: '0x' + 'c'.repeat(64), wait: async () => ({ status: 1, gasUsed: 100000n }) });
  const r = await relayer.procesarIntent(intentBasico('0x' + 'a'.repeat(40)));
  assert.equal(r.ok, true);
  assert.equal(relayer.enviadas, 1);
});

test('rechaza signer NO VERIFICADO (INSCRITO, estado 0 — allowlist D16/D28)', async () => {
  const { wallet, relayer } = setupRelayer({ estadoVerificacion: 0 });
  wallet.sendTransaction = async () => { throw new Error('no debería enviar'); };
  const r = await relayer.procesarIntent(intentBasico('0x' + 'a'.repeat(40)));
  assert.equal(r.ok, false);
  assert.match(r.motivo, /no verificado/i);
  assert.equal(relayer.rechazadas.noVerificado, 1);
});

test('rechaza nonce repetido (anti-replay D16)', async () => {
  const { wallet, relayer } = setupRelayer();
  wallet.sendTransaction = async () => ({ hash: '0x' + 'c'.repeat(64), wait: async () => ({ status: 1, gasUsed: 100000n }) });
  const intent = intentBasico('0x' + 'a'.repeat(40));
  await relayer.procesarIntent(intent); // nonce 0 → ok
  const r2 = await relayer.procesarIntent(intent); // nonce 0 repetido
  assert.equal(r2.ok, false);
  assert.match(r2.motivo, /nonce repetido/i);
});

test('rechaza chainId incorrecto (dominio D16)', async () => {
  const { wallet, relayer } = setupRelayer();
  wallet.sendTransaction = async () => { throw new Error('no debería enviar'); };
  const intent = { ...intentBasico('0x' + 'a'.repeat(40)), chainId: 999 };
  const r = await relayer.procesarIntent(intent);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /chainId incorrecto/i);
});

test('limite diario: rechaza la meta-tx #21 (D29)', async () => {
  const { wallet, relayer } = setupRelayer();
  wallet.sendTransaction = async () => ({ hash: '0x' + 'c'.repeat(64), wait: async () => ({ status: 1, gasUsed: 100000n }) });
  const signer = '0x' + 'a'.repeat(40);
  for (let i = 0; i < 20; i++) {
    const r = await relayer.procesarIntent({ ...intentBasico(signer), nonce: i });
    assert.equal(r.ok, true, `meta-tx ${i + 1} debe pasar`);
  }
  const r21 = await relayer.procesarIntent({ ...intentBasico(signer), nonce: 20 });
  assert.equal(r21.ok, false);
  assert.match(r21.motivo, /límite diario/i);
  assert.equal(relayer.rechazadas.limite, 1);
});

test('3 fallos en 10 min → bloqueo temporal 1 h (D29)', async () => {
  const { wallet, relayer } = setupRelayer();
  // la primera tx falla (status 0) → cuenta como fallo
  let intentos = 0;
  wallet.sendTransaction = async () => {
    intentos++;
    return { hash: '0x' + 'c'.repeat(64), wait: async () => ({ status: 0, gasUsed: 100000n }) };
  };
  const signer = '0x' + 'a'.repeat(40);
  // nonces distintos para no chocar con el check de nonce
  for (let i = 0; i < 3; i++) {
    const r = await relayer.procesarIntent({ ...intentBasico(signer), nonce: i });
    assert.equal(r.ok, false, `intento ${i + 1} falla en cadena`);
  }
  // 3 fallos → bloqueado
  const r4 = await relayer.procesarIntent({ ...intentBasico(signer), nonce: 3 });
  assert.equal(r4.ok, false);
  assert.match(r4.motivo, /bloqueado/i);
  assert.ok(relayer.rechazadas.bloqueado >= 1, 'bloqueo activo registrado');
});

test('health: saldo y red (D15)', async () => {
  const { wallet, relayer } = setupRelayer({ saldo: ethers.parseEther('2') });
  const h = await relayer.health();
  assert.equal(h.ok, true);
  assert.equal(h.chainId, 31337);
  assert.equal(h.saldoBajo, false);
});
