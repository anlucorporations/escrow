// =============================================================================
// TrueKeate — Datos de la sección de Ayuda (agente INTEGRADOR)
// Contenido embebido de los manuales literales docs/Manuales/** (no se leen
// .md en runtime): grupos (temas) -> manuales -> secciones (##) ->
// sub-secciones (###) con párrafos y referencia a imágenes por nombre
// (rutas públicas /manual/imagenes/<nombre>.svg).
// =============================================================================

export interface SubseccionAyuda {
  titulo: string;
  parrafos: string[];
  imagen?: string;
}

export interface SeccionAyuda {
  titulo: string;
  parrafos: string[];
  imagen?: string;
  subsecciones: SubseccionAyuda[];
}

export interface ManualAyuda {
  id: string;
  carpeta: string;
  titulo: string;
  resumen: string;
  secciones: SeccionAyuda[];
}

export interface GrupoManual {
  carpeta: string;
  etiqueta: string;
  descripcion: string;
}

/** Grupos de manuales (carpetas del árbol docs/Manuales/**) en orden. */
export const gruposManuales: GrupoManual[] =   [
    {
      "carpeta": "01-Tecnologia",
      "etiqueta": "La tecnología en palabras simples",
      "descripcion": "Manuales introductorios para todo el mundo: qué es TrueKeate, la blockchain, los servidores y la app web, explicados sin jerga."
    },
    {
      "carpeta": "02-Dependencias",
      "etiqueta": "Las piezas que usa TrueKeate",
      "descripcion": "Qué librerías, servicios y herramientas componen la plataforma por dentro, cómo se leen sus versiones y de quién es cada pieza (licencias)."
    },
    {
      "carpeta": "03-Implementacion",
      "etiqueta": "Cómo funciona por dentro",
      "descripcion": "Los manuales operativos: el escrow y sus 9 estados, tu cuenta inteligente, las finanzas (BRLT y Fondo de Valor), el indexador, el relayer, la API, la app y las pruebas."
    },
    {
      "carpeta": "04-Despliegue",
      "etiqueta": "Dónde vive y cómo se despliega",
      "descripcion": "Los dos entornos (local y nube), las llaves secretas, el orden de despliegue de contratos y servidores, la red de puertos y los respaldos."
    },
    {
      "carpeta": "05-Diccionario-de-Datos",
      "etiqueta": "Diccionario de datos",
      "descripcion": "Lo que TrueKeate guarda en su base de datos: las 14 carpetas, las etiquetas fijas, qué guarda de tu identidad y las reglas de privacidad."
    },
    {
      "carpeta": "06-Diagrama-Relacional",
      "etiqueta": "Cómo se conectan los datos",
      "descripcion": "Las relaciones entre las tablas, el espejo de la blockchain, la regla de los 10 km y un ejemplo completo de principio a fin."
    }
  ];

