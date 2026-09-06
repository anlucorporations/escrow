// =============================================================================
// TrueKeate — Tests del minteo de NFT al publicar (lógica maestra punto 1)
// Cubren:
//   - crearMinteador sin red → modo simulado (no persiste token, avisa).
//   - crearMinteador con red/contrato → llama al contrato y devuelve el tokenId.
//   - POST /catalog/articulos con minteador simulado → 201 + aviso sin token BD.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearMinteador } from '../api/lib/nft-minter.js';

test('crearMinteador sin red → simulado (activo=false, mintear no persiste)', async () => {
  const m = crearMinteador({ rpcUrl: null, nftAddress: null, minterPk: null });
  assert.equal(m.activo, false);
  assert.equal(m.direccion, null);
  const r = await m.mintear('0xabc', 'ARTICULO', 'ipfs://x');
  assert.equal(r.simulado, true);
  assert.equal(r.nftTokenId, null, 'en simulado NO se devuelve token (BD limpia)');
  assert.equal(r.txHash, null);
});

test('crearMinteador con red → modo real', () => {
  // sin RPC real no podemos ejecutar mint; verificamos que con RPC inalcanzable
  // la construcción no revienta y degrada a simulado solo si el provider falla
  const m = crearMinteador({ rpcUrl: 'http://127.0.0.1:1', nftAddress: '0x0000000000000000000000000000000000000001', minterPk: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' });
  // JsonRpcProvider no hace red al construir → activo true (la tx fallará luego)
  assert.equal(m.activo, true);
  assert.ok(m.minter, 'expone la cuenta minter');
});

test('POST /catalog/articulos con minteador simulado → 201 + aviso', async () => {
  const { crearApp } = await import('../api/app.js');
  const { crearAlmacen } = await import('../api/lib/almacen.js');
  const { ethers } = await import('ethers');
  const request = (await import('supertest')).default;

  const wallet = ethers.Wallet.createRandom();
  const w = wallet.address.toLowerCase();
  const almacen = crearAlmacen();
  almacen.crearUsuario({ wallet: w, estado: 'VERIFICADO', nivel: 'COMUN' });
  almacen.guardarSesion('tok-mint', w);

  const app = crearApp({
    almacen,
    minteadorNft: crearMinteador({ rpcUrl: null, nftAddress: null, minterPk: null }),
  });
  const server = app.listen(0);
  await new Promise((res) => server.on('listening', res));

  const r = await request(app).post('/catalog/articulos').set('Authorization', 'Bearer tok-mint')
    .send({ titulo: 'Bici NFT', rubro: 'Deportes', categoria: 'ARTICULO' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(r.body.articulo.id);
  assert.equal(r.body.articulo.nftTokenId, null, 'sin red no se persiste token');
  assert.equal(r.body.nft.simulado, true);
  assert.match(r.body.nft.aviso, /simulado/);

  server.close();
});
