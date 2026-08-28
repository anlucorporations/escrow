#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deploy-local.py — Script de despliegue local con asignación de roles completos:
  1. Cuenta 0: SuperUsuario (Owner, Deployer, Relayer, Árbitro, Socio, Admin)
  2. Cuentas 1, 2, 3: Usuarios Particulares (inscritos en UserRegistry)
  3. Cuentas 4, 5: Usuarios Comerciantes (inscritos, flag business + suscripción 12 meses BRLT)
  4. Cuentas 6, 7, 8: Usuarios Socios (inscritos en UserRegistry + rol Socio en Governance)
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
print("  DESPLIEGUE LOCAL ESCROW / TRUEKEATE - ROLES PRECONFIGURADOS")
print("=================================================================")

# 1. Verificar Anvil
try:
    block = run_cmd(["cast", "block-number", "--rpc-url", RPC_URL])
    print(f"[+] Conectado a Anvil en {RPC_URL} (Bloque actual: {block})")
except Exception as e:
    print(f"[!] Error al conectar con Anvil en {RPC_URL}. Inicia Anvil primero.")
    sys.exit(1)

# 2. Compilar
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
# Asignar nivel 3 (Certificado on-chain) y emitir Soulbound Token
send_tx(OWNER_KEY, registry, "setUserIdentificationLevel(address,uint8)", OWNER_ADDR, "2")
send_tx(OWNER_KEY, trueke_sbt, "mint(address,string)", OWNER_ADDR, "Certificacion Fundador & Socio TrueKeate")
print(f"  [+] Cuenta 0 ({OWNER_ADDR}) configurada como: Owner + Arbiter + Socio Certificado (Nivel 3 SBT) + @superadmin")

# 5. Minteo de tokens para todas las 10 cuentas
print("\n[Paso 4/7] Minteando tokens de prueba para las 10 cuentas...")
for addr in ADDRS:
    send_tx(OWNER_KEY, tka, "mint(address,uint256)", addr, "1000000000000000000000")
    send_tx(OWNER_KEY, tkb, "mint(address,uint256)", addr, "1000000000000000000000")
    send_tx(OWNER_KEY, usdt, "mint(address,uint256)", addr, "5000000000")
    send_tx(OWNER_KEY, delivery, "mint(address,uint256)", addr, "5")
    send_tx(OWNER_KEY, brlt, "mint(address,uint256)", addr, "10000000000000000000000")
print("  [+] 1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY + 10000 BRLT asignados por cuenta")

# 6. Inscribir Usuarios Particulares (Cuentas 1, 2, 3)
print("\n[Paso 5/7] Inscribiendo 3 Usuarios Particulares en UserRegistry...")
part_data = [
    ("particular_alice", "alice@truekeate.com", "+584121112233", "Av. Principal 1, Higuerote", "729450", "1159800", "19", "true"),
    ("particular_bob", "bob@truekeate.com", "+584122223344", "Calle Marina 12, Carenero", "731200", "1162400", "19", "true"),
    ("particular_carol", "carol@truekeate.com", "+584123334455", "Sector Playa 4, Rio Chico", "735800", "1148900", "19", "true"),
]
for i in [1, 2, 3]:
    addr = ADDRS[i]
    key = KEYS[i]
    u, em, ph, loc, east, north, z, nhem = part_data[i - 1]
    send_tx(key, registry, "register(string,string,string,string,int32,int32,uint8,bool)", u, em, ph, loc, east, north, z, nhem)
    print(f"  [+] Cuenta {i} ({addr}) -> @{u} ({em}, {ph}, UTM Zone {z}N)")

# 7. Inscribir y Configurar Comerciantes (Cuentas 4, 5)
print("\n[Paso 6/7] Inscribiendo 2 Comerciantes y activando membresia BRLT...")
com_data = [
    ("tienda_tech", "tech@barloventas.com", "+584124445566", "Centro Comercial Barlovento Local 14", "728900", "1158500", "19", "true"),
    ("mercado_central", "mercado@barloventas.com", "+584125556677", "Av. Comercio Local 3, Tacarigua", "727500", "1156200", "19", "true"),
]
for i in [4, 5]:
    addr = ADDRS[i]
    key = KEYS[i]
    u, em, ph, loc, east, north, z, nhem = com_data[i - 4]
    send_tx(key, registry, "register(string,string,string,string,int32,int32,uint8,bool)", u, em, ph, loc, east, north, z, nhem)
    send_tx(OWNER_KEY, subscription, "setBusiness(address,bool)", addr, "true")
    send_tx(key, brlt, "approve(address,uint256)", subscription, "1200000000000000000000")
    send_tx(key, subscription, "subscribe(uint256)", "12")
    print(f"  [+] Cuenta {i} ({addr}) -> @{u} (Business: TRUE, Suscripcion: 12 meses activa)")

