// =============================================================================
// TrueKeate — Integración E2E del Relayer (Ciclo 5)
// Levanta el flujo completo contra anvil:
//   1. Se asume SmartAccountFactory desplegada (deploy previo del Ciclo 2).
//   2. Un usuario (owner EOA) firma un intent EIP-712 hacia su Smart Account.
//   3. El Relayer (cuenta 1 del anvil — RF-15.2) envía la tx asumiendo el gas.
//   4. Se verifica que la Smart Account ejecutó y el nonce subió.
//
// Uso: node test/integracion-relayer.js <factoryAddr> [rpcUrl]
// =============================================================================
import { ethers } from 'ethers';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scRoot = join(__dirname, '../../sc');
const FACTORY = process.argv[2];
const RPC = process.argv[3] || 'http://127.0.0.1:8545';

// cuentas de anvil: (0)=owner/deployer, (1)=relayer (RF-15.2)
const PK0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const PK1 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const abiSmartAccount = JSON.parse(
  readFileSync(join(scRoot, 'out/SmartAccount.sol/SmartAccount.json'), 'utf-8')
).abi;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const relayerWallet = new ethers.Wallet(PK1, provider); // cuenta 1 = relayer
  const ownerWallet = new ethers.Wallet(PK0, provider);   // cuenta 0 = owner del usuario

  const factory = new ethers.Contract(FACTORY, ['function cuentas(address) view returns (address)'], provider);
  let sa = await factory.cuentas(ownerWallet.address);
  if (sa === ethers.ZeroAddress) {
    console.log('No hay Smart Account para el owner; desplegando...');
    const fac = new ethers.Contract(FACTORY, ['function desplegarCuenta(address,bytes32)'], ownerWallet);
    const tx = await fac.desplegarCuenta(ownerWallet.address, ethers.keccak256(ethers.toUtf8Bytes('INSCRITO')));
    await tx.wait();
    sa = await factory.cuentas(ownerWallet.address);
  }
  console.log('Smart Account:', sa);

  const saContract = new ethers.Contract(sa, abiSmartAccount, ownerWallet); // owner firma
  console.log('estadoVerificacion:', await saContract.estadoVerificacion());

  // marcar VERIFICADO (etapa correo+teléfono — D28) para que el relayer acepte (D16/D28)
  const estadoActual = Number(await saContract.estadoVerificacion());
  if (estadoActual < 1) {
    console.log('Marcando estado VERIFICADO (D28)...');
    const iface = new ethers.Interface(abiSmartAccount);
    const typehash = ethers.id('CambiarEstadoVerificacion(uint8 estado,uint256 nonce)');
    const nonce = await saContract.nonce();
    const dom = await saContract.domainSeparator();
    const structHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint8', 'uint256'], [typehash, 1, nonce]
    ));
    const digest = ethers.keccak256(ethers.concat(['0x1901', dom, structHash]));
    const firma = ownerWallet.signingKey.sign(digest).serialized;
    const root = ethers.keccak256(ethers.toUtf8Bytes('VERIFICADO'));
    const tx = await saContract.cambiarEstadoVerificacion(1, root, nonce, firma);
    await tx.wait();
    console.log('Estado ahora:', await saContract.estadoVerificacion());
  }

  console.log('== Relayer envía meta-tx (cuenta 1 paga gas) ==');
  const { RelayerEIP712 } = await import('../relayer.js');
  const relayer = new RelayerEIP712({
    provider,
    wallet: relayerWallet,
    smartAccountFactory: FACTORY,
    abiSmartAccount,
  });

  const destino = ownerWallet.address; // destino: el propio owner (autollamada simple)
  const valor = 0n;
  const data = '0x'; // sin payload: solo comprobar ejecución
  const nonceTx = await saContract.nonce();
  const iface = new ethers.Interface(abiSmartAccount);
  const typehash = ethers.id('Execute(address to,uint256 value,bytes data,uint256 nonce)');
  const dom = await saContract.domainSeparator();
  const structHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'address', 'uint256', 'bytes32', 'uint256'],
    [typehash, destino, valor, ethers.keccak256(data), nonceTx]
  ));
  const digest = ethers.keccak256(ethers.concat(['0x1901', dom, structHash]));
  const firmaTx = ownerWallet.signingKey.sign(digest).serialized;

  const res = await relayer.procesarIntent({
    signer: ownerWallet.address,
    destino, valor, data,
    nonce: nonceTx,
    firma: firmaTx,
    chainId: 31337,
  });
  console.log('Resultado relayer:', res);
  if (!res.ok) throw new Error('meta-tx falló: ' + res.motivo);

  const nonceFinal = await saContract.nonce();
  console.log('Nonce final:', nonceFinal.toString(), '(esperado', (nonceTx + 1n).toString() + ')');
  if (nonceFinal !== nonceTx + 1n) throw new Error('el nonce no se incrementó');
  console.log('INTEGRACIÓN E2E RELAYER: OK ✅');
}

main().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
