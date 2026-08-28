#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deploy-local.py — Script de despliegue local con matriz de pruebas de operación:
  - Cuenta 0: SuperUsuario Owner (Deployer, Árbitro, Socio Fundador, Certificado N3 SBT, @superadmin)
  - Cuentas 1, 2: Usuarios Socios Certificados (Gobernanza + Nivel 3 Certificado + TruekeSBT)
  - Cuentas 3, 4: Usuarios Empresa Certificados (Nivel 3 Certificado + TruekeSBT + Suscripción 12 meses BRLT)
  - Cuentas 5, 6: Usuarios Particulares Verificados (Nivel 2 Verificado, cuota 3 truekes simultáneos)
  - Cuentas 7, 8: Cuentas Libres / No registradas (para pruebas de bienvenida e inscripción en /register)
  - Cuenta 9: Cuenta Reserva Libre
"""

import subprocess
import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

RPC_URL = os.environ.get("RPC_URL", "http://127.0.0.1:8545")
ROOT = os.path.dirname(os.path.abspath(__file__))

ADDRS = [
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
]

KEYS = [
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
]

OWNER_ADDR = ADDRS[0]
OWNER_KEY = KEYS[0]

def run_cmd(args, cwd=ROOT, check=True):
    res = subprocess.run(args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
    if check and res.returncode != 0:
        print(f"Error executing {' '.join(args)}:\n{res.stderr}")
    return res.stdout.strip()

def send_tx(from_key, to_addr, sig, *params):
    args = ["cast", "send", "--rpc-url", RPC_URL, "--private-key", from_key, to_addr, sig] + [str(p) for p in params]
    return run_cmd(args, check=False)

def deploy_contract(name, *args):
    cmd = ["forge", "create", "--rpc-url", RPC_URL, "--private-key", OWNER_KEY, "--broadcast", f"src/{name}.sol:{name}"]
    if args:
        cmd.append("--constructor-args")
        cmd.extend(args)
    out = run_cmd(cmd, cwd=os.path.join(ROOT, "sc"))
    for line in out.splitlines():
        if "Deployed to:" in line:
            return line.split()[-1]
    raise RuntimeError(f"Deployment of {name} failed: {out}")

print("=================================================================")
print("  🚀 DESPLIEGUE LOCAL ESCROW / TRUEKEATE - MATRIZ DE ROLES")
print("=================================================================")

# 1. Verificar Anvil
try:
    block = run_cmd(["cast", "block-number", "--rpc-url", RPC_URL])
    print(f"[+] Conectado a Anvil en {RPC_URL} (Bloque actual: {block})")
except Exception as e:
    print(f"[!] Error al conectar con Anvil en {RPC_URL}. Inicia Anvil primero.")
    sys.exit(1)

# 2. Compilar contratos
print("\n[Paso 1/7] Compilando contratos inteligentes con Foundry...")
run_cmd(["forge", "build"], cwd=os.path.join(ROOT, "sc"))
print("[+] Contratos compilados correctamente")

# 3. Desplegar contratos
print(f"\n[Paso 2/7] Desplegando contratos (Owner = Cuenta 0: {OWNER_ADDR})...")
escrow = deploy_contract("Escrow")
registry = deploy_contract("UserRegistry")
tka = deploy_contract("MockERC20", "TokenA", "TKA", "18")
tkb = deploy_contract("MockERC20", "TokenB", "TKB", "18")
usdt = deploy_contract("MockERC20", "USDT", "USDT", "6")
delivery = deploy_contract("MockERC20", "DELIVERY", "DELIVERY", "18")
brlt = deploy_contract("BRLT")
subscription = deploy_contract("Subscription", brlt, "100000000000000000000") # 100 BRLT/mes
governance = deploy_contract("Governance")
trueke_sbt = deploy_contract("TruekeSBT")
sbt_registry = deploy_contract("SBTRegistry")
trueke_rwa = deploy_contract("TruekeRWA", sbt_registry)
trueke_service = deploy_contract("TruekeService", sbt_registry)

# Vincular minter de SBT nativo
send_tx(OWNER_KEY, trueke_sbt, "setMinter(address)", sbt_registry)
send_tx(OWNER_KEY, sbt_registry, "setNativeSBT(address)", trueke_sbt)

print(f"  [+] Escrow:        {escrow}")
print(f"  [+] UserRegistry:  {registry}")
print(f"  [+] Governance:    {governance}")
print(f"  [+] Subscription:  {subscription}")
print(f"  [+] Token A:       {tka}")
print(f"  [+] Token B:       {tkb}")
print(f"  [+] USDT Mock:     {usdt}")
print(f"  [+] DELIVERY:      {delivery}")
print(f"  [+] BRLT Token:    {brlt}")
print(f"  [+] TruekeSBT:     {trueke_sbt}")
print(f"  [+] SBTRegistry:   {sbt_registry}")
print(f"  [+] TruekeRWA:     {trueke_rwa}")
print(f"  [+] TruekeService: {trueke_service}")

# 4. Configurar Cuenta 0 (SuperUsuario Owner + Socio Certificado)
print("\n[Paso 3/7] Configurando SuperUsuario (Cuenta 0: Owner + Socio Certificado + SBT)...")
for t in [tka, tkb, usdt, delivery]:
    send_tx(OWNER_KEY, escrow, "addToken(address)", t)
send_tx(OWNER_KEY, escrow, "setArbiter(address)", OWNER_ADDR)
send_tx(OWNER_KEY, escrow, "setUserRegistry(address)", registry)
send_tx(OWNER_KEY, governance, "setTreasury(address)", OWNER_ADDR)
send_tx(OWNER_KEY, governance, "setSocio(address,bool)", OWNER_ADDR, "true")
send_tx(
    OWNER_KEY,
    registry,
    "register(string,string,string,string,int32,int32,uint8,bool)",
    "superadmin",
    "superadmin@truekeate.com",
    "+584120000000",
    "Sede Central TrueKeate, Barlovento, Miranda",
    "729000",
    "1159000",
    "19",
    "true",
)
send_tx(OWNER_KEY, registry, "setUserIdentificationLevel(address,uint8)", OWNER_ADDR, "2")
send_tx(OWNER_KEY, trueke_sbt, "mint(address,string)", OWNER_ADDR, "Certificacion Fundador & Socio TrueKeate")
print(f"  [+] Cuenta 0 ({OWNER_ADDR}) -> @superadmin (Owner + Socio Certificado N3 SBT)")

# 5. Minteo de tokens para todas las cuentas
print("\n[Paso 4/7] Minteando tokens de prueba para las 10 cuentas de Anvil...")
for addr in ADDRS:
    send_tx(OWNER_KEY, tka, "mint(address,uint256)", addr, "1000000000000000000000")
    send_tx(OWNER_KEY, tkb, "mint(address,uint256)", addr, "1000000000000000000000")
    send_tx(OWNER_KEY, usdt, "mint(address,uint256)", addr, "5000000000")
    send_tx(OWNER_KEY, delivery, "mint(address,uint256)", addr, "5")
    send_tx(OWNER_KEY, brlt, "mint(address,uint256)", addr, "10000000000000000000000")
print("  [+] 1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY + 10000 BRLT asignados por cuenta")

# 6. Configurar Cuentas 1 y 2: Usuarios Socios Certificados
print("\n[Paso 5/7] Configurando 2 Usuarios Socios Certificados (Cuentas 1 y 2)...")
soc_data = [
    ("socio_juez_alpha", "juez.alpha@truekeate.com", "+584126667788", "Tribunal Comunitario Alpha, Barlovento", "729800", "1160100", "19", "true"),
    ("socio_juez_beta", "juez.beta@truekeate.com", "+584127778899", "Tribunal Comunitario Beta, Caucagua", "725100", "1152000", "19", "true"),
]
for i in [1, 2]:
    addr = ADDRS[i]
    key = KEYS[i]
    u, em, ph, loc, east, north, z, nhem = soc_data[i - 1]
    send_tx(key, registry, "register(string,string,string,string,int32,int32,uint8,bool)", u, em, ph, loc, east, north, z, nhem)
    send_tx(OWNER_KEY, governance, "setSocio(address,bool)", addr, "true")
    send_tx(OWNER_KEY, registry, "setUserIdentificationLevel(address,uint8)", addr, "2")
    send_tx(OWNER_KEY, trueke_sbt, "mint(address,string)", addr, "Certificacion Socio Comunitario")
    print(f"  [+] Cuenta {i} ({addr}) -> @{u} (Socio: TRUE, Certificado N3 SBT: TRUE)")

# 7. Configurar Cuentas 3 y 4: Usuarios Empresa Certificados
print("\n[Paso 6/7] Configurando 2 Usuarios Empresa Certificados (Cuentas 3 y 4)...")
emp_data = [
    ("empresa_tech", "tech@barloventas.com", "+584124445566", "Centro Comercial Barlovento Local 14", "728900", "1158500", "19", "true"),
    ("empresa_agro", "agro@barloventas.com", "+584125556677", "Av. Comercio Local 3, Tacarigua", "727500", "1156200", "19", "true"),
]
for i in [3, 4]:
    addr = ADDRS[i]
    key = KEYS[i]
    u, em, ph, loc, east, north, z, nhem = emp_data[i - 3]
    send_tx(key, registry, "register(string,string,string,string,int32,int32,uint8,bool)", u, em, ph, loc, east, north, z, nhem)
    send_tx(OWNER_KEY, subscription, "setBusiness(address,bool)", addr, "true")
    send_tx(key, brlt, "approve(address,uint256)", subscription, "1200000000000000000000")
    send_tx(key, subscription, "subscribe(uint256)", "12")
    send_tx(OWNER_KEY, registry, "setUserIdentificationLevel(address,uint8)", addr, "2")
    send_tx(OWNER_KEY, trueke_sbt, "mint(address,string)", addr, "Certificacion Empresa Verificada")
    print(f"  [+] Cuenta {i} ({addr}) -> @{u} (Empresa: TRUE, Suscripción: 12 meses, Certificado N3 SBT: TRUE)")

# 8. Configurar Cuentas 5 y 6: Usuarios Particulares Verificados
print("\n[Paso 7/7] Configurando 2 Usuarios Particulares Verificados (Cuentas 5 y 6)...")
part_data = [
    ("particular_carlos", "carlos@truekeate.com", "+584121112233", "Av. Principal 1, Higuerote", "729450", "1159800", "19", "true"),
    ("particular_diana", "diana@truekeate.com", "+584122223344", "Calle Marina 12, Carenero", "731200", "1162400", "19", "true"),
]
for i in [5, 6]:
    addr = ADDRS[i]
    key = KEYS[i]
    u, em, ph, loc, east, north, z, nhem = part_data[i - 5]
    send_tx(key, registry, "register(string,string,string,string,int32,int32,uint8,bool)", u, em, ph, loc, east, north, z, nhem)
    send_tx(OWNER_KEY, registry, "setUserIdentificationLevel(address,uint8)", addr, "1")
    print(f"  [+] Cuenta {i} ({addr}) -> @{u} (Particular Verificado N2 - Cuota: 3 truekes)")

print("\n  [+] Cuentas 7, 8 y 9 permanecen LIBRES (Sin registrar en UserRegistry) para pruebas de registro y acceso.")

# 9. Actualizar web/.env.local
env_path = os.path.join(ROOT, "web", ".env.local")
env_content = f"""NEXT_PUBLIC_ESCROW_ADDRESS={escrow}
NEXT_PUBLIC_USER_REGISTRY_ADDRESS={registry}
NEXT_PUBLIC_GOVERNANCE_ADDRESS={governance}
NEXT_PUBLIC_SUBSCRIPTION_ADDRESS={subscription}
NEXT_PUBLIC_TOKEN_A_ADDRESS={tka}
NEXT_PUBLIC_TOKEN_B_ADDRESS={tkb}
NEXT_PUBLIC_USDT_ADDRESS={usdt}
NEXT_PUBLIC_DELIVERY_ADDRESS={delivery}
NEXT_PUBLIC_BRLT_ADDRESS={brlt}
NEXT_PUBLIC_SBT_REGISTRY_ADDRESS={sbt_registry}
NEXT_PUBLIC_TRUEKE_SBT_ADDRESS={trueke_sbt}
NEXT_PUBLIC_TRUEKE_RWA_ADDRESS={trueke_rwa}
NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS={trueke_service}
NEXT_PUBLIC_RPC_URL={RPC_URL}
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY={OWNER_KEY}
DATABASE_URL=postgresql://anlucorporations:KeLuDa.2324@127.0.0.1:5432/TrueKeate
KYC_SECRET=truekeate-local-dev-secret-0123456789abcdef0123456789abcdef
"""
with open(env_path, "w", encoding="utf-8") as f:
    f.write(env_content)
print("\n[+] web/.env.local actualizado con direcciones de contratos y PostgreSQL")

# 10. Actualizar deployment-info.txt
info_path = os.path.join(ROOT, "deployment-info.txt")
info_content = f"""=================================================================
  DESPLIEGUE LOCAL ESCROW & TRUEKEATE — MATRIZ DE CUENTAS Y ROLES
