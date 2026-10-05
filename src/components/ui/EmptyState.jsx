import { Plus } from "lucide-react";

export function EmptyState({ icon: Icon, title, subtitle, acao, onAcao }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center mb-4">
        <Icon size={24} className="text-stone-400" />
      </div>
      <p className="font-semibold text-stone-800">{title}</p>
      <p className="text-sm text-stone-500 mt-1 max-w-xs">{subtitle}</p>
      {acao && (
        <button
          onClick={onAcao}
          className="mt-5 inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> {acao}
        </button>
      )}
    </div>
  );
}