/** Manuales literales, en orden de carpeta y archivo. */
export const manuales: ManualAyuda[] =   [
    {
      "id": "01-plataforma",
      "carpeta": "01-Tecnologia",
      "titulo": "TrueKeate para todos",
      "resumen": "Manual en lenguaje sencillo del manual técnico de plataforma: explica cómo funciona un trueque con escrow paso a paso, quiénes participan, la escalera de verificación, quién paga los gastos con el fondo de valor y dónde vive cada dato.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "TrueKeate es una plataforma para intercambiar cosas directamente entre personas: sin dinero de por medio, o mezclando objetos, servicios y criptos.",
            "Un ejemplo muy simple:",
            "1. Ana tiene una bicicleta y quiere una guitarra.",
            "2. Bruno tiene una guitarra y quiere una bicicleta.",
            "3. Ambos se ponen de acuerdo en la plataforma.",
            "4. Ninguno entrega su objeto a ciegas: los dos lo depositan en una caja fuerte digital (el escrow).",
            "5. Cuando Ana recibe la guitarra y Bruno recibe la bici, los dos firman que todo llegó bien.",
            "6. Solo entonces la caja fuerte se abre y cada uno se queda con lo suyo.",
            "La caja fuerte es un contrato inteligente (un programa que nadie puede engañar) y se llama escrow.",
            "Para participar necesitas una billetera digital (como MetaMask).",
            "Hay tres niveles de usuarios: Inscrito, Verificado y Certificado (ver sección 4).",
            "Los trueques se guardan en la blockchain, un registro público que no se puede borrar.",
            "Las personas particulares no pagan comisiones de gas por operar; las empresas sí (ver sección 6)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. ¿Qué es TrueKeate?",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "2.1 La idea en una frase",
              "parrafos": [
                "TrueKeate es una DApp Web3 de trueques: una aplicación descentralizada donde personas y empresas intercambian bienes, productos, servicios y criptos o NFTs de forma segura y confiable.",
                "En español llano, es un mercadillo digital donde no hace falta dinero para conseguir lo que quieres: se intercambia."
              ]
            },
            {
              "titulo": "2.2 ¿Qué se puede intercambiar?",
              "parrafos": [
                "Se intercambian bienes (una bici por una guitarra), productos (ropa, libros, tecnología), servicios (clases de inglés por el arreglo de una bici) y criptos y NFTs (un token digital por un objeto físico).",
                "La plataforma representa los objetos como NFTs (certificados digitales de propiedad) o criptomonedas (como BRLT, la moneda propia de TrueKeate)."
              ]
            },
            {
              "titulo": "2.3 ¿Qué NO es TrueKeate?",
              "parrafos": [
                "No es una tienda: no compras, intercambias.",
                "No es una red social: su propósito es el trueque seguro, no publicar contenido.",
                "La plataforma no guarda tu dinero: los activos se custodian en el escrow solo durante el trueque."
              ]
            }
          ]
        },
        {
          "titulo": "3. ¿Quiénes participan?",
          "parrafos": [
            "Participan el Particular (una persona con billetera digital, como Ana que cambia su bici), la Empresa (negocio certificado con nivel Oro, como una tienda que cambia stock), el Socio (miembro de la comunidad que vota y ayuda a resolver disputas) y el Owner (el administrador de la plataforma, que mantiene el sistema y revisa casos delicados)."
          ],
          "subsecciones": [
            {
              "titulo": "Cómo entra cada uno",
              "parrafos": [
                "1. Particular: conecta su billetera y se inscribe con correo, teléfono y dirección.",
                "2. Empresa: pasa una certificación y paga una suscripción.",
                "3. Socio: pide entrar formalmente y los demás Socios votan si lo aceptan.",
                "4. Owner: es la cuenta que crea (despliega) la plataforma y guarda las llaves secretas del sistema en un lugar especial llamado Secret Manager.",
                "Nota de verificación: los tipos de usuario están escritos en la base de datos (backend/db/schema.sql:14): PARTICULAR, EMPRESA y SOCIO."
              ]
            }
          ]
        },
        {
          "titulo": "4. La escalera de verificación",
          "parrafos": [
            "Para que el trueque sea seguro, TrueKeate usa una escalera de confianza: cada peldaño da más permisos.",
            "Peldaño 1 INSCRITO: se sube conectando la billetera e inscribiéndote; puedes ver ofertas y catálogo, pero no completar trueques.",
            "Peldaño 2 VERIFICADO: se sube confirmando un código en tu correo y otro en tu teléfono; puedes crear y completar trueques, con un máximo de 3 activos a la vez.",
            "Peldaño 3 CERTIFICADO: se sube con verificación de identidad completa (documento más selfie); permite todo lo anterior más las subastas.",
            "Ejemplo real: Ana se inscribe hoy y solo mira ofertas; mañana confirma su correo y teléfono y ya puede crear su primer trueque de la bici; si luego completa el KYC (documento más selfie) podrá participar en subastas.",
            "Dato curioso: tu identidad se guarda encriptada; la plataforma demuestra que estás verificado sin revelar quién eres, usando una prueba matemática llamada merkle root (ver manual de tecnología web3)."
          ],
          "imagen": "escalera-verificacion.svg",
          "subsecciones": []
        },
        {
          "titulo": "5. Cómo funciona un trueque con escrow",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "5.1 El problema que resuelve",
              "parrafos": [
                "En un trueque normal por internet, alguien tiene que entregar primero, y eso da miedo: ¿y si el otro no cumple?",
                "TrueKeate lo resuelve con custodia atómica: nada se entrega de verdad hasta que ambas partes confirman que recibieron bien."
              ]
            },
            {
              "titulo": "5.2 Los pasos de un trueque (con ejemplo)",
              "parrafos": [
                "Ana (bici) y Bruno (guitarra) hacen su trueque:",
                "1. Crear el trueque: Ana ofrece su bici NFT y acepta la guitarra de Bruno. Se registra el acuerdo. Estado: CREADO.",
                "2. Depositar (custodiar): Ana mete su bici en el escrow y luego Bruno mete su guitarra. Estado: CUSTODIADO.",
                "3. Abrir el trueque: ambos confirman que quieren seguir; hay una ventana de tiempo para hacerlo (unos minutos de margen). Estado: APERTURA.",
                "4. Recibir y firmar: cuando cada uno recibe lo suyo, firma la recepción; además, cada uno valora la experiencia del 1 al 5.",
                "5. Cierre: con las dos firmas y las dos valoraciones, el escrow libera los activos en cruz: la bici va a Bruno y la guitarra a Ana. Estado: COMPLETADO.",
                "Regla de oro: nadie puede liberar un activo solo; hacen falta las dos firmas (o una votación de Socios en caso de conflicto)."
              ],
              "imagen": "flujo-truque.svg"
            },
            {
              "titulo": "5.3 ¿Qué pasa si algo sale mal?",
              "parrafos": [
                "Si el acuerdo aún no tiene objetos depositados, cualquiera de los dos puede cancelar sin problemas.",
                "Si uno no aparece o no quiere seguir, se abre una disputa dentro de un plazo (máximo 5 días).",
                "Si la disputa no se resuelve entre ellos, los Socios votan y se necesita 2 de cada 3 votos a favor.",
                "Si alguien rompe las reglas, la plataforma puede bloquear el trueque y congelar los activos.",
                "Los estados por los que pasa un trueque son 9; el diagrama muestra las transiciones entre CREADO, CUSTODIADO, APERTURA, COMPLETADO, ANULADO, EN_DISPUTA, RESOLUCION_SOCIOS (votación de Socios, quórum 2/3) y BLOQUEADO (sanción con espera de 6 horas), y recuerda que en custodia nada se mueve sin las dos firmas.",
                "Verificación: los 9 estados existen de verdad en el contrato Escrow (sc/src/Escrow.sol:39-49) y en la base de datos (backend/db/schema.sql:31-35); el estado ACTIVO aparece en el código como sinónimo de CREADO."
              ],
              "imagen": "estados-escrow.svg"
            }
          ]
        },
        {
          "titulo": "6. ¿Quién paga los gastos? El \"fondo de valor\"",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "6.1 Gas: el combustible de la blockchain",
              "parrafos": [
                "Cada operación en la blockchain cuesta un pequeño peaje llamado gas; TrueKeate quiere que sea fácil para las personas.",
                "Particulares: no pagan gas; la plataforma firma y paga por ellos (son las llamadas meta-transacciones).",
                "Empresas: sí pagan su propio gas, porque son operaciones grandes y la plataforma no las subvenciona."
              ]
            },
            {
              "titulo": "6.2 El fondo de valor",
              "parrafos": [
                "Para pagar esos gastos (servidores, gas, red), TrueKeate recoge un pequeño porcentaje en un fondo común administrado por el Owner.",
                "Las fuentes del fondo: trueque completado (1 % del valor; un trueque de 100 euros aporta 1 euro), suscripción de empresa (10 %; el 10 % va al fondo) y emisión de BRLT, la moneda propia (5 %; al crear BRLT nuevo, el 5 % va al fondo).",
                "El Owner puede cambiar esos porcentajes desde su panel; si el fondo se queda sin dinero, la plataforma avisa al Owner para que lo reponga.",
                "Pendiente de confirmar: en el código actual se ve la aportación del 10 % (suscripciones) y del 5 % (emisión de BRLT); la aportación del 1 % por trueque completado está declarada en el diseño pero no se ha observado su llamada dentro del contrato Escrow, así que no se afirma que funcione hasta verificarlo."
              ]
            }
          ]
        },
        {
          "titulo": "7. Dónde vive cada dato (en una frase)",
          "parrafos": [
            "TrueKeate tiene tres capas:",
            "1. Blockchain (on-chain): guarda los estados del escrow; es la única fuente de verdad: lo que dice la cadena es lo que vale.",
            "2. Base de datos (off-chain): guarda el volumen (publicaciones, chat, datos de verificación cifrados, ubicación, estadísticas); sirve para mostrar información rápido.",
            "3. Servidores (orquestación): conectan la app con la blockchain y la base de datos (el backend); se explican en el manual 03-stack-backend.",
            "Regla importante: la base de datos nunca puede cambiar el estado de un trueque por su cuenta; solo la blockchain decide."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Estado actual y qué falta confirmar",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "8.1 Lo que está verificado",
              "parrafos": [
                "Verificado: los contratos inteligentes existen y funcionan en pruebas (ver manual 02-stack-web3); el backend (vigilantes de eventos más servidor API) existe y pasa sus pruebas; y la página web existe (ver manual 04-stack-frontend)."
              ]
            },
            {
              "titulo": "8.2 Pendiente de confirmar",
              "parrafos": [
                "Pendiente de confirmar: la coherencia del README del proyecto, que dice que el desarrollo está pendiente aunque ya hay mucho código escrito; la aportación del 1 % al fondo por trueque completado (ver 6.2); el sistema de certificado de imagen (para demostrar que una foto no fue retocada), que está en diseño sin decidir dónde se ancla en la cadena; y el estado real del entorno en la nube (GCP), según el manual 04-Despliegue."
              ]
            }
          ]
        },
        {
          "titulo": "9. Glosario mínimo de este manual",
          "parrafos": [
            "DApp = Aplicación que funciona sobre blockchain · Web3 = Internet con blockchain y billeteras digitales · Escrow = Caja fuerte digital que custodia los objetos durante el trueque · NFT = Certificado digital de propiedad de un objeto único · Wallet o billetera = Programa que guarda tus claves y firma por ti · Gas = Peaje que se paga por usar la blockchain · KYC = Verificación de identidad (documento más selfie) · On-chain u off-chain = Dentro de la blockchain o fuera de ella (base de datos)",
            "Para profundizar, continúa con los manuales: 02-stack-web3 (la tecnología blockchain en palabras simples), 03-stack-backend (los servidores que vigilan los trueques) y 04-stack-frontend (la app web y móvil)."
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "02-stack-web3",
      "carpeta": "01-Tecnologia",
      "titulo": "La tecnología blockchain en palabras simples",
      "resumen": "Manual en lenguaje sencillo del stack Web3: explica sin tecnicismos los contratos inteligentes de TrueKeate, los contratos principales y para qué sirven, la SmartAccount, las meta-transacciones con relayer, las protecciones anti-abuso y cómo se prueban los contratos.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "Cuando haces un trueque en TrueKeate, detrás hay programas que viven dentro de la blockchain: se llaman contratos inteligentes y son como empleados digitales que cumplen las reglas al pie de la letra y no pueden mentir.",
            "Las 4 ideas clave:",
            "1. Blockchain: un registro público y compartido; todos ven lo mismo y nadie puede borrar lo escrito.",
            "2. Contrato inteligente: un programa que vive en ese registro y ejecuta las reglas de forma automática.",
            "3. Billetera (wallet): un llavero digital donde guardas tus claves y con ellas firmas tus operaciones; TrueKeate usa billeteras como MetaMask.",
            "4. Gas: el pequeño peaje de la red por cada operación; los particulares no lo pagan en TrueKeate, la plataforma paga por ellos.",
            "Los contratos de TrueKeate están probados con herramientas profesionales (Foundry) y librerías reconocidas mundialmente (OpenZeppelin); eso no garantiza que sean perfectos, pero sí que siguen buenas prácticas."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. ¿Qué hay \"debajo del capó\"? (sin asustarse)",
          "parrafos": [
            "TrueKeate construye su parte blockchain con estas piezas: Solidity (el idioma en que se escriben los contratos, versión 0.8.24), Foundry (el taller donde se crean y prueban: forge, anvil, cast), OpenZeppelin (librería de piezas ya hechas y muy usadas, versión 5.0.2) y anvil (una blockchain de pruebas que corre en tu ordenador, red 31337).",
            "Piensa en Foundry como el taller, Solidity como el idioma y OpenZeppelin como una caja de piezas estándar (candados, cerraduras) que ya están bien probadas."
          ],
          "subsecciones": []
        },
        {
          "titulo": "3. Los contratos de TrueKeate y para qué sirven",
          "parrafos": [
            "TrueKeate tiene 6 contratos principales (más 2 de prueba):",
            "Escrow: custodia los trueques y controla sus estados; es la caja fuerte del trueque.",
            "SmartAccount: tu cuenta personal que firma por ti; es tu carnet de identidad digital.",
            "SmartAccountFactory: crea las cuentas personales; es la oficina que expide carnets.",
            "BRLT: la moneda propia de TrueKeate; es el vale interno de la plataforma.",
            "FondoDeValor: recoge los porcentajes para gastos; es la hucha común (ver manual de plataforma).",
            "SociosRegistry: lleva el padrón de Socios y sus votos; es el censo electoral.",
            "SuscripcionEmpresa: gestiona las suscripciones de empresas; es el abono de las empresas.",
            "Nota de verificación: estos contratos existen de verdad en la carpeta sc/src del proyecto y cada uno cita qué requisito cumple."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. Tu cuenta personal: la SmartAccount",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "4.1 ¿Por qué necesitas una cuenta dentro de la blockchain?",
              "parrafos": [
                "Tu billetera (MetaMask) es tu puerta de entrada, pero TrueKeate te crea una cuenta propia dentro de la plataforma llamada SmartAccount.",
                "Ejemplo real: 1. Ana conecta MetaMask por primera vez. 2. La plataforma crea su SmartAccount automáticamente, sin que Ana haga nada raro. 3. Desde ese momento, todas sus operaciones de trueque se firman desde esa cuenta."
              ]
            },
            {
              "titulo": "4.2 La escalera de verificación, dentro de la cadena",
              "parrafos": [
                "Los niveles INSCRITO, VERIFICADO y CERTIFICADO (del manual de plataforma) también se guardan en la blockchain, dentro de la SmartAccount; así el sistema sabe en cadena qué puede hacer cada uno, sin necesidad de confiar solo en la base de datos."
              ]
            },
            {
              "titulo": "4.3 Recuperación social: si pierdes tu billetera",
              "parrafos": [
                "Perder la billetera es un problema serio en el mundo blockchain: normalmente, quien tiene la clave tiene el dinero; TrueKeate tiene un plan de rescate:",
                "1. Al crear tu cuenta eliges 3 guardianes (personas de confianza).",
                "2. Si pierdes el acceso, al menos 2 de esos 3 deben aprobar tu solicitud.",
                "3. Se abre una espera de 48 horas (para que nadie te robe por sorpresa).",
                "4. Pasada la espera, recuperas el control de tu cuenta, sin mover los fondos, que siguen custodiados.",
                "Ejemplo: Ana pierde su teléfono; Bruno y Carla, sus guardianes, aprueban la recuperación; esperan 48 horas y Ana vuelve a controlar su cuenta."
              ]
            }
          ]
        },
        {
          "titulo": "5. Firmar sin pagar gas (las meta-transacciones)",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "5.1 El problema",
              "parrafos": [
                "Cada operación en blockchain cuesta gas (dinero); si cada trueque de Ana costara gas, usar la plataforma sería caro y complicado."
              ]
            },
            {
              "titulo": "5.2 La solución de TrueKeate",
              "parrafos": [
                "Ana firma la operación con su billetera (solo un clic, sin pagar nada); después, un servidor especial llamado relayer (mensajero) toma esa firma, la revisa y la envía a la blockchain pagando él el gas.",
                "Es como firmar un cheque en blanco con condiciones muy estrictas: la firma solo sirve una vez (número de serie único por operación); solo puede usarla la cuenta correcta de Ana; Ana no puede hacer más de 20 operaciones gratis al día (para evitar abusos); y si algo falla 3 veces en 10 minutos, se pausa esa cuenta durante 1 hora.",
                "Regla importante: las empresas no usan el mensajero; ellas envían sus operaciones directamente y pagan su propio gas, porque son operaciones grandes de negocio."
              ],
              "imagen": "meta-transaccion.svg"
            }
          ]
        },
        {
          "titulo": "6. Protecciones anti-abuso (el mensajero es exigente)",
          "parrafos": [
            "El relayer no firma cualquier cosa; antes de enviar una operación comprueba:",
            "1. Que la red sea la correcta (no vayas a firmar en la red equivocada).",
            "2. Que la cuenta no esté bloqueada por intentos fallidos.",
            "3. Que no se supere el límite diario de 20 operaciones gratis.",
            "4. Que el número de serie (nonce) no se haya usado antes (anti-repetición).",
            "5. Que la cuenta esté verificada (no valen cuentas solo inscritas).",
            "6. Recién entonces envía la operación a la blockchain.",
            "El diagrama resume Web3 en 30 segundos: blockchain (registro público, no se puede borrar, fuente de verdad del escrow), contrato inteligente (programa en la cadena que cumple reglas solo, por ejemplo Escrow y SmartAccount), billetera o wallet (guarda tus claves, MetaMask, firma operaciones), gas (peaje de la red que paga el relayer para los particulares), token o NFT (cripto BRLT o certificado digital de un objeto), on-chain (estados y custodia) y off-chain (chat, fotos, estadísticas)."
          ],
          "imagen": "glosario-web3.svg",
          "subsecciones": []
        },
        {
          "titulo": "7. Las pruebas: ¿cómo sabemos que no se rompe?",
          "parrafos": [
            "Los contratos se prueban con Foundry, un taller de pruebas profesional.",
            "Pruebas normales: se simulan trueques completos y se comprueba cada paso.",
            "Fuzzing: la máquina lanza miles de datos aleatorios buscando fallos.",
            "Invariantes: comprueba las reglas de oro una y otra vez; por ejemplo, nunca se entrega un objeto custodiado sin las dos firmas.",
            "Ejemplo de regla de oro que se prueba siempre: 1. Ana deposita su bici. 2. Bruno no ha firmado la recepción. 3. El sistema debe negarse a entregar la bici, siempre, pase lo que pase."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Qué falta confirmar",
          "parrafos": [
            "Pendiente de confirmar: el certificado de imagen (demostrar que una foto no fue retocada usando matemáticas) está en diseño, sin contrato terminado y sin decidir dónde se guardará la prueba; la versión de Foundry no está fijada en el proyecto (se usa la instalada en el entorno de desarrollo); no se ha verificado una tubería automática de pruebas en la nube (CI); y la versión de Node.js (el motor que corre los servidores) no está fijada en el repositorio."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Glosario visual rápido",
          "parrafos": [
            "Blockchain = Libro de registro digital compartido e inmutable · Contrato inteligente = Programa que vive en la blockchain y cumple reglas · ERC-20 / ERC-721 = Estándares de criptomonedas y de NFTs · EIP-712 = Forma estándar de firmar mensajes legibles · Nonce = Número de serie único que evita repetir firmas · CREATE2 = Truco matemático para saber de antemano dónde nacerá una cuenta · KYC = Verificación de identidad con documento y selfie",
            "Continúa con el manual 03-stack-backend para conocer a los servidores que vigilan todo esto."
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "03-stack-backend",
      "carpeta": "01-Tecnologia",
      "titulo": "Los servidores que vigilan los trueques",
      "resumen": "Manual en lenguaje sencillo del backend (Node.js): cuenta qué hacen los trabajadores invisibles de TrueKeate: la API (el camarero), el indexador (el vigilante de eventos), el relayer (el mensajero que paga el gas), la base de datos PostgreSQL, la seguridad con límites y frenos, y cómo se prueban.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "TrueKeate no es solo blockchain: detrás hay servidores (ordenadores siempre encendidos) que hacen tres trabajos:",
            "1. El vigilante de eventos (indexador): mira la blockchain y copia lo que pasa a la base de datos, para que la app sea rápida.",
            "2. El mensajero que paga (relayer): envía las operaciones de los usuarios particulares a la blockchain y paga el gas por ellos.",
            "3. El camarero de peticiones (API): atiende a la app web o móvil (dame el catálogo, crea un trueque, inicia sesión).",
            "Es como un restaurante: la API es el camarero que toma los pedidos de los clientes, el indexador es el que anota en el libro de contabilidad lo que ocurre en la cocina y el relayer es el repartidor que lleva los pedidos a la blockchain pagando el envío.",
            "Los tres hablan el mismo idioma que la blockchain (una librería llamada ethers) y guardan datos en una base de datos llamada PostgreSQL."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. El camarero: la API (REST)",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "2.1 ¿Qué es una API?",
              "parrafos": [
                "Una API es la boca de los servidores: un conjunto de puertas (direcciones) por las que la app pide cosas.",
                "Ejemplo real: cuando Ana abre el catálogo, su app le pide a la API dame los artículos disponibles y la API responde con la lista."
              ]
            },
            {
              "titulo": "2.2 Qué puertas existen",
              "parrafos": [
                "Las puertas se agrupan por áreas: /auth (entrar y registrarse, por ejemplo iniciar sesión con mi firma), /kyc (subir en la escalera de verificación, por ejemplo envié mi documento y selfie), /catalog (publicar y ver artículos, por ejemplo publicar mi bici o ver encargos), /truekes (gestionar trueques, por ejemplo crear trueque o firmar recepción), /admin (panel del Owner, por ejemplo ver usuarios o el estado de los servidores), /reputacion (ver la reputación, qué puntuación tengo) y /subastas (subastas de empresas, por ejemplo hacer una puja)."
              ]
            },
            {
              "titulo": "2.3 Reglas de negocio que la API hace cumplir",
              "parrafos": [
                "1. Para crear un trueque necesitas sesión iniciada y estar VERIFICADO o CERTIFICADO.",
                "2. Si estás VERIFICADO, máximo 3 trueques activos a la vez.",
                "3. Las valoraciones son de 1 a 5 en cinco aspectos."
              ]
            },
            {
              "titulo": "2.4 ¿Cómo sabe la API quién eres?",
              "parrafos": [
                "Cuando Ana inicia sesión:",
                "1. La app le pide firmar un mensaje con MetaMask: TrueKeate, iniciar sesión.",
                "2. Con esa firma, la API sabe que Ana es Ana (la matemática lo demuestra).",
                "3. La API le entrega un pase de sesión (un código secreto temporal).",
                "4. Con ese pase, Ana puede pedir cosas durante un tiempo sin volver a firmar.",
                "Nota de verificación: hoy los datos de la API viven en la memoria del servidor (como un bloc rápido) imitando las tablas de la base de datos; la conexión definitiva con PostgreSQL está prevista en una fase de integración posterior, pendiente de confirmar."
              ]
            }
          ]
        },
        {
          "titulo": "3. La base de datos: PostgreSQL (el almacén)",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "3.1 ¿Para qué sirve si ya está la blockchain?",
              "parrafos": [
                "La blockchain es segura pero lenta para buscar; es como buscar una aguja en un pajar cada vez que quieres ver el catálogo.",
                "PostgreSQL es el almacén veloz: guarda copias de lo que pasa en la blockchain y todos los datos de uso (artículos, chats, valoraciones, ubicaciones, estadísticas)."
              ]
            },
            {
              "titulo": "3.2 Regla de oro",
              "parrafos": [
                "Solo el vigilante (indexador) escribe las copias del estado de los trueques; nadie más puede tocar esas copias desde la base de datos. Si alguien modificara la base de datos a mano, no cambiaría nada en la blockchain: la cadena manda."
              ]
            },
            {
              "titulo": "3.3 Datos personales protegidos",
              "parrafos": [
                "Los datos sensibles (correo, teléfono, dirección, documento de identidad, selfie) están marcados para guardarse cifrados (encriptados): aunque alguien robara la base de datos, no podría leerlos.",
                "Pendiente de confirmar: el cifrado está marcado en el diseño del esquema, pero no se ha verificado el mecanismo concreto que lo implementa."
              ]
            },
            {
              "titulo": "3.4 ¿Dónde está la base de datos?",
              "parrafos": [
                "TrueKeate reutiliza un servicio de base de datos en la nube de Google (GCP) llamado internamente mcc-postgres, con una herramienta de administración llamada pgAdmin (ver manual 04-Despliegue)."
              ]
            }
          ]
        },
        {
          "titulo": "4. El vigilante: el indexador",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "4.1 Su trabajo",
              "parrafos": [
                "La blockchain emite eventos cuando algo pasa (un grito público): el trueque 42 pasó a CUSTODIADO o Ana fue admitida como SOCIO.",
                "El indexador está siempre escuchando; cuando oye un evento:",
                "1. Anota en su libro (auditoría) que ya lo vio, para no repetirlo.",
                "2. Copia el cambio a la base de datos (tablas espejo).",
                "3. Guarda la marca de hasta dónde ha leído (checkpoint).",
                "El diagrama muestra cómo el vigilante escucha los eventos de la blockchain (fuente de verdad) y escribe las copias en la base de datos (tabla truekes con el estado actualizado y tabla usuarios con tipo SOCIO)."
              ],
              "imagen": "indexador-copia.svg"
            },
            {
              "titulo": "4.2 ¿Y si se pierde algo?",
              "parrafos": [
                "Si el vigilante se cae o se pierde un evento, se puede reprocesar: volver a leer la blockchain desde un bloque anterior y rehacer las copias; como cada evento tiene un número de serie único, no se duplican (el sistema omite lo que ya está anotado)."
              ]
            },
            {
              "titulo": "4.3 El vigilante también informa",
              "parrafos": [
                "El indexador calcula el retraso (lag): cuántos eventos hay entre lo último que leyó y lo último que pasó en la blockchain; si el retraso crece, algo va mal y el Owner lo ve en su panel."
              ]
            }
          ]
        },
        {
          "titulo": "5. El mensajero: el relayer",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "5.1 Su trabajo en simple",
              "parrafos": [
                "Cuando Ana quiere hacer una operación sin pagar gas:",
                "1. Ana firma con su billetera (ver manual 02-stack-web3).",
                "2. La API recibe la firma y llama al relayer.",
                "3. El relayer revisa todo (red, bloqueos, límite diario, número de serie, estado de verificación).",
                "4. Si todo está bien, envía la operación a la blockchain pagando el gas.",
                "El diagrama muestra a los usuarios (Ana, particular sin gas, y la empresa que paga su propio gas), los servidores (API, relayer e indexador) y el guardado (blockchain con los estados del escrow y base de datos PostgreSQL con las copias rápidas)."
              ],
              "imagen": "servidores-vigilantes.svg"
            },
            {
              "titulo": "5.2 Su salud: ¿está todo bien?",
              "parrafos": [
                "El relayer se hace un chequeo médico periódico: comprueba si la cuenta que paga el gas tiene saldo (si baja de 0,5 ETH, avisa al Owner) y si está conectado a la red correcta."
              ]
            },
            {
              "titulo": "5.3 ¿Y si el mensajero se cae?",
              "parrafos": [
                "Está previsto un plan B (D39): si el relayer falla más de una hora, el usuario puede pagar el gas directamente y la plataforma le reembolsa en BRLT (la moneda propia) si la caída fue culpa del operador.",
                "Pendiente de confirmar: ese plan B está documentado como requisito, pero no se ha verificado su implantación operativa; también está pendiente que el relayer corra como servicio independiente con 2 copias y cola de reintentos (así lo pide el diseño D15)."
              ]
            }
          ]
        },
        {
          "titulo": "6. Seguridad: límites y frenos",
          "parrafos": [
            "La API y el relayer tienen frenos para evitar abusos:",
            "Límite de peticiones: máximo 120 peticiones por minuto a la API.",
            "Límite diario: máximo 20 operaciones gratis por usuario y día.",
            "Bloqueo temporal: 3 fallos en 10 minutos provocan una pausa de 1 hora.",
            "Pase de sesión: las zonas privadas exigen tu pase válido."
          ],
          "subsecciones": []
        },
        {
          "titulo": "7. Cómo se sabe que todo funciona: pruebas",
          "parrafos": [
            "El backend se prueba con pruebas automáticas: del vigilante (¿copia bien los eventos? ¿no duplica?), del mensajero (¿rechaza firmas repetidas? ¿aplica los frenos?) y del camarero (¿responden bien todas las puertas de la API?).",
            "Documentado: 19 de 19 pruebas pasan en el momento de escribir el manual técnico."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Qué falta confirmar",
          "parrafos": [
            "Pendiente de confirmar: el diseño pedía escribir el backend en TypeScript, pero el código real está en JavaScript (desviación del diseño, a confirmar si es intencional); el cifrado real de datos personales en la base de datos; la API guarda datos en memoria y la conexión definitiva con PostgreSQL está en fase de integración; el relayer como servicio independiente con 2 instancias; y en el mapa de contratos del indexador, las direcciones de las SmartAccounts de cada usuario figuran como pendiente (las cuentas se crean una a una, a confirmar cómo se resolverá en producción)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Glosario de este manual",
          "parrafos": [
            "API = Puertas de los servidores por las que la app pide cosas · Endpoint = Una puerta concreta de la API (una dirección más una acción) · Evento = Aviso público que emite la blockchain cuando algo pasa · Checkpoint = Marca de hasta dónde ha leído el vigilante · Lag o retraso = Distancia entre lo último leído y lo último ocurrido · Pool = Conjunto de conexiones preparadas a la base de datos · Rate limiting = Freno que limita peticiones por minuto · Health-check = Chequeo de salud de un servidor",
            "Continúa con el manual 04-stack-frontend: la app que ven las personas."
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "04-stack-frontend",
      "carpeta": "01-Tecnologia",
      "titulo": "La app web y móvil de TrueKeate",
      "resumen": "Manual en lenguaje sencillo del frontend (Next.js): cuenta qué se ve y qué se toca al usar TrueKeate: la página principal, el panel personal, las tecnologías de construcción, la identidad visual, la conexión de MetaMask, la PWA instalable y las pruebas automáticas.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "TrueKeate tiene una página web (la app) hecha con tecnologías modernas; esto es lo que encontrarás:",
            "1. Página principal (landing): explica qué es TrueKeate y tiene un botón Comenzar a truequear.",
            "2. Panel personal (dashboard): tu espacio dentro de la app; aquí conectas tu billetera y ves tu nivel (INSCRITO, VERIFICADO o CERTIFICADO).",
            "3. Menú inferior con 5 botones: Mercado, Inventario, Trueke, Socios y Perfil.",
            "Para empezar a usar la app en 5 minutos:",
            "1. Abre la página principal.",
            "2. Pulsa Comenzar a truequear.",
            "3. Conecta tu billetera MetaMask (un clic para aceptar).",
            "4. Mira tu panel: verás tu nivel de la escalera y qué módulos puedes usar.",
            "5. Si estás solo INSCRITO, verás el catálogo pero no podrás crear trueques todavía: verifica tu correo y teléfono para subir de nivel.",
            "Ejemplo real: Ana abre la app, conecta MetaMask y aparece como INSCRITO, con los módulos de crear trueques atenuados (grises); después de confirmar su correo y teléfono pasa a VERIFICADO y ya puede empezar a truequear."
          ],
          "imagen": "recorrido-app.svg",
          "subsecciones": []
        },
        {
          "titulo": "2. Con qué está construida la app",
          "parrafos": [
            "La app se construye con Next.js (el marco principal de la web, el esqueleto), React (librería de pantallas con piezas de interfaz reutilizables), TypeScript (JavaScript con red de seguridad que evita errores de tipos antes de publicar), Tailwind CSS (sistema de estilos que define colores y formas de forma ordenada) y ethers (puente con la blockchain que conecta con MetaMask y los contratos).",
            "Verificación: versiones exactas leídas de los archivos de bloqueo de versiones: Next.js 16.3.4, React 19.2.8, Tailwind v4 y ethers 6.17.0."
          ],
          "subsecciones": []
        },
        {
          "titulo": "3. La página principal (landing)",
          "parrafos": [
            "Es la puerta de entrada, abierta a todo el mundo (no hace falta iniciar sesión).",
            "Muestra el nombre y el logo de TrueKeate y las 4 ventajas del trueque digital:",
            "1. Custodia atómica: nadie se queda sin su parte.",
            "2. Trueke sin gas: los particulares no pagan comisiones de red.",
            "3. Reputación real: las valoraciones construyen confianza.",
            "4. Economía circular: las cosas se reutilizan entre personas.",
            "Hay un botón grande: Comenzar a truequear, que lleva al panel personal."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. El panel personal (dashboard)",
          "parrafos": [
            "Es la única pantalla de la zona privada que ya está totalmente funcional."
          ],
          "subsecciones": [
            {
              "titulo": "4.1 Qué hace",
              "parrafos": [
                "1. Muestra un botón Conectar MetaMask si no tienes la billetera conectada.",
                "2. Al conectar, muestra tu nivel de la escalera (INSCRITO, VERIFICADO o CERTIFICADO).",
                "3. Activa o atenúa los módulos según tu nivel: Explorar ofertas, Mis truekes (máximo 3 activos si eres VERIFICADO), Reputación y Punto de encuentro."
              ]
            },
            {
              "titulo": "4.2 La barra superior",
              "parrafos": [
                "Dentro de la app, arriba aparece la marca TrueKeat con un símbolo de visto y tu nombre de usuario con una palomita si estás verificado."
              ]
            },
            {
              "titulo": "4.3 El menú inferior (BottomNav)",
              "parrafos": [
                "Una barra flotante abajo con 5 botones: Mercado (ícono de casa, el panel principal), Inventario (ícono de maletín, tus artículos, en construcción), Trueke (ícono de intercambio, el trueque; es el botón central dorado y hexagonal), Socios (ícono de edificio, gobernanza y votaciones, en construcción) y Perfil (ícono de persona, tu perfil, en construcción).",
                "Importante (verificado): los módulos Inventario, Trueke, Socios y Perfil son lugares reservados (placeholders); dentro de cada uno pone módulo en construcción, se completa en el Ciclo 8. No se afirma que funcionen todavía."
              ]
            }
          ]
        },
        {
          "titulo": "5. Identidad visual: el estilo \"Bóveda Digital Moderna\"",
          "parrafos": [
            "TrueKeate tiene un sistema de diseño propio con esta paleta: azul marino oscuro para fondos principales (#0a1128 y #1a2b4c), verde azulado (teal) para acciones y éxito (#2a9d8f), cian para detalles y estados activos (#48cae4), dorado para lo premium y el botón central (#d4af37), rojo carmesí para alertas y peligro (#e63946) y coral para avisos suaves (#f4a261).",
            "Las piezas visuales (botones, tarjetas, insignias) ya existen como componentes reutilizables; los activos de marca (logos) están en la carpeta pública de la web."
          ],
          "imagen": "estilo-visual.svg",
          "subsecciones": []
        },
        {
          "titulo": "6. Conectar la billetera: cómo funciona",
          "parrafos": [
            "Cuando pulsas Conectar MetaMask:",
            "1. La app pide permiso a MetaMask (aparece una ventanita de MetaMask).",
            "2. Tú aceptas; MetaMask guarda en la app la dirección de tu cuenta.",
            "3. La app recuerda tu cuenta: si recargas la página, vuelve a conectar solo.",
            "4. Si cambias de cuenta en MetaMask, la app se entera y se actualiza.",
            "En el teléfono, la firma se delega a la wallet móvil (MetaMask mobile) cuando la app se instala como PWA (aplicación instalable)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "7. La app como aplicación instalable (PWA)",
          "parrafos": [
            "TrueKeate puede instalarse en el teléfono como una app normal: tiene su manifest (la tarjeta de presentación que permite instalarla), al instalarla se abre a pantalla completa sin barra del navegador y el acceso rápido está pensado para que el panel personal sea la primera pantalla.",
            "Pendiente de confirmar: existe la tarjeta de instalación, pero no se ha encontrado el trabajador de servicio (service worker) que permite el modo sin conexión y la caché completa; hoy es instalable, pero 100 % offline queda a confirmar. La app nativa (Android e iOS) es una mejora futura prevista, no algo ya hecho."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. ¿Cómo sabemos que la app funciona? Pruebas automáticas",
          "parrafos": [
            "La app se prueba con una herramienta llamada Playwright, que abre un navegador de verdad y comprueba:",
            "1. Que la página principal muestre el logo, las ventajas y el botón.",
            "2. Que el botón lleve al panel personal.",
            "3. Que dentro del panel se vea la escalera y que un usuario INSCRITO no pueda crear trueques (los botones están bloqueados).",
            "Se prueba en dos tamaños de pantalla: ordenador (Chrome) y móvil (como un Pixel 5), porque TrueKeate es móvil primero."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Qué falta confirmar",
          "parrafos": [
            "Pendiente de confirmar: los módulos Inventario, Trueke, Socios y Perfil son espacios reservados cuyo contenido real se completará en una fase posterior; la integración real con el servidor (sesión, verificación KYC y envío de operaciones firmadas) hoy se simula en el panel para demostrar el diseño; el service worker de la PWA (modo sin conexión); y las direcciones de los contratos cargadas en la app corresponden al entorno de pruebas, pues en producción deben cargarse del servidor."
          ],
          "subsecciones": []
        },
        {
          "titulo": "10. Glosario de este manual",
          "parrafos": [
            "Frontend = La parte de la app que ves y tocas (web y móvil) · Landing = Página principal de presentación · Dashboard = Panel personal con tus datos y acciones · Placeholder = Espacio reservado que aún no tiene contenido · PWA = Aplicación web que se puede instalar como app · Service worker = Programa en segundo plano que permite usar la app sin conexión · E2E = Pruebas de principio a fin, como un usuario real · Componente = Pieza de interfaz reutilizable (botón, tarjeta...)",
            "Continúa con el manual 02-Dependencias para conocer las piezas que usa TrueKeate por dentro."
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "01-dependencias",
      "carpeta": "02-Dependencias",
      "titulo": "Las piezas que usa TrueKeate por dentro",
      "resumen": "Explica, en lenguaje sencillo, de qué piezas está hecha TrueKeate por dentro: librerías, dependencias y servicios de las capas de contratos, servidores, app web y servicios externos, con sus versiones y licencias.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "Una app moderna no se construye desde cero: usa piezas ya hechas llamadas librerías o dependencias, como los ingredientes de una receta.",
            "TrueKeate se cocina con estos ingredientes principales:",
            "1. Solidity, el idioma de los contratos, con el compilador fijado en la versión 0.8.24.",
            "2. OpenZeppelin, una caja de piezas de seguridad probadas, en versión 5.0.2.",
            "3. Node.js, el motor de los servidores, con librerías como Express (servidor web) y ethers (puente con la blockchain).",
            "4. Next.js + React + Tailwind para la app web, y TypeScript como red de seguridad.",
            "5. PostgreSQL como base de datos y servicios en la nube de Google (GCP).",
            "Para qué sirve saber esto: cuando TrueKeate se actualiza o algo falla, conocer las piezas ayuda a encontrar la causa, y usar la plataforma da confianza al saber que se apoya en piezas muy usadas y conocidas."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Cómo se leen las versiones",
          "parrafos": [
            "Las versiones se escriben con un formato llamado semver: mayor.menor.parches.",
            "Por ejemplo, ethers ^6.17.0 significa versión 6.17.0 o superior compatible; el símbolo ^ permite actualizaciones menores automáticas.",
            "Para saber la versión exacta instalada se mira el lockfile, que es como el recibo de la compra exacta de las piezas.",
            "TrueKeate, además, fija algunas piezas por commit, una huella digital exacta del código, para que nadie cambie una pieza sin querer."
          ],
          "subsecciones": []
        },
        {
          "titulo": "3. Las piezas de los contratos (capa blockchain)",
          "parrafos": [
            "En la capa blockchain se usan Solidity 0.8.24 como idioma para escribir los contratos inteligentes, Foundry (sin fijar) como taller para crearlos y probarlos, forge-std v1.9.4 como caja de pruebas y OpenZeppelin v5.0.2 como candados y cerraduras estándar."
          ],
          "subsecciones": [
            {
              "titulo": "Qué piezas de OpenZeppelin se usan",
              "parrafos": [
                "Ownable: solo el dueño puede hacer esto, y el dueño es el Owner.",
                "ReentrancyGuard: evita que un contrato sea atacado con trucos de re-llamada.",
                "EIP712 y ECDSA: firma digital segura de mensajes.",
                "MerkleProof: demuestra que algo está en una lista sin mostrar la lista.",
                "ERC20 y ERC721: estándares de criptomonedas y NFTs.",
                "SafeERC20: transferencias de criptos sin sorpresas.",
                "Analogía: OpenZeppelin es como comprar cerraduras certificadas en lugar de inventar la tuya; son piezas revisadas por mucha gente experta."
              ]
            }
          ]
        },
        {
          "titulo": "4. Las piezas de los servidores (capa backend)",
          "parrafos": [
            "En la capa backend se usan Node.js (sin fijar) como motor que ejecuta los servidores, ethers 6.17.0 para hablar con la blockchain, Express 5.2.1 para crear el servidor de la API, express-rate-limit 8.7.0 como freno de peticiones anti-abuso, pg 8.23.0 para conectar con PostgreSQL y supertest 7.2.2 para probar las puertas de la API.",
            "Ejemplo real de para qué sirve express-rate-limit: si alguien lanza miles de peticiones por minuto para saturar la app, este freno corta el abuso."
          ],
          "subsecciones": []
        },
        {
          "titulo": "5. Las piezas de la app web (capa frontend)",
          "parrafos": [
            "La app web se divide en piezas de funcionamiento y piezas de desarrollo, estas últimas solo para quien construye."
          ],
          "subsecciones": [
            {
              "titulo": "5.1 Piezas de funcionamiento",
              "parrafos": [
                "Next.js 16.3.4 es el esqueleto de la web, React 19.2.8 crea las pantallas y react-dom 19.2.8 se encarga de dibujarlas.",
                "ethers 6.17.0 sirve para conectar MetaMask y los contratos."
              ]
            },
            {
              "titulo": "5.2 Piezas de desarrollo (solo para quien construye)",
              "parrafos": [
                "TypeScript 5.9.3 es la red de seguridad contra errores, Tailwind CSS 4.3.3 aporta los estilos visuales, Playwright 1.62.1 hace pruebas automáticas como un usuario real y ESLint 9.39.5 revisa la calidad del código.",
                "Las piezas de desarrollo no llegan a los usuarios: solo ayudan a quien construye a trabajar mejor."
              ]
            }
          ]
        },
        {
          "titulo": "6. Las piezas externas (servicios que no son código)",
          "parrafos": [
            "TrueKeate también depende de servicios: PostgreSQL + PostGIS como base de datos y mapas (reutiliza un servicio en Google Cloud, GCP); IPFS para guardar imágenes y archivos de forma descentralizada (decidido, sin desplegar); OpenStreetMap (OSM) para mapas y rutas del punto de encuentro (decidido, sin integrar); Nodemailer + SMTP para enviar correos y códigos de verificación (decidido, sin integrar); MetaMask como la billetera del usuario (verificado en la app); y GCP Secret Manager para guardar claves secretas (verificado en los scripts).",
            "Varios servicios están decididos en el diseño pero aún no integrados en el código: se marcan como pendiente de confirmar."
          ],
          "subsecciones": []
        },
        {
          "titulo": "7. Licencias: ¿de quién es cada pieza?",
          "parrafos": [
            "Los contratos de TrueKeate usan licencia MIT, que significa código abierto y libre; el backend usa ISC, permisiva y similar a MIT; la app web es privada, sin licencia pública declarada; OpenZeppelin usa MIT y forge-std usa MIT/Apache-2.0, ambas libres.",
            "No se ha hecho una revisión completa legal de las licencias de todas las piezas secundarias (las que traen otras piezas), así que está pendiente de confirmar si el proyecto necesita esa revisión."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Mapa visual: las piezas por capa",
          "parrafos": [
            "El diagrama organiza las piezas por capas: la capa de contratos en blockchain (Solidity 0.8.24, Foundry, OpenZeppelin v5.0.2 y forge-std v1.9.4), la capa de servidores Node.js (ethers, Express, express-rate-limit y pg), la capa de la app web (Next.js, React, Tailwind y ethers) y los servicios externos (PostgreSQL + PostGIS en GCP, GCP Secret Manager, MetaMask e IPFS pendiente).",
            "Las relaciones entre capas: el backend se apoya en los contratos, la web habla con el backend y conecta con MetaMask, y el backend guarda en la base de datos y lee los secretos del Secret Manager."
          ],
          "imagen": "mapa-piezas.svg",
          "subsecciones": []
        },
        {
          "titulo": "9. Qué falta confirmar",
          "parrafos": [
            "Está pendiente de confirmar: fijar la versión de Node.js, fijar la versión de Foundry, conocer la versión del servicio PostgreSQL en la nube, integrar IPFS, los mapas (OSM) y los correos (SMTP), contar con una política escrita de actualización de piezas (no hay robot automático de actualizaciones) y hacer la revisión legal completa de licencias."
          ],
          "subsecciones": []
        },
        {
          "titulo": "10. Glosario de este manual",
          "parrafos": [
            "Dependencia = Pieza de software que otro software usa · Librería = Conjunto de piezas listas para usar · Versión = Número que identifica una edición del código · Lockfile = Recibo con las versiones exactas instaladas · Submódulo = Pieza guardada en otro repositorio, fijada por huella digital · Semver = Formato de versiones: mayor.menor.parche · Licencia = Permiso legal de uso del código · Runtime = El motor que ejecuta el programa (p. ej. Node.js)",
            "Continúa con el manual 04-Despliegue: dónde vive TrueKeate y cómo se actualiza."
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "01-contratos-escrow",
      "carpeta": "03-Implementacion",
      "titulo": "El Escrow: la caja fuerte de tu trueque",
      "resumen": "Manual en lenguaje sencillo del contrato Escrow de TrueKeate: la caja fuerte digital que guarda los objetos de un trueque entre dos personas. Explica con ejemplos cotidianos qué pasa cuando creas, custodias y completas un trueque, incluidos los estados, las disputas, el bloqueo y las sanciones.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "Un trueque en TrueKeate funciona como un trueque de verdad, pero con una caja fuerte digital por medio: nadie puede quedarse con lo suyo sin cumplir su parte. Las 4 ideas básicas son acuerdas, depositan, se encuentran y reciben.",
            "1. Acuerdas: tú y otra persona se ponen de acuerdo en qué intercambian.",
            "2. Depositan: cada uno entrega su objeto a la caja fuerte (el escrow).",
            "3. Se encuentran: confirman que están listos para el intercambio.",
            "4. Reciben: cuando ambos dicen que lo recibieron bien, la caja fuerte entrega a cada uno lo del otro. Nadie se queda sin su parte.",
            "Ejemplo rápido de 5 minutos: Ana ofrece su bicicleta a cambio del curso de fotografía de Bruno. Ana crea el trueque y la caja fuerte queda marcada como CREADO; Ana deposita la bici y Bruno deposita el curso; ambos confirman la entrega; la caja fuerte manda la bici a Bruno y el curso a Ana. Trueque terminado: COMPLETADO.",
            "Si algo sale mal, la caja fuerte no suelta nada hasta que se resuelva (disputa, anulación o bloqueo). Eso es lo que hace segura a la plataforma."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Qué es el escrow y por qué existe",
          "parrafos": [
            "Escrow es la palabra inglesa para depósito en manos de un tercero de confianza. En TrueKeate ese tercero es un contrato inteligente: un programa que vive dentro de la blockchain y que no puede ser engañado ni cambiado a mitad de camino.",
            "Imagina una caja fuerte con dos cerraduras: la caja solo se abre con dos llaves a la vez, la tuya y la de la otra persona; mientras las dos no giren, el contenido está congelado.",
            "Por eso funciona el intercambio entre dos personas (AtoA, a to a): ni tú puedes quedarte con el objeto de Bruno sin entregar el tuyo, ni Bruno con el tuyo sin entregar el suyo.",
            "La blockchain es la única fuente de verdad: el estado del trueque (creado, completado, anulado...) vive en la cadena, no en los servidores de la plataforma. Si la plataforma se apagara, la caja fuerte seguiría guardando todo."
          ],
          "subsecciones": []
        },
        {
          "titulo": "3. Los 9 estados del trueque (con ejemplos cotidianos)",
          "parrafos": [
            "Cada trueque tiene un estado, como una etiqueta que dice en qué momento está. Son nueve estados: CREADO, ACTIVO, CUSTODIADO, APERTURA, EN_DISPUTA, RESOLUCION_SOCIOS, COMPLETADO, ANULADO y BLOQUEADO.",
            "CREADO: se registró el acuerdo y todavía nadie depositó (quedamos en intercambiar, pero aún no llevamos nada). ACTIVO: lo mismo que CREADO, es el nombre antiguo para leer. CUSTODIADO: al menos uno (o ambos) ya depositó su objeto (Ana ya dejó la bici en la caja fuerte). APERTURA: ambos confirmaron que están listos en la ventana de tiempo (los dos llegan a la cita a la hora acordada). EN_DISPUTA: alguien pidió anular el trueque (Bruno dice que el curso no era lo que ofrecía). RESOLUCION_SOCIOS: los Socios están votando qué hacer (un jurado de vecinos está deliberando). COMPLETADO: ambos firmaron y valoraron, se entregó todo en cruz (cada uno tiene lo suyo). ANULADO: se canceló antes de custodiar o por votación, y cada uno recuperó lo suyo. BLOQUEADO: alguien violó una norma y los objetos quedan congelados a la espera de sanción.",
            "Detalle técnico pendiente de confirmar: el estado ACTIVO existe en la lista, pero el programa nunca lo usa al crear un trueque (crea en CREADO); solo lo acepta como estado de entrada en algunas funciones. En la práctica no lo verás en pantalla."
          ],
          "imagen": "estados-escrow.svg",
          "subsecciones": []
        },
        {
          "titulo": "4. Crear un trueque (paso a paso)",
          "parrafos": [
            "Quién puede crearlo: cualquier persona registrada (parte A). La parte A crea el acuerdo ofreciendo su objeto y pidiendo el de la parte B. Pasos:",
            "1. La parte A indica quién es la parte B.",
            "2. Describe su objeto (lo que ofrece) y el objeto que quiere de B.",
            "3. Propone una hora pautada: cuándo se hará el encuentro.",
            "4. El sistema registra el acuerdo y lo marca como CREADO.",
            "5. Se emite una notificación en cadena (un evento llamado TruekeCreado) que sirve para que los vigilantes del sistema lo anoten.",
            "Reglas básicas: no puedes hacerte un trueque a ti mismo; cada objeto debe ser válido (una cripto o token, o un NFT con su número de identificación); no existe un botón para aceptar oferta: la parte B participa directamente depositando su objeto (paso siguiente).",
            "Un NFT es un certificado digital único (como una obra de arte firmada). Una cripto es dinero digital divisible (como monedas fraccionables)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "5. Custodiar: depositar los objetos (paso a paso)",
          "parrafos": [
            "Custodiar significa entregar tu objeto a la caja fuerte. Puede hacerse en cualquier orden: primero uno, luego el otro. Pasos:",
            "1. La parte A deposita su objeto (la bici) con un clic.",
            "2. El sistema pide permiso previo (aprobación) para mover tu objeto: es como firmar una autorización que permite mover tu bici a la caja fuerte.",
            "3. El objeto sale de tu billetera y entra al escrow. El estado pasa a CUSTODIADO.",
            "4. La parte B hace lo mismo con el suyo (el curso).",
            "Reglas importantes: solo el dueño del objeto puede custodiarlo; no puedes depositar dos veces el mismo objeto; cuando los dos objetos están dentro, el trueque está cargado y listo para el encuentro."
          ],
          "subsecciones": []
        },
        {
          "titulo": "6. El encuentro: apertura y la ventana de 10 minutos",
          "parrafos": [
            "Antes de que la caja fuerte entregue nada, ambas partes confirman que están listas. Esto se llama apertura. Las reglas de tiempo son como las de una cita presencial:",
            "Solo puedes confirmar si los dos objetos ya están custodiados: no se abre la puerta con la caja medio vacía.",
            "Debes hacerlo cerca de la hora pautada: como máximo 10 minutos antes o después. Si llegas tarde, el sistema te avisa que estás fuera de la ventana de apertura.",
            "Si el otro ya abrió, tú debes abrir a lo sumo 10 minutos después: es como decir que los dos llegan a la cita con poca diferencia.",
            "Detalle técnico (observación): el programa permite, en rigor, firmar la recepción sin pasar por la apertura si ambos ya depositaron; en la práctica documentada y probada, el paso de apertura existe siempre. La secuencia completa no se impone por fuerza en el contrato: queda como observación, no como fallo."
          ],
          "subsecciones": []
        },
        {
          "titulo": "7. Completar: firmas dobles + valoración (paso a paso)",
          "parrafos": [
            "Para que la caja fuerte se abra hacen falta cuatro gestos:",
            "1. La parte A marca que valoró el trueque (estrella 1-5, opcional en pantalla pero necesaria para cerrar).",
            "2. La parte B marca que valoró el trueque.",
            "3. La parte A firma la recepción: recibió el curso de Bruno y está bien.",
            "4. La parte B firma la recepción: recibió la bici de Ana y está bien.",
            "Cuando las dos valoraciones y las dos firmas están, el sistema libera en cruz: el curso va de la caja fuerte a la billetera de Ana y la bici va de la caja fuerte a la billetera de Bruno. El trueque queda COMPLETADO y nadie puede deshacerlo.",
            "Por qué es seguro: la entrega ocurre después de que ambos firmaron y valoraron, y las dos entregas ocurren en el mismo movimiento. No existe primero tú y luego yo."
          ],
          "imagen": "flujo-truque.svg",
          "subsecciones": []
        },
        {
          "titulo": "8. Cancelar antes de custodiar",
          "parrafos": [
            "Si nadie ha depositado todavía, cualquiera de las dos partes puede cancelar sin problemas: pulsas cancelar y el trueque pasa a ANULADO, sin castigos ni comisiones.",
            "Pero si algo ya está custodiado, no se puede cancelar por las buenas: alguien podría depositar y luego irse. En ese caso, para salir se usa el camino de la disputa (sección siguiente) o se completa el trueque.",
            "Ejemplo: Ana y Bruno quedaron, pero Bruno se arrepintió antes de depositar nada, así que la cancelación es limpia. Si Bruno ya depositó el curso y luego desaparece, no hay botón de me arrepiento: entra la disputa."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Disputas: anulación con votos de Socios (paso a paso)",
          "parrafos": [
            "Si algo se rompe con los objetos ya depositados, cualquiera de las dos partes puede solicitar la anulación y contar su motivo. Pasos:",
            "1. La parte afectada solicita la anulación (solo una vez por trueque).",
            "2. El trueque pasa a EN_DISPUTA. Se abre un plazo de 5 días.",
            "3. Los Socios (miembros con buena reputación de la comunidad) votan a favor o en contra de anular.",
            "4. Regla de votación: se necesitan 2 de cada 3 votos a favor (mayoría cualificada de dos tercios).",
            "5. Si se alcanza el quórum a favor, los objetos vuelven a sus dueños (ANULADO).",
            "6. Si en 5 días no se alcanza, el sistema resuelve por defecto y anula igualmente: nadie queda esperando para siempre.",
            "Puntos importantes: solo se puede pedir anulación si hay objetos custodiados (si no, se cancela directo, ver sección 8); cada Socio vota una sola vez por trueque. Pendiente de confirmar: en el código actual, una vez pedida la anulación el trueque siempre termina en ANULADO (por votos o por plazo); no existe todavía un camino que diga que no se anula y el trueque continúa."
          ],
          "imagen": "disputa-anulacion.svg",
          "subsecciones": []
        },
        {
          "titulo": "10. Bloqueo y sanción (cuando alguien rompe las normas)",
          "parrafos": [
            "Explica cómo se bloquea un trueque cuando se rompen las normas: el bloqueo por el Owner (moderación) y la sanción programada por los Socios con una espera de 6 horas."
          ],
          "subsecciones": [
            {
              "titulo": "10.1 Bloqueo por el Owner (moderación)",
              "parrafos": [
                "El Owner (el administrador de la plataforma) puede bloquear un trueque si se viola una norma.",
                "Los objetos quedan congelados dentro de la caja fuerte.",
                "No se puede bloquear un trueque ya COMPLETADO o ANULADO."
              ]
            },
            {
              "titulo": "10.2 Sanción con espera de 6 horas",
              "parrafos": [
                "Los Socios pueden además programar una sanción:",
                "1. Un Socio programa la sanción (solo en estados BLOQUEADO o en votación).",
                "2. Empieza una espera de 6 horas (el timelock): tiempo para pensar o rectificar.",
                "3. Pasadas las 6 horas, cualquiera puede ejecutarla.",
                "4. El resultado: el trueque queda BLOQUEADO de forma definitiva.",
                "Pendiente de confirmar: la sanción ejecutada por el contrato es el bloqueo definitivo sin liberación de los objetos; no se ha visto en el código un mecanismo que tras la sanción devuelva o redistribuya los objetos congelados. La interpretación económica exacta queda por confirmar."
              ]
            }
          ]
        },
        {
          "titulo": "11. Qué falta confirmar (resumen)",
          "parrafos": [
            "Pendiente de confirmar: el estado ACTIVO nunca se asigna en el código actual (solo se acepta de entrada); la apertura dual no es un requisito mecánico para completar (observación); no existe ruta de rechazo de anulación: toda disputa termina en ANULADO; BLOQUEADO no tiene salida que libere los objetos y la sanción vuelve a BLOQUEADO; la comisión del 1 % de los trueques completados hacia el Fondo de Valor está en el diseño pero no aparece en este contrato (se integra en ciclos posteriores); la conexión del Escrow con el padrón de Socios no se ejecuta en el guion de despliegue actual."
          ],
          "subsecciones": []
        },
        {
          "titulo": "12. Glosario de este manual",
          "parrafos": [
            "Escrow = la caja fuerte digital que guarda los objetos durante el trueque · Contrato inteligente = programa que vive en la blockchain y se ejecuta solo · Trueque AtoA = intercambio directo entre dos personas · Custodiar = depositar tu objeto en la caja fuerte · Apertura = confirmación de ambos de que están listos para el intercambio · Hora pautada = la hora acordada para el encuentro · Firma de recepción = tu declaración de que recibiste tu parte y está bien · Valoración = tu puntuación 1-5 del trueque · Socios = miembros de confianza de la comunidad que votan en disputas · Quórum = número mínimo de votos necesarios para decidir (2 de 3) · Timelock = espera obligatoria antes de ejecutar algo (6 horas en sanciones) · NFT = certificado digital único (obra, coleccionable) · Token o cripto = dinero digital (divisible)"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "02-contratos-identidad",
      "carpeta": "03-Implementacion",
      "titulo": "Tu cuenta inteligente: identidad, verificación y recuperación",
      "resumen": "Manual en lenguaje sencillo de los contratos de identidad (SmartAccount y SmartAccountFactory): qué es tu cuenta inteligente en TrueKeate, qué datos guarda, la escalera de verificación INSCRITO, VERIFICADO y CERTIFICADO, cómo funciona la firma digital y cómo recuperar tu cuenta con 3 guardianes si pierdes el acceso.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "TrueKeate te da una cuenta inteligente (una identidad digital dentro de la blockchain) que hace tres cosas por ti:",
            "1. Te representa: guarda quién eres (tu estado de verificación).",
            "2. Firma por ti: ejecuta acciones solo con tu firma digital.",
            "3. Te protege: si pierdes tu clave, 3 guardianes pueden ayudarte a recuperarla.",
            "Los 3 conceptos clave: verificación (subes por una escalera de confianza: INSCRITO, VERIFICADO, CERTIFICADO; cuanto más subes, más cosas puedes hacer), firma digital (tu firma manuscrita electrónica que demuestra que fuiste tú quien pidió algo) y recuperación (si pierdes el acceso, necesitas que 2 de tus 3 guardianes aprueben la recuperación y esperar 48 horas).",
            "En 5 minutos entiendes la idea: tu cuenta es como un documento de identidad digital con cerradura propia, y tú llevas la llave."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Tu cuenta inteligente: qué es y para qué sirve",
          "parrafos": [
            "En las apps normales, tu cuenta vive en los servidores de la empresa. En TrueKeate, tu identidad vive en la blockchain como un contrato inteligente llamado SmartAccount (cuenta inteligente).",
            "Piénsalo como un casillero personal con tu nombre, con dos ventajas grandes: nadie puede falsificarla (cada acción necesita tu firma digital) y un ayudante puede pagar por ti (como tu cuenta solo actúa cuando firmas, un mensajero o relayer puede enviar la transacción a la red y pagar el gas por ti; así tú no pagas comisiones de red o gas en tus trueques).",
            "Gas es la gasolina que cuesta hacer una operación en la blockchain: normalmente la pagas tú; en TrueKeate, para los particulares, la paga la plataforma por ti."
          ],
          "subsecciones": [
            {
              "titulo": "2.1 La fábrica de cuentas",
              "parrafos": [
                "Las cuentas no se crean solas: existe una fábrica (SmartAccountFactory) que las fabrica una por persona. Gracias a una técnica llamada CREATE2, la dirección de tu cuenta se puede calcular de antemano, sin tener que crearla antes. Esto permite que la plataforma te cree la cuenta sin que tú pagues nada.",
                "Detalle técnico: la fábrica no tiene administrador ni control de acceso: cualquiera puede pedir que se fabrique una cuenta (quien paga el gas). En el flujo real, el que paga es la plataforma."
              ]
            }
          ]
        },
        {
          "titulo": "3. Tu identidad guarda tres datos",
          "parrafos": [
            "Tu cuenta inteligente guarda:",
            "1. Quién eres (owner): la dirección de tu billetera (por ejemplo, la de MetaMask). Es la única que puede firmar.",
            "2. Tu nivel de verificación: un estado de la escalera INSCRITO, VERIFICADO, CERTIFICADO.",
            "3. Una huella de tu verificación (kycMerkleRoot): una marca que demuestra que tu identidad fue comprobada sin revelar tus datos personales. Tu documento y tu selfie nunca se guardan en la blockchain: viven cifrados fuera de ella. En cadena solo queda la prueba.",
            "Regla de privacidad: la blockchain certifica que esta persona pasó la verificación, pero no muestra quién es realmente (nombre, DNI, foto...). Tus datos reales quedan en privado."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. La escalera de verificación: INSCRITO → VERIFICADO → CERTIFICADO",
          "parrafos": [
            "Tu cuenta empieza como INSCRITO (recién registrado) y puede subir peldaños: INSCRITO significa que te registraste con tu billetera (entré a la feria, todavía no me conocen); VERIFICADO, que confirmaste correo y teléfono (etapa 1); CERTIFICADO, que un humano revisó tu documento y selfie (etapa 2).",
            "Cómo se sube, en términos simples:",
            "1. El sistema (backend) comprueba tus datos fuera de la cadena.",
            "2. Te pide que firmes un mensaje: subir mi estado a VERIFICADO.",
            "3. Con tu firma, el sistema actualiza tu cuenta y guarda la nueva huella.",
            "4. La cuenta emite una notificación (evento) para que el resto del sistema se entere.",
            "Pendiente de confirmar: el contrato acepta cualquier cambio de estado si está firmado por ti, incluso bajar de CERTIFICADO a INSCRITO o saltar directo a CERTIFICADO; la escalera en orden correcto la controla el backend (fuera del contrato). Cómo se garantiza esa secuencia en el backend está pendiente de confirmar."
          ],
          "subsecciones": [
            {
              "titulo": "4.1 Comprobar la huella (prueba de inclusión)",
              "parrafos": [
                "Cualquiera puede comprobar que tu huella pertenece al árbol de verificados on-chain usando la función verificarInclusion. Es como enseñar el sello de autenticidad de tu documento: se puede verificar sin abrir el documento."
              ],
              "imagen": "escalera-verificacion.svg"
            }
          ]
        },
        {
          "titulo": "5. La firma digital: cómo demuestra que fuiste tú",
          "parrafos": [
            "Tu cuenta ejecuta acciones solo con tu firma. La firma se hace con tu billetera (MetaMask u otra) sobre un mensaje con formato estándar llamado EIP-712. Piénsalo como un cheque firmado:",
            "1. La app te muestra que vas a ejecutar esta acción en tu cuenta.",
            "2. Tu billetera te pide firmar (como estampar tu rúbrica).",
            "3. La firma viaja a la plataforma (no necesitas pagar gas).",
            "4. Un mensajero lleva tu firma a la blockchain.",
            "5. Tu cuenta comprueba que la firma es tuya y ejecuta la acción."
          ],
          "subsecciones": [
            {
              "titulo": "5.1 El número de un solo uso (nonce)",
              "parrafos": [
                "Cada firma lleva un número de orden (nonce). Sirve para que una firma no se pueda usar dos veces (anti-replay): si alguien copiara tu firma, al intentar usarla otra vez el sistema diría que este número ya se usó y la firma es inválida.",
                "Es como numerar los cheques: el cheque número 5 no vale dos veces."
              ]
            },
            {
              "titulo": "5.2 ¿Qué se necesita para que te firmen?",
              "parrafos": [
                "Tu cuenta verifica que la firma corresponde a tu owner. Si la firma no es tuya, la operación se rechaza con FirmaInvalida.",
                "Pendiente de confirmar: el contrato no exige por sí mismo un nivel mínimo de verificación para ejecutar acciones. La regla de que solo las cuentas verificadas pueden operar la aplica el mensajero (relayer) en el backend como protección anti-abuso. Esa política vive fuera del contrato."
              ],
              "imagen": "firma-digital.svg"
            }
          ]
        },
        {
          "titulo": "6. Recuperar tu cuenta con 3 guardianes (paso a paso)",
          "parrafos": [
            "Si pierdes tu clave o te roban el teléfono, no pierdes tu identidad: tus guardianes (personas de confianza) pueden ayudarte. Es la recuperación social: como pedir a 3 amigos que confirmen que tú eres tú.",
            "Reglas de oro: la recuperación solo cambia quién es el dueño de la cuenta; la recuperación nunca mueve objetos ni dinero: solo entrega la llave a la nueva persona."
          ],
          "subsecciones": [
            {
              "titulo": "6.1 Designar guardianes (una sola vez, para siempre)",
              "parrafos": [
                "1. Siendo el dueño, eliges 3 guardianes (amigos, familiares).",
                "2. Deben ser personas distintas, y no puedes ser tu propio guardián.",
                "3. Esta elección es definitiva: una vez fijados, no se pueden cambiar. Es una protección: un ladrón no podría cambiar a tus guardianes durante un ataque."
              ]
            },
            {
              "titulo": "6.2 Proponer la recuperación",
              "parrafos": [
                "Cuando pierdes el acceso:",
                "1. Un guardián (o tú mismo con uno de ellos) propone al nuevo dueño.",
                "2. Cada guardián aprueba la propuesta. Se necesitan 2 de 3.",
                "3. Al alcanzar 2 aprobaciones, empieza una espera de 48 horas."
              ]
            },
            {
              "titulo": "6.3 La espera de 48 horas (para pensar y abortar)",
              "parrafos": [
                "Las 48 horas son el tiempo de reacción: si tú (el dueño legítimo) recuperas tu clave durante la espera, puedes cancelar la recuperación y todo vuelve a la normalidad.",
                "Solo puedes cancelar si la propuesta ya tiene las 2 aprobaciones.",
                "Pendiente de confirmar (observación): mientras la propuesta no llegue a 2 guardianes, el dueño no puede cancelarla por esta vía."
              ]
            },
            {
              "titulo": "6.4 Ejecutar la recuperación",
              "parrafos": [
                "Pasadas las 48 horas, cualquiera puede ejecutar el cambio (el sistema o un mensajero lo hace automáticamente):",
                "1. El nuevo dueño queda registrado.",
                "2. La cuenta emite la notificación OwnerActualizado.",
                "3. El resto del sistema (vigilantes, app) se entera y actualiza tus datos.",
                "Observación técnica (para auditoría): el sistema de votos acumula las aprobaciones de los guardianes sin comprobar que todos aprueben al mismo nuevo dueño. Con 2 aprobaciones de guardianes distintos basta para arrancar la espera hacia el dueño del último que aprobó. Es un comportamiento verificable del código, señalado para revisión."
              ],
              "imagen": "recuperacion-cuenta.svg"
            }
          ]
        },
        {
          "titulo": "7. Qué falta confirmar (resumen)",
          "parrafos": [
            "Pendiente de confirmar: la elección de guardianes es de una sola vez y no permite cambios posteriores (decisión de diseño documentada en el código); la secuencia de la escalera INSCRITO, VERIFICADO, CERTIFICADO no se impone dentro del contrato y depende del backend; no hay límite on-chain de qué acciones permite cada estado de verificación (por ejemplo, máximo 3 trueques activos) y la política se aplica en el backend; la firma móvil de la app (deep-link a la billetera móvil) está comentada como delegación a la wallet en la PWA, sin código aún. Las pruebas del contrato (14 casos en SmartAccount.t.sol) cubren fábrica, firma con nonce, escalera por huella y recuperación social."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Glosario de este manual",
          "parrafos": [
            "Cuenta inteligente = tu identidad digital en la blockchain · Owner = el dueño de la cuenta (tu billetera) · Fábrica de cuentas = el contrato que crea cuentas, una por persona · Firma digital = tu rúbrica electrónica que autoriza una acción · EIP-712 = formato estándar y legible para firmar mensajes · Nonce = número de un solo uso que evita firmas repetidas · Escalera de verificación = INSCRITO, VERIFICADO, CERTIFICADO · Huella (merkle root) = prueba de verificación sin revelar tus datos · Guardianes = personas de confianza que ayudan a recuperar la cuenta · Umbral = número mínimo de aprobaciones (2 de 3) · Timelock = espera obligatoria (48 horas en recuperación) · Gas = gasolina que cuesta operar en la blockchain"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "03-contratos-finanzas",
      "carpeta": "03-Implementacion",
      "titulo": "Las finanzas de TrueKeate: BRLT, el Fondo de Valor y las empresas",
      "resumen": "Manual en lenguaje sencillo de los contratos de finanzas y gobernanza de TrueKeate: el padrón de Socios, la moneda BRLT, el Fondo de Valor y las suscripciones de empresa. Explica sin tecnicismos cómo se mueve el dinero de la plataforma.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "TrueKeate tiene su propia moneda digital y un fondo común para pagar los gastos de funcionamiento. Las piezas son cuatro:",
            "1. BRLT: la moneda de la plataforma (se llama BorloTokens).",
            "2. Fondo de Valor: la hucha que paga los gastos de operación.",
            "3. Padrón de Socios: la lista de miembros de confianza que votan las decisiones económicas.",
            "4. Suscripción de empresa: cómo las empresas pagan por estar en la plataforma.",
            "Las 3 ideas en 5 minutos: la moneda no se puede imprimir sin control (hay un tope máximo de 1.000.000 BRLT y emitir más exige votación de los Socios); cada vez que se crea moneda o una empresa se suscribe, un porcentaje va a la hucha común (el Fondo de Valor); las empresas no pagan cada mes con transferencia: bloquean su pago por adelantado (staking) y el sistema cobra solo la parte del mes."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Las cuatro piezas y cómo se conectan",
          "parrafos": [
            "Las piezas son: BRLT, la moneda de la plataforma, sirve para pagar suscripciones y recibir reembolsos; el Fondo de Valor, la hucha común, paga los gastos (servidores, gas, red); el padrón de Socios es la lista con votaciones para aprobar Socios nuevos y decisiones de dinero; la suscripción de empresa es un contrato de cobro por bloqueo con el que las empresas pagan su plan con BRLT bloqueados.",
            "Las piezas se conectan entre sí al desplegarse, como enchufar los aparatos de una casa: la moneda se conecta con el padrón (quién puede mandar emitir) y con el fondo (a dónde va el 5 %); el fondo se conecta con la moneda (para recibir y guardar); el padrón se conecta con la moneda (para ejecutar votaciones); las suscripciones se conectan con la moneda y con el fondo.",
            "Conexión pendiente: el Escrow (la caja fuerte de los trueques) también debería conectarse con el padrón de Socios para las disputas, pero esa conexión no se ejecuta en el guion de despliegue actual: pendiente de confirmar (ver manual 01)."
          ],
          "imagen": "arquitectura-financiera.svg",
          "subsecciones": []
        },
        {
          "titulo": "3. El padrón de Socios: quién decide y cómo vota",
          "parrafos": [
            "El padrón de Socios reúne a los miembros de confianza que votan las decisiones: esta sección explica qué es un Socio, cómo se admite a uno nuevo por votación y cómo se toman las propuestas económicas."
          ],
          "subsecciones": [
            {
              "titulo": "3.1 ¿Qué es un Socio?",
              "parrafos": [
                "Un Socio es un miembro de la comunidad con buena reputación (puntaje alto) que puede: votar la admisión de Socios nuevos; votar propuestas económicas (emitir moneda, subir el tope); y votar en las disputas de trueques (ver manual 01).",
                "La lista de Socios la administra el Owner (el administrador de la plataforma): alta directa, el Owner puede admitir a alguien como Socio (caso fundacional); y baja, el Owner puede quitar a un Socio."
              ]
            },
            {
              "titulo": "3.2 Cómo se admite un Socio nuevo (por votación)",
              "parrafos": [
                "1. El candidato se postula solo (debe tener puntaje mayor o igual a 76, comprobado fuera de la cadena).",
                "2. Los Socios votan a favor o en contra.",
                "3. Regla: 2 de cada 3 votos a favor (mayoría cualificada).",
                "4. Si se alcanza, el candidato se admite automáticamente.",
                "Pendiente de confirmar: el requisito del puntaje mayor o igual a 76 se valida fuera de la blockchain; el mecanismo exacto que lo garantiza en el backend está pendiente de confirmar."
              ]
            },
            {
              "titulo": "3.3 Propuestas económicas",
              "parrafos": [
                "Las decisiones de dinero se toman por votación:",
                "1. El Owner crea la propuesta (por ejemplo: emitir 50.000 BRLT para un programa).",
                "2. Los Socios votan (cada uno, una sola vez por propuesta).",
                "3. Al alcanzar 2 de 3 votos a favor, la propuesta se ejecuta sola: el sistema manda la orden a la moneda (emitir) o sube el tope.",
                "Pendiente de confirmar: una propuesta sin suficientes votos se queda abierta para siempre (no expira) y no existe ejecutar después si ya se aprobó: la ejecución ocurre en el momento en que el último voto alcanza el quórum. Además, solo el Owner puede crear propuestas."
              ]
            }
          ]
        },
        {
          "titulo": "4. BRLT: la moneda de la plataforma (paso a paso)",
          "parrafos": [
            "La moneda de la plataforma es BRLT (BorloTokens): esta sección explica sus características y qué pasa, paso a paso, cuando se emite moneda nueva."
          ],
          "subsecciones": [
            {
              "titulo": "4.1 Características",
              "parrafos": [
                "Es una moneda digital estándar (ERC-20) llamada BorloTokens.",
                "Tiene un tope de emisión inicial de 1.000.000 BRLT.",
                "Para emitir más moneda hace falta una votación de los Socios (no puede decidirlo una sola persona).",
                "Solo el padrón de Socios puede dar la orden de emitir: la moneda rechaza órdenes de cualquiera que no sea el padrón."
              ]
            },
            {
              "titulo": "4.2 Qué pasa cuando se emite moneda",
              "parrafos": [
                "Cuando los Socios aprueban emitir, por ejemplo, 100.000 BRLT:",
                "1. La moneda comprueba que la orden viene del padrón.",
                "2. Comprueba el tope: si los 100.000 caben dentro del máximo. Si no, se rechaza con un aviso de que excede el tope.",
                "3. El 5 % va a la hucha común (Fondo de Valor): 5.000 BRLT.",
                "4. El resto (95.000 BRLT) va al destinatario de la emisión.",
                "5. La emisión queda registrada con su propósito y su fecha (transparencia total).",
                "Ejemplo cotidiano: el ayuntamiento decide crear vales para un programa; automáticamente, el 5 % de los vales impresos se reserva para los gastos del propio programa."
              ],
              "imagen": "emision-brlt.svg"
            }
          ]
        },
        {
          "titulo": "5. El Fondo de Valor: la hucha común",
          "parrafos": [
            "El Fondo de Valor guarda BRLT para pagar los gastos de operación: servidores (hosting), gas de la red, etc. Se nutre de tres fuentes: trueques completados (el 1 % de cada trueque que termina bien; pendiente de confirmar, sin implementar); suscripciones de empresa (el 10 % de cada ciclo mensual de las empresas; sí funciona hoy); y emisión de BRLT (el 5 % de cada emisión aprobada; sí funciona hoy).",
            "Cómo entran los fondos (fuentes 2 y 3): por emisión, la moneda mintea el 5 % directamente al fondo y avisa; por suscripción, la empresa bloquea BRLT y cada mes el sistema mueve el 10 % hacia el fondo (con tu aprobación previa automática).",
            "Cómo salen los fondos: solo el Owner puede retirar BRLT del fondo, y solo para gastos de operación de la plataforma. Cada retiro queda registrado.",
            "Pendiente de confirmar: la fuente 1 (el 1 % de los trueques) está declarada en el diseño, pero ningún contrato la ejecuta todavía: ni el Escrow ni el Fondo tienen la función que calcule y deposite ese 1 %; se espera en ciclos posteriores. Además, el depósito voluntario siempre se registra como suscripción (fuente 2) aunque lo haga otra fuente autorizada."
          ],
          "subsecciones": []
        },
        {
          "titulo": "6. Suscripción de empresas: pagar bloqueando (paso a paso)",
          "parrafos": [
            "Las empresas no pagan cada mes con una transferencia nueva: en su lugar, bloquean su pago por adelantado. Se llama staking bloqueado: dejas el dinero aparcado y el sistema solo cobra lo que corresponde."
          ],
          "subsecciones": [
            {
              "titulo": "6.1 Suscribirse (el primer mes)",
              "parrafos": [
                "1. La empresa elige el plan (el plan base son 100 BRLT al mes).",
                "2. La empresa aprueba que el contrato mueva BRLT (autorización única).",
                "3. El contrato transfiere los 100 BRLT del primer ciclo a su casillero y los retiene 30 días.",
                "4. La empresa queda ACTIVA. Ya no tendrá que firmar cada mes.",
                "Ejemplo cotidiano: pagas el gimnasio dejando el dinero en una taquilla; el gimnasio cobra de ahí cada mes sin que tengas que ir a pagar."
              ]
            },
            {
              "titulo": "6.2 Cada mes (el ciclo de 30 días)",
              "parrafos": [
                "Cuando vencen los 30 días, un vigilante del sistema recolecta el ciclo:",
                "1. Comprueba que han pasado los 30 días (si no, ciclo no vencido).",
                "2. Del mes (100 BRLT), el 10 % va al Fondo de Valor (10 BRLT).",
                "3. El 90 % restante se queda en el contrato como fondos de operación de la plataforma.",
                "4. Se reinicia el contador del nuevo ciclo (otros 30 días).",
                "Puntos importantes (comportamiento real del código): la empresa no vuelve a aprobar por cada mes (la autorización inicial basta); el bloqueo original no se gasta ni se repone por ciclo (el contrato solo mueve el 10 % mensual hacia el fondo).",
                "Pendiente de confirmar: el diseño dice que si el saldo del contrato no cubre el próximo ciclo, la suscripción pasa a IRREGULAR, pero esa comprobación no está implementada: no hay transición automática a IRREGULAR. El único camino a IRREGULAR hoy es la llamada manual del Owner."
              ]
            },
            {
              "titulo": "6.3 Cancelar la suscripción",
              "parrafos": [
                "La empresa puede cancelar en cualquier momento:",
                "1. Solo si está ACTIVA.",
                "2. El contrato devuelve los 100 BRLT bloqueados (el monto completo).",
                "3. La empresa pasa a CANCELADA.",
                "Pendiente de confirmar: la devolución entrega el monto completo sin descontar los días ya usados del ciclo (sin prorrateo). Además, si los ciclos previos ya vaciaron el casillero (10 % por varios meses hacia el fondo), la devolución podría fallar por falta de saldo. La política exacta de devolución está pendiente de confirmar."
              ],
              "imagen": "ciclo-suscripcion.svg"
            }
          ]
        },
        {
          "titulo": "7. Orden de despliegue (cómo se monta todo)",
          "parrafos": [
            "Al desplegar el sistema, el guion crea las piezas en este orden:",
            "1. La caja fuerte de trueques (Escrow).",
            "2. La fábrica de cuentas.",
            "3. Monedas y NFT de prueba.",
            "4. BRLT, Fondo de Valor, Padrón de Socios y Suscripción de empresa.",
            "5. Conecta las piezas entre sí (las seis conexiones enchufe).",
            "El Owner es la cuenta 0 del entorno de pruebas (la cuenta principal)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Qué falta confirmar (resumen)",
          "parrafos": [
            "Pendiente de confirmar: el 1 % de los trueques completados hacia el fondo no tiene implementación en ningún contrato; el depósito voluntario en el fondo se registra siempre como fuente 2 (suscripción) aunque venga de otra fuente (observación); la recolección mensual no comprueba saldo ni detecta fallos repetidos (los contadores de fallos están declarados pero sin uso); la cancelación de suscripción devuelve el monto íntegro sin prorrateo y puede fallar si el casillero quedó vacío; las propuestas económicas sin quórum no expiran y no hay ejecución diferida (solo el Owner crea propuestas); el puntaje mayor o igual a 76 para ser Socio se valida fuera de la cadena. Los tests (319 líneas en Ciclo3.t.sol) cubren: admisión por quórum, emisión con tope y 5 % al fondo, suscripción con 10 % al fondo y porcentajes configurables."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Glosario de este manual",
          "parrafos": [
            "BRLT = la moneda digital de la plataforma (BorloTokens) · Stablecoin = moneda digital pensada para valer siempre lo mismo · Fondo de Valor = la hucha común que paga los gastos de operación · Padrón de Socios = la lista oficial de Socios de la comunidad · Quórum = votos mínimos para decidir (2 de 3) · Tope de emisión = límite máximo de moneda que puede existir · Emisión = crear moneda nueva · Staking bloqueado = dejar dinero retenido por adelantado · Ciclo = período de cobro (30 días) · Prorrateo = descontar solo la parte usada del tiempo · Socio = miembro de confianza con derecho a voto · ERC-20 = estándar común de las monedas digitales"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "04-backend-indexador",
      "carpeta": "03-Implementacion",
      "titulo": "El vigilante (indexador): cómo se anota cada movimiento",
      "resumen": "Explica cómo el indexador (el vigilante de TrueKeate) se entera de todo lo que pasa en la blockchain: lee los avisos o eventos que emiten los contratos y los copia a la base de datos PostgreSQL para que la app consulte rápido. Detalla cómo trabaja paso a paso, la regla de oro para no duplicar anotaciones, el checkpoint, el retraso, la reconciliación, los contratos que vigila y qué queda pendiente de confirmar.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "En TrueKeate, la blockchain es el libro oficial donde ocurre todo: los trueques se crean, se custodian y se completan. Pero leer ese libro es lento y caro, por eso existe el vigilante (indexador).",
            "1. Mira la blockchain constantemente.",
            "2. Detecta los avisos (eventos) que emiten los contratos: trueque creado, objeto custodiado, trueque completado...",
            "3. Copia cada aviso en la base de datos de la plataforma (PostgreSQL), donde la app puede consultarlo al instante.",
            "4. No escribe nunca en la blockchain: solo lee de la cadena y escribe en la base de datos.",
            "En 5 minutos: el vigilante es como un secretario que lee el acta oficial y va anotando en el cuaderno de la oficina cada cosa que pasa, para que cualquiera de la oficina pueda consultar el cuaderno al momento."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Qué es un evento (y por qué avisan)",
          "parrafos": [
            "Cuando un contrato inteligente hace algo importante, emite un aviso (evento). Es como cuando en una obra de teatro cambian de escena y el apuntador anuncia el cambio.",
            "Avisos que emite la caja fuerte (Escrow): TruekeCreado (se creó un trueque), CustodiaA y CustodiaB (alguien depositó su objeto), AperturaA y AperturaB (alguien confirmó que está listo), TruekeCompletado (el trueque terminó bien), TruekeCancelado (se canceló el trueque), EscrowBloqueado (el trueque quedó bloqueado) y AnulacionSolicitada, VotoSocio y otros movimientos de una disputa.",
            "También avisan las cuentas inteligentes (verificación, cambio de dueño), el padrón de Socios (nuevo Socio), la moneda BRLT (emisiones) y las suscripciones de empresa."
          ],
          "subsecciones": []
        },
        {
          "titulo": "3. Cómo trabaja el vigilante (paso a paso)",
          "parrafos": [
            "El vigilante es un programa escrito en el lenguaje JavaScript que corre así:",
            "1. Se despierta: puede hacer una pasada única o quedarse en modo servicio revisando cada 5 segundos (por defecto).",
            "2. Pregunta a la blockchain si hay avisos nuevos de estos contratos.",
            "3. Por cada aviso: comprueba si ya lo anotó antes (para no duplicar; ver sección 4), lo interpreta (qué contrato, qué acción, quién participó), lo aplica actualizando la copia espejo en la base de datos (por ejemplo, cambia el estado del trueque a COMPLETADO) y lo registra en la tabla de auditoría (el historial imborrable).",
            "4. Anota hasta dónde llegó (checkpoint) para saber por dónde iba.",
            "5. Mide su retraso: cuántos avisos lleva pendientes.",
            "Si un aviso falla al aplicarse, no rompe la ronda: lo marca como fallido, avisa y sigue con el siguiente."
          ],
          "imagen": "indexador-flujo.svg",
          "subsecciones": []
        },
        {
          "titulo": "4. La regla de oro: nunca duplicar (idempotencia)",
          "parrafos": [
            "La blockchain puede repetir información y el vigilante puede releer avisos ya vistos. Para no anotar dos veces lo mismo usa dos frenos:",
            "1. Antes de anotar pregunta si ese aviso (transacción + posición + contrato) ya está en la auditoría; si sí, lo salta.",
            "2. La base de datos lo prohíbe por diseño: hay una regla (constraint) que impide guardar dos veces la misma combinación.",
            "Resultado: aunque el vigilante lea 100 veces el mismo aviso, en la base de datos solo queda una anotación."
          ],
          "subsecciones": []
        },
        {
          "titulo": "5. Dónde anota cada cosa (el espejo)",
          "parrafos": [
            "El vigilante actualiza una copia espejo de lo que pasa en la cadena. Resumen de dónde anota cada aviso: los de trueque creado, custodiado, apertura, completado, cancelado o bloqueado van a la tabla truekes y actualizan el estado del trueque (CREADO → CUSTODIADO → ... → COMPLETADO); Apertura A y B anotan en truekes la hora en que cada parte confirmó; la huella de verificación actualizada va a la tabla kyc; el cambio de dueño o la recuperación ejecutada van a la tabla usuarios (tu nueva billetera o wallet); un nuevo Socio admitido hace que tu tipo pase a SOCIO en usuarios; una emisión de BRLT suma el monto emitido en la tabla finanzas; y una empresa suscrita crea la suscripción con su ciclo de 30 días en la tabla suscripciones.",
            "Los estados del trueque en la base de datos son los mismos 9 estados del manual 01: CREADO, ACTIVO, CUSTODIADO, APERTURA, EN_DISPUTA, RESOLUCION_SOCIOS, COMPLETADO, ANULADO, BLOQUEADO."
          ],
          "subsecciones": []
        },
        {
          "titulo": "6. El checkpoint: saber por dónde iba",
          "parrafos": [
            "El vigilante guarda un marcador por contrato: ya leí hasta el bloque número X. Ese marcador se llama checkpoint.",
            "Sirve para dos cosas:",
            "1. Saber su retraso (lag): la diferencia entre el último bloque de la cadena y el checkpoint.",
            "2. Poder releer desde un punto si algo se pierde (reproceso).",
            "Pendiente de confirmar: en el código actual, en modo servicio el vigilante vuelve a preguntar desde el bloque 0 en cada ronda (no usa el checkpoint para continuar desde donde quedó). La duplicación está evitada por la regla de oro de la sección 4, pero la lectura completa en cada ronda gasta más recursos. El avance incremental desde el checkpoint está pendiente de confirmar en ciclos posteriores."
          ],
          "subsecciones": []
        },
        {
          "titulo": "7. El retraso y la reconciliación",
          "parrafos": [
            "La sección trata de cómo el vigilante mide su retraso (lag) y de cómo comprueba que la copia espejo es fiel a lo que ocurre en la cadena."
          ],
          "subsecciones": [
            {
              "titulo": "7.1 Medir el retraso (lag)",
              "parrafos": [
                "El vigilante calcula y reporta su retraso, por ejemplo: la cadena va en el bloque 1.000 y yo voy por el 950; llevo 50 bloques de retraso.",
                "El panel del Owner muestra estas métricas para detectar si el vigilante va atrasado."
              ]
            },
            {
              "titulo": "7.2 Reconciliar (comprobar que el espejo es fiel)",
              "parrafos": [
                "De vez en cuando, el vigilante cuenta su espejo: cuántos trueques tiene anotados y cuándo se actualizaron por última vez.",
                "La comparación fina (estado real en la cadena frente al estado en el espejo, trueque por trueque) está prevista pero no implementada, por lo que queda pendiente de confirmar."
              ]
            }
          ]
        },
        {
          "titulo": "8. Qué vigila el vigilante (contratos cubiertos)",
          "parrafos": [
            "El vigilante escucha 5 contratos:",
            "1. Escrow (la caja fuerte de trueques).",
            "2. SmartAccount (las cuentas inteligentes).",
            "3. SociosRegistry (el padrón de Socios).",
            "4. BRLT (la moneda).",
            "5. SuscripcionEmpresa (las suscripciones).",
            "Los contratos están registrados en un archivo de configuración (contratos.json) con su dirección y su manual de instrucciones (ABI), para que el vigilante sepa interpretar cada aviso.",
            "Pendiente de confirmar: muchos avisos existen en la cadena pero aún no están mapeados en el vigilante: los de disputas y votaciones (VotoSocio, ResolucionEjecutada, SancionProgramada...), las firmas de recepción, las valoraciones y los movimientos de la moneda (Transfer). Su efecto sobre las tablas de disputas, valoraciones o imágenes certificadas no está implementado todavía."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. La base de datos por dentro (sin miedo)",
          "parrafos": [
            "El vigilante guarda en una base de datos llamada PostgreSQL, con 14 tablas (hojas de cálculo organizadas): usuarios, verificación, artículos, trueques, valoraciones, puntos de encuentro, disputas, imágenes certificadas, suscripciones, campañas, subastas, finanzas, auditoría y checkpoints.",
            "De esas 14, el vigilante escribe 7 (trueques, usuarios, verificación, finanzas, suscripciones, auditoría y checkpoint).",
            "Las otras 7 las escribe el backend (la API) con datos de la app: artículos, valoraciones, disputas, subastas... (ver manual 06).",
            "La tabla auditoría es el historial que solo crece (append-only): nunca se borra ni se modifica lo anotado. Ahí queda la huella de cada evento: quién, qué, cuándo y en qué transacción."
          ],
          "subsecciones": []
        },
        {
          "titulo": "10. Cómo se enciende el vigilante",
          "parrafos": [
            "Hay dos modos:",
            "1. Una pasada rápida: revisa todo una vez y termina (se ejecuta con: node backend/indexador-cli.js).",
            "2. Modo servicio (vigilante de guardia): revisa cada 5 segundos sin parar (se ejecuta con: node backend/indexador-cli.js --watch).",
            "Configuración por variables de entorno con valores por defecto: RPC_URL (por defecto http://127.0.0.1:8545) indica dónde está la blockchain (en pruebas: anvil); DATABASE_URL (PostgreSQL local) indica dónde está la base de datos; INTERVALO_MS (por defecto 5000) indica cada cuánto revisa en modo servicio; DESDE_BLOQUE (por defecto 0) indica desde qué bloque empieza a leer."
          ],
          "subsecciones": []
        },
        {
          "titulo": "11. Qué falta confirmar (resumen)",
          "parrafos": [
            "Pendiente de confirmar: no hay suscripción en tiempo real (solo se activa por intervalo o pasada manual); no se manejan las reorganizaciones de la cadena; la reconciliación fina trueque por trueque no está implementada; el avance incremental desde el checkpoint no está implementado (siempre relee desde el bloque configurado); la cobertura de eventos es parcial (disputas, valoraciones y sanciones no se reflejan aún en sus tablas); y en los tests no se conecta PostgreSQL real (se simula), por lo que la ejecución real contra la base de datos no se verificó en este entorno. Los 5 tests del vigilante están verificados (5/5 verdes) con simulaciones en memoria (ver manual 08)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "12. Glosario de este manual",
          "parrafos": [
            "Indexador = el vigilante que copia eventos de la cadena a la base de datos · Evento = aviso que emite un contrato cuando algo importante ocurre · Blockchain = el libro oficial e imborrable donde ocurre todo · Base de datos (PostgreSQL) = el cuaderno donde la app consulta rápido · Espejo = copia de los estados de la cadena para consulta rápida · Auditoría = historial que solo crece, con cada evento anotado · Idempotencia = regla que evita anotar dos veces el mismo evento · Checkpoint = marcador de hasta aquí leí · Lag (retraso) = cuántos bloques lleva el vigilante de retraso · Reconciliación = comprobar que el espejo coincide con la cadena · ABI = el manual de instrucciones de un contrato · Bloque = página del libro de la blockchain"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "05-backend-relayer",
      "carpeta": "03-Implementacion",
      "titulo": "El mensajero (relayer): quién paga el gas y qué hacer si falla",
      "resumen": "Explica qué es el relayer o mensajero de TrueKeate: el encargado de pagar el gas (la gasolina de la blockchain) de las operaciones de los particulares. Detalla quién paga el gas, las 5 protecciones contra abusos, qué pasa al enviar una operación, el termómetro de salud y métricas, el plan B si el mensajero falla, los datos que recuerda y qué queda pendiente de confirmar.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "Hacer una operación en la blockchain cuesta gas (una pequeña comisión en cripto). En TrueKeate, si eres particular no pagas ese gas: lo paga la plataforma por ti. El encargado de hacerlo es el mensajero (relayer).",
            "Cómo funciona en 5 minutos:",
            "1. Tú quieres hacer algo: custodiar un objeto, firmar una recepción...",
            "2. La app te pide firmar la petición (con MetaMask u otra billetera).",
            "3. Tú firmas sin pagar nada.",
            "4. El mensajero recoge tu firma, la lleva a la blockchain y paga el gas.",
            "5. Tu cuenta inteligente comprueba tu firma y ejecuta la acción.",
            "El mensajero cuida el dinero de la plataforma con 5 protecciones:",
            "1. Comprueba que la petición viene de la red correcta.",
            "2. Comprueba que no sea una firma repetida (número de un solo uso).",
            "3. Solo ayuda a usuarios verificados (lista de permitidos).",
            "4. Límite de 20 ayudas por persona y día.",
            "5. Si alguien provoca 3 fallos en 10 minutos, queda bloqueado 1 hora."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Quién paga el gas (y quién no)",
          "parrafos": [
            "Si eres particular (tú), el gas lo paga la plataforma (el mensajero), para que truequear sea gratis y fácil (sin gas). Si eres empresa, el gas lo paga la propia empresa, porque las empresas ya operan con sus propias cuentas.",
            "Las empresas envían sus transacciones directamente a la blockchain, pagando su propio gas. El mensajero solo se ocupa de los particulares.",
            "El mensajero paga desde una billetera propia (la cuenta 1 del entorno de pruebas). Esa billetera necesita tener saldo: si baja de 0,5 ETH, el sistema avisa al Owner para que la recargue y los trueques no se queden sin gasolina."
          ],
          "imagen": "relayer-meta-tx.svg",
          "subsecciones": []
        },
        {
          "titulo": "3. Las 5 protecciones del mensajero (paso a paso)",
          "parrafos": [
            "Las cinco protecciones que aplica el mensajero a cada petición firmada antes de enviarla y pagar el gas, explicadas paso a paso."
          ],
          "subsecciones": [
            {
              "titulo": "Protección 1: ¿Vienes de la red correcta?",
              "parrafos": [
                "Cada petición firmada menciona a qué red pertenece (por ejemplo, la red de pruebas 31337). Si alguien intenta usar una firma de otra red, se rechaza: cadena incorrecta.",
                "Ejemplo: un cheque emitido en un banco de otro país no se puede cobrar en este banco."
              ]
            },
            {
              "titulo": "Protección 2: ¿Es una firma nueva? (número de un solo uso)",
              "parrafos": [
                "Cada petición lleva un número de orden (nonce). El mensajero recuerda los números ya usados.",
                "Si llega una petición con un número antiguo o repetido, se rechaza (anti-replay): esta firma ya se usó. Así, una firma robada no sirve para repetir la operación.",
                "Pendiente de confirmar: la comprobación del número se hace en un registro local del mensajero (en memoria). La validación estricta contra el número consumido en tu cuenta inteligente de la blockchain está prevista en el diseño pero no implementada."
              ]
            },
            {
              "titulo": "Protección 3: ¿Estás en la lista de permitidos? (verificado)",
              "parrafos": [
                "El mensajero comprueba en la blockchain si tu cuenta está verificada:",
                "1. Busca tu cuenta inteligente en la fábrica de cuentas.",
                "2. Lee tu estado de verificación (INSCRITO, VERIFICADO o CERTIFICADO).",
                "3. Si estás solo INSCRITO (recién registrado), te rechaza: signer no verificado. Debes subir al menos a VERIFICADO para operar.",
                "Ejemplo: el mensajero es como un repartidor que solo entrega paquetes a personas con identificación comprobada."
              ]
            },
            {
              "titulo": "Protección 4: Límite diario de 20 operaciones",
              "parrafos": [
                "El mensajero cuenta cuántas veces ayuda a cada persona al día: máximo 20 meta-operaciones por persona y día.",
                "Al llegar a 20, te avisa: límite diario superado, vuelve mañana.",
                "Es una medida anti-abuso: evita que alguien use el mensajero (que paga el gas) para miles de operaciones sin coste."
              ]
            },
            {
              "titulo": "Protección 5: Bloqueo tras fallos repetidos",
              "parrafos": [
                "Si una operación falla en la blockchain (por ejemplo, tu firma no era válida), se anota el fallo.",
                "3 fallos en 10 minutos: el mensajero te bloquea 1 hora. Pasada la hora, puedes volver a intentarlo.",
                "Los rechazos de las protecciones 1-4 (red, firma repetida, no verificado, límite) no cuentan como fallos de este mecanismo: solo cuentan los fallos reales en la cadena."
              ],
              "imagen": "protecciones-relayer.svg"
            }
          ]
        },
        {
          "titulo": "4. Qué pasa cuando el mensajero envía la operación",
          "parrafos": [
            "Dos resultados posibles: éxito o fallo en la cadena."
          ],
          "subsecciones": [
            {
              "titulo": "4.1 Éxito",
              "parrafos": [
                "La transacción entra en la blockchain y se confirma.",
                "El mensajero anota el número usado, suma uno a tu contador diario y guarda el coste del gas.",
                "La app te muestra: ¡Hecho! (por ejemplo, tu objeto quedó custodiado)."
              ]
            },
            {
              "titulo": "4.2 Fallo en la cadena",
              "parrafos": [
                "La transacción se rechaza (por ejemplo, tu cuenta dijo firma inválida).",
                "El mensajero registra el fallo (al tercero en 10 minutos, bloqueo de 1 hora).",
                "La app te muestra un aviso claro: meta-transacción rechazada.",
                "Pendiente de confirmar: la app de trueques tiene preparado el cableado para usar al mensajero (una función llamada _enviar), pero en el ciclo actual ninguna ruta la invoca todavía: los trueques se guardan en un almacén de pruebas y no se envían aún a la blockchain. La conexión completa mensajero y trueques está pendiente de confirmar en la integración final."
              ]
            }
          ]
        },
        {
          "titulo": "5. El termómetro del mensajero (salud y métricas)",
          "parrafos": [
            "El mensajero se puede vigilar como a un coche con luces en el tablero: el chequeo de salud mira si su billetera tiene saldo y si está en la red correcta (alarma si tiene menos de 0,5 ETH: saldo bajo); las métricas muestran cuántas operaciones envió, cuántas rechazó y por qué, en el panel del Owner.",
            "El panel del administrador muestra: operaciones enviadas, rechazadas (por firma repetida, no verificado, límite, bloqueo o fallo) y cuántas personas distintas usan el mensajero.",
            "Pendiente de confirmar: el diseño prevé mínimo 2 mensajeros con cola de reintentos y conmutación automática (SLA de disponibilidad ≥ 99 %). El código actual solo ofrece el chequeo de salud y las métricas: no hay cola de reintentos ni segunda copia en este archivo; queda pendiente de confirmar según la orquestación del despliegue."
          ],
          "subsecciones": []
        },
        {
          "titulo": "6. Si el mensajero falla: el plan B (modo degradado)",
          "parrafos": [
            "El diseño define un plan B para cuando el mensajero se cae mucho rato:",
            "1. Si el mensajero está caído más de 1 hora, se activa el modo degradado.",
            "2. En modo degradado, tú pagas el gas directamente con tu billetera (como las empresas).",
            "3. Si la caída fue culpa del operador de la plataforma, la plataforma te reembolsa en BRLT lo que pagaste.",
            "Pendiente de confirmar: este plan B está documentado (en la cabecera del código y en el diseño), pero no está implementado: no existe el interruptor de modo degradado ni la lógica de reembolso en BRLT. Es una política operativa pendiente de activar."
          ],
          "subsecciones": []
        },
        {
          "titulo": "7. Los datos que recuerda el mensajero",
          "parrafos": [
            "El mensajero recuerda, por cada usuario: el último número de firma usado, el contador diario de operaciones, los fallos recientes (con hora) y el bloqueo activo (hasta cuándo).",
            "Pendiente de confirmar: hoy esos datos viven en la memoria del programa: si el mensajero se reinicia, se pierden. El diseño prevé guardarlos en la base de datos (PostgreSQL), pero esa persistencia no está implementada."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Qué falta confirmar (resumen)",
          "parrafos": [
            "Pendiente de confirmar: la validación estricta del número de firma contra tu cuenta en la blockchain no está implementada (se usa un registro local); el cableado real de la app de trueques con el mensajero no está activo (_enviar definido pero sin invocar); no hay cola de reintentos ni segunda copia del mensajero (SLA ≥ 99 % en diseño); el plan B (modo degradado más reembolso en BRLT) está documentado pero no implementado; y el estado del mensajero se pierde al reiniciar (persistencia en PostgreSQL pendiente). Los 7 tests del mensajero están verificados (7/7 verdes) con simulaciones (ver manual 08)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Glosario de este manual",
          "parrafos": [
            "Relayer = el mensajero que envía tus operaciones y paga el gas · Meta-transacción = operación firmada por ti pero enviada por otro (el mensajero) · Gas = la gasolina que cuesta operar en la blockchain · Firma EIP-712 = tu rúbrica digital con formato estándar y legible · Nonce = número de un solo uso que evita firmas repetidas · Allowlist = lista de cuentas permitidas (usuarios verificados) · Anti-replay = protección contra repetir una firma ya usada · Límite diario = máximo de operaciones gratis por persona y día (20) · Bloqueo temporal = castigo leve por fallos repetidos (1 hora) · Health o salud = chequeo de que el mensajero está sano (saldo, red) · Modo degradado = plan B cuando el mensajero no puede operar · SLA = porcentaje de tiempo que un servicio debe estar disponible"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "06-backend-api",
      "carpeta": "03-Implementacion",
      "titulo": "Los servicios de TrueKeate (la API): qué puede hacer la plataforma",
      "resumen": "Presenta la API REST de TrueKeate, el servicio central que la app usa por dentro, agrupado en familias: acceso, verificación, catálogo, trueques, panel del Owner, reputación y subastas. Explica las 3 puertas de entrada (límite de peticiones, sesión con firma y estado de verificación), las reglas de cada familia, los códigos de error y qué queda pendiente de confirmar.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "La app que ves en el móvil no guarda los datos: los pide a un servicio central llamado API. La API es como la cocina de un restaurante: el camarero (la app) te toma el pedido, lo pasa a la cocina, y la cocina prepara el plato con sus reglas.",
            "Los servicios se agrupan por familias: Acceso (/auth) para registrarte e iniciar sesión; Verificación (/kyc) para subir tu escalera de confianza; Catálogo (/catalog) para publicar objetos y ver ofertas; Trueques (/truekes) para crear y seguir trueques; Panel del Owner (/admin) para ver usuarios, contratos y salud; Reputación (/reputacion) para calcular tu puntaje y nivel; y Subastas (/subastas) para las subastas de empresas.",
            "En 5 minutos: la API tiene 3 puertas de entrada para proteger el servicio:",
            "1. Límite de peticiones: máximo 120 peticiones por minuto (anti-ataque).",
            "2. Sesión: para lo privado necesitas iniciar sesión con tu firma.",
            "3. Estado de verificación: algunas cosas exigen estar VERIFICADO o CERTIFICADO."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. La puerta de entrada (reglas generales)",
          "parrafos": [
            "Reglas generales que toda petición debe cumplir para entrar: límite de peticiones, sesión con tu firma y estado de verificación."
          ],
          "subsecciones": [
            {
              "titulo": "2.1 Límite de peticiones (rate limit)",
              "parrafos": [
                "Cualquiera que pida demasiado rápido recibe un aviso: demasiadas peticiones. Es la protección contra programas que intentan saturar el servicio: máximo 120 peticiones por minuto."
              ]
            },
            {
              "titulo": "2.2 Iniciar sesión con tu firma",
              "parrafos": [
                "Para lo privado, la app pide que firmes el mensaje TrueKeate: iniciar sesión con tu billetera.",
                "La cocina entonces:",
                "1. Recupera quién firmó (con tu firma, calcula tu dirección).",
                "2. Te crea un pase temporal (token) que no es tu clave: es solo un ticket de entrada válido mientras dure la sesión.",
                "3. Cada petición privada debe mostrar su ticket en la cabecera.",
                "El ticket no es un JWT (aunque los comentarios del código lo llamen así): es un código opaco aleatorio. Es un detalle técnico documentado para no confundir."
              ]
            },
            {
              "titulo": "2.3 El estado de verificación manda",
              "parrafos": [
                "Muchos servicios preguntan en qué peldaño de la escalera estás (INSCRITO, VERIFICADO o CERTIFICADO). Si el servicio exige VERIFICADO y tú estás INSCRITO, la respuesta es clara: estado requerido."
              ]
            }
          ]
        },
        {
          "titulo": "3. Acceso: registrarte e iniciar sesión (/auth)",
          "parrafos": [
            "Las acciones de acceso son: Conectar billetera (la app anuncia tu billetera y te inscribe automáticamente; la dirección debe tener formato válido, 0x...), Registrarte (formalizas tu inscripción con correo y teléfono; el consentimiento GDPR es obligatorio: sin consentimiento no hay registro) e Iniciar sesión (firmas el mensaje de sesión y recibes tu ticket; la firma debe ser tuya).",
            "La GDPR es la ley europea de protección de datos personales. TrueKeate exige tu consentimiento expreso para tratar tus datos.",
            "Pendiente de confirmar: el diseño lista verificaciones de correo y teléfono (/auth/verify-email, /auth/verify-phone) que no están implementadas en este ciclo."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. Verificación: subir la escalera (/kyc) — 2 etapas",
          "parrafos": [
            "La verificación ocurre en 2 etapas (la escalera que ya conoces del manual 02).",
            "Etapa 1: llegar a VERIFICADO.",
            "1. Pides iniciar la verificación.",
            "2. El sistema dice: se enviaron códigos a tu correo y teléfono.",
            "3. Escribes ambos códigos.",
            "4. Subes a VERIFICADO.",
            "Pendiente de confirmar: en el código actual, los códigos solo deben estar presentes (no se comprueban contra los reales enviados). El envío real por correo (email) y la validación con vencimiento están previstos pero no implementados.",
            "Etapa 2: llegar a CERTIFICADO.",
            "1. Envías la referencia de tu documento y la de tu selfie.",
            "2. Tu solicitud queda PENDIENTE: la revisa un humano (el Owner).",
            "3. Si aprueba, subes a CERTIFICADO. Si rechaza, te avisa.",
            "Pendiente de confirmar (observación de seguridad): la ruta de revisión no comprueba que quien aprueba sea realmente el Owner: cualquier usuario con sesión podría aprobar o rechazar una verificación en el estado actual. Está señalado para corregir."
          ],
          "imagen": "escalera-accesos.svg",
          "subsecciones": []
        },
        {
          "titulo": "5. Catálogo: publicar y buscar (/catalog)",
          "parrafos": [
            "El catálogo es el escaparate de la comunidad (AtoA = entre personas).",
            "Reglas por acción: Publicar un objeto pueden VERIFICADO o CERTIFICADO, sin superar el límite de tu nivel; Ver el catálogo puede todo el mundo (público) y solo se ven objetos disponibles; Pedir un encargo puede cualquiera con sesión (pides un objeto que no está en el mercado); Ver encargos puede todo el mundo (lista de peticiones activas)."
          ],
          "subsecciones": [
            {
              "titulo": "5.1 El límite de artículos por nivel",
              "parrafos": [
                "No todos pueden publicar lo mismo: el límite depende de tu nivel (no de tu tipo de cuenta). Máximo de objetos publicados: INICIADO 5, COMÚN 50, FRECUENTE 100 y SOCIO 100.",
                "Ejemplo: un INICIADO puede tener hasta 5 objetos a la vez en el escaparate. Si ya tiene 5, el sistema responde: límite de artículos alcanzado."
              ]
            }
          ]
        },
        {
          "titulo": "6. Trueques: crear y seguir (/truekes)",
          "parrafos": [
            "Esta familia coordina la caja fuerte (ver manual 01) con la app.",
            "Reglas por acción: Crear trueque pueden VERIFICADO o CERTIFICADO (máximo 3 trueques activos para VERIFICADO); Ver detalle puede cualquiera (información de confianza del trueque); Custodiar solo la parte dueña del objeto (cada lado custodia el suyo); Firmar recepción solo la parte correspondiente (tu declaración de recibí bien); Valorar pueden ambas partes (5 renglones con nota de 1 a 5: aceptación, honestidad, seguridad, confiabilidad y compromiso)."
          ],
          "subsecciones": [
            {
              "titulo": "6.1 La regla de los 3 trueques",
              "parrafos": [
                "Un usuario VERIFICADO no puede tener más de 3 trueques en marcha a la vez (estados CREADO, CUSTODIADO, APERTURA...). Es una regla anti-acaparación: limita el riesgo de comprometerse de más."
              ]
            },
            {
              "titulo": "6.2 La valoración en 5 dimensiones",
              "parrafos": [
                "Cuando valoras un trueque, puntúas 5 cosas (de 1 a 5):",
                "1. Aceptación: ¿el otro cumplió lo pactado?",
                "2. Honestidad: ¿describió bien su objeto?",
                "3. Seguridad: ¿el intercambio fue seguro?",
                "4. Confiabilidad: ¿fue puntual y serio?",
                "5. Compromiso: ¿terminó lo que empezó?",
                "Pendiente de confirmar: la app de trueques tiene preparado el envío a la blockchain (por mensajero para particulares, o directo para empresas), pero en el ciclo actual ninguna ruta lo ejecuta: los trueques se guardan en un almacén de pruebas y las acciones de custodiar o firmar no comprueban aún el estado real en la cadena. También faltan las rutas de apertura, anulación y disputa desde la app (en el diseño, no implementadas)."
              ]
            }
          ]
        },
        {
          "titulo": "7. Panel del Owner: administración (/admin)",
          "parrafos": [
            "El administrador (Owner) tiene su propio tablero con: Usuarios (lista de inscritos, solo Owner o Socios); Contratos (direcciones de los contratos desplegados); KPIs de disputas (total de trueques y disputas abiertas); Base de datos (cuántos usuarios, objetos y trueques hay); y Salud de infraestructura (salud y métricas del mensajero y del vigilante).",
            "Observación: el servicio de contratos no exige rol de Owner (solo sesión), y el de salud responde vacío cuando no hay mensajero ni vigilante conectados (como ocurre en el modo de pruebas actual)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Reputación: tu puntaje y tu nivel (/reputacion)",
          "parrafos": [
            "Cada trueque completado alimenta tu reputación. La fórmula (de diseño) mezcla tres ingredientes: puntaje = 50 % reputación + 30 % volumen efectivo + 20 % (1 − ratio de apelaciones).",
            "Se normaliza a una nota de 0 a 100, y de ahí salen tu nivel y tu medalla: puntaje 0-25 nivel INICIADO con medalla BRONCE; 26-50 COMÚN con PLATA; 51-75 FRECUENTE con ORO; 76-100 SOCIO con ORO.",
            "Dos reglas especiales: Oro histórico (requisito de empresa): tener ≥ 1.000 trueques efectivos y un ratio de éxito ≥ 90 %. Penalización por inactividad: 180 días sin actividad y dominar más del 5 % del mercado hacen que tu puntaje baje (regla anti-monopolio).",
            "Pendiente de confirmar: en el estado actual el cálculo usa un volumen máximo del sistema fijo en 1 (la normalización real queda pendiente), el recálculo mensual automático solo responde un aviso (sin lote programado) y la penalización por inactividad está definida pero no se invoca en ninguna ruta."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Subastas de empresa (/subastas)",
          "parrafos": [
            "Las empresas pueden subastar objetos (RF-17), con reglas claras: Crear subasta solo las empresas (puja inicial obligatoria y duración por defecto de 24 horas); Ver subastas todo el mundo (público, solo subastas abiertas); Pujar solo usuarios CERTIFICADOS (puja mínima e incremento mínimo); Cerrar el sistema o de forma manual (cuando vence el tiempo)."
          ],
          "subsecciones": [
            {
              "titulo": "9.1 El desempate (regla D27)",
              "parrafos": [
                "Al cerrar la subasta:",
                "1. Gana la puja más alta.",
                "2. Si hay empate, gana el de mayor nivel (SOCIO > FRECUENTE > COMÚN > INICIADO).",
                "3. Si no hubo pujas, la subasta se declara ANULADA (sin ganador).",
                "Pendiente de confirmar: el estado de las subastas vive en la memoria del programa (se pierde al reiniciar), el cierre es manual (no hay reloj automático de vencimiento) y faltan servicios de detalle y de listado de pujas. La persistencia y la automatización están pendientes de confirmar."
              ],
              "imagen": "api-servicios.svg"
            }
          ]
        },
        {
          "titulo": "10. Los códigos de error (cuando algo sale mal)",
          "parrafos": [
            "Cuando algo falla, la API responde con un código claro, no con un error 500 misterioso.",
            "wallet_invalida = la dirección de la billetera no tiene formato correcto · consentimiento_requerido = falta el consentimiento GDPR · firma_invalida = la firma no corresponde a tu billetera · estado_requerido = necesitas un estado de verificación mayor · limite_articulos = ya publicaste el máximo de tu nivel · max_3_activos = ya tienes 3 trueques en marcha · valoraciones_1_a_5 = las notas deben ser enteros de 1 a 5 · solo_owner = solo el Owner puede hacer esto · solo_empresa = solo las empresas pueden hacer esto · solo_certificado = solo CERTIFICADOS pueden hacer esto · rate_limit = demasiadas peticiones por minuto · not_found = lo que buscas no existe"
          ],
          "subsecciones": []
        },
        {
          "titulo": "11. Qué falta confirmar (resumen)",
          "parrafos": [
            "Pendiente de confirmar: la API guarda todo en memoria (se pierde al reiniciar; el puente a la base de datos PostgreSQL real está declarado como trabajo de la integración final); la verificación real de códigos de correo y teléfono y el envío por email no están implementados; falta el control de rol Owner en la revisión de verificación (observación de seguridad); los trueques no se envían aún a la blockchain desde la app; la reputación usa un volumen máximo fijo en 1 y el recálculo mensual solo está simulado; las subastas viven en memoria, sin cierre automático ni persistencia; y muchos servicios del diseño no existen aún (verificación por email y teléfono, apelaciones, cola de revisión, rutas de disputas y votaciones, apertura y anulación de trueques, puntos de encuentro, campañas y finanzas). Los 14 tests de la API están verificados (14/14 verdes) con el almacén en memoria (ver manual 08)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "12. Glosario de este manual",
          "parrafos": [
            "API = servicio central que la app usa por dentro (la cocina) · Ruta o endpoint = una puerta concreta del servicio (/truekes, /kyc...) · Sesión = tu estado de logueado con ticket temporal · Token = el ticket temporal de tu sesión · Rate limit = límite de peticiones por minuto (120) · GDPR = ley europea de protección de datos personales · KYC = verificación de identidad (conoce a tu cliente) · Selfie = tu foto para verificar que eres tú · AtoA = intercambio entre personas (a to a) · Rubro = categoría del objeto (arte, tecnología...) · Encargo = pedir un objeto que no está en el mercado · Nivel o medalla = tu rango según el puntaje (INICIADO... SOCIO) · Apelación = recurso contra una decisión (cuenta como disputa) · JWT = formato de ticket firmado (no usado aquí: ticket opaco)"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "07-frontend",
      "carpeta": "03-Implementacion",
      "titulo": "La app de TrueKeate: pantallas, MetaMask y navegación",
      "resumen": "Manual en lenguaje sencillo sobre la app web de TrueKeate (hecha con Next.js e instalable como PWA): presenta las pantallas que existen hoy, cómo conectar la billetera MetaMask y cómo moverse por la app.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "La app de TrueKeate es una página web, también instalable en el móvil como una app gracias a la tecnología PWA.",
            "Sus pantallas principales: 1. Portada (/), la página de bienvenida pública. 2. Mi Trueke Central (/suite/dashboard), tu panel personal tras entrar. 3. Inventario, Intercambio, Socios y Perfil, accesos desde la barra de abajo (algunos en construcción).",
            "Para empezar en 5 minutos:",
            "1. Abre la portada y pulsa Comenzar a truequear.",
            "2. Se abre tu panel personal (Mi Trueke Central).",
            "3. Pulsa Conectar MetaMask para conectar tu billetera.",
            "4. Verás tu dirección resumida (por ejemplo 0x1234…abcd).",
            "5. Ya estás dentro de la suite: la escalera de verificación te muestra en qué peldaño estás (INSCRITO por ahora).",
            "Nota pendiente de confirmar: hoy el panel muestra tu estado simulado (siempre INSCRITO); en la integración final ese estado vendrá del backend (tu sesión y tu verificación real). Mientras tanto, la app es una demostración visual del diseño."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Las pantallas que existen hoy (mapa de la app)",
          "parrafos": [
            "La app cuenta con estas pantallas: Portada (/), funcional, con el hero, las ventajas del trueque, la filosofía y el botón de inicio. Suite como marco (/suite), funcional, con barra superior y navegación inferior. Mi Trueke Central (/suite/dashboard), funcional con estado simulado, que muestra tu estado, los módulos por verificación y conectar MetaMask. Inventario (/suite/inventario), para tus objetos, en construcción (placeholder). Trueke Central (/suite/intercambio), para crear y ver trueques, en construcción (placeholder). Socios (/suite/gobernanza), para gobernanza y votaciones, en construcción (placeholder). Perfil (/suite/perfil), para tus datos, en construcción (placeholder).",
            "Los módulos en construcción muestran el aviso: Este módulo se completa en la integración final. Acceso según rol y estado.",
            "Hay rutas del diseño que todavía no existen: historial, zona de empresa, zona de socio, panel de administración, subastas, campañas y la sala de intercambio. No están prometidas como funcionales.",
            "El diagrama del mapa de la app muestra el recorrido desde la portada (página pública) hasta Mi Trueke Central, y desde la barra de abajo a los módulos de Inventario, Trueke Central, Socios y Perfil, estos últimos en construcción."
          ],
          "imagen": "pantallas-app.svg",
          "subsecciones": []
        },
        {
          "titulo": "3. La portada (la carta de presentación)",
          "parrafos": [
            "La portada pública cuenta qué es TrueKeate. Incluye un hero con el logo, el titular y las cifras de la plataforma (usuarios, trueques, volumen).",
            "Incluye el apartado ¿Qué es un Trueke Digital? con las 4 ventajas: 1. Custodia atómica: nadie pierde su parte (la caja fuerte). 2. Trueke sin gas: la plataforma paga el gas por ti. 3. Reputación real: tu historial te precede. 4. Economía circular: dar nueva vida a las cosas.",
            "También presenta la filosofía: confianza recompensada, seguridad por diseño, sin barreras.",
            "Termina con el botón Comenzar a truequear, que te lleva a tu panel personal.",
            "Pendiente de confirmar: las cifras de la portada (usuarios, trueques, volumen) son contenido de maqueta (estático), no datos reales del backend."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. Conectar tu billetera con MetaMask (paso a paso)",
          "parrafos": [
            "MetaMask es una billetera (wallet) de cripto: una extensión del navegador (o app móvil) que guarda tus llaves y firma por ti. TrueKeate la usa para saber quién eres.",
            "El diagrama resume el flujo de conexión: abres Mi Trueke Central; si MetaMask no está instalado aparece un aviso para instalarlo o usar otra wallet; si está instalado, pulsas Conectar MetaMask y MetaMask pide permiso para ver tus cuentas; si aceptas quedas conectado y tu dirección aparece en pantalla, y si rechazas sigues sin conectar y puedes reintentar. Al refrescar la página, la app se reconecta sola."
          ],
          "imagen": "conexion-metamask.svg",
          "subsecciones": [
            {
              "titulo": "4.1 Primera vez (conectar)",
              "parrafos": [
                "1. Instala MetaMask en tu navegador (o usa una wallet compatible).",
                "2. Abre Mi Trueke Central.",
                "3. Pulsa el botón Conectar MetaMask.",
                "4. MetaMask te pregunta si permites que este sitio vea tus cuentas: acepta.",
                "5. Tu dirección aparece en la pantalla (resumida: 0x1234…abcd).",
                "Si MetaMask no está instalado, la app te avisa claramente: MetaMask no está instalado. Instálalo o usa una wallet compatible."
              ]
            },
            {
              "titulo": "4.2 Al refrescar la página (volver a entrar)",
              "parrafos": [
                "La app recuerda tu cuenta en el almacén local del navegador:",
                "1. Al abrir la página, intenta reconectarse sola.",
                "2. Si tu billetera está bloqueada (con contraseña), conserva tu dirección pero sin firma disponible hasta que la desbloquees."
              ]
            },
            {
              "titulo": "4.3 Cambiar de cuenta o desconectar",
              "parrafos": [
                "Si cambias de cuenta dentro de MetaMask, la app se entera al momento y actualiza la pantalla (escucha el aviso accountsChanged).",
                "Si cierras sesión, la app borra el recuerdo y vuelve al estado inicial.",
                "Pendiente de confirmar: la firma desde el móvil (firmar con la app móvil de MetaMask, deep-link) está comentada como delegación a la wallet móvil, pero sin código todavía. La instalabilidad completa de la PWA (funcionar sin conexión) también queda pendiente de confirmar: existe el archivo de manifiesto pero no se observó el service worker."
              ]
            }
          ]
        },
        {
          "titulo": "5. Mi Trueke Central (el panel personal)",
          "parrafos": [
            "Es tu pantalla principal dentro de la suite. Muestra: 1. Tu billetera conectada (o el botón para conectar). 2. Tu escalera de verificación: INSCRITO, luego VERIFICADO, luego CERTIFICADO, dibujada como pasos; los alcanzados se ven en color (azul marino y luego verde azulado).",
            "3. Tus módulos disponibles según tu estado: Explorar ofertas, disponible para cualquiera (hasta INSCRITO) y siempre activo para ver el mercado; Mis truekes, que requiere VERIFICADO y se ve atenuado con el aviso Requiere estado Verificado; y Reputación, que requiere CERTIFICADO y se ve atenuado hasta que subas de estado.",
            "4. La barra de abajo (navegación inferior) con 5 accesos.",
            "La lógica de qué puedes hacer según tu estado es visual (los botones se atenúan); no hay todavía un bloqueo real de rutas por rol."
          ],
          "subsecciones": []
        },
        {
          "titulo": "6. La barra superior y la barra inferior",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "6.1 Barra superior (marco de la suite)",
              "parrafos": [
                "Logo textual TrueKeat☑ (el ☑ es el check on-chain, la marca de confianza).",
                "Tu nombre de usuario con check: @usuario con check.",
                "Un icono de notificaciones con un contador.",
                "Pendiente de confirmar: el nombre de usuario y el contador de notificaciones son estáticos (dibujados), no vienen de datos reales del backend."
              ]
            },
            {
              "titulo": "6.2 Barra inferior (navegación)",
              "parrafos": [
                "La barra de abajo es fija y flotante (siempre a la vista) y tiene 5 botones.",
                "1. Mercado: lleva a Mi Trueke Central.",
                "2. Inventario: tus objetos.",
                "3. Trueke Central: el botón del centro, destacado en dorado y elevado; es el corazón de la app, para crear trueques.",
                "4. Socios: gobernanza.",
                "5. Perfil: tus datos.",
                "El botón de la pantalla donde estás se ilumina en color verde azulado."
              ]
            }
          ]
        },
        {
          "titulo": "7. El estilo de la app (la \"Bóveda Digital Moderna\")",
          "parrafos": [
            "TrueKeate tiene su propia identidad visual.",
            "Colores: azul marino profundo (confianza), verde azulado (teal) y dorado (prestigio); el rojo y el coral solo para alertas y estados de error.",
            "Formas: botones en cápsula (pill), tarjetas con esquinas redondeadas y la tarjeta premium con borde dorado para activos certificados.",
            "Fuentes: tipografías limpias y modernas (Geist y sus variantes).",
            "Detalle de marca: el check ☑ que se dibuja con una animación al completar una verificación (el TrueKeat☑).",
            "Estados con colores (badges): INSCRITO, CREADO y CUSTODIADO en azul marino; VERIFICADO en verde azulado; CERTIFICADO y COMPLETADO en dorado; EN_DISPUTA, RESOLUCION_SOCIOS y APERTURA en coral; RECHAZADO, ANULADO y BLOQUEADO en rojo; y el resto en gris."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Qué falta confirmar (resumen)",
          "parrafos": [
            "El panel muestra un estado simulado (siempre INSCRITO) y ninguna pantalla hace llamadas reales al backend (sesión, catálogo, reputación, trueques); la capa de contratos (ABIs) está lista pero no se activa en ninguna pantalla; cuatro módulos de la suite son placeholders; el nombre de usuario, las notificaciones y las cifras de la portada son estáticos; la PWA tiene manifiesto pero sin service worker observado; la firma móvil (RF-16.3) y los roles de Empresa, Socio y Owner no están implementados en la app; y las pruebas de la app (Playwright, 18 ejecuciones) cubren portada y panel con estado estático, sin ejercitar una billetera real (ver manual 08)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Glosario de este manual",
          "parrafos": [
            "Frontend = La parte visible de la app (lo que ves) · PWA = App web que se puede instalar como una app del móvil · Wallet o billetera = Programa que guarda tus llaves y firma (MetaMask) · MetaMask = La billetera más conocida (extensión o app móvil) · Conectar = Vincular tu billetera a la app · Suite = La zona privada de la app tras entrar · Dashboard = Panel resumen (Mi Trueke Central) · Escalera D28 = INSCRITO, luego VERIFICADO, luego CERTIFICADO · Placeholder = Pantalla provisional en construcción · Landing = Página de bienvenida pública (portada) · Hero = La primera imagen grande de la portada · Manifest = Archivo que permite instalar la PWA · Service worker = Programa que permite la app sin conexión (pendiente)"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "08-pruebas",
      "carpeta": "03-Implementacion",
      "titulo": "Cómo sabemos que TrueKeate funciona (las pruebas)",
      "resumen": "Manual en lenguaje sencillo sobre la estrategia y la evidencia de pruebas de TrueKeate: explica cómo se comprueban los contratos con Foundry/Forge, los servidores con simulaciones de Node y la app con Playwright, junto con los resultados registrados y lo que falta por confirmar.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "Antes de dar algo por bueno, TrueKeate lo prueba en tres frentes:",
            "1. Los contratos (la caja fuerte y la moneda): se prueban con robots de prueba (Foundry/Forge) que lanzan miles de situaciones, incluso ataques y casos raros.",
            "2. Los servidores (vigilante, mensajero y cocina): se prueban con simulaciones (Node.js) de la blockchain y la base de datos.",
            "3. La app: se prueban las pantallas con un navegador robot (Playwright) que hace clics como una persona real, en ordenador y móvil.",
            "Resultados registrados (Fase 4): contratos (Forge) 62/62 pruebas verdes; servidores (Node) 26/26 pruebas verdes (verificado en este análisis); app (Playwright) 18/18 ejecuciones verdes; y cobertura de contratos del 89,55 % de las líneas de código probadas.",
            "La cobertura mide qué porcentaje del código fue tocado por las pruebas. La regla de TrueKeate (gate D38) exige al menos 80 % por ciclo.",
            "En 5 minutos, la idea es simple: como en un restaurante, nada sale a la mesa sin pasar el control del chef. Cada pieza tiene su control antes de darla por servida."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Cómo se prueban los contratos (Forge)",
          "parrafos": [
            "Los contratos son programas delicados (manejan objetos de valor), así que se prueban con tres técnicas.",
            "El diagrama de la pirámide de pruebas resume los tres frentes: en la base los contratos (Forge, 61 pruebas más invariantes sobre la caja fuerte, la moneda y la identidad); en el medio los servidores (Node, 26 pruebas del vigilante, el mensajero y la cocina); y arriba la app (Playwright, 18 ejecuciones de pantallas en ordenador y móvil)."
          ],
          "imagen": "piramide-pruebas.svg",
          "subsecciones": [
            {
              "titulo": "2.1 Pruebas normales (unit)",
              "parrafos": [
                "Son casos escritos a mano, por ejemplo: si creo un trueque, el estado debe ser CREADO; si un extraño intenta custodiar, debe ser rechazado. Hay 61 pruebas de este tipo, repartidas así: la caja fuerte (Escrow.t.sol) tiene 18 pruebas de la máquina de estados del trueque; el Ciclo 3 (Ciclo3.t.sol) tiene 20 que prueban moneda, fondo, socios y suscripciones juntos; la cuenta inteligente (SmartAccount.t.sol) tiene 14 sobre firma, verificación y recuperación; y la caja fuerte del ciclo 8 (EscrowCiclo8.t.sol) tiene 9 sobre disputas, valoraciones y sanciones."
              ]
            },
            {
              "titulo": "2.2 Pruebas con datos al azar (fuzz)",
              "parrafos": [
                "El robot lanza 256 combinaciones aleatorias por prueba: montos extraños, fechas raras, direcciones inventadas. Si algo se rompe, lo encuentra."
              ]
            },
            {
              "titulo": "2.3 Pruebas de invariantes (las reglas que nunca se rompen)",
              "parrafos": [
                "Son las leyes de la física de la plataforma: el robot juega 64 rondas de 100 movimientos aleatorios y comprueba que las leyes se cumplan siempre.",
                "I1 Conservación de activos: la caja fuerte nunca crea ni destruye saldo: lo que entra, sale.",
                "I2 Sin cancelación con custodia: no se puede cancelar por las buenas si alguien ya depositó.",
                "I4 Anulaciones resueltas a tiempo: toda disputa se resuelve dentro del plazo.",
                "I5 Sanción solo tras espera: la sanción nunca se ejecuta antes del tiempo de espera.",
                "I7 Completar exige firmas y valoración: ningún trueque se completa sin las 2 firmas y las 2 valoraciones.",
                "Pendiente de confirmar: el archivo menciona invariantes I1 a I7 pero solo existen 5 funciones (I1, I2, I4, I5, I7). Las invariantes I3 (ventanas de apertura) e I6 no tienen función en el archivo actual."
              ]
            }
          ]
        },
        {
          "titulo": "3. Cómo se prueban los servidores (Node)",
          "parrafos": [
            "Los servidores (vigilante, mensajero y cocina) se prueban sin necesidad de una blockchain ni de una base de datos reales: se crean simulaciones (mocks) que imitan su comportamiento.",
            "El vigilante (indexador) se simula con una base de datos de mentira en memoria y una blockchain simulada; se comprueba que anota los eventos, no duplica y guarda su avance.",
            "El mensajero (relayer) se simula con una billetera falsa y una blockchain simulada; se comprueban las 5 protecciones (red, firma, verificado, límite y bloqueo).",
            "La cocina (API) se prueba como servicio real con almacén en memoria; se comprueban registro, verificación, catálogo, trueques, panel y salud.",
            "Resultados verificados en este análisis: 26/26 verdes: vigilante (indexador.test.js) 5/5; mensajero (relayer.test.js) 7/7; cocina (api.test.js) 7/7; y ciclo 8 (ciclo8.test.js) 7/7.",
            "Nota importante: el comando oficial npm test solo ejecuta 19 pruebas (vigilante más mensajero más cocina). El archivo del Ciclo 8 (7 pruebas) no está incluido en ese comando y debe ejecutarse aparte para llegar a las 26. Es un detalle técnico documentado."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. Cómo se prueba la app (Playwright)",
          "parrafos": [
            "La app se prueba con un navegador robot que hace clics como una persona:",
            "1. Se prepara la versión final de la app (build) y se sirve en el puerto 3000.",
            "2. El robot abre las páginas en 2 dispositivos: un ordenador (Chrome) y un móvil (Pixel 5), porque TrueKeate es móvil primero.",
            "3. Cada caso se ejecuta en ambos: 9 casos por 2 dispositivos = 18 ejecuciones.",
            "Qué comprueban los 9 casos. Portada (4 casos): 1. El hero con la marca y el titular aparece. 2. Las cifras de la plataforma se ven. 3. Las ventajas del trueque se ven. 4. El botón lleva a la suite.",
            "Mi Trueke Central (5 casos): 1. La barra superior muestra @usuario y el logo TrueKeat☑. 2. La escalera de verificación se ve. 3. El módulo bloqueado para INSCRITO se ve atenuado. 4. El botón Conectar MetaMask aparece sin sesión. 5. La barra inferior con su botón central funciona.",
            "Resultado registrado: 18/18 verdes (dato reportado en el estado del proyecto; ver los pendientes más abajo).",
            "Límite de alcance: estas pruebas no usan una billetera real (MetaMask no está automatizado), ni el backend real, ni la blockchain: son pruebas de las pantallas y del contenido estático."
          ],
          "subsecciones": []
        },
        {
          "titulo": "5. Cómo reproducir las pruebas (por si quieres verlas)",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "5.1 Contratos",
              "parrafos": [
                "Desde la carpeta sc: el comando forge test reporta 62/62 pruebas verdes, y forge coverage comprueba el gate de al menos 80 % de líneas (89,55 % reportado)."
              ]
            },
            {
              "titulo": "5.2 Servidores",
              "parrafos": [
                "Desde la carpeta backend: npm test ejecuta 19 pruebas (comando oficial); ejecutando node --test con los archivos de prueba se llega a las 26 pruebas (incluye el ciclo 8), verificado 26/26."
              ]
            },
            {
              "titulo": "5.3 App",
              "parrafos": [
                "Desde la carpeta web: primero npm run build (necesario antes, porque el robot sirve la versión final) y luego npx playwright test, que ejecuta 9 casos en 2 dispositivos (ordenador y móvil)."
              ]
            }
          ]
        },
        {
          "titulo": "6. Qué falta confirmar (resumen)",
          "parrafos": [
            "No fue posible re-ejecutar forge test en el entorno de análisis (faltaba el programa forge): el 62/62 y la cobertura 89,55 % son datos reportados en estado_proyecto.md; las invariantes I3 e I6 no tienen función en el archivo actual; no hay pruebas con base de datos real (PostgreSQL), así que la conexión real y la reconciliación del vigilante y la cocina quedan sin evidencia; el 18/18 de la app es un dato reportado sin archivos de resultados; el E2E es estático (4 de los 9 casos cubren páginas provisionales o maqueta, sin billetera ni backend reales); la integración real mensajero-cuenta inteligente no forma parte de npm test; y sc/README.md conserva métricas de ciclos anteriores (94,96 % de cobertura) que no coinciden con el consolidado vigente de la Fase 4 (89,55 %), siendo estado_proyecto.md la referencia actual."
          ],
          "subsecciones": []
        },
        {
          "titulo": "7. Glosario de este manual",
          "parrafos": [
            "Prueba (test) = Comprobación automática de que algo funciona · Unit = Prueba de una pieza concreta con un caso escrito · Fuzz = Prueba con miles de datos al azar · Invariante = Regla que debe cumplirse siempre, pase lo que pase · Cobertura = Porcentaje del código que las pruebas tocan · Gate = Regla de calidad obligatoria (al menos 80 % de cobertura) · Mock o simulación = Doble de mentira que imita a blockchain o base de datos · E2E = Prueba de extremo a extremo (pantallas completas) · Playwright = Navegador robot que prueba la app · Forge o Foundry = Herramienta que prueba los contratos · Suite = Conjunto de pruebas de un área · Verde = Prueba que pasó correctamente (rojo significa que falló) · Handler = Manos del robot que hacen movimientos aleatorios en invariantes"
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "01-despliegue",
      "carpeta": "04-Despliegue",
      "titulo": "Dónde vive TrueKeate y cómo se actualiza",
      "resumen": "Manual en lenguaje sencillo sobre el despliegue: explica en qué lugares corre TrueKeate (tu ordenador con la blockchain anvil y la nube de Google GCP) y cómo se levanta, actualiza, vigila, comprueba y respalda todo el sistema, incluidos el Secret Manager, los contratos, los servidores y la red de puertos.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "TrueKeate corre en dos tipos de casa: tu ordenador (local), con una blockchain de pruebas llamada anvil que simula todo y sirve para probar, y la nube de Google (GCP), donde vive la versión compartida con los servicios de datos.",
            "Para levantar TrueKeate en tu ordenador, el camino es:",
            "1. Arranca la blockchain de pruebas: anvil (red 31337).",
            "2. Despliega los contratos: un comando de Foundry los crea.",
            "3. Prepara la base de datos: aplica el esquema (una sola vez).",
            "4. Enciende los servidores: vigilante (indexador), camarero (API) y app web.",
            "5. ¡Listo! Abres http://localhost:3000 y TrueKeate funciona.",
            "El mensajero (relayer) no tiene botón propio: la API lo usa por dentro (ver manual 03-stack-backend)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Las dos casas de TrueKeate",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "2.1 Casa local: anvil (red 31337)",
              "parrafos": [
                "anvil es un simulador de blockchain que corre en tu ordenador: es rápido y gratis, perfecto para probar sin miedo a romper nada.",
                "Hay dos cuentas importantes en las pruebas: la cuenta 0 es el Owner, que crea (despliega) los contratos, y la cuenta 1 es la plataforma, donde el relayer paga el gas."
              ]
            },
            {
              "titulo": "2.2 Casa en la nube: GCP (proyecto truekeate-main)",
              "parrafos": [
                "En la nube, TrueKeate reutiliza servicios de Google: una blockchain anvil compartida (para pruebas en la nube), PostgreSQL (base de datos) con pgAdmin (herramienta de administración) y el Secret Manager, la caja fuerte de Google donde se guardan las claves secretas (contraseñas de la base de datos y llaves privadas).",
                "Pendiente de confirmar: los archivos de configuración del entorno siguen apuntando a un proyecto de Google llamado MCC (de otro proyecto) y no se ha verificado un despliegue dedicado al proyecto TrueKeate (truekeate-main), por lo que el estado real del entorno queda marcado como pendiente de confirmar."
              ]
            }
          ]
        },
        {
          "titulo": "3. Las llaves secretas: el Secret Manager",
          "parrafos": [
            "Los secretos son como las llaves de casa: nadie debe verlas.",
            "TrueKeate guarda en el Secret Manager la contraseña de la base de datos, la clave del administrador y la clave del relayer.",
            "Un script llamado gcp-env.sh lee los secretos sin imprimirlos nunca en pantalla ni guardarlos en archivos.",
            "El Owner es el custodio de las llaves principales y debe rotarlas (cambiarlas) periódicamente.",
            "Regla de seguridad:",
            "1. Nunca escribas una clave secreta en un archivo del proyecto.",
            "2. Nunca pegues una clave en un chat o en un correo.",
            "3. Usa siempre el Secret Manager para leerlas."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. Cómo se despliegan los contratos (paso a paso)",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "4.1 Antes de empezar",
              "parrafos": [
                "Necesitas:",
                "1. La blockchain de pruebas encendida (anvil) o un acceso remoto.",
                "2. La clave privada del Owner (cuenta 0).",
                "3. Las librerías de contratos descargadas."
              ]
            },
            {
              "titulo": "4.2 El comando mágico",
              "parrafos": [
                "El comando es: forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key <clave-del-owner> --broadcast.",
                "Traducción: el taller de Foundry ejecuta el guion de despliegue contra la red local, firmando con la clave del Owner, y publica el resultado (broadcast)."
              ]
            },
            {
              "titulo": "4.3 Qué crea el guion, en orden",
              "parrafos": [
                "1. El Escrow (la caja fuerte).",
                "2. La fábrica de cuentas (SmartAccountFactory).",
                "3. Dos criptos de prueba (para simular trueques).",
                "4. Un NFT de prueba.",
                "5. La moneda BRLT, el Fondo de Valor, el padrón de Socios y las suscripciones de empresa.",
                "6. Conecta las piezas entre sí (por ejemplo: la moneda con el fondo).",
                "7. Anota las direcciones de cada pieza (como si apuntara las direcciones de las nuevas tiendas en un mapa)."
              ]
            },
            {
              "titulo": "4.4 Después del despliegue",
              "parrafos": [
                "1. Actualiza el mapa de contratos del backend (para que el vigilante sepa dónde escuchar).",
                "2. Actualiza las direcciones en la app web si es necesario.",
                "Pendiente de confirmar: el guion conecta el Escrow con el padrón de Socios en el código del contrato, pero esa conexión no se ejecuta en el guion de despliegue actual; esa vinculación queda pendiente de confirmar en un guion posterior."
              ],
              "imagen": "despliegue-contratos.svg"
            }
          ]
        },
        {
          "titulo": "5. Cómo se encienden los servidores",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "5.1 Preparar la base de datos (solo la primera vez)",
              "parrafos": [
                "Se aplica el esquema con psql usando la variable DATABASE_URL y el archivo backend/db/schema.sql: crea las tablas y los tipos.",
                "Es seguro repetirlo: si algo ya existe, no lo duplica."
              ]
            },
            {
              "titulo": "5.2 El vigilante (indexador)",
              "parrafos": [
                "Se arranca con node backend/indexador-cli.js para una pasada rápida, o con node backend/indexador-cli.js --watch para el modo vigilante, que escucha siempre.",
                "El modo --watch revisa la blockchain cada 5 segundos (por defecto) y copia lo nuevo a la base de datos."
              ]
            },
            {
              "titulo": "5.3 El camarero (API)",
              "parrafos": [
                "Se arranca con npm run api.",
                "Levanta la API en http://127.0.0.1:4000 (puerto configurable). Puedes comprobar que vive con un chequeo de salud: GET /healthz."
              ]
            },
            {
              "titulo": "5.4 La app web",
              "parrafos": [
                "Desde la carpeta web: npm run dev para desarrollo (http://localhost:3000), npm run build para preparar la versión final y npm start para servir la versión final."
              ]
            }
          ]
        },
        {
          "titulo": "6. El mapa de conexiones (red y puertos)",
          "parrafos": [
            "El diagrama muestra las casas y sus conexiones: en tu ordenador (local) están la app web (puerto 3000), la API (puerto 4000), el vigilante (indexador), la blockchain anvil (puerto 8545, red 31337) y MetaMask como billetera; en la nube de Google (GCP) están PostgreSQL (mcc-postgres, puerto 443), pgAdmin (puerto 443) y el Secret Manager con las claves secretas.",
            "Las conexiones son: la app web envía peticiones a la API, la API envía transacciones y paga el gas a la blockchain, el vigilante lee eventos de la blockchain y guarda copias en PostgreSQL, y la API lee los secretos del Secret Manager.",
            "Resumen de componentes, ubicación y puertos: la blockchain de pruebas está en local en el puerto 8545 (red 31337); la API en local en el 4000; la app web en local en el 3000; PostgreSQL en la nube de Google en el 443; y pgAdmin en la nube de Google en el 443."
          ],
          "imagen": "red-puertos.svg",
          "subsecciones": []
        },
        {
          "titulo": "7. Cómo saber que todo está sano: chequeos de salud",
          "parrafos": [
            "Cada servidor tiene un termómetro: la API responde a GET /healthz con ok, servicio: truekeate-api; el vigilante muestra métricas de retraso que indican cuántos eventos lleva de retraso; el mensajero tiene un chequeo de salud que mira si tiene saldo y si está en la red correcta.",
            "Si el mensajero tiene menos de 0,5 ETH de saldo, avisa al Owner para que recargue (así no se quedan los trueques sin gas)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Respaldo y recuperación",
          "parrafos": [
            "El objetivo declarado es: copia de seguridad diaria (como mucho se pierden 24 horas de datos), recuperación en 48 horas si algo se rompe, pruebas de restauración cada 3 meses para ensayar recuperar todo, y reproceso del vigilante: si se pierde un evento, se vuelve a leer desde un punto anterior (ver manual 03-stack-backend).",
            "Pendiente de confirmar: estos objetivos están escritos en el diseño, pero no se ha verificado la implementación operativa de las copias en el repositorio."
          ],
          "subsecciones": []
        },
        {
          "titulo": "9. Qué falta confirmar (resumen)",
          "parrafos": [
            "Pendiente de confirmar: el entorno en la nube dedicado a TrueKeate (truekeate-main), porque los archivos actuales apuntan al proyecto MCC; la ausencia de recetas de contenedores (Docker) y tuberías automáticas (CI) en el repositorio; la conexión Escrow-Socios en el guion de despliegue; el mensajero (relayer) como servicio independiente con 2 copias y cola de reintentos; la red de producción definitiva (hoy todo funciona sobre la red de pruebas 31337); y las copias de seguridad operativas y el plan B del mensajero."
          ],
          "subsecciones": []
        },
        {
          "titulo": "10. Glosario de este manual",
          "parrafos": [
            "Despliegue = Poner el software a funcionar en un lugar · Entorno = Un lugar donde corre el software (local, nube...) · RPC = La puerta por la que se habla con la blockchain · Broadcast = Publicar la transacción en la red · Secret Manager = Caja fuerte de Google para claves secretas · Health-check = Chequeo de salud de un servicio · Backup = Copia de seguridad · Puerto = Número de puerta por el que entra el tráfico",
            "Fin de los manuales de TrueKeate: ya conoces la plataforma (01), su tecnología web3 (02), sus servidores (03), su app (04), sus piezas (dependencias) y sus casas (despliegue)."
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "01-diccionario-de-datos",
      "carpeta": "05-Diccionario-de-Datos",
      "titulo": "Lo que TrueKeate guarda en su base de datos",
      "resumen": "Versión en lenguaje sencillo del manual técnico 05, Diccionario de Datos. Explica qué carpetas (tablas) usa TrueKeate para recordar quién eres, qué ofreces y en qué punto está cada trueque, y qué hace la plataforma con tus datos personales.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "Cada vez que usas TrueKeate, la plataforma guarda información en una base de datos (PostgreSQL). Esa información se organiza en 14 carpetas (los técnicos las llaman tablas) y cada carpeta guarda un tema: tu identidad, tus artículos, tus trueques, tus notas, tus puntos de encuentro.",
            "Para leer este manual solo se necesitan 6 palabras: Trueque es el intercambio entre dos personas (AtoA, de una a otra), como cuando Ana da su bicicleta y recibe el curso de Bruno; Custodia es el momento en que depositas lo que ofreces en la caja fuerte digital (el escrow); Valoración es la nota del 1 al 5 que dejas de la otra persona al terminar; Estado (o etiqueta) es la marca que dice en qué momento está el trueque (hay 9 posibles, como CREADO, CUSTODIADO o COMPLETADO); Espejo es la copia que la base mantiene de lo que ocurre en la blockchain; y Wallet es tu dirección pública en la blockchain (empieza por 0x), el DNI digital de tu cuenta.",
            "Un paseo de 5 minutos por lo que guarda TrueKeate:",
            "1. Te registras. La base crea tu ficha en la carpeta usuarios, con tu consentimiento y la fecha, como pide el GDPR.",
            "2. Verificas tu correo y tu teléfono. Subes peldaños de la escalera de verificación (sección 3.3).",
            "3. Publicas tu bicicleta. Nace una ficha en articulos.",
            "4. Tú y Bruno crean el trueque. Nace una ficha en truekes que une tus dos artículos y tus dos direcciones, con la etiqueta CREADO.",
            "5. Cada movimiento en la cadena actualiza esa ficha: cuando alguien deposita su objeto pasa a CUSTODIADO y cuando ambos terminan, a COMPLETADO. Esto lo hace el vigilante (el indexador), nunca una persona.",
            "6. Al terminar, cada uno deja sus notas: dos fichas nuevas en valoraciones.",
            "Una promesa importante (D17 / GDPR): tus datos personales se guardan cifrados y con tu consentimiento. De tu documento de identidad solo viaja a la cadena una huella (hash); el documento nunca sale de la base."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. Las 14 carpetas y quién las llena",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "2.1 Tres clases de carpetas",
              "parrafos": [
                "El esquema separa quién puede escribir cada carpeta. Hay 3 clases.",
                "Clase 1, espejo de la cadena: carpetas truekes y parte de kyc, usuarios, finanzas y suscripciones. Las escribe solo el vigilante (indexador) y su fuente de verdad es la blockchain (sus eventos).",
                "Clase 2, negocio fuera de la cadena: carpetas articulos, valoraciones, puntos_encuentro, disputas, imagenes_certificadas, campanas y subastas. Las escribe la plataforma (su API) y su fuente de verdad es la propia base más las evidencias (fotos, firmas).",
                "Clase 3, cocina interna del vigilante: carpetas auditoria e indexador_checkpoint. Las escribe el vigilante a partir del registro de eventos procesados.",
                "La regla más importante: la blockchain es la única fuente de verdad para los estados del escrow. El vigilante solo copia (nunca escribe en la cadena) y nadie edita el espejo a mano."
              ]
            },
            {
              "titulo": "2.2 El inventario de las 14 carpetas",
              "parrafos": [
                "Las 14 carpetas son: usuarios (quién eres y tu identidad, por ejemplo la ficha de Ana), kyc (tu verificación de identidad con documento y selfie cifrados, por ejemplo el trámite de Bruno para ser CERTIFICADO), articulos (lo que la gente ofrece al trueque, por ejemplo la bicicleta de Ana), truekes (cada trueque y su estado, espejo del escrow, por ejemplo el trueque bici-curso), valoraciones (las notas de 1 a 5 al cierre, por ejemplo Bruno puntúa a Ana), puntos_encuentro (lugares físicos de encuentro con mapa, por ejemplo el parque a 3 km), disputas (conflictos, votación de Socios y sanciones), imagenes_certificadas (fotos con sello: huella y firma), suscripciones (el pago mensual de las empresas), campanas (ventas masivas o recolectas solidarias), subastas (subastas de empresas), finanzas (saldos, moneda BRLT y el Fondo de Valor), auditoria (bitácora de cada evento procesado, sin borrar nada) e indexador_checkpoint (el marcapáginas del vigilante, por ejemplo qué bloque del contrato Escrow ya leyó)."
              ],
              "imagen": "glosario-datos.svg"
            },
            {
              "titulo": "2.3 Carpetas que el diseño prometió y aún no existen",
              "parrafos": [
                "Pendiente de confirmar: el diseño habla de algunas carpetas que aún no tienen tabla en la base.",
                "encargos: pedir un artículo que no está en el mercado.",
                "Marcador de valoración: saber que ambas partes ya valoraron existe como evento en la cadena, pero la base aún no guarda esa marca.",
                "Guardianes de la recuperación de cuenta: viven solo en el contrato (2 de 3, espera de 48 horas); no tienen carpeta en esta base.",
                "Detalle de las emisiones de BRLT: en la base solo hay el saldo total."
              ]
            }
          ]
        },
        {
          "titulo": "3. Las etiquetas fijas (los enum)",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "3.1 Qué es una etiqueta fija",
              "parrafos": [
                "Una etiqueta fija (enum) es una lista cerrada de valores permitidos. Así la base no acepta errores de escritura: el estado de un trueque solo puede ser uno de los 9 valores de la lista, nunca una variante escrita mal."
              ]
            },
            {
              "titulo": "3.2 Las 9 etiquetas del trueque",
              "parrafos": [
                "Los 9 estados posibles de un trueque son: CREADO (acuerdo registrado, nadie ha depositado aún; lo escribe el vigilante con el evento TruekeCreado), ACTIVO (nombre antiguo de CREADO, solo para leer; ningún evento la escribe hoy), CUSTODIADO (al menos uno de los dos ya depositó su objeto; lo escribe el vigilante con eventos de custodia), APERTURA (ambos abrieron en su ventana de tiempo; lo escribe el vigilante con eventos de apertura), EN_DISPUTA (alguien pidió anular el trueque), RESOLUCION_SOCIOS (los Socios están votando), COMPLETADO (firmas dobles y valoraciones, todo entregado; lo escribe el vigilante con el evento de completado), ANULADO (anulado por votación o por vencimiento de plazo; lo escribe el vigilante con el evento de cancelación) y BLOQUEADO (violación de norma, objetos congelados; lo escribe el vigilante con el evento de bloqueo).",
                "Pendiente de confirmar: hoy el vigilante solo escribe 6 de las 9 etiquetas; ACTIVO, EN_DISPUTA y RESOLUCION_SOCIOS quedan para un ciclo posterior de ajuste fino."
              ]
            },
            {
              "titulo": "3.3 La escalera de verificación (D28)",
              "parrafos": [
                "Tu nivel de confianza se sube por una escalera de 3 peldaños.",
                "Peldaño 1, INSCRITO: solo necesitas crear tu cuenta (wallet e inscripción) y puedes ver ofertas, pero no completar trueques.",
                "Peldaño 2, VERIFICADO: confirmas con códigos tu correo y tu teléfono; puedes crear y completar trueques, hasta 3 trueques activos.",
                "Peldaño 3, CERTIFICADO: haces el KYC completo (documento y selfie); tienes todas las operaciones, incluida la compra en subastas.",
                "Lo bonito de la privacidad: para certificar tu peldaño en la cadena solo se usa una huella (raíz merkle) de tu documento, nunca el documento mismo."
              ],
              "imagen": "escalera-verificacion.svg"
            },
            {
              "titulo": "3.4 El resto de etiquetas fijas",
              "parrafos": [
                "Otras etiquetas fijas: tipo de usuario (PARTICULAR, EMPRESA o SOCIO) para tu rol en la ficha usuarios; nivel de usuario (INICIADO, COMUN, FRECUENTE o SOCIO) por reputación; medalla (BRONCE, PLATA u ORO, y las empresas necesitan ORO); estado del KYC (PENDIENTE, APROBADO, RECHAZADO o APELACION); tipo de imagen (PUBLICACION para la foto del anuncio o RECEPCION para la foto al recibir); estado de suscripción (ACTIVA, IRREGULAR o CANCELADA); tipo de campaña (VENTA o RECOLECTA); y estado de subasta (ABIERTA, CERRADA o ANULADA).",
                "Cuidado con una palabra trampa: SOCIO aparece dos veces con significados distintos. Como tipo de usuario, SOCIO es un rol de gobernanza (vota en los conflictos). Como nivel, SOCIO es el nivel máximo de reputación. No son lo mismo."
              ]
            }
          ]
        },
        {
          "titulo": "4. Tu identidad: qué guarda TrueKeate de ti",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "4.1 La carpeta usuarios (una ficha por persona)",
              "parrafos": [
                "Cada cuenta tiene una ficha con: wallet (tu dirección pública, es única: una cuenta por dirección), correo, teléfono y dirección de inscripción (contacto y zona, guardados cifrados según D17), tu posición en el mapa (geog, para la regla de los 10 km de la sección 7), tipo, nivel y medalla (rol, reputación e insignia), estado de verificación (tu peldaño en la escalera D28), smart_account (la dirección de tu cuenta inteligente, el contrato que te representa), consentimiento GDPR y su fecha (la casilla que marcaste al registrarte) y última actividad (para saber cuándo borrar cuentas inactivas)."
              ]
            },
            {
              "titulo": "4.2 La carpeta kyc (verificación de identidad)",
              "parrafos": [
                "Aquí vive tu trámite de identidad, en estos pasos:",
                "1. Subes tu documento y tu selfie. Ambos se guardan cifrados.",
                "2. De ellos se calcula una huella (raíz merkle) que viaja al contrato de tu cuenta inteligente. Tu documento nunca sale de la base.",
                "3. Una persona responsable (el Owner) revisa tu trámite y lo marca APROBADO, RECHAZADO o, si pides revisión, APELACION.",
                "4. Cuando la huella cambia (por ejemplo al actualizar tu documento), el vigilante copia la nueva huella en la base."
              ]
            },
            {
              "titulo": "4.3 Privacidad: cifrado, consentimiento y borrado (D17 / GDPR)",
              "parrafos": [
                "Lo que TrueKeate guarda de ti y cómo lo protege, en 4 puntos:",
                "1. Solo lo necesario: correo, teléfono, dirección de inscripción, documento y selfie (KYC), los puntos de encuentro que registras y tu actividad. Nada más.",
                "2. Cifrado en reposo: todos esos datos personales se guardan cifrados. Aunque alguien robara la base, no podría leerlos sin la llave.",
                "3. Consentimiento explícito: al registrarte marcas una casilla y la base guarda la fecha. Sin consentimiento no hay cuenta (es lo que pide el GDPR, la ley europea de protección de datos; D17 es la decisión del proyecto que la aplica).",
                "4. Borrado por inactividad: si llevas 24 meses sin entrar, tus datos pueden borrarse. La base guarda tu última actividad para saberlo. Pendiente de confirmar: el detalle del borrado automático."
              ],
              "imagen": "que-guarda-truekeate.svg"
            },
            {
              "titulo": "4.4 Qué pasa si pierdes tu cuenta (recuperación)",
              "parrafos": [
                "Si pierdes el acceso a tu cuenta, tus guardianes (2 de 3) pueden ayudarte a recuperarla. Cuando cambia el dueño de la cuenta inteligente, el vigilante actualiza la dirección (wallet) en tu ficha de usuarios. Por eso, las fichas de trueques pasados guardan la dirección tal como era en ese momento: es una historia que no se reescribe."
              ]
            }
          ]
        },
        {
          "titulo": "5. Catálogo, intercambio y fotos con sello",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "5.1 articulos: lo que se ofrece",
              "parrafos": [
                "Publicar algo (un objeto, un NFT, una cripto, un servicio) crea una ficha en articulos que guarda: el título y el rubro (categoría) para las búsquedas, la foto certificada que lo avala (sección 5.3), su número de token en la cadena si es un NFT (nft_token_id), disponible (si ya se está truequeando, deja de ofrecerse a nuevas propuestas) y alta_disponibilidad, que es un cálculo automático de la plataforma y no un dato que tú escribes."
              ]
            },
            {
              "titulo": "5.2 truekes: la carpeta reina del intercambio",
              "parrafos": [
                "Cada trueque es una fila que guarda: escrow_id (el número del trueque en la cadena, es único: un escrow equivale a una fila), los 2 artículos (el tuyo y el de la otra persona), las 2 direcciones (usuario_a y usuario_b), su etiqueta (los 9 estados de la sección 3.2), la hora pautada del encuentro y cuándo abrió cada parte su ventana, el punto de encuentro elegido y el recibo de la cadena (hash de la transacción y bloque).",
                "Qué es una custodia en la práctica: cuando Bruno deposita su curso en la caja fuerte digital, la cadena emite un evento y el vigilante cambia la etiqueta a CUSTODIADO, que significa que al menos uno de los dos ya entregó su objeto.",
                "Solo el vigilante escribe en truekes. Nadie más puede cambiar el estado a mano."
              ],
              "imagen": "origen-de-los-datos.svg"
            },
            {
              "titulo": "5.3 imagenes_certificadas: las fotos con sello",
              "parrafos": [
                "Las fotos importantes llevan un sello digital para que no puedas engañar con una foto falsa, en 4 pasos:",
                "1. Se calcula la huella de la imagen (SHA-256).",
                "2. La imagen se guarda en IPFS (un almacén de archivos distribuido).",
                "3. El autor firma la huella con su clave.",
                "4. Se guarda el tipo: PUBLICACION (foto del anuncio) o RECEPCION (foto al recibir el objeto).",
                "Pendiente de confirmar: el diseño prevé anclar la huella de todas las fotos en la cadena, pero los contratos actuales no lo declaran todavía; también falta confirmar el punto exacto de la plataforma que sube las fotos."
              ]
            }
          ]
        },
        {
          "titulo": "6. Confianza y resolución: valoraciones y disputas",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "6.1 valoraciones: las notas al terminar",
              "parrafos": [
                "Para cerrar un trueque, ambas partes deben valorarse. Cada valoración son 5 preguntas (aceptación, honestidad, seguridad, confiabilidad y compromiso) y cada una se puntúa de 1 a 5.",
                "1. Ana valora a Bruno: 5 preguntas del 1 al 5.",
                "2. Bruno valora a Ana: lo mismo.",
                "3. La base no deja votar dos veces: una valoración por persona y por trueque.",
                "Tus notas alimentan tu nivel de reputación, que se recalcula cada mes. El contenido de la nota no viaja a la cadena: la cadena solo recibe la marca de que ya valoraste. Pendiente de confirmar: si esa marca se sincronizará en la base en un ciclo posterior."
              ]
            },
            {
              "titulo": "6.2 disputas: cuando algo sale mal",
              "parrafos": [
                "Si un trueque falla, la ficha de disputa guarda: quién la pidió y por qué (el motivo), su estado (ABIERTA, etc.), la resolución y la posible sanción, el timelock de 6 horas (una sanción no se ejecuta de inmediato; se espera 6 horas para que nadie actúe por impulso), el registro de votos de los Socios (hace falta quórum de 2/3 y cada Socio vota una sola vez) y la regla del plazo (si pasan 5 días sin alcanzar quórum, el trueque se anula por defecto y cada uno recupera sus NFTs).",
                "Pendiente de confirmar: la decisión final (votos y resolución) ocurre en la cadena; la base aún no sincroniza automáticamente el registro de votos ni el estado de disputa en este ciclo."
              ]
            }
          ]
        },
        {
          "titulo": "7. Geografía: los puntos de encuentro y la regla de los 10 km",
          "parrafos": [
            "TrueKeate tiene memoria de mapas gracias a una extensión de la base llamada PostGIS. Con ella guarda, en puntos_encuentro: la dirección del punto (cifrada, es dato personal) y sus coordenadas, su radio de búsqueda (por defecto, 10 km) y si es un establecimiento de retiro aprobado por los Socios (para recoger compras de campañas o subastas).",
            "La regla de convivencia (RF-08): las partes de un trueque deben estar a menos de 10 km según su dirección de inscripción y el punto de encuentro. La base lo comprueba sola: busca puntos de encuentro que estén a menos de 10.000 metros (10 km) de ti.",
            "Pendiente de confirmar: la plataforma planea una consulta tipo puntos de encuentro cercanos (latitud, longitud y radio), pero el punto exacto de la API aún no está implementado."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. Empresas y dinero: suscripciones, campañas, subastas y finanzas",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "8.1 suscripciones: cómo pagan las empresas (D33)",
              "parrafos": [
                "Las empresas no pagan con tarjeta: congelan una cantidad de BRLT durante 30 días (staking bloqueado) y esa congelación cuenta como el pago del mes.",
                "Cada ciclo de suscripción guarda: el plan, el monto congelado, la fecha de inicio y de fin (30 días) y su estado (ACTIVA, IRREGULAR o CANCELADA).",
                "Pendiente de confirmar: solo el evento de alta (Suscrita) está mapeado. Los eventos de cobro del ciclo, suscripción irregular y cancelación existen en el contrato pero aún no se sincronizan."
              ]
            },
            {
              "titulo": "8.2 campanas: ventas masivas y recolectas",
              "parrafos": [
                "Las empresas pueden organizar una campaña de tipo VENTA (vender varios artículos) o RECOLECTA (reunir donaciones para una causa social). La ficha guarda los artículos incluidos, la causa (en recolectas), la fecha de fin y si los Socios la aprobaron."
              ]
            },
            {
              "titulo": "8.3 subastas: pujas de empresa",
              "parrafos": [
                "Una empresa subasta un artículo con: duración, puja inicial, incremento mínimo y el historial de pujas. Al cerrar, la ficha guarda al ganador, el valor de su puja y su nivel de reputación, porque si dos personas ofrecen lo mismo, gana la de mayor nivel (regla de desempate D27)."
              ]
            },
            {
              "titulo": "8.4 finanzas: saldos y el Fondo de Valor",
              "parrafos": [
                "Cada persona tiene una sola ficha financiera (relación 1 a 1 con su identidad) que guarda: su stock declarado de NFTs y criptos, su saldo de BRLT (la moneda de la comunidad; cuando se emite BRLT en la cadena, el vigilante suma el saldo en la base, y el tope de emisión de 1.000.000 BRLT vive en el contrato, no en la base) y el Fondo de Valor, el fondo común de la plataforma: la base guarda los porcentajes que el Owner puede configurar, por defecto 1% de cada trueque, 10% de suscripciones y 5% de BRLT.",
                "Pendiente de confirmar: los eventos del contrato del Fondo de Valor (contribuciones, cambios de porcentaje y retiros) no están mapeados en el vigilante; el mantenimiento automático del fondo queda pendiente."
              ]
            }
          ]
        },
        {
          "titulo": "9. La cocina interna del vigilante: bitácora y marcapáginas",
          "parrafos": [],
          "subsecciones": [
            {
              "titulo": "9.1 auditoria: la bitácora que no se borra",
              "parrafos": [
                "Cada evento que el vigilante procesa se anota en la bitácora auditoria: qué contrato fue (por ejemplo Escrow) y qué evento (por ejemplo CustodiaA), quién lo emitió, en qué transacción y en qué bloque, los datos del evento y si ya se procesó.",
                "Es una bitácora de solo añadir: nada se borra ni se cambia. Tiene una triple llave (transacción + posición en la transacción + contrato) que impide procesar el mismo evento dos veces; los técnicos lo llaman idempotencia."
              ]
            },
            {
              "titulo": "9.2 indexador_checkpoint: el marcapáginas",
              "parrafos": [
                "Por cada contrato, el vigilante guarda el último bloque que leyó. Es como un marcapáginas: si el vigilante se apaga, al volver continúa exactamente donde estaba y puede incluso reprocesar desde cualquier bloque anterior."
              ]
            }
          ]
        },
        {
          "titulo": "10. Reglas de oro de los datos",
          "parrafos": [
            "1. La cadena manda: los estados del escrow viven en la blockchain; la base solo los copia y nadie los edita a mano.",
            "2. Nada se procesa dos veces: cada evento tiene su triple llave única.",
            "3. Un escrow equivale a una fila: cada trueque de la cadena tiene una sola ficha.",
            "4. Un voto por persona y por trueque, y las notas van de 1 a 5.",
            "5. Nadie está a más de 10 km: PostGIS vigila la cercanía.",
            "6. Tus datos personales van cifrados y con tu consentimiento (D17/GDPR).",
            "7. Búsquedas rápidas: la base pone índices de libro en las búsquedas frecuentes (estado del trueque, direcciones, rubros, eventos). Pendiente de confirmar: falta un índice sobre la cuenta inteligente, que el vigilante consulta con frecuencia.",
            "Resumen de lo pendiente de confirmar: carpetas prometidas sin tabla (encargos, guardianes, marcador de valoración), tres etiquetas del trueque aún sin escritor (ACTIVO, EN_DISPUTA, RESOLUCION_SOCIOS), anclaje de fotos en la cadena, mapeos de eventos de disputas, del Fondo de Valor y de suscripciones, y el borrado automático por inactividad."
          ],
          "subsecciones": []
        }
      ]
    },
    {
      "id": "01-diagrama-relacional",
      "carpeta": "06-Diagrama-Relacional",
      "titulo": "Cómo se conectan los datos de TrueKeate",
      "resumen": "Manual en lenguaje sencillo que explica cómo se conectan entre sí las 14 carpetas de datos de TrueKeate: quién tiene qué, en qué estado está y a quién hay que creerle. Recorre el mapa de tablas con sus candados y conexiones sueltas, y cuenta la historia de Ana y Bruno de principio a fin.",
      "secciones": [
        {
          "titulo": "1. Empezar en 5 minutos",
          "parrafos": [
            "En TrueKeate los datos no viven sueltos: las fichas se apuntan unas a otras. Cada ficha tiene una llave propia (clave primaria, PK) y puede llevar candados (claves foráneas, FK) que apuntan a la llave de otra ficha. Así la base sabe que este artículo es de Ana o que esta valoración pertenece a este trueque.",
            "La historia de Ana y Bruno, de principio a fin:",
            "Paso 1: Ana y Bruno se registran. Quedan 2 fichas en usuarios, cada una con su llave propia (id 1 y id 2).",
            "Paso 2: Ana publica su bicicleta y Bruno publica su curso. Quedan 2 fichas en articulos, cada una con un candado que dice que es de la usuaria 1 o del usuario 2.",
            "Paso 3: Crean el trueque. Queda 1 ficha en truekes que apunta a los 2 artículos y guarda las 2 direcciones de los participantes.",
            "Paso 4: La cadena habla. Cada movimiento del escrow (custodia, apertura, completado) actualiza la etiqueta de esa ficha: es un espejo del contrato.",
            "Paso 5: Se encuentran cerca. Eligen un punto en puntos_encuentro que la base comprueba que esté a menos de 10 km de ambos (PostGIS).",
            "Paso 6: Terminan y se valoran. Quedan 2 fichas en valoraciones con candado al trueque: una de Ana a Bruno y otra de Bruno a Ana.",
            "Para leer el manual se necesitan 4 palabras: Llave propia (PK) = el número de identificación único de cada ficha, por ejemplo el id de Ana (1) · Candado (FK) = un apunte que dice que esta ficha pertenece a aquella, por ejemplo el artículo que apunta a la usuaria 1 · 1 a muchos = una ficha madre puede tener muchas fichas hijas, por ejemplo Ana puede publicar 10 artículos · Espejo = una ficha que copia el estado de la cadena, como la ficha del trueque."
          ],
          "subsecciones": []
        },
        {
          "titulo": "2. El mapa general de las carpetas",
          "parrafos": [
            "El mapa muestra las carpetas y sus conexiones: desde usuarios salen kyc (verificación de identidad), articulos (publica), puntos_encuentro (registra), finanzas (tiene una ficha financiera, 1 a 1), suscripciones (la empresa paga), campanas (organiza) y subastas (la empresa subasta). Desde articulos salen truekes (se ofrece en un trueque) y subastas (se subasta). Desde truekes cuelgan valoraciones (recibe notas del 1 al 5) y disputas (puede tener conflictos). Hay además dos conexiones sin candado: puntos_encuentro se une a truekes como punto acordado e imagenes_certificadas se une a articulos como foto con sello.",
            "En el diagrama cada tabla muestra su contenido: usuarios tiene id como llave propia, wallet como dirección única y estado (escalera D28) · kyc tiene candado a usuarios y la huella merkle del trámite · articulos tiene candado a usuarios y su rubro o categoría · truekes guarda el número del escrow en la cadena (escrow_id), candados a articulo_a_id y articulo_b_id, y las direcciones usuario_a y usuario_b sueltas · valoraciones tiene candado a truekes y una nota de honestidad del 1 al 5 · finanzas comparte la llave con usuarios (1 a 1) y guarda el saldo brlt · auditoria guarda el hash de la transacción.",
            "En el mapa hay 3 tipos de conexión:",
            "Tipo 1, candado real: la base obliga a que exista la ficha madre; por ejemplo, articulos.usuario_id no puede apuntar a nadie que no exista.",
            "Tipo 2, conexión lógica (sin candado): la ficha lleva el apunte, pero la base no lo vigila; lo cuida la plataforma por código.",
            "Tipo 3, dirección suelta: se guarda la dirección de la cadena como texto, sin candado, porque puede cambiar con el tiempo (ver sección 4).",
            "Las formas de relacionarse: 1 a muchos es la más común (una usuaria tiene muchos artículos, un trueque tiene varias valoraciones) · 1 a 1 (cada persona tiene una sola ficha financiera que comparte la llave; también la verificación de identidad, aunque la base no lo obliga del todo, y la foto con sello de un artículo) · muchos a muchos (entre personas y artículos se resuelve con la ficha del trueque, que guarda 2 artículos y 2 personas, ver sección 5) · polimorfismo (la foto con sello apunta a un artículo o a un trueque según su tipo, PUBLICACION o RECEPCION)."
          ],
          "imagen": "mapa-relaciones.svg",
          "subsecciones": []
        },
        {
          "titulo": "3. Las relaciones con candado (1 a muchos reales)",
          "parrafos": [
            "Desde usuarios (cada persona puede tener muchas...): kyc guarda su trámite de identidad · articulos guarda sus publicaciones · puntos_encuentro guarda sus puntos de encuentro · suscripciones guarda sus ciclos de pago si es empresa · campanas guarda sus campañas · subastas guarda sus subastas como empresa y también como ganadora · finanzas guarda su ficha financiera (1 a 1).",
            "Desde articulos: truekes (el artículo se ofrece como artículo A o como artículo B) · subastas (el artículo se subasta).",
            "Desde truekes, la pieza central: valoraciones (las notas del trueque) · disputas (los conflictos del trueque)."
          ],
          "subsecciones": []
        },
        {
          "titulo": "4. Las conexiones sin candado (y por qué existen)",
          "parrafos": [
            "Las conexiones sin candado y qué unen: la foto con sello une articulos con imagenes_certificadas y es lógica (la base no obliga, la plataforma lo cuida) · el punto de encuentro une truekes con puntos_encuentro y es lógica (se acuerda fuera de la base) · la foto polimórfica une imagenes_certificadas con articulos o truekes según el tipo de foto · las direcciones de participantes unen truekes, valoraciones y disputas con usuarios, porque se guarda la dirección tal como era (por historia) · el número del escrow (truekes.escrow_id) une con la cadena: no apunta a una tabla local, es el puente con la blockchain.",
            "Las direcciones no llevan candado porque tu dirección puede cambiar: si pierdes tu cuenta y la recuperas con tus guardianes, el nuevo dueño tiene otra dirección. Si las fichas de los trueques antiguos llevaran candado a tu dirección actual, la historia se rompería. Por eso las fichas guardan la dirección del momento como un valor que no se reescribe."
          ],
          "subsecciones": []
        },
        {
          "titulo": "5. El trueque: la pieza central del modelo",
          "parrafos": [
            "Un trueque es la unión de 2 personas y 2 artículos en una sola ficha: articulo_a_id con usuario_a indica qué ofrece Ana y quién es Ana; articulo_b_id con usuario_b indica qué ofrece Bruno y quién es Bruno. Los artículos sí llevan candado real (deben existir en articulos); las direcciones se guardan sueltas (ver sección 4).",
            "Un artículo puede participar en varios trueques, pero si está marcado como no disponible ya no recibe nuevas ofertas.",
            "Además, la ficha del trueque es el espejo del contrato Escrow: el evento TruekeCreado crea la ficha con etiqueta CREADO · CustodiaA o CustodiaB cambia la etiqueta a CUSTODIADO · AperturaA o AperturaB cambia a APERTURA y anota cuándo abrió cada parte · TruekeCompletado cambia a COMPLETADO · TruekeCancelado cambia a ANULADO · EscrowBloqueado cambia a BLOQUEADO.",
            "Rige la regla de un escrow = una fila: el número del escrow es único, así que si el vigilante recibe dos veces el mismo evento, actualiza la misma ficha en vez de duplicarla."
          ],
          "subsecciones": []
        },
        {
          "titulo": "6. El espejo de la blockchain: qué copia cada carpeta",
          "parrafos": [
            "Cada carpeta de la base copia algo de un contrato de la cadena: truekes copia del contrato Escrow el estado de cada trueque · kyc (huella) copia de Smart Account la huella merkle de tu KYC · usuarios (dirección) copia de Smart Account tu dirección actual, que cambia al recuperar la cuenta · usuarios (tipo) copia del Padrón de Socios si pasas a ser SOCIO · finanzas (BRLT) copia del contrato BRLT el saldo cuando se emite moneda · suscripciones copia de la Suscripción de empresa cada ciclo de pago de 30 días · auditoria copia de todos cada evento procesado (bitácora) · indexador_checkpoint copia de todos el último bloque leído (marcapáginas).",
            "El vigilante (indexador) escucha los eventos de los contratos de la cadena (Escrow, Smart Account, Padrón de Socios, BRLT y Suscripción de empresa) y los copia en las carpetas espejo de la base, anotando cada evento en la bitácora auditoria sin duplicar.",
            "Pendiente de confirmar: algunos contratos ya emiten eventos que el vigilante todavía no copia en este ciclo, como el Fondo de Valor (contribuciones, cambios de porcentaje, retiros) y los eventos de disputa o resolución del escrow (solicitud de anulación, votos, resolución ejecutada, sanción). Se esperan en un ciclo posterior (C8)."
          ],
          "imagen": "espejo-blockchain.svg",
          "subsecciones": []
        },
        {
          "titulo": "7. Las carpetas que escribe la plataforma (sin cadena)",
          "parrafos": [
            "Estas carpetas las llena la propia plataforma con tu actividad: articulos guarda tus publicaciones, con candado a usuarios · valoraciones guarda tus notas del 1 al 5, con candado a truekes · puntos_encuentro guarda tus puntos con mapa, con candado a usuarios · disputas guarda los conflictos, con candado a truekes · imagenes_certificadas guarda las fotos con sello, con apunte lógico a artículos o trueques · campanas guarda las ventas masivas y recolectas, con candado a usuarios · subastas guarda las subastas de empresa, con candados a usuarios y articulos · finanzas guarda los saldos, en 1 a 1 con usuarios y como espejo parcial de BRLT."
          ],
          "subsecciones": []
        },
        {
          "titulo": "8. La regla de los 10 km (PostGIS)",
          "parrafos": [
            "La base tiene memoria de mapas (extensión PostGIS). Guarda coordenadas en dos carpetas: usuarios guarda el punto de tu dirección de inscripción, y puntos_encuentro guarda el punto de cada lugar de encuentro con su radio (por defecto 10 km).",
            "La regla: para que un trueque sea viable, el punto de encuentro debe estar a menos de 10.000 metros (10 km) de ambos participantes. La base lo comprueba con una consulta especial (los técnicos escriben ST_DWithin con 10000) y usa un índice espacial para que sea rápida.",
            "Esto sirve para:",
            "1. Sugerir puntos de encuentro cercanos a ti.",
            "2. Filtrar ofertas y trueques por cercanía.",
            "3. Buscar establecimientos de retiro aprobados por los Socios en tu zona.",
            "Pendiente de confirmar: la plataforma planea una consulta tipo puntos cercanos a una dirección (latitud, longitud y radio), pero el punto exacto de la API aún no está implementado."
          ],
          "imagen": "radio-10km.svg",
          "subsecciones": []
        },
        {
          "titulo": "9. Las garantías: nada se pierde ni se duplica",
          "parrafos": [
            "El sistema de datos tiene una cadena de garantías:",
            "1. Bitácora de solo añadir: cada evento procesado se anota en auditoria y no se borra nunca.",
            "2. Cada evento se procesa una sola vez: la triple llave (transacción + posición + contrato) lo impide.",
            "3. Cada escrow tiene una sola fila: si llega dos veces el mismo evento, se actualiza y no se duplica.",
            "4. Marcapáginas para reprocesar: el vigilante guarda el último bloque leído por contrato y puede volver a barrer desde cualquier bloque.",
            "5. Reconciliación: el vigilante compara su copia con la cadena. Pendiente de confirmar: la comparación fina de detalles se completa en un ciclo posterior.",
            "Reglas de integridad destacadas: wallet única, no puede haber dos cuentas con la misma dirección · un escrow = una fila, el número del escrow es único · una valoración por persona y trueque, nadie puede votar dos veces · notas entre 1 y 5, la base rechaza un 7 o un 0 · triple llave de eventos, ningún evento se procesa dos veces."
          ],
          "subsecciones": []
        },
        {
          "titulo": "10. Un ejemplo de principio a fin (con las preguntas que responde la base)",
          "parrafos": [
            "La historia de Ana y Bruno dentro de las carpetas sigue 4 etapas: etapa 1, identidad, con usuarios: Ana (id 1, wallet 0x...A) y Bruno (id 2, wallet 0x...B) · etapa 2, catálogo, con articulos: la bicicleta cuyo usuario_id apunta a Ana y el curso de fotografía cuyo usuario_id apunta a Bruno · etapa 3, el trueque como espejo del Escrow, con truekes: el escrow 42, el artículo A es la bicicleta de Ana, el artículo B es el curso de Bruno, y la etiqueta pasa de CREADO a CUSTODIADO, luego APERTURA y finalmente COMPLETADO · etapa 4, cierre y confianza, con valoraciones: Ana valora a Bruno y Bruno valora a Ana con notas del 1 al 5.",
            "Estas son las preguntas típicas que la base responde al unir carpetas:",
            "¿En qué estado está el trueque? Busca la ficha en truekes por su número de escrow y lee la etiqueta.",
            "¿Qué peldaño tiene Ana? Lee usuarios.estado (la escalera D28) y su trámite en kyc.",
            "¿Quién participó y con qué? Lee las 2 direcciones y los 2 artículos de la ficha del trueque.",
            "¿Qué notas recibió Bruno? Busca las valoraciones del trueque.",
            "¿Hay puntos de encuentro cerca? Pregunta al mapa de PostGIS (regla de los 10 km).",
            "¿Pagó la empresa este mes? Busca sus ciclos en suscripciones.",
            "¿Qué eventos ya se procesaron? Lee la bitácora auditoria y el marcapáginas indexador_checkpoint."
          ],
          "imagen": "ejemplo-ana-bruno.svg",
          "subsecciones": []
        },
        {
          "titulo": "11. Resumen por carpeta (la ficha de cada una)",
          "parrafos": [
            "Resumen por carpeta: usuarios tiene llave propia y la dirección wallet es su llave natural en la cadena · kyc tiene llave propia y candado a usuarios, con la huella (espejo) y quién la revisó · articulos tiene llave propia y candado a usuarios, más su foto con sello sin candado · truekes tiene llave propia y candados a articulos (dos veces), con el número del escrow, las direcciones y el punto de encuentro sueltos · valoraciones tiene llave propia y candado a truekes · puntos_encuentro tiene llave propia y candado a usuarios, con sus coordenadas en el mapa · disputas tiene llave propia y candado a truekes, con quién la pide y el registro de votos.",
            "Continúa el resumen: imagenes_certificadas tiene llave propia y apunte polimórfico a artículo o trueque · suscripciones tiene llave propia y candado a usuarios (empresa), con el recibo de la transacción · campanas tiene llave propia y candado a usuarios · subastas tiene llave propia y candados a usuarios (dos veces) y a articulos, con el número del escrow y el nivel del ganador · finanzas usa como llave la de usuarios, con candado 1 a 1 · auditoria tiene llave propia, con la dirección del evento y su triple llave · indexador_checkpoint usa el nombre del contrato y guarda el último bloque leído.",
            "Conclusión sencilla: la identidad está en usuarios, el intercambio en truekes, y todo lo demás cuelga de esos dos puntos con candados y apuntes. Así TrueKeate puede responder cualquier pregunta sobre quién tiene qué, en qué estado está y a quién hay que creerle."
          ],
          "subsecciones": []
        }
      ]
    }
  ];
