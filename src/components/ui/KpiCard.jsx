import { cn } from "../../utils/format";

export function KpiCard({ label, valor, icon: Icon, tom }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-3.5 flex items-center gap-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tom)}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-stone-500 leading-snug">{label}</p>
        <p className="text-lg font-semibold text-stone-900 leading-tight mt-0.5">{valor}</p>
      </div>
    </div>
  );
}
