import { useState } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Campo } from "./ui/Campo";
import { inputClasses } from "./ui/inputClasses";
import { cn } from "../utils/format";
import { gerarSenhaProvisoria } from "../utils/senha";

// Campo da senha provisória de um usuário novo: aparece em texto (quem cadastra precisa passar a senha
// para a pessoa), com botão para gerar outra e para copiar.
export function CampoSenhaProvisoria({ valor, onChange }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* sem permissão da área de transferência: a senha continua visível para copiar à mão */
    }
  }

  return (
    <Campo label="Senha provisória">
      <div className="flex gap-2">
        <input
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClasses, "font-mono")}
          autoComplete="off"
          spellCheck={false}
          maxLength={72}
          aria-label="Senha provisória"
        />
        <button
          type="button"
          onClick={() => onChange(gerarSenhaProvisoria())}
          className="shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-stone-300 bg-white text-sm text-stone-600 hover:bg-stone-50"
          aria-label="Gerar outra senha"
          title="Gerar outra senha"
        >
          <RefreshCw size={14} /> <span className="hidden sm:inline">Gerar</span>
        </button>
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-stone-300 bg-white text-sm text-stone-600 hover:bg-stone-50"
          aria-label="Copiar senha"
          title="Copiar senha"
        >
          {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </div>
    </Campo>
  );
}
