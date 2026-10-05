export function RodapePainel({ onSalvar, onCancelar }) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        onClick={onSalvar}
        className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        Salvar
      </button>
      <button
        onClick={onCancelar}
        className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}
