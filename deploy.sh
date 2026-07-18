#!/bin/bash

if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo "Error: Anvil not running. Run: anvil"
    exit 1
fi

echo "Deploying contracts..."

KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
cd sc || exit 1

ESCROW=$(ETH_RPC_URL=http://localhost:8545 forge create --private-key=$KEY --broadcast src/Escrow.sol:Escrow 2>&1 | grep "Deployed to:" | awk '{print $3}')
TOKENA=$(ETH_RPC_URL=http://localhost:8545 forge create --private-key=$KEY --broadcast src/MockERC20.sol:MockERC20 --constructor-args "Token A" "TKA" 2>&1 | grep "Deployed to:" | awk '{print $3}')
TOKENB=$(ETH_RPC_URL=http://localhost:8545 forge create --private-key=$KEY --broadcast src/MockERC20.sol:MockERC20 --constructor-args "Token B" "TKB" 2>&1 | grep "Deployed to:" | awk '{print $3}')

echo "Adding tokens to Escrow contract..."
cast send --private-key=$KEY --rpc-url=http://localhost:8545 $ESCROW "addToken(address)" $TOKENA
cast send --private-key=$KEY --rpc-url=http://localhost:8545 $ESCROW "addToken(address)" $TOKENB
echo "✅ Tokens added to Escrow"

echo "Minting tokens to accounts..."
for ADDR in "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" "0x90F79bf6EB2c4f870365E785982E1f101E93b906" "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" "0x976EA74026E726554dB657fA54763abd0C3a0aa9" "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955" "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"; do
    cast send --private-key=$KEY --rpc-url=http://localhost:8545 $TOKENA "mint(address,uint256)" $ADDR 1000000000000000000000 > /dev/null 2>&1
    cast send --private-key=$KEY --rpc-url=http://localhost:8545 $TOKENB "mint(address,uint256)" $ADDR 1000000000000000000000 > /dev/null 2>&1
done
echo "✅ Tokens minted to 10 accounts"

cd ..

sed -i.bak "s/export const ESCROW_ADDRESS = '0x[a-fA-F0-9]\{40\}'/export const ESCROW_ADDRESS = '${ESCROW}'/" web/lib/contracts.ts
rm -f web/lib/contracts.ts.bak
echo "Updated contract address to: $ESCROW"

# Kill Next.js dev server to force reload with new contract address
echo "Restarting Next.js dev server..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
rm -rf web/.next 2>/dev/null || true

cat > deployment-info.txt <<EOF
Escrow:  $ESCROW
Token A: $TOKENA (TKA)
Token B: $TOKENB (TKB)

Accounts (1000 TKA + 1000 TKB each):
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
EOF

echo ""
echo "✅ Deployed"
echo "Escrow:  $ESCROW"
echo "Token A: $TOKENA"
echo "Token B: $TOKENB"
echo ""
echo "Verifying tokens were added to Escrow..."
ALLOWED_TOKENS=$(cast call --rpc-url=http://localhost:8545 $ESCROW "getAllowedTokens()(address[])")
echo "Allowed tokens in contract: $ALLOWED_TOKENS"
