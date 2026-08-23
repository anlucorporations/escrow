export const USER_REGISTRY_ADDRESS = '0xCD8a1C3ba11CF5ECfa6267617243239504a98d90' as const;
export const EXCHANGE_ADDRESS = '0x82e01223d51Eb87e16A03E24687EDF0F294da6f1' as const;
export const ESCROW_ADDRESS = EXCHANGE_ADDRESS;

export const USER_REGISTRY_ABI = [
  {
    "type": "function",
    "name": "registerUser",
    "inputs": [{"name": "username", "type": "string"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isRegistered",
    "inputs": [{"name": "wallet", "type": "address"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserProfile",
    "inputs": [{"name": "wallet", "type": "address"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {"name": "wallet", "type": "address"},
          {"name": "username", "type": "string"},
          {"name": "registeredAt", "type": "uint256"},
          {"name": "isRegistered", "type": "bool"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "UserRegistered",
    "inputs": [
      {"name": "wallet", "type": "address", "indexed": true},
      {"name": "username", "type": "string", "indexed": false},
      {"name": "registeredAt", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  }
] as const;

export const EXCHANGE_ABI = [
  {
    "type": "constructor",
    "inputs": [{"name": "_userRegistry", "type": "address"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "userRegistry",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addToken",
    "inputs": [{"name": "token", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeToken",
    "inputs": [{"name": "token", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowedTokens",
    "inputs": [{"name": "", "type": "address"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAllowedTokens",
    "inputs": [],
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createOrder",
    "inputs": [
      {"name": "giveToken", "type": "address"},
      {"name": "takeToken", "type": "address"},
      {"name": "giveAmount", "type": "uint256"},
      {"name": "takeAmount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fillOrder",
    "inputs": [{"name": "orderId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelOrder",
    "inputs": [{"name": "orderId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getOrder",
    "inputs": [{"name": "orderId", "type": "uint256"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {"name": "id", "type": "uint256"},
          {"name": "maker", "type": "address"},
          {"name": "giveToken", "type": "address"},
          {"name": "takeToken", "type": "address"},
          {"name": "giveAmount", "type": "uint256"},
          {"name": "takeAmount", "type": "uint256"},
          {"name": "status", "type": "uint8"},
          {"name": "createdAt", "type": "uint256"},
          {"name": "filledAt", "type": "uint256"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOrdersPaged",
    "inputs": [
      {"name": "offset", "type": "uint256"},
      {"name": "limit", "type": "uint256"}
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {"name": "id", "type": "uint256"},
          {"name": "maker", "type": "address"},
          {"name": "giveToken", "type": "address"},
          {"name": "takeToken", "type": "address"},
          {"name": "giveAmount", "type": "uint256"},
          {"name": "takeAmount", "type": "uint256"},
          {"name": "status", "type": "uint8"},
          {"name": "createdAt", "type": "uint256"},
          {"name": "filledAt", "type": "uint256"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOrdersByMaker",
    "inputs": [{"name": "maker", "type": "address"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {"name": "id", "type": "uint256"},
          {"name": "maker", "type": "address"},
          {"name": "giveToken", "type": "address"},
          {"name": "takeToken", "type": "address"},
          {"name": "giveAmount", "type": "uint256"},
          {"name": "takeAmount", "type": "uint256"},
          {"name": "status", "type": "uint8"},
          {"name": "createdAt", "type": "uint256"},
          {"name": "filledAt", "type": "uint256"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "OrderCreated",
    "inputs": [
      {"name": "orderId", "type": "uint256", "indexed": true},
      {"name": "maker", "type": "address", "indexed": true},
      {"name": "giveToken", "type": "address", "indexed": false},
      {"name": "takeToken", "type": "address", "indexed": false},
      {"name": "giveAmount", "type": "uint256", "indexed": false},
      {"name": "takeAmount", "type": "uint256", "indexed": false},
      {"name": "createdAt", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OrderFilled",
    "inputs": [
      {"name": "orderId", "type": "uint256", "indexed": true},
      {"name": "taker", "type": "address", "indexed": true},
      {"name": "filledAt", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OrderCancelled",
    "inputs": [
      {"name": "orderId", "type": "uint256", "indexed": true}
    ],
    "anonymous": false
  }
] as const;

export const ESCROW_ABI = EXCHANGE_ABI;

export const ERC20_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view"
  }
] as const;
