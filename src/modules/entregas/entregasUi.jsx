import { cn } from "../../utils/format";
import { STATUS_ENTREGA } from "../../data/constantes";

export function StatusEntregaChip({ status }) {
  const s = STATUS_ENTREGA.find((x) => x.id === status);
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", s.chip)}>
      <Icon size={12} /> {s.label}
    </span>
  );
}
