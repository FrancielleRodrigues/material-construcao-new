import { cn } from "../../utils/format";
import { CATEGORIAS } from "../../data/constantes";

export function CategoriaBadge({ categoriaId }) {
  const cat = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!cat) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", cat.chip)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cat.dot)} />
      {cat.label}
    </span>
  );
}
