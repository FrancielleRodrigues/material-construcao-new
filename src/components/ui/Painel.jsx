import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/format";

export function Painel({ titulo, subtitulo, onFechar, children, largo }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div
        className={cn(
          "bg-white w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden",
          "max-h-[85vh]",
          largo ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">{titulo}</h2>
            {subtitulo && <p className="text-xs text-stone-400 mt-0.5 truncate">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5" style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
