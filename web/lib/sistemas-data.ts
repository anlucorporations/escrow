// =============================================================================
// TrueKeate — Biblioteca de Sistemas (SUITE 'Sistemas' del Owner, /suite/admin)
// Datos del agente INTEGRADOR: manuales técnicos de operación, agrupados por
// tópicos técnicos (carpetas de docs/Manuales/**, grupos 03-Implementacion,
// 04-Despliegue, 07-Wallets-y-Cuentas y 08-Suite-Sistemas). Cada ficha apunta
// al PDF ya copiado en /manual/pdf/<carpeta>-<id>.pdf y a su imagen, si existe,
// en /manual/imagenes/<imagen>.
// =============================================================================

export interface ManualTecnico {
  /** Identificador del manual (sin carpeta): forma el nombre del PDF. */
  id: string;
  /** Carpeta/tópico técnico al que pertenece (docs/Manuales/**). */
  carpeta: string;
  /** Título corto técnico de la tarjeta. */
  titulo: string;
  /** Descripción de una línea. */
  descripcion: string;
  /** Imagen/infografía opcional (nombre de archivo en /manual/imagenes/). */
  imagen?: string;
}

export interface TopicoSistemas {
  carpeta: string;
  etiqueta: string;
  descripcion: string;
  /** Manuales del tópico en orden. */
  manuales: ManualTecnico[];
}

/** URL pública del PDF técnico de un manual. */
export const pdfTecnico = (m: ManualTecnico) => `/manual/pdf/${m.carpeta}-${m.id}.pdf`;
/** URL pública de la imagen de un manual técnico. */
export const imagenTecnica = (m: ManualTecnico) => `/manual/imagenes/${m.imagen}`;

