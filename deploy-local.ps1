# deploy-local.ps1 — Despliegue local con matriz de roles completa (PowerShell)
param (
    [string]$RpcUrl = "http://127.0.0.1:8545"
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🚀 DESPLIEGUE LOCAL ESCROW / TRUEKEATE — MATRIZ DE ROLES" -ForegroundColor Cyan
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
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", # 0: Owner / SuperUsuario Socio
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", # 1: Usuario Socio 1 (Juez Alpha)
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", # 2: Usuario Socio 2 (Juez Beta)
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", # 3: Usuario Empresa 1 (Tech Store)
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", # 4: Usuario Empresa 2 (Agro Market)
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", # 5: Usuario Particular Verificado 1 (Carlos)
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9", # 6: Usuario Particular Verificado 2 (Diana)
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", # 7: Cuenta Libre 1 (Sin registrar)
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", # 8: Cuenta Libre 2 (Sin registrar)
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"  # 9: Cuenta Reserva
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

# Despliegue de SBTs, RWA y Vouchers
$TruekeSBT = Deploy-Contract "TruekeSBT"
$SBTRegistry = Deploy-Contract "SBTRegistry"
$TruekeRWA = Deploy-Contract "TruekeRWA" @($SBTRegistry)
$TruekeService = Deploy-Contract "TruekeService" @($SBTRegistry)

# Vincular minter de SBT nativo
cast send --rpc-url $RpcUrl --private-key $OwnerKey $TruekeSBT "setMinter(address)" $SBTRegistry | Out-Null
cast send --rpc-url $RpcUrl --private-key $OwnerKey $SBTRegistry "setNativeSBT(address)" $TruekeSBT | Out-Null

Write-Host "✓ Escrow:        $Escrow" -ForegroundColor Green
Write-Host "✓ UserRegistry:  $Registry" -ForegroundColor Green
Write-Host "✓ Governance:    $Governance" -ForegroundColor Green
Write-Host "✓ Subscription:  $Subscription" -ForegroundColor Green
Write-Host "✓ Token A:       $TKA" -ForegroundColor Green
Write-Host "✓ Token B:       $TKB" -ForegroundColor Green
Write-Host "✓ USDT Mock:     $USDT" -ForegroundColor Green
Write-Host "✓ DELIVERY:      $DELIVERY" -ForegroundColor Green
Write-Host "✓ BRLT Token:    $BRLT" -ForegroundColor Green
Write-Host "✓ TruekeSBT:     $TruekeSBT" -ForegroundColor Green
Write-Host "✓ SBTRegistry:   $SBTRegistry" -ForegroundColor Green
Write-Host "✓ TruekeRWA:     $TruekeRWA" -ForegroundColor Green
Write-Host "✓ TruekeService: $TruekeService" -ForegroundColor Green

# 4. Configurar SuperUsuario (Cuenta 0)
Write-Host "`n👑 [Paso 3/7] Configurando SuperUsuario (Cuenta 0: Owner + Socio Certificado + SBT)..." -ForegroundColor Yellow
foreach ($t in @($TKA, $TKB, $USDT, $DELIVERY)) {
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Escrow "addToken(address)" $t | Out-Null
}
cast send --rpc-url $RpcUrl --private-key $OwnerKey $Escrow "setArbiter(address)" $OwnerAddr | Out-Null
cast send --rpc-url $RpcUrl --private-key $OwnerKey $Escrow "setUserRegistry(address)" $Registry | Out-Null
cast send --rpc-url $RpcUrl --private-key $OwnerKey $Governance "setTreasury(address)" $OwnerAddr | Out-Null
cast send --rpc-url $RpcUrl --private-key $OwnerKey $Governance "setSocio(address,bool)" $OwnerAddr $true | Out-Null
try {
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Registry "register(string,string,string,string,int32,int32,uint8,bool)" "superadmin" "superadmin@truekeate.com" "+584120000000" "Sede Central TrueKeate, Barlovento, Miranda" 729000 1159000 19 $true | Out-Null
} catch {}
cast send --rpc-url $RpcUrl --private-key $OwnerKey $Registry "setUserIdentificationLevel(address,uint8)" $OwnerAddr 2 | Out-Null
cast send --rpc-url $RpcUrl --private-key $OwnerKey $TruekeSBT "mint(address,string)" $OwnerAddr "Certificacion Fundador & Socio TrueKeate" | Out-Null
Write-Host "✓ Cuenta 0 configurada como: Owner + Árbitro + Socio Certificado (Nivel 3 SBT) + @superadmin" -ForegroundColor Green

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

# 6. Configurar Cuentas 1 y 2: Usuarios Socios Certificados
Write-Host "`n⚖️ [Paso 5/7] Configurando 2 Usuarios Socios Certificados (Cuentas 1 y 2)..." -ForegroundColor Yellow
$socData = @(
    @("socio_juez_alpha", "juez.alpha@truekeate.com", "+584126667788", "Tribunal Comunitario Alpha, Barlovento", 729800, 1160100, 19, $true),
    @("socio_juez_beta", "juez.beta@truekeate.com", "+584127778899", "Tribunal Comunitario Beta, Caucagua", 725100, 1152000, 19, $true)
)
for ($i = 1; $i -le 2; $i++) {
    $a = $Addrs[$i]
    $k = $Keys[$i]
    $d = $socData[$i - 1]
    try {
        cast send --rpc-url $RpcUrl --private-key $k $Registry "register(string,string,string,string,int32,int32,uint8,bool)" $d[0] $d[1] $d[2] $d[3] $d[4] $d[5] $d[6] $d[7] | Out-Null
    } catch {}
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Governance "setSocio(address,bool)" $a $true | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Registry "setUserIdentificationLevel(address,uint8)" $a 2 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $TruekeSBT "mint(address,string)" $a "Certificacion Socio Comunitario" | Out-Null
    Write-Host "  ✓ Cuenta $i ($a) -> @$($d[0]) (Socio: TRUE, Certificado N3 SBT: TRUE)" -ForegroundColor Green
}

# 7. Configurar Cuentas 3 y 4: Usuarios Empresa Certificados
Write-Host "`n🏬 [Paso 6/7] Configurando 2 Usuarios Empresa Certificados (Cuentas 3 y 4)..." -ForegroundColor Yellow
$comData = @(
    @("empresa_tech", "tech@barloventas.com", "+584124445566", "Centro Comercial Barlovento Local 14", 728900, 1158500, 19, $true),
    @("empresa_agro", "agro@barloventas.com", "+584125556677", "Av. Comercio Local 3, Tacarigua", 727500, 1156200, 19, $true)
)
for ($i = 3; $i -le 4; $i++) {
    $a = $Addrs[$i]
    $k = $Keys[$i]
    $d = $comData[$i - 3]
    try {
        cast send --rpc-url $RpcUrl --private-key $k $Registry "register(string,string,string,string,int32,int32,uint8,bool)" $d[0] $d[1] $d[2] $d[3] $d[4] $d[5] $d[6] $d[7] | Out-Null
    } catch {}
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Subscription "setBusiness(address,bool)" $a $true | Out-Null
    cast send --rpc-url $RpcUrl --private-key $k $BRLT "approve(address,uint256)" $Subscription 1200000000000000000000 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $k $Subscription "subscribe(uint256)" 12 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Registry "setUserIdentificationLevel(address,uint8)" $a 2 | Out-Null
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $TruekeSBT "mint(address,string)" $a "Certificacion Empresa Verificada" | Out-Null
    Write-Host "  ✓ Cuenta $i ($a) -> @$($d[0]) (Empresa: TRUE, Suscripción: 12 meses, Certificado N3 SBT: TRUE)" -ForegroundColor Green
}

# 8. Configurar Cuentas 5 y 6: Usuarios Particulares Verificados
Write-Host "`n👤 [Paso 7/7] Configurando 2 Usuarios Particulares Verificados (Cuentas 5 y 6)..." -ForegroundColor Yellow
$partData = @(
    @("particular_carlos", "carlos@truekeate.com", "+584121112233", "Av. Principal 1, Higuerote", 729450, 1159800, 19, $true),
    @("particular_diana", "diana@truekeate.com", "+584122223344", "Calle Marina 12, Carenero", 731200, 1162400, 19, $true)
)
for ($i = 5; $i -le 6; $i++) {
    $a = $Addrs[$i]
    $k = $Keys[$i]
    $d = $partData[$i - 5]
    try {
        cast send --rpc-url $RpcUrl --private-key $k $Registry "register(string,string,string,string,int32,int32,uint8,bool)" $d[0] $d[1] $d[2] $d[3] $d[4] $d[5] $d[6] $d[7] | Out-Null
    } catch {}
    cast send --rpc-url $RpcUrl --private-key $OwnerKey $Registry "setUserIdentificationLevel(address,uint8)" $a 1 | Out-Null
    Write-Host "  ✓ Cuenta $i ($a) -> @$($d[0]) (Particular Verificado N2 - Cuota: 3 truekes)" -ForegroundColor Green
}

Write-Host "`n  ✓ Cuentas 7, 8 y 9 permanecen LIBRES (Sin registrar) para pruebas de inscripción." -ForegroundColor Cyan

# 9. Actualizar web/.env.local
$envPath = "web/.env.local"
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
NEXT_PUBLIC_SBT_REGISTRY_ADDRESS=$SBTRegistry
NEXT_PUBLIC_TRUEKE_SBT_ADDRESS=$TruekeSBT
NEXT_PUBLIC_TRUEKE_RWA_ADDRESS=$TruekeRWA
NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS=$TruekeService
NEXT_PUBLIC_RPC_URL=$RpcUrl
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY=$OwnerKey
DATABASE_URL=postgresql://anlucorporations:KeLuDa.2324@127.0.0.1:5432/TrueKeate
KYC_SECRET=truekeate-local-dev-secret-0123456789abcdef0123456789abcdef
"@
[System.IO.File]::WriteAllText($envPath, $envContent, [System.Text.Encoding]::UTF8)
Write-Host "✓ web/.env.local actualizado con direcciones de contratos y PostgreSQL" -ForegroundColor Green

# 10. Actualizar deployment-info.txt
$infoPath = "deployment-info.txt"
$infoContent = @"
=================================================================
  DESPLIEGUE LOCAL ESCROW & TRUEKEATE — MATRIZ DE CUENTAS Y ROLES
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
  TruekeSBT:     $TruekeSBT (SBT ERC-5192)
  SBTRegistry:   $SBTRegistry
  TruekeRWA:     $TruekeRWA
  TruekeService: $TruekeService

MATRIZ DE CUENTAS PRECONFIGURADAS (ANVIL):
-----------------------------------------------------------------
[0] SUPERUSUARIO OWNER (Deployer, Árbitro, Socio Fundador, Certificado N3 SBT):
    Dirección: $OwnerAddr
    Username:  @superadmin
    Rol:       Usuario Socio (Fundador) + Admin Supremo + Árbitro
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   $OwnerKey

[1] USUARIO SOCIO CERTIFICADO 1:
    Dirección: $($Addrs[1])
    Username:  @socio_juez_alpha
    Rol:       Usuario Socio (Gobernanza / Mediador de Disputas)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   $($Keys[1])

[2] USUARIO SOCIO CERTIFICADO 2:
    Dirección: $($Addrs[2])
    Username:  @socio_juez_beta
    Rol:       Usuario Socio (Gobernanza / Mediador de Disputas)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   $($Keys[2])

[3] USUARIO EMPRESA CERTIFICADO 1:
    Dirección: $($Addrs[3])
    Username:  @empresa_tech
    Rol:       Usuario Empresa (Suscripción BRLT 12 Meses Activa)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   $($Keys[3])

[4] USUARIO EMPRESA CERTIFICADO 2:
    Dirección: $($Addrs[4])
    Username:  @empresa_agro
    Rol:       Usuario Empresa (Suscripción BRLT 12 Meses Activa)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   $($Keys[4])

[5] USUARIO PARTICULAR VERIFICADO 1:
    Dirección: $($Addrs[5])
    Username:  @particular_carlos
    Rol:       Usuario Particular
    Nivel:     Nivel 2 · Verificado (Cuota: 3 Truekes Simultáneos)
    PrivKey:   $($Keys[5])

[6] USUARIO PARTICULAR VERIFICADO 2:
    Dirección: $($Addrs[6])
    Username:  @particular_diana
    Rol:       Usuario Particular
    Nivel:     Nivel 2 · Verificado (Cuota: 3 Truekes Simultáneos)
    PrivKey:   $($Keys[6])

[7] CUENTA LIBRE 1 (Pruebas de Registro):
    Dirección: $($Addrs[7])
    Estado:    LIBRE / Sin Registrar en UserRegistry
    PrivKey:   $($Keys[7])

[8] CUENTA LIBRE 2 (Pruebas de Registro):
    Dirección: $($Addrs[8])
    Estado:    LIBRE / Sin Registrar en UserRegistry
    PrivKey:   $($Keys[8])

[9] CUENTA RESERVA (Libre):
    Dirección: $($Addrs[9])
    Estado:    LIBRE / Reserva
    PrivKey:   $($Keys[9])
=================================================================
"@
[System.IO.File]::WriteAllText($infoPath, $infoContent, [System.Text.Encoding]::UTF8)

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  ✓ DESPLIEGUE LOCAL Y ASIGNACIÓN DE ROLES COMPLETADA CON ÉXITO" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  - Cuenta 0: SuperUsuario Owner + Socio Certificado N3 (@superadmin)"
Write-Host "  - Cuentas 1, 2: Socios Certificados N3 (@socio_juez_alpha, @socio_juez_beta)"
Write-Host "  - Cuentas 3, 4: Empresas Certificadas N3 + BRLT (@empresa_tech, @empresa_agro)"
Write-Host "  - Cuentas 5, 6: Particulares Verificados N2 (@particular_carlos, @particular_diana)"
Write-Host "  - Cuentas 7, 8, 9: Cuentas LIBRES para pruebas de bienvenida (/register)"
Write-Host "`n  Configuración guardada en: web/.env.local y deployment-info.txt"
Write-Host "=================================================================" -ForegroundColor Cyan
