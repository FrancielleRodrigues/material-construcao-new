import { useState, useMemo } from "react";
import { Search, X, Factory } from "lucide-react";
import { cn } from "../utils/format";
import { inputClasses } from "./ui/inputClasses";

export function BuscaFornecedor({ fornecedores, value, onChange, placeholder }) {
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);

  const selecionado = value ? fornecedores.find((f) => f.id === Number(value)) : null;

  const resultados = useMemo(() => {
    if (!termo.trim()) return fornecedores.slice(0, 8);
    return fornecedores.filter((f) => f.nome.toLowerCase().includes(termo.toLowerCase())).slice(0, 8);
  }, [fornecedores, termo]);

  if (selecionado) {
    return (
      <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5">
        <div className="min-w-0 flex items-center gap-1.5">
          <Factory size={14} className="text-stone-400 shrink-0" />
          <span className="text-sm text-stone-800 truncate">{selecionado.nome}</span>
        </div>
        <button
          type="button"
          onClick={() => { onChange(""); setTermo(""); }}
          className="text-stone-400 hover:text-stone-700 shrink-0"
          aria-label="Trocar fornecedor"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
      <input
        value={termo}
        onChange={(e) => { setTermo(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        className={cn(inputClasses, "pl-8")}
        placeholder={placeholder || "Buscar fornecedor pelo nome..."}
      />
      {aberto && (
        <div className="absolute z-10 left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {resultados.length === 0 ? (
            <p className="text-sm text-stone-400 px-3 py-3">Nenhum fornecedor encontrado.</p>
          ) : (
            resultados.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(f.id); setTermo(""); setAberto(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <Factory size={13} className="text-stone-400 shrink-0" />
                <span className="truncate">{f.nome}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
