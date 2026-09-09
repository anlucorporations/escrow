// =============================================================================
// TrueKeate — Detección del Owner (única fuente de verdad)
// =============================================================================
// El Owner de la plataforma es el DUEÑO on-chain del SociosRegistry
// (`SociosRegistry.owner()`), no un "tipo de usuario": Ana/Bruno/Owner son todos
// tipo SOCIO en la BD, pero SOLO la wallet dueña del registry (cuenta anvil #0 en
// GCP: 0xf39F…2266) es el Owner (RF-13.1 / RF-18.4).
//
// Orden de resolución:
//   1) On-chain: `owner()` del SociosRegistry (si hay red + registry) — GCP.
//   2) Sin red (dev/tests): env OWNER_WALLET si existe.
//   3) Sin red ni env: usuario BD con `rol === 'OWNER'` (tests en memoria).
// Devuelve la wallet del Owner (lowercase) o null si no se puede determinar.
// =============================================================================
import { ethers } from 'ethers';

const ABI_OWNER = ['function owner() view returns (address)'];

/**
 * Crea el detector de Owner.
 * @param {object} deps { almacen, proveedor?, registryAddress?, ownerWallet? }
 *   - ownerWallet: wallet conocida del Owner (env OWNER_WALLET) para modo sin red.
 */
export function crearDetectorOwner({ almacen, proveedor, registryAddress, ownerWallet }) {
  let cacheOwner = null; // wallet del owner resuelta (lowercase)
  let cacheTs = 0;
  const TTL_MS = 30_000;

  async function ownerOnChain() {
    const reg = registryAddress || process.env.REGISTRY_ADDRESS || null;
    if (!reg || !proveedor) return null;
    try {
      const c = new ethers.Contract(reg, ABI_OWNER, proveedor);
      return (await c.owner()).toLowerCase();
    } catch {
      return null;
    }
  }

  /** Resuelve (con caché corta) la wallet del Owner; null si indeterminado. */
  async function resolverOwner() {
    if (cacheOwner && Date.now() - cacheTs < TTL_MS) return cacheOwner;
    const ahora = Date.now();
    const onChain = await ownerOnChain();
    if (onChain) {
      cacheOwner = onChain;
      cacheTs = ahora;
      return onChain;
    }
    // Sin red: env OWNER_WALLET o usuario BD con rol OWNER
    const envOwner = (process.env.OWNER_WALLET || ownerWallet || '').toLowerCase();
    if (envOwner) {
      cacheOwner = envOwner;
      cacheTs = ahora;
      return envOwner;
    }
    try {
      const usuarios = (await almacen.listarUsuarios?.()) ?? [];
      const conRol = usuarios.find((u) => u.rol === 'OWNER');
      if (conRol?.wallet) {
        cacheOwner = conRol.wallet.toLowerCase();
        cacheTs = ahora;
        return cacheOwner;
      }
    } catch { /* sin almacen */ }
    return null;
  }

  /** ¿Esta wallet es el Owner? */
  async function esOwner(wallet) {
    const owner = await resolverOwner();
    return Boolean(owner && (wallet || '').toLowerCase() === owner);
  }

  /** Middleware Express: exige que req.wallet sea el Owner (RF-13.1). */
  function requiereOwner(req, res, next) {
    esOwner(req.wallet)
      .then((ok) => {
        if (!ok) {
          return res.status(403).json({ error: 'solo_owner', detalle: 'sección reservada al Owner (RF-13.1)' });
        }
        next();
      })
      .catch((e) => {
        console.error('[es-owner] middleware:', e.message);
        return res.status(500).json({ error: 'internal', detalle: 'no se pudo verificar el Owner' });
      });
  }

  return { esOwner, resolverOwner, requiereOwner };
}
