import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autónomo (standalone) para Cloud Run / contenedores — despliegue GCP
  output: "standalone",
};

export default nextConfig;
