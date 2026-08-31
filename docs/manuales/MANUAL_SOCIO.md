# 👑 Manual de Operaciones para Usuarios Socios — TrueKeat

Este manual describe los roles, facultades de gobernanza, supervisión de tesorería y arbitraje correspondientes a los **Socios Fundadores y Certificados** de la comunidad TrueKeat.

---

## 1. Perfil y Privilegios del Socio

Los Socios representan la máxima autoridad de confianza y gobernanza dentro del ecosistema descentralizado. Sus privilegios incluyen:
* **Identidad Nivel 3 (Certificado SBT)** con emisión de Soulbound Tokens intransferibles.
* **Cuota Ilimitada** de intercambios y custodias activas simultáneas.
* **Voto en Gobernanza** para la admisión de nuevos socios y fijación de parámetros de protocolo.
* **Facultad Arbitral** para resolver disputas y mediar en trueques con inconformidad.
* **Auditoría de Tesorería** y control de subvenciones de gas para transacciones EIP-712.

---

## 2. Flujo de Votación para Admisión de Nuevos Socios

1. Acceder al módulo **Gobernanza** en la barra superior o menú de usuario (`/governance/socio-voting`).
2. Revisar la lista de postulantes con depósito en garantía activo en `Governance.sol`.
3. Emitir voto:
   - **👍 A Favor**: Si el postulante cumple con el aval comunitario y reputación verificada.
   - **👎 En Contra**: Si existen objeciones de seguridad o faltas éticas.
4. Tras alcanzar el quórum y la mayoría simple, la postulación es aprobada y los fondos pasan a la tesorería de la comunidad.

---

## 3. Resolución de Disputas en Custodia Escrow

1. Cuando un intercambio es elevado a disputa por incumplimiento, el Socio Árbitro recibe una alerta de notificación.
2. Ingresar al detalle de la operación en `/operations/[id]`.
3. Evaluar las evidencias:
   - Fotografías y metadatos IPFS originales del activo.
   - Bitácora y coordenadas GPS del punto de encuentro acordado.
   - Historial de comunicación entre las partes.
4. Ejecutar la sentencia en el panel del árbitro:
   - **A Favor del Creador**: Si la contraparte no asistió o rechazó injustificadamente el bien acordado.
   - **A Favor de la Contraparte**: Si el bien entregado no coincidía con la descripción verificada.
5. El contrato inteligente liquida o reembolsa los fondos de forma atómica e irreversible.
