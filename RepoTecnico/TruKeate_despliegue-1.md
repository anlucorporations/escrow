🌐 Servicios Activos
Frontend Web (Next.js 16): http://localhost:3000
Sección de Ayuda y Guías: http://localhost:3000/help
Nodo Blockchain Local (Anvil): http://127.0.0.1:8545 (Chain ID: 31337)
🔗 Contratos Inteligentes Desplegados
Contrato	Dirección On-Chain	Propósito
Escrow	0x5FbDB2315678afecb367f032d93F642f64180aa3	Custodia atómica bilateral, swaps y disputas
UserRegistry	0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512	Registro e identidad on-chain
Governance	0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6	Panel de Socios y votación de propuestas
Subscription	0xa513E6E4b8f2a923D98304ec87F64353C4D5C853	Membresías para empresas (100 BRLT/mes)
BRLT	0x0165878A594ca255338adfa4d48449f69242Eb8F	Token para suscripciones (18 decimals)
Tokens ERC20 Autorizados en Escrow:
Token A (TKA): 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 (18 decimals)
Token B (TKB): 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 (18 decimals)
USDT Mock: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 (6 decimals)
DELIVERY Mock: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 (18 decimals)
🔑 Cuentas de Prueba Pre-Financiadas
Todas las cuentas disponen de 10,000 ETH de gas + 1,000 TKA + 1,000 TKB + 5,000 USDT + 10,000 BRLT:

Rol / Cuenta	Dirección Pública	Clave Privada (MetaMask)
0. Admin / Owner	0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266	0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
1. User 1 (Creador)	0x70997970C51812dc3A010C7d01b50e0d17dc79C8	0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
2. User 2 (Contraparte)	0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC	0x5de4111afa1a4b94908f83103eb2f958082a1015f1b41400e9e99b26e9b6cb68
3. Árbitro Oficial	0x90F79bf6EB2c4f870365E785982E1f101E93b906	0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
💡 Pasos para Probar en el Navegador:
Abre tu navegador en http://localhost:3000.
En MetaMask, añade la red local Anvil (http://127.0.0.1:8545, Chain ID 31337).
Importa la clave privada de User 1 o Admin.
Conecta tu billetera e inscríbete con un nombre de usuario en el modal inicial.
Visita la nueva sección de Ayuda para consultar las guías interactivas de cada proceso.