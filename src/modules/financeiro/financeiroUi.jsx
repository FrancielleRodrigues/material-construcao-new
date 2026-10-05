import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, hojeISO } from "../../utils/format";

export function statusLancamento(l) {
  if (l.pago) return "pago";
  if (l.vencimento < hojeISO()) return "vencido";
  return "pendente";
}

export function StatusChip({ status }) {
  const mapa = {
    pago: { label: "Pago", cls: "bg-emerald-50 text-emerald-700" },
    vencido: { label: "Vencido", cls: "bg-red-50 text-red-700" },
    pendente: { label: "Pendente", cls: "bg-amber-50 text-amber-700" },
  };
  const s = mapa[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

export function TipoLancamentoChip({ tipo }) {
  const receita = tipo === "receita";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        receita ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-600"
      )}
    >
      {receita ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {receita ? "Receita" : "Despesa"}
    </span>
  );
}
