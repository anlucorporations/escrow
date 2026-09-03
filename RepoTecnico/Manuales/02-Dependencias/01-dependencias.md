# Manual técnico · Dependencias y versiones

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: dependencias de TrueKeate por capa
> (contratos, backend, frontend, herramientas), con **versiones exactas** leídas de
> `package.json`/`package-lock.json`, `foundry.toml`, `.gitmodules` y de los tags de los
> submódulos. Referencias `ruta:línea`. Lo no verificable se marca **pendiente de confirmar**.

---

## 1. Metodología y cómo leer este manual

### 1.1 Fuentes de versiones

- **package.json** declara rangos semver con `^` (p. ej. `"ethers": "^6.17.0"`,
  `backend/package.json:14`).
- **package-lock.json** (lockfileVersion 3) fija la **versión exacta** instalada
  (`backend/package-lock.json`, `web/package-lock.json`).
- **foundry.toml** fija el compilador (`sc/foundry.toml:5`).
- **.gitmodules** (raíz del repositorio) declara los submódulos de contratos (`.gitmodules:1-6`);
  los **tags exactos** se verificaron con `git describe --tags` sobre el checkout local
  (`sc/lib/forge-std` → v1.9.4; `sc/lib/openzeppelin-contracts` → v5.0.2).

### 1.2 Convenciones de la tabla

- "Declarada": rango del `package.json`. "Exacta": versión resuelta del lockfile.
- Reinstalar tras un cambio debe reproducir el lockfile (`npm ci`); la política de actualización
  de dependencias de npm no está documentada en el repo → **pendiente de confirmar**.

---

## 2. Capa de contratos (cadena)

### 2.1 Compilador y configuración

| Dependencia | Versión | Fuente |
|---|---|---|
| Solidity (pragma) | `^0.8.24` | `sc/src/Escrow.sol:2` (y resto de contratos) |
| Solidity (compilador fijo) | `0.8.24` | `sc/foundry.toml:5` |
| EVM | `paris` | `sc/foundry.toml:8` |
| Optimizador | activo, 200 runs | `sc/foundry.toml:6-7` |

### 2.2 Librerías (submódulos git)

| Librería | Tag exacto | Commit (gitlink) | Declaración | Uso |
|---|---|---|---|---|
| **forge-std** | **v1.9.4** | `1eea5bae12ae557d589f9f0f0edae2faa47cb262` | `.gitmodules:1-3` | Scripts y utilidades de test (`sc/script/Deploy.s.sol:4`) |
| **openzeppelin-contracts** | **v5.0.2** | `dbb6104ce834628e473d2173bbc9d47f81a9eec3` | `.gitmodules:4-6` | Ownable, ReentrancyGuard, EIP712, ECDSA, MerkleProof, ERC20/721, SafeERC20 |

Verificación: el commit del submódulo coincide exactamente con la tag (`git rev-parse v5.0.2` =
HEAD = `dbb6104c…`; `v1.9.4` = HEAD = `1eea5ba…`). Los remappings están en `sc/foundry.toml:11-14`.

### 2.3 Módulos OpenZeppelin usados (imports reales)

Ver tabla completa en `RepoTecnico/Manuales/01-Tecnologia/02-stack-web3.md` §4.1; resumen:
`Ownable`, `ReentrancyGuard`, `EIP712`, `ECDSA`, `MerkleProof`, `ERC20`, `ERC721`, `IERC20`,
`IERC721`, `SafeERC20` (imports en `sc/src/Escrow.sol:4-8`, `sc/src/SmartAccount.sol:4-7`,
`sc/src/BRLT.sol:4-5`, `sc/src/FondoDeValor.sol:4-6`, `sc/src/SuscripcionEmpresa.sol:4-6`,
`sc/src/mocks/*`).

---

## 3. Capa de backend (Node.js)

### 3.1 Dependencias de runtime

Fuente de rangos: `backend/package.json:13-19`. Versiones exactas: `backend/package-lock.json`
(lockfileVersion 3).

| Dependencia | Declarada | Exacta (lockfile) | Propósito |
|---|---|---|---|
| `ethers` | `^6.17.0` | **6.17.0** | RPC, interfaces, firmas EIP-191/712 |
| `express` | `^5.2.1` | **5.2.1** | API REST |
| `express-rate-limit` | `^8.7.0` | **8.7.0** | Rate-limiting global (D16) |
| `pg` | `^8.23.0` | **8.23.0** | PostgreSQL (Pool) |
| `supertest` | `^7.2.2` | **7.2.2** | Tests HTTP (ubicada en `dependencies`) |

### 3.2 Características del paquete