=================================================================

CONTRATOS DESPLEGADOS:
  Escrow:        {escrow}
  UserRegistry:  {registry}
  Governance:    {governance}
  Subscription:  {subscription}
  Token A:       {tka} (TKA, 18 dec)
  Token B:       {tkb} (TKB, 18 dec)
  USDT Mock:     {usdt} (USDT, 6 dec)
  DELIVERY:      {delivery} (DELIVERY, 18 dec)
  BRLT:          {brlt} (BRLT Stablecoin, 18 dec)
  TruekeSBT:     {trueke_sbt} (SBT ERC-5192)
  SBTRegistry:   {sbt_registry}
  TruekeRWA:     {trueke_rwa}
  TruekeService: {trueke_service}

MATRIZ DE CUENTAS PRECONFIGURADAS (ANVIL):
-----------------------------------------------------------------
[0] SUPERUSUARIO OWNER (Deployer, Árbitro, Socio Fundador, Certificado N3 SBT):
    Dirección: {OWNER_ADDR}
    Username:  @superadmin
    Rol:       Usuario Socio (Fundador) + Admin Supremo + Árbitro
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   {OWNER_KEY}

[1] USUARIO SOCIO CERTIFICADO 1:
    Dirección: {ADDRS[1]}
    Username:  @socio_juez_alpha
    Rol:       Usuario Socio (Gobernanza / Mediador de Disputas)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   {KEYS[1]}

