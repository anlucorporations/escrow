# 🏢 Manual de Operaciones Comerciales para Empresas — TrueKeat

Este manual instruye a los **Usuarios Comerciales y Empresas** sobre la administración de inventario, tokenización de activos RWA, emisión de vouchers de servicios y gestión financiera en la plataforma TrueKeat.

---

## 1. Perfil y Capacidades Comerciales

Las cuentas de tipo Empresa disfrutan de una suite integral de herramientas para el comercio Web3:
* **Tokenización de Bienes RWA (`TruekeRWA.sol`)**: Conversión de inventario físico (maquinaria, tecnología, vehículos, materia prima) en tokens no fungibles custodiados.
* **Emisión de Vouchers de Servicios (`TruekeService.sol`)**: Creación de paquetes de servicios canjeables y quemables bajo estándar ERC-1155.
* **Suscripción Comercial en BRLT (`Subscription.sol`)**: Mantenimiento de membresía activa para publicación ilimitada en el catálogo.
* **Múltiples Puntos de Venta Físicos (`company_stores`)**: Registro de sucursales georreferenciadas para entregas presenciales.
* **Panel de Finanzas y Cobros (`company_finances`)**: Conciliación de ingresos en BRLT y stablecoins (USDT).

---

## 2. Tokenización y Publicación de Inventario RWA

1. Acceder a **Inventario Comercial** en `/company/inventory`.
2. Presionar **+ Tokenizar Nuevo Activo RWA**.
3. Completar la ficha técnica:
   - Nombre comercial y marca del producto.
   - Número de serie, IMEI o identificación de fábrica.
   - Estado de conservación y garantía de fábrica.
   - Subida de fotografías multifocales (mínimo 3) que serán alojadas en IPFS.
4. Definir las condiciones de intercambio:
   - Intercambio directo por insumos / productos específicos.
   - Precio de referencia en USDT / BRLT bajo custodia escrow.
5. Confirmar la transacción para emitir el token RWA y publicarlo en el catálogo público.

---

## 3. Emisión y Canje de Vouchers de Servicios

1. En la pestaña **Servicios SBT**, seleccionar **Emitir Voucher de Servicio**.
2. Especificar la descripción del servicio (ej. *Mantenimiento Preventivo de Equipos*, *Asesoría Técnica*, *Transporte de Carga*).
3. Indicar el número de unidades o sesiones disponibles y la fecha límite de validez.
4. Cuando el cliente recibe el servicio, la empresa procede a la **quema del voucher (Burn)** para liberar los fondos en custodia del contrato inteligente.
