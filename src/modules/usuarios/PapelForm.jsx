import { useState } from "react";
import { Pencil, Eye } from "lucide-react";
import { cn } from "../../utils/format";
import { MODULOS_PERMISSAO, NIVEIS_PERMISSAO, permissoesTotais } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";

export function PapelForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { nome: "", fixo: false, permissoes: permissoesTotais("nenhum") }
  );
  const [erro, setErro] = useState("");

  function salvar() {
    if (!form.nome.trim()) {
      setErro("Dê um nome para o papel.");
      return;
    }
    onSalvar(form);
  }

  return (
    <Painel titulo={inicial ? "Editar papel" : "Novo papel"} onFechar={onCancelar} largo>
      <div className="space-y-5">
        <Campo label="Nome do papel">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={inputClasses}
            placeholder="Ex: Estoquista, Supervisor..."
            autoFocus
          />
        </Campo>

        <div className="pt-1 border-t border-stone-100" />
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Permissões por módulo</p>

        <div className="border border-stone-200 rounded-lg divide-y divide-stone-100">
          {MODULOS_PERMISSAO.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm text-stone-700">{m.label}</span>
              <div className="flex gap-1 p-1 bg-stone-100 rounded-lg shrink-0">
                {NIVEIS_PERMISSAO.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setForm({ ...form, permissoes: { ...form.permissoes, [m.id]: n.id } })}
                    title={n.label}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      form.permissoes[m.id] === n.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-400"
                    )}
                  >
                    {n.id === "nenhum" ? "—" : n.id === "visualizar" ? <Eye size={13} /> : <Pencil size={13} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400">— sem acesso · olho: só visualizar · lápis: visualizar e editar</p>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}
