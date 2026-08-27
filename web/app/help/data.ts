export interface GuideStep {
  step: number
  title: string
  detail: string
  badge?: string
}

export interface Guide {
  id: string
  title: string
  category: 'auth' | 'escrow' | 'marketplace' | 'disputes' | 'reputation'
  categoryLabel: string
  icon: string
  image?: string
  introduction: {
    description: string
    purpose: string
  }
  useCaseDiagram: {
    actors: string[]
    flow: string[]
  }
  development: GuideStep[]
  results: {
    systemOutputs: string[]
    blockchainState: string
    userFeedback: string
  }
}

export const HELP_CATEGORIES = [
  { id: 'all', label: 'Todas las Guías', icon: '📚' },
  { id: 'auth', label: 'Billetera & Registro', icon: '🔑' },
  { id: 'escrow', label: 'Escrow & Swaps', icon: '🛡️' },
  { id: 'marketplace', label: 'Marketplace & Citas', icon: '📦' },
  { id: 'disputes', label: 'Disputas & Arbitraje', icon: '⚖️' },
  { id: 'reputation', label: 'Reputación & Gobernanza', icon: '⭐' },
]

export const HELP_GUIDES: Guide[] = [
  {
    id: 'auth-register',
    title: 'Conexión de Billetera y Registro On-Chain (UserRegistry)',
    category: 'auth',
    categoryLabel: 'Billetera & Registro',
    icon: '🔑',
    introduction: {
      description:
        'Proceso de vinculación de tu billetera Web3 (como MetaMask) y registro soberano on-chain mediante un nombre de usuario único.',
      purpose:
        'Garantizar la trazabilidad y confianza comunitaria, evitando identidades anónimas maliciosas y habilitando el acceso a todas las funciones de la plataforma.',
    },
    useCaseDiagram: {
      actors: ['Usuario', 'Billetera Web3 (MetaMask)', 'Contrato UserRegistry.sol'],
      flow: [
        '1. Usuario hace clic en "Conectar billetera"',
        '2. MetaMask solicita autorización de conexión',
        '3. Frontend verifica si la dirección está registrada en UserRegistry.sol',
        '4. Si no está inscrita -> Pantalla AccessGate despliega formulario de registro',
        '5. Usuario ingresa username único (3-20 caracteres) y firma la transacción',
        '6. Contrato emite UserRegistered y desbloquea el acceso a la plataforma',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Conectar la Billetera',
        detail:
          'Presiona el botón "Conectar billetera" en la barra de navegación superior y autoriza la conexión en tu extensión de MetaMask.',
        badge: 'Paso Inicial',
      },
      {
        step: 2,
        title: 'Verificar Red Local o Testnet',
        detail:
          'Asegúrate de estar en la red correcta (Localhost / Anvil RPC: http://127.0.0.1:8545, Chain ID: 31337).',
      },
      {
        step: 3,
        title: 'Completar Registro de Usuario',
        detail:
          'En el modal de inscripción, introduce un nombre de usuario de 3 a 20 caracteres (sin espacios ni caracteres especiales).',
      },
      {
        step: 4,
        title: 'Confirmar Transacción On-Chain',
        detail:
          'Aprueba la transacción en MetaMask para inscribir tu perfil de forma permanente en el contrato UserRegistry.',
      },
    ],
    results: {
      systemOutputs: [
        'La barra superior muestra tu nombre de usuario y avatar.',
        'Se desbloquean los menús de Operaciones, Catálogo, Balances y Perfil.',
      ],
      blockchainState:
        'Contrato UserRegistry.sol actualiza profiles[wallet] = { isRegistered: true, username: "tu_usuario" } y emite el evento UserRegistered.',
      userFeedback:
        'Notificación verde: "¡Registro exitoso! Bienvenido a la plataforma."',
    },
  },
  {
    id: 'escrow-create',
    title: 'Creación de una Operación de Escrow (Oferta de Intercambio)',
    category: 'escrow',
    categoryLabel: 'Escrow & Swaps',
    icon: '🛡️',
    image: '/help/escrow-swap.jpg',
    introduction: {
      description:
        'Procedimiento para depositar tokens en custodia bilateral y publicar una oferta de intercambio especificando el activo que entregas y el que solicitas.',
      purpose:
        'Permitir que un usuario proponga un trueque o compraventa sin intermediarios tradicionales, manteniendo sus fondos protegidos en un Smart Contract inviolable.',
    },
    useCaseDiagram: {
      actors: ['Usuario Creador (User 1)', 'Contrato Escrow.sol', 'Contrato ERC20 Token A'],
      flow: [
        '1. User 1 abre el modal "Crear Operación" y define: Token A, Monto A, Token B, Monto B y Plazo',
        '2. User 1 presiona "Crear Operación"',
        '3. Frontend solicita Approve(EscrowAddress, MontoA) en Token A',
        '4. Frontend encadena createOperation(tokenA, tokenB, amountA, amountB, deadline)',
        '5. Escrow.sol transfiere tokens al contrato y crea la orden con estado Active',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Acceder a la Sección de Operaciones',
        detail:
          'Navega a "Operaciones" y haz clic en el botón azul "Nueva Operación" en la parte superior derecha.',
      },
      {
        step: 2,
        title: 'Configurar Tokens y Montos',
        detail:
          'Selecciona el Token que vas a entregar (ej. Token A - TKA) y el monto a transferir. Luego selecciona el Token que solicitas (ej. Token B - TKB) y su cantidad.',
      },
      {
        step: 3,
        title: 'Definir el Plazo de Expiración (Deadline)',
        detail:
          'Ingresa los días de vigencia de la oferta. Si colocas "0", la operación no vencerá automáticamente.',
        badge: 'Opcional',
      },
      {
        step: 4,
        title: 'Firma y Confirmación Encadenada',
        detail:
          'Haz clic en "Crear Operación". El modal guiará la aprobación (Approve) y el depósito en una secuencia automatizada de transacciones.',
      },
    ],
    results: {
      systemOutputs: [
        'La nueva operación aparece en la lista con el badge verde "Activa".',
        'Se reduce el saldo disponible de Token A en tu billetera y se refleja en el contrato.',
      ],
      blockchainState:
        'Escrow.sol crea un nuevo Operation struct con estado Status.Active, timestamp de creación y emite OperationCreated(operationId, user1, ...).',
      userFeedback:
        'Mensaje de éxito: "Operación creada con éxito. Tus tokens están en custodia segura."',
    },
  },
  {
    id: 'escrow-complete',
    title: 'Aceptar y Completar una Operación (Swap Atómico)',
    category: 'escrow',
    categoryLabel: 'Escrow & Swaps',
    icon: '🔄',
    image: '/help/escrow-swap.jpg',
    introduction: {
      description:
        'Procedimiento mediante el cual una contraparte toma una oferta activa, deposita el token requerido y liquida el intercambio de forma inmediata.',
      purpose:
        'Garantizar la atomicidad: ambas partes reciben sus activos en una sola transacción inseparable; si falla una transferencia, se revierte todo.',
    },
    useCaseDiagram: {
      actors: ['Usuario Contraparte (User 2)', 'Usuario Creador (User 1)', 'Contrato Escrow.sol'],
      flow: [
        '1. User 2 visualiza una orden Activa en el explorador',
        '2. User 2 presiona "Completar Operación"',
        '3. Frontend solicita Approve(Token B, Monto B)',
        '4. Frontend ejecuta completeOperation(operationId)',
        '5. Escrow.sol envía Token B a User 1 y entrega Token A a User 2',
        '6. Operación pasa a estado Completed',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Localizar la Operación Activa',
        detail:
          'En la lista de "Operaciones", busca una con estado "Activa" creada por otro usuario.',
      },
      {
        step: 2,
        title: 'Verificar Montos y Decimales',
        detail:
          'Revisa con atención lo que debes entregar y lo que recibirás a cambio.',
      },
      {
        step: 3,
        title: 'Ejecutar "Completar Operación"',
        detail:
          'Presiona el botón verde "Completar Operación" y confirma las firmas en MetaMask.',
      },
    ],
    results: {
      systemOutputs: [
        'El estado de la tarjeta cambia a "Completada" con un badge azul.',
        'Se abre la opción para calificar a la contraparte.',
      ],
      blockchainState:
        'Token B transferido de User 2 a User 1; Token A transferido de Escrow a User 2. Estado = Status.Completed. Emite OperationCompleted.',
      userFeedback:
        'Notificación: "¡Intercambio completado exitosamente! Fondos recibidos."',
    },
  },
  {
    id: 'escrow-cancel-refund',
    title: 'Cancelar Operación o Reclamar Reembolso por Expiración',
    category: 'escrow',
    categoryLabel: 'Escrow & Swaps',
    icon: '↩️',
    introduction: {
      description:
        'Mecanismos para que el creador de una oferta recupere íntegramente sus fondos en custodia, ya sea por decisión voluntaria o porque la oferta venció sin contraparte.',
      purpose:
        'Evitar que los fondos de un usuario queden bloqueados o inaccesibles en caso de ofertas no correspondidas o cambios de planes.',
    },
    useCaseDiagram: {
      actors: ['Usuario Creador (User 1)', 'Contrato Escrow.sol'],
      flow: [
        'Opción A (Cancelación voluntaria): Creador presiona "Cancelar Operación" -> cancelOperation() -> Token A devuelto',
        'Opción B (Expiración vencida): block.timestamp > deadline -> Botón cambia a "Reclamar Reembolso" -> refundAfterExpiry() -> Token A devuelto',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Identificar tu Operación',
        detail:
          'Usa el filtro "Mis operaciones" en la sección de Operaciones para encontrar la oferta que deseas recuperar.',
      },
      {
        step: 2,
        title: 'Cancelar o Reclamar Reembolso',
        detail:
          'Si la operación está activa, presiona "Cancelar Operación". Si el plazo de días venció, presiona "Reclamar Reembolso".',
      },
      {
        step: 3,
        title: 'Confirmar Transacción',
        detail:
          'Aprueba la transacción en tu billetera. No se requieren aprobaciones de tokens adicionales.',
      },
    ],
    results: {
      systemOutputs: [
        'La tarjeta se actualiza al estado "Cancelada".',
        'Tus tokens regresan inmediatamente al saldo de tu billetera.',
      ],
      blockchainState:
        'El contrato transfiere amountA a user1 y marca operation.status = Status.Cancelled. Emite OperationCancelled u OperationExpired.',
      userFeedback:
        'Notificación: "Fondos devueltos exitosamente a tu billetera."',
    },
  },
  {
    id: 'disputes-arbitration',
    title: 'Apertura y Mediación de Disputas con el Árbitro',
    category: 'disputes',
    categoryLabel: 'Disputas & Arbitraje',
    icon: '⚖️',
    image: '/help/arbitration-trust.jpg',
    introduction: {
      description:
        'Procedimiento para someter una operación conflictiva a mediación oficial ante el Árbitro designado por la gobernanza.',
      purpose:
        'Proporcionar un mecanismo imparcial de resolución cuando existan desacuerdos en intercambios vinculados a servicios o entregas fuera de la cadena.',
    },
    useCaseDiagram: {
      actors: ['Usuario Afectado', 'Árbitro Oficial', 'Contrato Escrow.sol'],
      flow: [
        '1. Parte involucrada presiona "Abrir Disputa"',
        '2. Escrow.sol bloquea la operación en estado Disputed',
        '3. Árbitro revisa evidencias off-chain (mensajes, pruebas de entrega)',
        '4. Árbitro ejecuta resolveDispute(operationId, favorUser1, recipient)',
        '5. Fondos liquidados a la parte ganadora y operación finalizada',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Iniciar la Disputa',
        detail:
          'En la tarjeta de la operación activa, presiona el botón rojo "Abrir Disputa" y confirma la transacción.',
      },
      {
        step: 2,
        title: 'Revisión por el Árbitro',
        detail:
          'La operación pasa a estado "En disputa". El árbitro designado evaluará el caso y los acuerdos previos entre las partes.',
      },
      {
        step: 3,
        title: 'Resolución y Liquidación',
        detail:
          'El árbitro dictaminará la resolución en el panel: reembolso al creador o liberación del pago a la contraparte.',
      },
    ],
    results: {
      systemOutputs: [
        'La operación muestra el badge amarillo "En Disputa" y posteriormente "Completada (Resuelta)".',
      ],
      blockchainState:
        'Escrow.sol transfiere los fondos de custodia al ganador dictaminado y emite DisputeResolved(operationId, favorUser1, timestamp).',
      userFeedback:
        'Notificación: "Disputa resuelta por el árbitro. Fondos liquidados."',
    },
  },
  {
    id: 'marketplace-meetups',
    title: 'Marketplace de Items y Coordinación de Citas Físicas Seguras',
    category: 'marketplace',
    categoryLabel: 'Marketplace & Citas',
    icon: '📦',
    image: '/help/meetup-trade.jpg',
    introduction: {
      description:
        'Publicación de bienes o servicios en el catálogo comunitario y coordinación de puntos de encuentro presenciales (Meetups) para trueques en el mundo real.',
      purpose:
        'Facilitar el intercambio seguro de bienes físicos vinculando la oferta con custodia en tokens y verificación de presencia.',
    },
    useCaseDiagram: {
      actors: ['Vendedor / Ofrecedor', 'Comprador / Interesado', 'Servidor / Base de Datos Off-Chain'],
      flow: [
        '1. Usuario publica un artículo en el Catálogo (título, descripción, valor en tokens)',
        '2. Interesado contacta y programa una cita (Meetup) con fecha, hora y lugar seguro',
        '3. Ambas partes confirman la cita',
        '4. Se crea la operación de Escrow vinculada',
        '5. En el encuentro presencial, al verificar el bien físico, se ejecuta el swap',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Publicar un Artículo',
        detail:
          'Ve a la pestaña "Catálogo" y presiona "Publicar Item". Define categoría, estado del artículo y precio estimado.',
      },
      {
        step: 2,
        title: 'Coordinar Encuentro Presencial',
        detail:
          'Haz clic en "Agendar Cita / Meetup". Especifica un lugar público y seguro (ej. centro comercial, estación o punto verificado), fecha y hora.',
      },
      {
        step: 3,
        title: 'Validación en Persona y Swap',
        detail:
          'Al encontrarse y verificar el estado del bien físico, la contraparte procede a completar la operación en la plataforma.',
      },
    ],
    results: {
      systemOutputs: [
        'El item aparece en el Catálogo público.',
        'La cita queda registrada con estado "Pendiente" y luego "Confirmada" por ambas partes.',
      ],
      blockchainState:
        'Al completarse el intercambio, el contrato Escrow libera el pago en tokens ERC20 a la billetera del vendedor.',
      userFeedback:
        'Notificación: "Encuentro completado y trueque confirmado exitosamente."',
    },
  },
  {
    id: 'reputation-vouches',
    title: 'Sistema de Calificaciones, Reseñas y Avales de Confianza (Vouches)',
    category: 'reputation',
    categoryLabel: 'Reputación & Gobernanza',
    icon: '⭐',
    image: '/help/arbitration-trust.jpg',
    introduction: {
      description:
        'Evaluación post-transacción mediante estrellas (1 a 5), comentarios descriptivos y otorgamiento de avales comunitarios entre usuarios de confianza.',
      purpose:
        'Construir un historial de reputación descentralizado y verificable que premie las buenas prácticas y alerte sobre malos actores.',
    },
    useCaseDiagram: {
      actors: ['Usuario 1', 'Usuario 2', 'Módulo de Reputación / API'],
      flow: [
        '1. Finaliza una operación con estado Completed',
        '2. Se habilita el modal "Calificar Operación"',
        '3. Usuario selecciona estrellas (1-5) y redacta comentario',
        '4. Usuario de nivel Socio o con trayectoria puede otorgar un "Vouch" (Aval)',
        '5. Perfil público actualiza el score promedio y medallas de confianza',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Calificar al Finalizar la Operación',
        detail:
          'En la tarjeta de una operación completada, presiona "Calificar". Selecciona la puntuación y escribe tu reseña.',
      },
      {
        step: 2,
        title: 'Ver Perfil y Avales',
        detail:
          'Visita la sección "Perfil" para consultar tu promedio de estrellas, historial de intercambios y avales recibidos.',
      },
      {
        step: 3,
        title: 'Avalar a un Miembro de Confianza',
        detail:
          'Si tienes rango para avalar, puedes otorgar un Vouch a usuarios que hayan demostrado cumplimiento intachable.',
      },
    ],
    results: {
      systemOutputs: [
        'El perfil del usuario incrementa su reputación y muestra el nuevo comentario.',
        'Se actualizan las métricas comunitarias.',
      ],
      blockchainState:
        'Los metadatos quedan asociados a la dirección de la billetera y el nombre de usuario registrado.',
      userFeedback:
        'Notificación: "¡Gracias por tu valoración! Has fortalecido la reputación de la comunidad."',
    },
  },
  {
    id: 'subscription-governance',
    title: 'Membresías Comerciales con BRLT y Gobernanza de Socios',
    category: 'reputation',
    categoryLabel: 'Reputación & Gobernanza',
    icon: '👑',
    introduction: {
      description:
        'Activación de suscripciones mensuales para comercios frecuentes usando token BRLT y participación en propuestas de gobernanza comunitaria.',
      purpose:
        'Monetización sostenible del ecosistema, concesión de beneficios operativos a empresas y empoderamiento de los Socios para moderar la plataforma.',
    },
    useCaseDiagram: {
      actors: ['Empresa / Comercio', 'Socios de Gobernanza', 'Contrato Subscription.sol & Governance.sol'],
      flow: [
        '1. Comercio deposita mensualidad en BRLT en Subscription.sol (Periodos de 30 días acumulables)',
        '2. Subscription.isActive() valida que la empresa está al día',
        '3. Socios crean propuestas de sanción o mejoras en Governance.sol',
        '4. Votación comunitaria durante 3 días -> Ejecución con quórum mínimo',
      ],
    },
    development: [
      {
        step: 1,
        title: 'Suscribirse como Comercio Frecuente',
        detail:
          'En la sección de Perfil o Balances, selecciona la cantidad de meses a suscribir y aprueba el débito en tokens BRLT.',
      },
      {
        step: 2,
        title: 'Verificar Beneficios Activos',
        detail:
          'Tu cuenta obtendrá el distintivo de Comercio Frecuente con vigencia extendida.',
      },
      {
        step: 3,
        title: 'Participar en Votaciones (Solo Socios)',
        detail:
          'Si eres Socio, accede al panel de propuestas para emitir tu voto (A favor / En contra) en las sanciones y apelaciones en curso.',
      },
    ],
    results: {
      systemOutputs: [
        'Estado de suscripción actualizado con fecha de vencimiento (`paidUntil`).',
        'Registro del voto en la propuesta de gobernanza.',
      ],
      blockchainState:
        'Subscription.sol transfiere BRLT al fondo común; Governance.sol actualiza proposal.yes / proposal.no y emite VoteCast.',
      userFeedback:
        'Notificación: "Suscripción / Voto procesado correctamente."',
    },
  },
]
