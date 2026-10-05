import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({ titulo, descricao, textoConfirmar, onConfirmar, onCancelar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-[60] p-6">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={18} className="text-red-600" />
        </div>
        <h2 className="text-base font-semibold text-stone-900 mb-1.5">{titulo}</h2>
        <p className="text-sm text-stone-500">{descricao}</p>
        <div className="flex gap-2 pt-6">
          <button
            onClick={onCancelar}
            className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
            autoFocus
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {textoConfirmar || "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
