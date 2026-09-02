[OBJETIVO]
Crear una plataforma en web3 llamada TrueKeate donde los usuarios puedan intercambiar Activos, Bienes y Servicios de una forma segura y fiable donde la confianza y la honestidad sea recompensadas con reputación y beneficios para el entorno. los usuarios pueden ser empresas o particulares; siendo empresas le permite ofrecer más de 5 artículos para intercambio y propiciar subastas por alguno de sus artículos considerados buscados; siendo particular le permite tener hasta 5 artículos para su cambio y solicitar artículos que no estén dentro del mercado como un encargo ofreciendo algo a cambio.

[CONTEXTO]
el proyecto DApp para el intercambio de Bienes-Productos-servicios-criptos representados en NFTs, pudiendo establecer trueque en entre cualquiera de ellos de una manera facil y verificable.
estos trueques se ejecuta cuando un Usuario A ofrese un NFT/cripto y otro usuario B completa el intercambio ofreciendo el NFT/Cripto requerido.
al ofrecer o completar un trueque los NFTs pasan a ser custodiados por el contrato escrow hasta que ambos usuarios firmen la recepcion correcta de lo negociado.
como requisito indispensable del proceso de cierre de trueke se debe dar una valoracion de la actividad y de lo negociado.
para lograr se debe llegar a un acuardo para el sitio de entrega y se debe certificar que se recibio o no lo negociado. 
de ser insatisfecha o rechazada el intercambio se puede solicitar anulacion justificando la anulacion y los NTFs ofrecidos vuelven a las billeteras de los usuarios.
todos los truekes son valorado por un esquema de reputacion que les concede al usuario beneficios o prioridades en ciertos proceso (establecer puntos de encuentros, mayor peso en las disputas, etc).

Estructura:
- Smart contracts con Foundry
- Frontend con Next.js 14 y ethers.js
- Debe permitir crear operaciones de swap, completarlas y cancelarlas
- debe tener una BD Posrgresql para albergar gran catidad de informacion que no deberia estar on-chain. 
- PostgreSQL debe comportarse como una base de datos de lectura impulsada por eventos. 
- Debemos construir un Indexador de Eventos (puedes usar The Graph o un listener en tu API de Node.js) que escuche los eventos de la blockchain y actualice PostgreSQL en consecuencia. 
- La blockchain es la única fuente de verdad para los estados del escrow. 
- debe incorporar soporte para manejo de mapas para establecer puntos de encuentros. en la versión móvil ofrece la ruta del como llegar. 
- todos los elementos externos incorporados deberan ser estrictamente de codigo abierto, de uso publico y gratuito.
- la interface debe ser amigable con colores vividos, y la navegación intuitiva. 
- se debe desplegar bien en diferentes dispositivos sin afectar la interface de usuario de manera que beneficie la Experiencia de usuario.

como metodo de reputacion se tomara en cuenta la valoracion de los usuarios en varias renglones:
- Aceptacion del producto: se enfoca a valorar la apariencia y estado del articulo.
- Honestidad Publicitaria: se enfoca en valorar que tan cierto ha sido la descripcion en la publicacion.
- Seguridad: se enfoca en valorar lo certificados y evidencias legales del articulo.
- Confiabilidad: se enfoca en valorar la experiencia durante la actividad de intercambio.
- Compromiso: se enfoca en valorar el tiempo y las novedades que transcurren desde que se acuerda el intercambio hasta que se realiza.

como estructura general:
- solo los usuarios inscritos y corectamente verificados podran hacer acuerdos de intercambios.
- los usuarios particulares deben formalizar su inscripcion para realizar operaciones en la plataforma.
- los niveles de confianza (iniciado, Comun, Frecuente, Socio), se obtiene en una combinacion de valor dado por el niver de repotacion, el volumen de transacciones efectivas y el volumen de intercabios en apelacion.
- el Usuario Iniciado solo puede intercambiar artículos del mismo rubro y de alta disponibilidad, para ello deberá tener lo equivalente al 3% del total de las transacciones en su rubro. solo se le permite tener un maximo de 5 rubros en sus articulos. no puede determinar lugares de intercambio
- el Nivel Comun podrá tener establecer proponer lugares de intercambio vasado a la cercania entre la contraparte y el, solo se le permitira aceptar o proponer zonas ya registradas por el o por la contraparte. Podrá tener hasta 20 rubros para intercambio y un maximo de 50 articulos a intercambiar. su cuenta puede ser penalizada al pasar un periodo de inactividad prolongado con mas del 5% del volumen de articulos en el mercado.
- el nivel Frecuente es mayormente desugnado para los usuarios empresa, en este nivel se podra establecer campanas de venta de articulos de forma masiva, tener muchos rubros declarados, tener establecimiento para retiro de articulos, contar con la opcion de envios o delibery, podra ofrecer intercambio de articulos por stablecoin BorloTokens BRLT.
- el nivel Socio esta disenado para dar control auditoria y verificacion de los intercambios los usuarios Empresas o Particulares se encargaran de servir como mediadores y jueces en los conflictos de disputas en intercambios, evaluaran las sanciones aplicadas, administraran la emision y valor de la stablecoin BorloTokens BRLT y aprobaran las creaciones de establecimientos de retiros, crearan campanas de recolecta por una causa dando como intercambio articulos por puntos de reputacion. aprobaran las campanas de venta masiva, conformaran un fondo de valor para los gastos de operacion (infraestructura y equipamiento tecnico) de la plataforma (hosting, gas, red de despliege de contratos, etc). (porpon otras actividades a incorporar para el bienestar y confor de los usuarios y las actividades de intercambio)

