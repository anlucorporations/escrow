// TrueKeate — Suite: Panel Admin (Owner, RF-13.1) — placeholder por rol
import { Card } from "@/components/Card";
export default function PaginaAdmin() {
  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold text-navy-800">🛠️ Panel del Owner</h1>
      <p className="mt-2 text-sm text-navy-800/60">
        Dashboard operativo (RF-13.1): usuarios, contratos, KPIs de disputas, BD e
        infraestructura (relayer/indexador). Acceso exclusivo Owner (Socio).
      </p>
    </Card>
  );
}