[2] USUARIO SOCIO CERTIFICADO 2:
    Dirección: {ADDRS[2]}
    Username:  @socio_juez_beta
    Rol:       Usuario Socio (Gobernanza / Mediador de Disputas)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   {KEYS[2]}

[3] USUARIO EMPRESA CERTIFICADO 1:
    Dirección: {ADDRS[3]}
    Username:  @empresa_tech
    Rol:       Usuario Empresa (Suscripción BRLT 12 Meses Activa)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   {KEYS[3]}

[4] USUARIO EMPRESA CERTIFICADO 2:
    Dirección: {ADDRS[4]}
    Username:  @empresa_agro
    Rol:       Usuario Empresa (Suscripción BRLT 12 Meses Activa)
    Nivel:     Nivel 3 · Certificado (TruekeSBT on-chain)
    PrivKey:   {KEYS[4]}

[5] USUARIO PARTICULAR VERIFICADO 1:
    Dirección: {ADDRS[5]}
    Username:  @particular_carlos
    Rol:       Usuario Particular
    Nivel:     Nivel 2 · Verificado (Cuota: 3 Truekes Simultáneos)
    PrivKey:   {KEYS[5]}

[6] USUARIO PARTICULAR VERIFICADO 2:
    Dirección: {ADDRS[6]}
    Username:  @particular_diana
    Rol:       Usuario Particular
    Nivel:     Nivel 2 · Verificado (Cuota: 3 Truekes Simultáneos)
    PrivKey:   {KEYS[6]}

