# deploy-local.ps1 — Despliegue local con roles preconfigurados (PowerShell)
param (
    [string]$RpcUrl = "http://127.0.0.1:8545"
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🚀 DESPLIEGUE LOCAL ESCROW / TRUEKEATE — ROLES PRECONFIGURADOS" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Verificar Anvil
try {
    $block = cast block-number --rpc-url $RpcUrl 2>$null
    Write-Host "✓ Anvil detectado en $RpcUrl (Bloque actual: $block)" -ForegroundColor Green
} catch {
    Write-Host "❌ Anvil no está corriendo en $RpcUrl. Inicia Anvil primero: anvil" -ForegroundColor Red
    exit 1
}

$Addrs = @(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", # 0: SuperUsuario
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", # 1: Particular 1 (Alice)
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", # 2: Particular 2 (Bob)
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", # 3: Particular 3 (Carol)
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", # 4: Comerciante 1 (Tienda Tech)
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", # 5: Comerciante 2 (Super Market)
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9", # 6: Socio 1 (Juez Alpha)
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", # 7: Socio 2 (Juez Beta)
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", # 8: Socio 3 (Juez Gamma)
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"  # 9: Reserva
)

$Keys = @(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
)

$OwnerAddr = $Addrs[0]
$OwnerKey = $Keys[0]

# 2. Compilar contratos
Write-Host "`n📦 [Paso 1/7] Compilando contratos inteligentes con Foundry..." -ForegroundColor Yellow
Push-Location sc
try {
    forge build | Out-Null
    Write-Host "✓ Contratos compilados correctamente" -ForegroundColor Green
} finally {
    Pop-Location
}

function Deploy-Contract {
    param (
        [string]$ContractName,
        [string[]]$ConstructorArgs = @()
    )
    Push-Location sc
    try {
        $cmdArgs = @("create", "--rpc-url", $RpcUrl, "--private-key", $OwnerKey, "--broadcast", "src/$ContractName.sol:$ContractName")
        if ($ConstructorArgs.Count -gt 0) {
            $cmdArgs += "--constructor-args"
            $cmdArgs += $ConstructorArgs
        }
        $out = forge @cmdArgs 2>$null
        $line = $out | Select-String "Deployed to:\s+(0x[a-fA-F0-9]{40})"
        if ($line.Matches.Groups.Count -ge 2) {
            return $line.Matches.Groups[1].Value
        }
        throw "Failed to deploy $ContractName"
    } finally {
        Pop-Location
    }
}

# 3. Desplegar contratos
Write-Host "`n🔐 [Paso 2/7] Desplegando contratos (Owner = Cuenta 0: $OwnerAddr)..." -ForegroundColor Yellow
$Escrow = Deploy-Contract "Escrow"
$Registry = Deploy-Contract "UserRegistry"
$TKA = Deploy-Contract "MockERC20" @("TokenA", "TKA", "18")
$TKB = Deploy-Contract "MockERC20" @("TokenB", "TKB", "18")
$USDT = Deploy-Contract "MockERC20" @("USDT", "USDT", "6")
$DELIVERY = Deploy-Contract "MockERC20" @("DELIVERY", "DELIVERY", "18")
$BRLT = Deploy-Contract "BRLT"
$Subscription = Deploy-Contract "Subscription" @($BRLT, "100000000000000000000")
$Governance = Deploy-Contract "Governance"

Write-Host "✓ Escrow:       $Escrow" -ForegroundColor Green
Write-Host "✓ UserRegistry: $Registry" -ForegroundColor Green
Write-Host "✓ Governance:   $Governance" -ForegroundColor Green
Write-Host "✓ Subscription: $Subscription" -ForegroundColor Green
Write-Host "✓ Token A:      $TKA" -ForegroundColor Green
Write-Host "✓ Token B:      $TKB" -ForegroundColor Green
Write-Host "✓ USDT Mock:    $USDT" -ForegroundColor Green
Write-Host "✓ DELIVERY:     $DELIVERY" -ForegroundColor Green
Write-Host "✓ BRLT Token:   $BRLT" -ForegroundColor Green

# 4. Configurar SuperUsuario (Cuenta 0)
Write-Host "`n👑 [Paso 3/7] Configurando SuperUsuario (Cuenta 0)..." -ForegroundColor Yellow
foreach ($t in @($TKA, $TKB, $USDT, $DELIVERY)) {
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Escrow "addToken(address)" $t | Out-Null
}
cast send --rpc-url $RpcUrl --private-key $OwnerKey $Escrow "setArbiter(address)" $OwnerAddr | Out-Null
cast send --rpc-url $RpcUrl --private-key $OwnerKey $Governance "setSocio(address,bool)" $OwnerAddr $true | Out-Null
try { cast send --rpc-url $RpcUrl --private-key $OwnerKey $Registry "register(string)" "superadmin" | Out-Null } catch {}
Write-Host "✓ Cuenta 0 configurada como: Owner + Árbitro + Socio + superadmin on-chain" -ForegroundColor Green

# 5. Minteo de tokens de prueba
Write-Host "`n💰 [Paso 4/7] Minteando tokens de prueba a las 10 cuentas de Anvil..." -ForegroundColor Yellow
foreach ($addr in $Addrs) {
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $TKA "mint(address,uint256)" $addr 1000000000000000000000 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $TKB "mint(address,uint256)" $addr 1000000000000000000000 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $USDT "mint(address,uint256)" $addr 5000000000 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $DELIVERY "mint(address,uint256)" $addr 5 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $BRLT "mint(address,uint256)" $addr 10000000000000000000000 | Out-Null
}
Write-Host "✓ 1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY + 10000 BRLT asignados por cuenta" -ForegroundColor Green

# 6. Inscribir Usuarios Particulares (Cuentas 1, 2, 3)
Write-Host "`n👤 [Paso 5/7] Inscribiendo 3 Usuarios Particulares en UserRegistry..." -ForegroundColor Yellow
$partNames = @("particular_alice", "particular_bob", "particular_carol")
for ($i = 1; $i -le 3; $i++) {
    $a = $Addrs[$i]
    $k = $Keys[$i]
    $u = $partNames[$i - 1]
    try { cast send --rpc-url $RpcUrl --private-key $k $Registry "register(string)" $u | Out-Null } catch {}
    Write-Host "  ✓ Cuenta $i ($a) -> @$u" -ForegroundColor Green
}

# 7. Inscribir y Configurar Comerciantes (Cuentas 4, 5)
Write-Host "`n🏬 [Paso 6/7] Inscribiendo 2 Comerciantes y activando suscripción BRLT..." -ForegroundColor Yellow
$comNames = @("tienda_tech", "mercado_central")
for ($i = 4; $i -le 5; $i++) {
    $a = $Addrs[$i]
    $k = $Keys[$i]
    $u = $comNames[$i - 4]
    try { cast send --rpc-url $RpcUrl --private-key $k $Registry "register(string)" $u | Out-Null } catch {}
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Subscription "setBusiness(address,bool)" $a $true | Out-Null
    cast send --rpc-url $RpcUrl --private-key $k $BRLT "approve(address,uint256)" $Subscription 1200000000000000000000 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $k $Subscription "subscribe(uint256)" 12 | Out-Null
    Write-Host "  ✓ Cuenta $i ($a) -> @$u (Business: TRUE, Suscripción: 12 meses activa)" -ForegroundColor Green
}

# 8. Inscribir y Configurar Socios (Cuentas 6, 7, 8)
Write-Host "`n⚖️  [Paso 7/7] Inscribiendo 3 Socios y otorgando rol en Governance..." -ForegroundColor Yellow
$socNames = @("socio_juez_alpha", "socio_juez_beta", "socio_juez_gamma")
for ($i = 6; $i -le 8; $i++) {
    $a = $Addrs[$i]
    $k = $Keys[$i]
    $u = $socNames[$i - 6]
    try { cast send --rpc-url $RpcUrl --private-key $k $Registry "register(string)" $u | Out-Null } catch {}
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Governance "setSocio(address,bool)" $a $true | Out-Null
    Write-Host "  ✓ Cuenta $i ($a) -> @$u (Socio en Governance: TRUE)" -ForegroundColor Green
}

# 9. Configurar web/.env.local
$envContent = @"
NEXT_PUBLIC_ESCROW_ADDRESS=$Escrow
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=$Registry
NEXT_PUBLIC_GOVERNANCE_ADDRESS=$Governance
NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=$Subscription
NEXT_PUBLIC_TOKEN_A_ADDRESS=$TKA
NEXT_PUBLIC_TOKEN_B_ADDRESS=$TKB
NEXT_PUBLIC_USDT_ADDRESS=$USDT
NEXT_PUBLIC_DELIVERY_ADDRESS=$DELIVERY
NEXT_PUBLIC_BRLT_ADDRESS=$BRLT
NEXT_PUBLIC_RPC_URL=$RpcUrl
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY=$OwnerKey
"@
Set-Content -Path "web/.env.local" -Encoding utf8 -Value $envContent

# 10. Guardar deployment-info.txt
$deployInfo = @"
=================================================================
  DESPLIEGUE LOCAL ESCROW & TRUEKEATE — INFORME DE ROLES
=================================================================

CONTRATOS DESPLEGADOS:
  Escrow:        $Escrow
  UserRegistry:  $Registry
  Governance:    $Governance
  Subscription:  $Subscription
  Token A:       $TKA (TKA, 18 dec)
  Token B:       $TKB (TKB, 18 dec)
  USDT Mock:     $USDT (USDT, 6 dec)
  DELIVERY:      $DELIVERY (DELIVERY, 18 dec)
  BRLT:          $BRLT (BRLT Stablecoin, 18 dec)

CUENTAS Y ASIGNACIÓN DE ROLES:
-----------------------------------------------------------------
[0] SUPERUSUARIO (Owner, Árbitro, Socio, Relayer Gas, Admin):
    Dirección: $OwnerAddr
    Username:  @superadmin
    PrivKey:   $OwnerKey

[1] USUARIO PARTICULAR 1:
    Dirección: $($Addrs[1])
    Username:  @particular_alice
    PrivKey:   $($Keys[1])

[2] USUARIO PARTICULAR 2:
    Dirección: $($Addrs[2])
    Username:  @particular_bob
    PrivKey:   $($Keys[2])

[3] USUARIO PARTICULAR 3:
    Dirección: $($Addrs[3])
    Username:  @particular_carol
    PrivKey:   $($Keys[3])

[4] USUARIO COMERCIANTE 1 (Suscripción BRLT 12 Meses):
    Dirección: $($Addrs[4])
    Username:  @tienda_tech
    PrivKey:   $($Keys[4])

[5] USUARIO COMERCIANTE 2 (Suscripción BRLT 12 Meses):
    Dirección: $($Addrs[5])
    Username:  @mercado_central
    PrivKey:   $($Keys[5])

[6] USUARIO SOCIO 1 (Gobernanza / Mediador):
    Dirección: $($Addrs[6])
    Username:  @socio_juez_alpha
    PrivKey:   $($Keys[6])

[7] USUARIO SOCIO 2 (Gobernanza / Mediador):
    Dirección: $($Addrs[7])
    Username:  @socio_juez_beta
    PrivKey:   $($Keys[7])

[8] USUARIO SOCIO 3 (Gobernanza / Mediador):
    Dirección: $($Addrs[8])
    Username:  @socio_juez_gamma
    PrivKey:   $($Keys[8])

[9] CUENTA RESERVA:
    Dirección: $($Addrs[9])
    PrivKey:   $($Keys[9])
=================================================================
"@
Set-Content -Path "deployment-info.txt" -Encoding utf8 -Value $deployInfo

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  ✅ DESPLIEGUE LOCAL Y ASIGNACIÓN DE ROLES COMPLETADA CON ÉXITO" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  • SuperUsuario: Cuenta 0 (@superadmin)" -ForegroundColor White
Write-Host "  • Particulares: Cuentas 1, 2, 3 (@particular_alice, @particular_bob, @particular_carol)" -ForegroundColor White
Write-Host "  • Comerciantes: Cuentas 4, 5 (@tienda_tech, @mercado_central con 12 meses activos)" -ForegroundColor White
Write-Host "  • Socios:       Cuentas 6, 7, 8 (@socio_juez_alpha, @socio_juez_beta, @socio_juez_gamma)" -ForegroundColor White
Write-Host "`n  Configuración guardada en: web/.env.local y deployment-info.txt" -ForegroundColor Gray
