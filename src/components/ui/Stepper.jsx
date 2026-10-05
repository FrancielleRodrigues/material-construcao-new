import { Fragment } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "../../utils/format";

export function Stepper({ etapas, etapaAtual }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {etapas.map((etapa, i) => {
        const concluida = i < etapaAtual;
        const atual = i === etapaAtual;
        return (
          <Fragment key={etapa.id}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  concluida && "bg-teal-800 text-white",
                  atual && "bg-teal-800 text-white ring-4 ring-teal-800/15",
                  !concluida && !atual && "bg-stone-100 text-stone-400"
                )}
              >
                {concluida ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              <span className={cn("text-sm font-medium hidden sm:inline", atual ? "text-stone-900" : "text-stone-400")}>
                {etapa.titulo}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className={cn("h-px flex-1 min-w-[16px]", concluida ? "bg-teal-800" : "bg-stone-200")} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
