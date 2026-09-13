mejoras de chrome-extension

1. aplica la entidad visual del proyecto solo a todo el frontend de la extension, adapta los titulos, paleta de colores, iconos, etc para que se entegre visualmente. NO MODIFIQUES LA LOGICA del proyecto ni de la extension.
2. separa las interfaces para:
2.1. el index muestre secciones separadas (fichas contraibles) para:
2.1.1 la barra superior debe contener el icono + el titulo de Truekeate.
2.1.2. una seccion superior para gestion de billeteras, el nombre de la cuenta que se esta usando + el icono para desplegar las otras cuentas.
2.1.3. una seccion balance que muestre los saldos de los otros token agregados, esta seccion muestra principalmente el saldo de ETH cambiando son las flechas laterales entre los token. esta seccion siembre debe abarcar el ancho que ocupe la billetera en la ventana.
2.1.4. una seccion de gestion de saldo donde se muestre los iconos de Recibir (despliega un QR de la billetra ), Enviar ( despliega el formulario de envoi), comprar (despliega el folmulario de compra de crypto), cambiar ( despliega el formulario de intercambio ).
2.1.5. una seccion para gestionar las redes: muestre la red actual conectada + boton de acceso a las redes.
2.1.6. usa seccion para caracteristicas que muestre las pestanas de Tokens (muestra el listado de los tokens y sus saldos), DeFi, NFT (muestra la coleccion de NFTs que posea la billetera), Actividad (muestra el resumen listado de los movimientos de la billetera, con obcion de mostrar el detalle del movimiento).
2.1.7 seccion desconectar muestra la dapp a la que se esta conectado, icono del estado de la conexion + icono de bloquear + icono de desconexion. esta seccion depe estar siempre en el pie.
3. las paginas de firmas deben tener un header con la identificacion de TrueKeate (iconoIntegral.ico), titulo de accion a ejecutar (soliciud de firma, Solicitud de autorizacion, etc), direccion de la Dapp. los iconos de aceptar y rechazar deben tener la misma forma que los botones del proyecto.
4. en Firmar Mensaje EIP-712:
4.1. en la descripcion del mensaje debe estar mas estructurado para que contenga la billetera que se usara para firmar (de forma reducida), la descripcion de los que se va a firmar, el valor que tiene la transaccion (si posee), la fecha y hora en la que se firma.

