import { useState } from "react";
import { CheckCircle2, KeyRound, Building2 } from "lucide-react";
import { cn } from "../../utils/format";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { PROVEDORES_NFE } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { inputClasses } from "../../components/ui/inputClasses";

export function ConfigFiscalForm({ inicial, emitente, irParaEmpresa, onSalvar, somenteLeitura = false }) {
  const [form, setForm] = useState(inicial);
  const [salvo, setSalvo] = useState(false);
  const isSm = useMediaQuery("(min-width: 640px)");

  function salvar() {
    onSalvar(form);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    // fieldset desabilitado trava todos os campos e botões de dentro de uma vez
    <fieldset disabled={somenteLeitura} className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 space-y-6 min-w-0">
      <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5">
        <Building2 size={16} className="text-stone-400 shrink-0 mt-0.5" />
        <div className="text-sm text-stone-600 min-w-0">
          <p>
            Os dados do emitente (razão social, CNPJ, inscrição estadual, regime tributário e endereço) ficam no módulo <strong>Empresa</strong>.
          </p>
          <p className="text-xs text-stone-500 mt-1" data-testid="emitente-resumo">
            {emitente.razaoSocial ? <>{emitente.razaoSocial}{emitente.cnpj ? ` · CNPJ ${emitente.cnpj}` : " · CNPJ não informado"}</> : "Empresa ainda não cadastrada."}
          </p>
          {irParaEmpresa && (
            <button type="button" onClick={irParaEmpresa} className="mt-2 text-xs font-medium text-teal-800 border border-teal-800 rounded-md px-2.5 py-1 hover:bg-teal-50">
              Abrir dados da empresa
            </button>
          )}
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

      {somenteLeitura ? (
        <p className="text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5">Você só pode visualizar estas configurações.</p>
      ) : (
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
      )}
    </fieldset>
  );
}
