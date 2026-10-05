import { Info, FileClock, FileCheck2, ShieldCheck, ShieldAlert, Settings2, FileText, ChevronRight } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { cn, formatarData, moeda, totalVenda } from "../../utils/format";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfigFiscalForm } from "./ConfigFiscalForm";

export function FiscalView({
  clientesPorId,
  empresaFiscal,
  gerarRascunhoNota,
  integracaoConfigurada,
  notasComVenda,
  notasFiscais,
  salvarConfigFiscal,
  setNotaPreview,
  setSubFiscal,
  subFiscal,
  vendasPendentesNota,
}) {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Este módulo organiza a emissão fiscal, mas ainda não está integrado à SEFAZ. As notas geradas aqui são <strong>rascunhos sem validade fiscal</strong> — a emissão oficial exige certificado digital e um provedor de NF-e conectado a um backend.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem" }}>
          <KpiCard label="Vendas pendentes de nota" valor={vendasPendentesNota.length} icon={FileClock} tom="bg-amber-50 text-amber-700" />
          <KpiCard label="Rascunhos gerados" valor={notasFiscais.length} icon={FileCheck2} tom="bg-teal-50 text-teal-700" />
          <KpiCard
            label="Integração"
            valor={integracaoConfigurada ? "Configurada" : "Não configurada"}
            icon={integracaoConfigurada ? ShieldCheck : ShieldAlert}
            tom={integracaoConfigurada ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
          />
        </div>

        <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-md">
          {[
            { id: "pendentes", label: "Pendentes", icon: FileClock },
            { id: "rascunhos", label: "Rascunhos", icon: FileCheck2 },
            { id: "config", label: "Configurações", icon: Settings2 },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSubFiscal(s.id)}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                subFiscal === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
              )}
            >
              <s.icon size={14} /> {s.label}
            </button>
          ))}
        </div>

        {subFiscal === "pendentes" && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {vendasPendentesNota.length === 0 ? (
              <EmptyState icon={FileCheck2} title="Nenhuma venda pendente" subtitle="Todas as vendas já têm um rascunho de NF-e gerado." />
            ) : (
              <div className="divide-y divide-stone-100">
                {vendasPendentesNota.map((v) => {
                  const cliente = v.clienteId ? clientesPorId[v.clienteId] : null;
                  return (
                    <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-stone-800">Venda nº {v.numero}</p>
                        <p className="text-xs text-stone-400">{formatarData(v.data)} · {cliente ? cliente.nome : "Consumidor não identificado"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-medium text-stone-700 tabular-nums">{moeda(v.total ?? totalVenda(v))}</span>
                        <button
                          onClick={() => gerarRascunhoNota(v)}
                          className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                        >
                          <FileCheck2 size={14} /> Gerar rascunho
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {subFiscal === "rascunhos" && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {notasComVenda.length === 0 ? (
              <EmptyState icon={FileText} title="Nenhum rascunho gerado" subtitle="Gere rascunhos a partir das vendas pendentes na aba anterior." />
            ) : (
              <div className="divide-y divide-stone-100">
                {notasComVenda.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setNotaPreview(n)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-stone-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800">NF-e nº {n.numero} · Série {n.serie}</p>
                      <p className="text-xs text-stone-400">Venda nº {n.venda?.numero} · gerada em {formatarData(n.dataGeracao)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                        <FileClock size={12} /> Rascunho
                      </span>
                      <ChevronRight size={16} className="text-stone-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {subFiscal === "config" && (
          <ConfigFiscalForm inicial={empresaFiscal} onSalvar={salvarConfigFiscal} />
        )}
      </div>
    </>
  );
}
