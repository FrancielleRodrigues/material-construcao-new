import { cn } from "../../utils/format";
import { PRESETS } from "./calculos";

const CAMPO = "border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700";

// Filtro único, em uma linha, acima de tudo que ele filtra.
export function FiltroPeriodo({ preset, periodo, onPreset, onPeriodo }) {
  const invalido = periodo.inicio && periodo.fim && periodo.inicio > periodo.fim;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPreset(p.id)}
              aria-pressed={preset === p.id}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                preset === p.id ? "bg-teal-800 text-white border-teal-800" : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
              )}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <label className="flex items-center gap-1.5">
            De
            <input type="date" value={periodo.inicio} onChange={(e) => onPeriodo({ ...periodo, inicio: e.target.value })} className={CAMPO} aria-label="Data inicial" />
          </label>
          <label className="flex items-center gap-1.5">
            até
            <input type="date" value={periodo.fim} onChange={(e) => onPeriodo({ ...periodo, fim: e.target.value })} className={CAMPO} aria-label="Data final" />
          </label>
        </div>
      </div>
      {invalido && <p role="alert" className="text-xs text-red-600">A data inicial não pode ser depois da data final.</p>}
    </div>
  );
}
