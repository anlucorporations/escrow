import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // El adaptador PostgreSQL (server/db.js) importa `pg` con webpackIgnore:true,
  // por lo que el tracing automático del build standalone no lo detecta.
  // Se fuerza la inclusión de todo el árbol de pg en el artefacto de Cloud Run.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pg/**/*",
      "./node_modules/pg-connection-string/**/*",
      "./node_modules/pg-pool/**/*",
      "./node_modules/pg-protocol/**/*",
      "./node_modules/pg-types/**/*",
      "./node_modules/pg-int8/**/*",
      "./node_modules/pgpass/**/*",
      "./node_modules/postgres-array/**/*",
      "./node_modules/postgres-bytea/**/*",
      "./node_modules/postgres-date/**/*",
      "./node_modules/postgres-interval/**/*",
      "./node_modules/split2/**/*",
    ],
  },
  /* config options here */
};

export default nextConfig;
