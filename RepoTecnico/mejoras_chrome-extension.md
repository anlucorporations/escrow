mejoras de chrome-extension

1. aplica la entidad visual del proyecto solo a todo el frontend de la extension, adapta los titulos, paleta de colores, iconos, etc para que se entegre visualmente. NO MODIFIQUES LA LOGICA del proyecto ni de la extension.
2. separa las interfaces para:
2.1. el index muestre secciones separadas (fichas contraibles) para:
2.1.1 la barra superior debe contener el icono + el titulo de Truekeate.
2.1.2. una seccion superior para gestion de billeteras, el nombre de la cuenta que se esta usando + el icono para desplegar las otras cuentas.
2.1.3. una seccion balance que muestre los saldos de los otros token agregados, esta seccion muestra principalmente el saldo de ETH cambiando son las flechas laterales entre los token. esta seccion siembre debe abarcar el ancho que ocupe la billetera en la ventana.
2.1.4. una seccion de gestion de saldo donde se muestre los iconos de Recibir (despliega un QR de la billetra ), Enviar ( despliega el formulario de envoi), comprar (despliega el folmulario de compra de crypto), cambiar ( despliega el formulario de intercambio ), contactos (se despliega la seccion de direcciones Guardadas).
2.1.5. una seccion para gestionar las redes: muestre la red actual conectada + boton de acceso a las redes.
2.1.6. usa seccion para caracteristicas que muestre las pestanas de Tokens (muestra el listado de los tokens y sus saldos), DeFi, NFT (muestra la coleccion de NFTs que posea la billetera), Actividad (muestra el resumen listado de los movimientos de la billetera, con obcion de mostrar el detalle del movimiento).
2.1.7 seccion desconectar muestra la dapp a la que se esta conectado, icono del estado de la conexion + icono de bloquear + icono de desconexion. esta seccion depe estar siempre en el pie.
3. las paginas de firmas deben tener un header con la identificacion de TrueKeate (iconoIntegral.ico), titulo de accion a ejecutar (soliciud de firma, Solicitud de autorizacion, etc), direccion de la Dapp. los iconos de aceptar y rechazar deben tener la misma forma que los botones del proyecto.
4. en Firmar Mensaje EIP-712:
4.1. en la descripcion del mensaje debe estar mas estructurado para que contenga la billetera que se usara para firmar (de forma reducida), la descripcion de los que se va a firmar, el valor que tiene la transaccion (si posee), la fecha y hora en la que se firma.
5. la extension tiene la opcion de mostrarce como una pestana en el navegador, como una barra lateral de la pestana donde esta la dapp o un flotante. depende de la opcion que elijas en la seccion configuracion.
6. la seccion Configuracion debe permitir gestionar las redes a la que se puede conectar, la forma como se muestra la billetera, las notificaciones y el perfil. solo mostrara los acceso a las secciones.
6.1. esta pagina mostrara el area de noirificaciones, el area de modo de vista (panel, Pestana o Flotante), el area de redes (muestra la informacion basica de la red actual conectada con opcion a desplegar la paina de configuracion de las redes), el area de ayuda (muestra los botones para desplegar la pagina de ayuda) y el area de perfil (muestra informacion basica del perfil actual con la opcion de desplegar la pagina de perfil).
6.1.1.el area de notificaciones se mostrara en forma de fichas deslizables en resumen de las notificaciones sin leer.
6.1.2. la pagina de redes se divide en las 3 pestanas redes Publicas, Redes de Prueba y Redes personalizadas (debe tener las redes publicas mas conocidas de Etherum, BitCoin, Base; tambien debe tener las principales redes de pruebas); esta seccion muestra la lista de las redes y la posibilidad de conectarce a ellas. abarca todo el central del espacio la billetera adaptandoce a su tamano disponible.
6.1.3. en area de ayuda mostrara el acceso a la pagina de ayuda de la billetera, alli tendra toda la informacion disponible para resolver cualquier conflicto.
6.1.4. en el area de Perfil se tendra acceso a la pagina de configuracion del perfil actual la extencion, cambio de clave de bloqueo, respaldo de nemonic, cifrado de nemonic, backup de la billetera, modo dark, etc.
7. sta extensio es nativa de la plataforma por lo tanto el usuario puede instalarlo desde la barra de navegacion del proyecto.