/** Tópicos técnicos de la Biblioteca de Sistemas (solo Owner), en orden. */
export const topicosSistemas: TopicoSistemas[] = [
  {
    carpeta: "03-Implementacion",
    etiqueta: "Implementación (operación técnica)",
    descripcion:
      "Cómo funciona la plataforma por dentro: contratos inteligentes, backend (indexador, relayer, API), frontend, pruebas y la certificación con SBT.",
    manuales: [
      {
        id: "01-contratos-escrow",
        carpeta: "03-Implementacion",
        titulo: "Contratos del escrow",
        descripcion: "Los 9 estados de custodia, las dos firmas y las disputas del contrato Escrow.",
        imagen: "estados-escrow.svg",
      },
      {
        id: "02-contratos-identidad",
        carpeta: "03-Implementacion",
        titulo: "Contratos de identidad",
        descripcion: "SmartAccount, escalera de verificación, recuperación social y firma digital.",
        imagen: "escalera-verificacion.svg",
      },
      {
        id: "03-contratos-finanzas",
        carpeta: "03-Implementacion",
        titulo: "Contratos de finanzas",
        descripcion: "BRLT, Fondo de Valor, emisión de moneda y suscripciones de empresas.",
        imagen: "arquitectura-financiera.svg",
      },
      {
        id: "04-backend-indexador",
        carpeta: "03-Implementacion",
        titulo: "Backend · indexador",
        descripcion: "El vigilante de eventos que copia la cadena a la base de datos (espejo).",
        imagen: "indexador-flujo.svg",
      },
      {
        id: "05-backend-relayer",
        carpeta: "03-Implementacion",
        titulo: "Backend · relayer",
        descripcion: "Meta-transacciones sin gas, protecciones anti-abuso y salud del relayer.",
        imagen: "relayer-meta-tx.svg",
      },
      {
        id: "06-backend-api",
        carpeta: "03-Implementacion",
        titulo: "Backend · API REST",
        descripcion: "Endpoints por área (auth, kyc, catálogo, truekes, admin, reputación, subastas).",
        imagen: "api-servicios.svg",
      },
      {
        id: "07-frontend",
        carpeta: "03-Implementacion",
        titulo: "Frontend (app web)",
        descripcion: "Página principal, panel personal, identidad visual y PWA instalable.",
        imagen: "pantallas-app.svg",
      },
      {
        id: "08-pruebas",
        carpeta: "03-Implementacion",
        titulo: "Pruebas",
        descripcion: "Pirámide de pruebas: contratos (Foundry), backend y frontend (Playwright E2E).",
        imagen: "piramide-pruebas.svg",
      },
      {
        id: "09-certificacion-sbt",
        carpeta: "03-Implementacion",
        titulo: "Certificación con SBT",
        descripcion: "Credencial SBT (escalera D28): vías automática y con fotos, servicios /kyc.",
        imagen: "flujo-certificacion-sbt.svg",
      },
    ],
  },
  {
    carpeta: "04-Despliegue",
    etiqueta: "Despliegue y operación del entorno",
    descripcion:
      "Dónde vive la plataforma y cómo se pone en marcha: entornos, secretos, orden de despliegue, reinicio y bootstrap.",
    manuales: [
      {
        id: "01-despliegue",
        carpeta: "04-Despliegue",
        titulo: "Despliegue",
        descripcion: "Entornos local y nube (GCP), Secret Manager, orden de despliegue y puertos.",
        imagen: "produccion-gcp.svg",
      },
      {
        id: "02-reinicio-y-bootstrap",
        carpeta: "04-Despliegue",
        titulo: "Reinicio y bootstrap",
        descripcion: "Secuencia de reinicio, bootstrap del Owner y recuperación del entorno.",
        imagen: "secuencia-reinicio-bootstrap.svg",
      },
    ],
  },
  {
    carpeta: "07-Wallets-y-Cuentas",
    etiqueta: "Wallets y cuentas",
    descripcion:
      "Manuales técnicos de billeteras y cuentas de la red de pruebas: MetaMask, red RPC, cuentas anvil, tokens y conexión en móvil.",
    manuales: [
      {
        id: "01-instalacion-wallet",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "Instalación de la wallet",
        descripcion: "Crear e instalar MetaMask y conectar tu primera billetera a TrueKeate.",
        imagen: "flujo-instalacion.svg",
      },
      {
        id: "02-conexion-red-rpc",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "Conexión a la red RPC",
        descripcion: "Añadir la red del proyecto (anvil 31337) a tu billetera.",
        imagen: "red-rpc.svg",
      },
      {
        id: "03-cuentas-anvil",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "Cuentas del anvil",
        descripcion: "Las cuentas de prueba (Owner, relayer y usuarios) y sus claves públicas.",
        imagen: "importar-cuenta.svg",
      },
      {
        id: "04-token-brlt",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "Token BRLT",
        descripcion: "La moneda interna ERC-20: dirección, importación y saldo en la wallet.",
        imagen: "token-brlt.svg",
      },
      {
        id: "05-nfts-trueques",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "NFTs de trueques",
        descripcion: "Ver los certificados ERC-721 de los trueques y comprobar su propietario.",
        imagen: "nft-trueques.svg",
      },
      {
        id: "06-interactuar-wallet",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "Interactuar con la wallet",
        descripcion: "Conectar, firmar sesión y autorizar pasos: firma frente a transacción.",
        imagen: "flujo-firma.svg",
      },
      {
        id: "08-fichas-didacticas",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "Fichas didácticas",
        descripcion: "Repaso rápido de los 6 temas de wallets en tarjetas de estudio.",
        imagen: "mapa-fichas.svg",
      },
      {
        id: "09-conexion-wallet-movil",
        carpeta: "07-Wallets-y-Cuentas",
        titulo: "Conexión en móvil",
        descripcion: "Usar TrueKeate en el teléfono: deep link y navegador interno de MetaMask.",
        imagen: "conexion-wallet-movil.svg",
      },
    ],
  },
  {
    carpeta: "08-Suite-Sistemas",
    etiqueta: "Suite Sistemas del Owner",
    descripcion:
      "El panel del responsable de TrueKeate: cuadro de mandos con KPIs, revisión KYC, contratos, base de datos e infraestructura.",
    manuales: [
      {
        id: "01-panel-sistemas",
        carpeta: "08-Suite-Sistemas",
        titulo: "Panel del Owner / Sistemas",
        descripcion: "El cuadro de mandos completo del Owner: cifras, KYC con fotos, contratos e infra.",
        imagen: "biblioteca-sistemas-owner.svg",
      },
    ],
  },
];