- `"type": "module"` (ESM) (`backend/package.json:20`); `main: index.js` (`package.json:5`);
  licencia ISC (`package.json:12`).
- Sin dependencias dev separadas ni gestor de TS en runtime.

---

## 4. Capa de frontend (Next.js)

### 4.1 Dependencias de runtime

Fuente de rangos: `web/package.json:11-16`. Versiones exactas: `web/package-lock.json`.

| Dependencia | Declarada | Exacta (lockfile) | Propósito |
|---|---|---|---|
| `next` | `16.3.4` (fija) | **16.3.4** | Framework App Router |
| `react` | `19.2.8` (fija) | **19.2.8** | UI |
| `react-dom` | `19.2.8` (fija) | **19.2.8** | Renderizado |
| `ethers` | `^6.17.0` | **6.17.0** | Wallet/provider en cliente |

### 4.2 Dependencias de desarrollo

Fuente de rangos: `web/package.json:17-27`. Versiones exactas: `web/package-lock.json`.

| Dependencia | Declarada | Exacta (lockfile) | Propósito |
|---|---|---|---|
| `@playwright/test` | `^1.62.1` | **1.62.1** | E2E (chromium + mobile-chrome) |
| `@tailwindcss/postcss` | `^4` | **4.3.3** | Plugin PostCSS de Tailwind v4 |
| `tailwindcss` | `^4` | **4.3.3** | Estilos (tokens `@theme`) |
| `typescript` | `^5` | **5.9.3** | Lenguaje/tipado |
| `eslint` | `^9` | **9.39.5** | Lint |
| `eslint-config-next` | `16.3.4` (fija) | **16.3.4** | Config ESLint de Next |
| `@types/node` | `^20` | **20.19.43** | Tipos Node |
| `@types/react` | `^19` | **19.2.18** | Tipos React |
| `@types/react-dom` | `^19` | **19.2.5** | Tipos React DOM |

---

## 5. Herramientas y servicios externos (no npm)

| Herramienta/servicio | Versión/valor | Estado de verificación |
|---|---|---|
| Node.js (runtime) | no fijada en el repo (sin `.nvmrc`/`engines` verificado) | **pendiente de confirmar** |
| Foundry (`forge`/`anvil`/`cast`) | sin versión fijada en el repo | **pendiente de confirmar** (toolchain instalada en el entorno de desarrollo) |
| PostgreSQL + PostGIS | servicio GCP `mcc-postgres` reutilizado (D25) | versión del servicio **pendiente de confirmar** (`entornos_globales.md:43`, `backend/README.md:26`) |
| IPFS/Kubo (pinning propio, D23/D37) | open source, sin SaaS | **pendiente de confirmar** (no desplegado en el repo; ver `arquitectura_tecnica.md:403-404`) |
| Geocodificación/rutas | OSM + Nominatim / OSRM (D37) | decisión documentada (`arquitectura_tecnica.md:400-402`); integración **pendiente de confirmar** |
| Email/códigos | Nodemailer + SMTP propio (D37) | decisión documentada (`arquitectura_tecnica.md:406-408`); integración **pendiente de confirmar** |
| Wallet | MetaMask (browser) + MetaMask mobile (PWA D40) | `arquitectura_tecnica.md:95-98`, `web/lib/ethereum.tsx` |
| gcloud CLI + Secret Manager | entorno GCP | `entornos_globales.md:44`, `gcp-env.sh:38-46` |

---

## 6. Licencias

| Paquete/contrato | Licencia | Fuente |
|---|---|---|
| `truekeate-backend` | ISC | `backend/package.json:12` |
| `web` | `private: true` (sin licencia declarada) | `web/package.json:4` |
| Contratos TrueKeate | SPDX MIT | `sc/src/Escrow.sol:1` (y resto de `sc/src/*.sol`) |
| OpenZeppelin Contracts | MIT (upstream) | librería del submódulo `sc/lib/openzeppelin-contracts` |
| forge-std | MIT/Apache-2.0 (upstream) | librería del submódulo `sc/lib/forge-std` |

> No se ha realizado un análisis completo de licencias de terceros (transitivas de npm) → **pendiente
> de confirmar** si el proyecto exige revisión legal de licencias.

---

## 7. Notas de verificación

- Rangos declarados (`^`) vs versiones exactas del lockfile: los valores de este manual usan el
  lockfile, que es lo que realmente se instala con `npm ci`.
- Los submódulos de contratos están **fijados por commit** (tags v1.9.4 y v5.0.2 verificadas), a
  diferencia de npm que usa lockfileVersion 3.
- No hay CI/config de dependabot/renovate en el repositorio (búsqueda sin resultados) →
  **pendiente de confirmar** la política de mantenimiento.
