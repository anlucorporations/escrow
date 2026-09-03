# Manual técnico · Operación: reinicio limpio y bootstrap del Owner

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: procedimientos de operación
> para entorno de producción — reinicio completo de la BD off-chain (sin tocar anvil) y
> bootstrap del Owner (cuenta 0) como CERTIFICADO + SOCIO. Complementa a
> `04-Despliegue/01-despliegue.md` (§8 Operación).

---

## 1. Contexto verificado (cuentas del anvil)

| Cuenta | Dirección (anvil por defecto) | Rol | Evidencia |
|---|---|---|---|
| **0** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | **Owner / deployer**: despliega los contratos y es `owner()` de ellos (`Ownable`) | RF-15.1; `sc/broadcast/Deploy.s.sol/31337/run-latest.json` (todas las txs firmadas desde la cuenta 0, `receipts[0].from`) |
| **1** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | **Relayer + cuenta general de la plataforma** (paga gas, gastos) | RF-15.2; `backend/relayer.js:6,37`; `backend/test/integracion-relayer.js:21-31` |

Hallazgo que motiva este manual: el despliegue deja a la cuenta 0 como owner **on-chain**
(`Ownable(msg.sender)` en `Deploy.s.sol`), pero **no existe ningún mecanismo** que la registre
en la BD off-chain como usuario `CERTIFICADO` (escalera D28) con `tipo`/`nivel` SOCIO, ni que la
admita como Socio en `SociosRegistry` (el deploy solo vincula BRLT/Fondo/Suscripción;
`admitirSocioDirecto` solo se usa en tests). El dashboard `/admin` exige `tipo === 'SOCIO'`
(`backend/api/routes/admin.js:15`), por lo que sin bootstrap el Owner no puede operar el panel.

---

## 2. `reiniciar-plataforma.sh` — reinicio completo (BD off-chain)

**Ubicación**: `backend/scripts/reiniciar-plataforma.sh` (orquesta) +
`backend/scripts/reiniciar-plataforma.mjs` (motor).

**Qué hace**: borra **todos** los registros de las **14 tablas** del esquema
(`backend/db/schema.sql`): `usuarios, kyc, articulos, truekes, valoraciones, puntos_encuentro,
disputas, imagenes_certificadas, suscripciones, campanas, subastas, finanzas, auditoria,
indexador_checkpoint` — con `TRUNCATE TABLE … RESTART IDENTITY CASCADE`.

**Qué NO hace (por diseño)**:
- ❌ NO reinicia ni detiene **anvil** (el nodo y los contratos desplegados quedan intactos).
- ❌ NO redeploya contratos ni toca Secret Manager / Cloud Run / relayer / API.
- ❌ NO borra el esquema ni las extensiones (`postgis`, `pgcrypto`): solo los datos.

**Uso** (solo cuando el director lo solicite):

```bash
source /home/dsh/workspace/gcp-env.sh            # exporta DATABASE_URL, RPC_URL, claves
bash backend/scripts/reiniciar-plataforma.sh --check          # diagnóstico (conteos, sin borrar)
bash backend/scripts/reiniciar-plataforma.sh --confirmar       # ejecuta (pide escribir BORRAR)
bash backend/scripts/reiniciar-plataforma.sh --confirmar --respaldo  # pg_dump previo en backups/
```

**Seguridad**: exige `--confirmar` + confirmación interactiva (`BORRAR`); sin `--confirmar`
solo muestra el modo de uso y no modifica nada.

**Después del reinicio**: si se desea re-poblar el espejo desde la cadena, arrancar el indexador
(`node backend/indexador-cli.js --watch`); los checkpoints quedan vacíos y el barrido parte de
`DESDE_BLOQUE` (0 por defecto). Luego ejecutar el bootstrap del Owner (§3) para volver a sembrar
la identidad operativa.

---

## 3. `bootstrap-owner.sh` — sembrar al Owner (cuenta 0)

**Ubicación**: `backend/scripts/bootstrap-owner.sh` (orquesta) +
`backend/scripts/bootstrap-owner.mjs` (motor).

**Qué hace**:
1. Verifica que la clave del Owner coincide con el `owner()` on-chain de `SociosRegistry`.
2. Muestra la cuenta del relayer derivada de `RELAYER_PRIVATE_KEY` (en anvil de pruebas debe ser
   la cuenta 1 `0x7099…79C8`; en producción la clave viene de Secret Manager).
3. **BD off-chain**: registra/actualiza al Owner como `estado='CERTIFICADO'` (escalera D28),
   `tipo='SOCIO'`, `nivel='SOCIO'`, `medalla='ORO'`, `consentimiento_gdpr=TRUE`
   (`backend/db/schema.sql:62-79`).
4. **On-chain**: lo admite como Socio vía `SociosRegistry.admitirSocioDirecto(owner)` si aún no
   lo es (función `onlyOwner`, la firma el propio Owner — `sc/src/SociosRegistry.sol:74`).
5. Con `--smart-account`: despliega su SmartAccount si no existe
   (`SmartAccountFactory.desplegarCuenta`, root inicial `0x0` = INSCRITO — D28/D35,
   `sc/src/SmartAccountFactory.sol:22`).

**Uso**:

```bash
source /home/dsh/workspace/gcp-env.sh
export OWNER_PRIVATE_KEY=<clave privada de la cuenta 0>   # o ADMIN_PRIVATE_KEY
bash backend/scripts/bootstrap-owner.sh --confirmar                  # BD + Socio on-chain
bash backend/scripts/bootstrap-owner.sh --confirmar --smart-account  # + SmartAccount
```

**Nota de alcance (honestidad técnica)**: la escalera on-chain `VERIFICADO/CERTIFICADO` de la
SmartAccount se fija con el **merkle root real** que genera el backend KYC (D28, RF-01.7); el
bootstrap registra `CERTIFICADO` en la **BD off-chain** (fuente de permisos del backend) y la
admisión como **Socio on-chain**, que es lo verificable sin un KYC real. Cuando el backend KYC
emita el root, la SmartAccount debe actualizarse con `cambiarEstadoVerificacion`
(`sc/src/SmartAccount.sol:140`).

---

## 4. Secuencia recomendada (producción limpia)

1. `bash backend/scripts/reiniciar-plataforma.sh --check` (diagnóstico).
2. (Opcional) `--confirmar --respaldo` cuando el director lo ordene.
3. `bash backend/scripts/bootstrap-owner.sh --confirmar --smart-account`.
4. Verificar: `/admin/usuarios` responde con el Owner presente (requiere sesión de la cuenta 0);
   `/admin/contratos` muestra las direcciones; el relayer aparece en `/admin/infra/health`.
5. Arrancar el indexador en modo servicio (`--watch`) para re-poblar el espejo desde la cadena.

---

## 5. Dónde viven los scripts

```
backend/scripts/
├─ reiniciar-plataforma.sh   # entrada: reinicio total de la BD off-chain (--confirmar)
├─ reiniciar-plataforma.mjs  # motor: TRUNCATE CASCADE de las 14 tablas (pg)
├─ bootstrap-owner.sh        # entrada: sembrar Owner CERTIFICADO/SOCIO (--confirmar)
├─ bootstrap-owner.mjs       # motor: BD + admitirSocioDirecto + SmartAccount (ethers v6 + pg)
└─ backups/                  # respaldos pg_dump opcionales (--respaldo)
```
