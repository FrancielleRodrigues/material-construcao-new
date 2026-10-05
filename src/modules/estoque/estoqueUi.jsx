import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "../../utils/format";

export function TipoMovimentoChip({ tipo }) {
  const entrada = tipo === "entrada";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        entrada ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      )}
    >
      {entrada ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
      {entrada ? "Entrada" : "Saída"}
    </span>
  );
}

export function BarraEstoque({ produto }) {
  const alvo = Math.max(produto.estoqueMin * 2, 1);
  const pct = Math.min(100, Math.round((produto.estoque / alvo) * 100));
  const baixo = produto.estoque <= produto.estoqueMin;
  return (
    <div className="w-full max-w-[120px]">
      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full", baixo ? "bg-red-500" : "bg-teal-700")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