[LIMITACIONES]
- las transacciones entre los usuarios particulares no deberan generar coste de gas. Debemos implementar un patrón de Meta-Transacciones (EIP-712) y una infraestructura de Relayers (como Biconomy o OpenZeppelin Defender). Los usuarios firmarán criptográficamente sus intenciones (sin costo), y el backend enviará la transacción a la blockchain asumiendo el costo del gas.
-  los usuarios Empresas deberan pagar el gas de todas sus transacciones.
-  los usuarios empresas deberan pagar para su inscripcion, Adicionalmente el contrato inteligente debe implementar un patrón de suscripción (ej. EIP-1337 o un modelo de staking bloqueado) para automatizar los cobros sin requerir que la empresa firme una transacción manual cada 30 días. 
- los lugares de intercambios no deberan tener mas de 10km de distancia entre las partes. Esta lógica debe vivir estrictamente en la Capa Off-chain (PostgreSQL con extensión PostGIS) mediante las API de geolocalizacion partiendo de la direccion de los usuarios suministrada en la inscripcion.
- la identidad real de los usuarios debera ser confidencial, salvo que se autorice la divulgacion para la emision de facturas o certificados.
- la verificacion del usuario debe tener una tecnica aceptable correo, telefono, documento de identidad y selfie. implementar Abstracción de Cuentas (ERC-4337). Los usuarios se registran con su correo/teléfono y el sistema despliega un Smart Account (contrato inteligente que actúa como wallet). Esto permite recuperación social o recuperación vinculada a su KYC en caso de pérdida de acceso, manteniendo la descentralización de los fondos. 
- La metadata del KYC se almacena cifrada en tu PostgreSQL, pero un hash de validación (merkle root) se sube al Smart Account para certificar el estado de verificación ("Iniciado", "Común", etc.) sin revelar la identidad real. 
- todas las imagenes (publicacion o resepcion) deben generar un hash con la metadata y la wallet del usuario conectado para certificacion. Hash criptográfico (SHA-256) de la imagen subida (idealmente almacenada en IPFS) y haciendo que la wallet del usuario firme ese hash (ECDSA). La firma y el hash se almacenan en tu PostgreSQL, garantizando la inmutabilidad y auditoría real. 
- el proceso de intercambio debe ser aperturado por ambas partes a no mas de 10 minutos de la hora pautada y con un maximo de 10 minutos de diferencias entra la apertura de ambas partes, 
- ante cualquier violacion de norma, el intercambio se bloquea y se solicita autorización de cierre  del intercambio como irregulas y no efectivo a ambas partes.

[entorno remoto]
- el entorno remoto sera para pruebas de desarrollo que permita la visualizacion del proyecto el estilo preview usando las cuentas de desplegadas en el anvil (nodo de pruebas interno)
- el entorno de trabajo remoto sera con mi cuenta Google Cloud donde se encuentra desplegado los servicios globales (foundry y PostgreSQL). se usaran esos servicios.
- se usara a la herramientas de manejos de identidad y manejo de claves/datos escenciales que ofrece GCP.
- se Debera restringir el acceso a los servicios que no sean nescesario para su uso publico.
- se solicitara autorizacion para la creacion o despliege de servicios globales de la cuenta o servicios especificos del proyecto.
 
