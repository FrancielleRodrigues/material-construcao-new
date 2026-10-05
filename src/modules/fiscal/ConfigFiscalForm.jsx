import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { cn } from "../../utils/format";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { REGIMES_TRIBUTARIOS, PROVEDORES_NFE } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { inputClasses } from "../../components/ui/inputClasses";

export function ConfigFiscalForm({ inicial, onSalvar }) {
  const [form, setForm] = useState(inicial);
  const [salvo, setSalvo] = useState(false);
  const isSm = useMediaQuery("(min-width: 640px)");

  function salvar() {
    onSalvar(form);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 space-y-6">
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Dados do emitente</p>
        <div className="space-y-4">
          <Campo label="Razão social">
            <input
              value={form.razaoSocial}
              onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
              className={inputClasses}
              placeholder="Ex: Construgestão Materiais Ltda"
            />
          </Campo>
          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Nome fantasia">
              <input
                value={form.nomeFantasia}
                onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
                className={inputClasses}
                placeholder="Nome usado no dia a dia"
              />
            </Campo>
            <Campo label="CNPJ">
              <input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className={inputClasses}
                placeholder="00.000.000/0000-00"
              />
            </Campo>
          </div>
          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Inscrição estadual">
              <input
                value={form.ie}
                onChange={(e) => setForm({ ...form, ie: e.target.value })}
                className={inputClasses}
                placeholder="Número da IE"
              />
            </Campo>
            <Campo label="Regime tributário">
              <select
                value={form.regimeTributario}
                onChange={(e) => setForm({ ...form, regimeTributario: e.target.value })}
                className={cn(inputClasses, "bg-white")}
              >
                {REGIMES_TRIBUTARIOS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </Campo>
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-stone-100">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Emissão de NF-e</p>
        <div className="space-y-4">
          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Provedor de emissão">
              <select
                value={form.provedor}
                onChange={(e) => setForm({ ...form, provedor: e.target.value })}
                className={cn(inputClasses, "bg-white")}
              >
                <option value="">Nenhum selecionado</option>
                {PROVEDORES_NFE.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Ambiente">
              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
                {[
                  { id: "homologacao", label: "Homologação" },
                  { id: "producao", label: "Produção" },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setForm({ ...form, ambiente: a.id })}
                    className={cn(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                      form.ambiente === a.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Campo>
          </div>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Série da NF-e">
              <input
                value={form.serieNFe}
                onChange={(e) => setForm({ ...form, serieNFe: e.target.value })}
                className={inputClasses}
                placeholder="1"
              />
            </Campo>
            <Campo label="Próximo número">
              <input
                type="number"
                min="1"
                value={form.proximoNumero}
                onChange={(e) => setForm({ ...form, proximoNumero: parseInt(e.target.value) || 1 })}
                className={inputClasses}
              />
            </Campo>
          </div>

          <div className="bg-stone-50 border border-stone-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <KeyRound size={16} className="text-stone-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-700">Certificado digital (A1)</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  O upload do certificado exige um backend seguro — não é possível armazená-lo com segurança direto no navegador. Essa etapa fica disponível quando o backend for conectado.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-stone-700 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.certificadoInstalado}
                onChange={(e) => setForm({ ...form, certificadoInstalado: e.target.checked })}
                className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
              />
              Simular certificado instalado (apenas para teste do fluxo)
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={salvar}
          className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Salvar configurações
        </button>
        {salvo && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> Salvo
          </span>
        )}
      </div>
    </div>
  );
}
