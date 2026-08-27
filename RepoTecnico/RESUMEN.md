# Resumen del Proyecto Escrow DApp

Proyecto DApp de escrow para intercambio seguro de tokens ERC20 con smart contract en Solidity (Foundry) y frontend Next.js 16 (App Router).
Usa tecnologías como Solidity 0.8.13, Foundry, OpenZeppelin, Next.js 16, ethers.js v6, Tailwind CSS v4 y MetaMask para conexión con blockchain.

## Funcionalidades clave

- **Custodia bilateral con intercambio atómico**: ninguna parte entrega su contraprestación sin recibir la suya.
- **Estados**: `Active / Completed / Cancelled / Disputed` (enum).
- **Deadline**: expiración configurable con `refundAfterExpiry()` para el creador.
- **Arbitraje**: rol de árbitro (`setArbiter`) + `disputeOperation()` + `resolveDispute()`.
- **Paginación** on-chain: `getOperations(offset, limit)` + `getOperationsCount()`.
- **Validación de tokens** en `addToken`: código de contrato + `symbol()`.
- **Frontend**: hooks compartidos (`useEscrow`, `useTokenInfo`, `useAllowedTokens`),
  decimals dinámicos, badges de estado, filtros, panel de árbitro y tests con Vitest.
