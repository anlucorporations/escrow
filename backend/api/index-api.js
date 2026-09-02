// =============================================================================
// TrueKeate — API: punto de entrada del servidor
// Uso: node api/index-api.js
// Config: PORT (4000), RPC_URL, DATABASE_URL, CONTRATOS_FILE
// =============================================================================
import { crearAlmacen } from './lib/almacen.js';
import { iniciarServidor } from './app.js';

const almacen = crearAlmacen();
iniciarServidor({ almacen });