[entorno de sistema]
-para uso del entorno de pruebas se debe usar la cuenta 0 generada en el anvil como eo ounwer y despliegue de contrato, luego la cuenta 1 como el relayer y como cuenta general de la plataforma para pagos de gas y otros gstos.
- crea un dasboard de solo acceso del ouner para gestionar todas las secciones de la plataforma (contratos desplegados, Finanzan generales, Usuarios inscritos, kpi de disputas, Base de datos off-chaing) y cualquier otro sub modulo que deba incluirse para verificar el rendimiento de la plataforma
- esta plataforma se tendra que ejecutar principalmente en equipos moviles, por lo qie las interfaces deben dicenarce para uso en dispositivos moviles. (usa el frontend mas adecuado y efectivo para tener la version Pc, version Telefono y Version Tablet).
- crea una landing page de inicio que tenga toda la informacion de la plataforma. Cantidades de usuarios, vomunen de transacciones, que es un Trueke Digital, ventajas, etc. el objetivo es mostrar  los beneficios y seguridad del trueke y su filosofia.
- las funciones de las plataforma se ejecutaran en un apartado tipo dashboard (suite para usuarios) donde se accedera a todas las funciones de intercambio de la plataforma, el catalogo de productos ofrecidos para intercambio, perfil de Usuario. reputacion y confianza, intercambio activo, etc. el objetivo es tener acceso a todos los modulos segun su tipo y nivel de usuario.
-en cuanto a el acceso a las interfaces de usuario:
1. establezcamos un proceso de niveles segun su reputacion para los usuarios, los niveles van de bronce (basico y recien inscrito) a Oro (con mas de 1000 intercambio y con un 90% de intercambios efectivos).
2. todas las billeteras conectadas se inscriben como Usuario particular, pueden realizar las funciones basicas ya disenadas para este tipo de usuarios.
3. para optar a la clacificacion como Usuario empresa debe estar certificado y con clasificacion Oro.
4. para optar a la clasificacion como Usuario Socio debe hacer una solicitud formal a la plataforma y esta sera sometida a votacion por los demas Usuarios Socios.
5. el acceso a las interfaces se dividira de la siguiente forma:
5.1 Usuario Particular Inscrito: tiene acceso a las ofertas de intercambios con la posibilidad de completar un intercambio a la vez.
5.2 Usuario Particular Verificado: tiene tambien acceso al panel de oferta de intercambio y puede tener maximo 3 intercambios activos a la vez.
5.3. Usuario Particular certificado: tiene tambien acceso a realizar todas las operaciones de intercambio dentro de la plataforma y acceder a la administracion de sus actividades.
6. los Usuarios Certificados tienen tambien acceso a la seccion intercambio (Crear intercambio, Completar Intercambio, Intercambios en disputa, etc), Perfil (agregar nueva direccion Particular, ver su reputacion, Etc),  historial.
7. Los Usuarios Empresa tienen tambien acceso a gestion de inventario, Direcciones de encuentro, finanzas Particulares (solo en el intercambio de criptos), Gestion de Promociones.
8. los Usuarios Socios tienen tambien acceso a la seccion Disputas, Finanzas Globales (gastos de mantenimiento de la plataforma, gastos de gas, etc).
-en cuanto a loa intercambio contempla:
1.el detalle de cada intercambio activo, asegurate de incluir todos la informacion que de confianza en el intercambio.
2. en la creacion de un nuevo intercambio se solicite incluir todos la informacion que de confianza en el intercambio.
3. resalta los elementos que deben estar off-chain (por volumen de informacion) y on-chain (para el menor consumo de gas).
- incorpora pruebas de test_fuzzing_o_invariantes y test_cobertura a toda la estructura de pruebas de foundry
-Crea el setup base del frontend:
1. Configurar Next.js 16 con TypeScript
2. Instalar ethers.js v6
3. Configurar Tailwind CSS v4
4. Crear el context provider de Ethereum en lib/ethereum.tsx que:
   - Gestione la conexión con MetaMask
   - Provea provider, signer, account
   - Auto-reconecte al refrescar la página
5. Crear lib/contracts.ts con los ABIs
-Tecnologías sugeridas:
1.Solidity: Lenguaje de smart contracts
2.Foundry: Framework para desarrollo y testing de contratos
3.OpenZeppelin: Librerías estándar (Ownable, ReentrancyGuard, IERC20)
4.Next.js*: Framework de React con App Router
5.TypeScript: Tipado estático
6.Ethers.js: Librería para interactuar con Ethereum
7.Tailwind CSS: Estilos
8.MetaMask: Wallet de navegador (en la vercion movil cuando se ejecute una firma o autorizacion con la wallet se solicite ejecucion con la apk instalada en el dispositivo)