[7] CUENTA LIBRE 1 (Pruebas de Registro):
    Dirección: {ADDRS[7]}
    Estado:    LIBRE / Sin Registrar en UserRegistry
    PrivKey:   {KEYS[7]}

[8] CUENTA LIBRE 2 (Pruebas de Registro):
    Dirección: {ADDRS[8]}
    Estado:    LIBRE / Sin Registrar en UserRegistry
    PrivKey:   {KEYS[8]}

[9] CUENTA RESERVA (Libre):
    Dirección: {ADDRS[9]}
    Estado:    LIBRE / Reserva
    PrivKey:   {KEYS[9]}
=================================================================
"""
with open(info_path, "w", encoding="utf-8") as f:
    f.write(info_content)

print("\n=================================================================")
print("  [SUCCESS] DESPLIEGUE LOCAL Y ASIGNACION DE ROLES COMPLETADA")
print("=================================================================")
print("  - Cuenta 0: SuperUsuario Owner + Socio Certificado N3 (@superadmin)")
print("  - Cuentas 1, 2: Socios Certificados N3 (@socio_juez_alpha, @socio_juez_beta)")
print("  - Cuentas 3, 4: Empresas Certificadas N3 + BRLT (@empresa_tech, @empresa_agro)")
print("  - Cuentas 5, 6: Particulares Verificados N2 (@particular_carlos, @particular_diana)")
print("  - Cuentas 7, 8, 9: Cuentas LIBRES para pruebas de inscripción (/register)")
print("\n  Configuracion guardada en: web/.env.local y deployment-info.txt")
print("=================================================================")