# 8. Inscribir y Configurar Socios (Cuentas 6, 7, 8)
print("\n[Paso 7/7] Inscribiendo 3 Socios y asignando rol en Governance...")
soc_data = [
    ("socio_juez_alpha", "juez.alpha@truekeate.com", "+584126667788", "Tribunal Comunitario Alpha, Barlovento", "729800", "1160100", "19", "true"),
    ("socio_juez_beta", "juez.beta@truekeate.com", "+584127778899", "Tribunal Comunitario Beta, Caucagua", "725100", "1152000", "19", "true"),
    ("socio_juez_gamma", "juez.gamma@truekeate.com", "+584128889900", "Tribunal Comunitario Gamma, San Jose", "733000", "1157400", "19", "true"),
]
for i in [6, 7, 8]:
    addr = ADDRS[i]
    key = KEYS[i]
    u, em, ph, loc, east, north, z, nhem = soc_data[i - 6]
    send_tx(key, registry, "register(string,string,string,string,int32,int32,uint8,bool)", u, em, ph, loc, east, north, z, nhem)
    send_tx(OWNER_KEY, governance, "setSocio(address,bool)", addr, "true")
    print(f"  [+] Cuenta {i} ({addr}) -> @{u} (Socio en Governance: TRUE)")

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
print("\n[+] web/.env.local actualizado con nuevas direcciones y conexion PostgreSQL")

# 10. Actualizar deployment-info.txt
info_path = os.path.join(ROOT, "deployment-info.txt")
info_content = f"""=================================================================
  DESPLIEGUE LOCAL ESCROW & TRUEKEATE — INFORME DE ROLES
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

CUENTAS Y ASIGNACIÓN DE ROLES:
-----------------------------------------------------------------
[0] SUPERUSUARIO (Owner, Árbitro, Socio, Relayer Gas, Admin):
    Dirección: {OWNER_ADDR}
    Username:  @superadmin
    PrivKey:   {OWNER_KEY}

[1] USUARIO PARTICULAR 1:
    Dirección: {ADDRS[1]}
    Username:  @particular_alice
    PrivKey:   {KEYS[1]}

[2] USUARIO PARTICULAR 2:
    Dirección: {ADDRS[2]}
    Username:  @particular_bob
    PrivKey:   {KEYS[2]}

[3] USUARIO PARTICULAR 3:
    Dirección: {ADDRS[3]}
    Username:  @particular_carol
    PrivKey:   {KEYS[3]}

[4] USUARIO COMERCIANTE 1 (Suscripción BRLT 12 Meses):
    Dirección: {ADDRS[4]}
    Username:  @tienda_tech
    PrivKey:   {KEYS[4]}

[5] USUARIO COMERCIANTE 2 (Suscripción BRLT 12 Meses):
    Dirección: {ADDRS[5]}
    Username:  @mercado_central
    PrivKey:   {KEYS[5]}

[6] USUARIO SOCIO 1 (Gobernanza / Mediador):
    Dirección: {ADDRS[6]}
    Username:  @socio_juez_alpha
    PrivKey:   {KEYS[6]}

[7] USUARIO SOCIO 2 (Gobernanza / Mediador):
    Dirección: {ADDRS[7]}
    Username:  @socio_juez_beta
    PrivKey:   {KEYS[7]}

[8] USUARIO SOCIO 3 (Gobernanza / Mediador):
    Dirección: {ADDRS[8]}
    Username:  @socio_juez_gamma
    PrivKey:   {KEYS[8]}

[9] CUENTA RESERVA:
    Dirección: {ADDRS[9]}
    PrivKey:   {KEYS[9]}
=================================================================
"""
with open(info_path, "w", encoding="utf-8") as f:
    f.write(info_content)

print("\n=================================================================")
print("  [SUCCESS] DESPLIEGUE LOCAL Y ASIGNACION DE ROLES COMPLETADA")
print("=================================================================")
print("  - SuperUsuario: Cuenta 0 (@superadmin)")
print("  - Particulares: Cuentas 1, 2, 3 (@particular_alice, @particular_bob, @particular_carol)")
print("  - Comerciantes: Cuentas 4, 5 (@tienda_tech, @mercado_central con 12 meses activos)")
print("  - Socios:       Cuentas 6, 7, 8 (@socio_juez_alpha, @socio_juez_beta, @socio_juez_gamma)")
print("\n  Configuracion guardada en: web/.env.local y deployment-info.txt")
print("=================================================================")
