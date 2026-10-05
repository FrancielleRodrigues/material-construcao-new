import { Landmark, TrendingUp, TrendingDown, AlertTriangle, Wallet, CalendarClock, Check, Pencil, Trash2 } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { moeda, cn, formatarData } from "../../utils/format";
import { EmptyState } from "../../components/ui/EmptyState";
import { statusLancamento, TipoLancamentoChip, StatusChip } from "./financeiroUi";

export function FinanceiroView({
  barraBusca,
  aPagar,
  aReceber,
  alternarPago,
  clientesPorId,
  filtroFinanceiro,
  lancamentosFiltrados,
  saldoMes,
  setConfirmacao,
  setFiltroFinanceiro,
  setFormLancamento,
  vencidos,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiCard
          label="Saldo do mês"
          valor={moeda(saldoMes)}
          icon={Landmark}
          tom={saldoMes >= 0 ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}
        />
        <KpiCard label="A receber" valor={moeda(aReceber)} icon={TrendingUp} tom="bg-emerald-50 text-emerald-700" />
        <KpiCard label="A pagar" valor={moeda(aPagar)} icon={TrendingDown} tom="bg-amber-50 text-amber-700" />
        <KpiCard label="Lançamentos vencidos" valor={vencidos} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
      </div>
      <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-md mb-4">
        {[
          { id: "todos", label: "Todos" },
          { id: "receber", label: "A receber" },
          { id: "pagar", label: "A pagar" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltroFinanceiro(f.id)}
            className={cn(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
              filtroFinanceiro === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {barraBusca}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {lancamentosFiltrados.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhum lançamento encontrado"
            subtitle="Registre contas a receber e a pagar para acompanhar o financeiro."
            acao="Novo"
            onAcao={() => setFormLancamento({})}
          />
        ) : (
          <>
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                  <th className="text-left px-5 py-3 font-medium">Descrição</th>
                  <th className="text-left px-5 py-3 font-medium">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium">Cliente / Fornecedor</th>
                  <th className="text-left px-5 py-3 font-medium">Vencimento</th>
                  <th className="text-left px-5 py-3 font-medium">Valor</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lancamentosFiltrados.map((l) => {
                  const status = statusLancamento(l);
                  const contraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "—") : (l.contraparte || "—");
                  return (
                    <tr key={l.id} className="group hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-stone-800">{l.descricao}</td>
                      <td className="px-5 py-3.5"><TipoLancamentoChip tipo={l.tipo} /></td>
                      <td className="px-5 py-3.5 text-stone-600">{contraparte}</td>
                      <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} className="text-stone-400" />{formatarData(l.vencimento)}</span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums font-medium">
                        <span className={l.tipo === "receita" ? "text-emerald-700" : "text-stone-700"}>{moeda(l.valor)}</span>
                      </td>
                      <td className="px-5 py-3.5"><StatusChip status={status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => alternarPago(l)}
                            className={cn(
                              "w-7 h-7 rounded-md flex items-center justify-center border",
                              l.pago ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-stone-400 hover:bg-white hover:text-emerald-700 hover:border-stone-200 border-transparent"
                            )}
                            aria-label="Marcar como pago"
                            title={l.pago ? "Marcado como pago" : "Marcar como pago"}
                          >
                            <Check size={14} />
                          </button>
                          <button onClick={() => setFormLancamento(l)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmacao({ tipo: "lancamento", id: l.id, nome: l.descricao })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="divide-y divide-stone-100 md:hidden">
              {lancamentosFiltrados.map((l) => {
                const status = statusLancamento(l);
                const contraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "—") : (l.contraparte || "—");
                return (
                  <div key={l.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="font-medium text-stone-800 min-w-0">{l.descricao}</p>
                      <span className={cn("font-medium tabular-nums shrink-0", l.tipo === "receita" ? "text-emerald-700" : "text-stone-700")}>
                        {moeda(l.valor)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <TipoLancamentoChip tipo={l.tipo} />
                      <StatusChip status={status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>{contraparte}</span>
                      <span className="inline-flex items-center gap-1"><CalendarClock size={12} />{formatarData(l.vencimento)}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => alternarPago(l)}
                        className={cn(
                          "flex-1 py-1.5 rounded-md text-xs font-medium border flex items-center justify-center gap-1",
                          l.pago ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-stone-600 border-stone-200"
                        )}
                      >
                        <Check size={13} /> {l.pago ? "Pago" : "Marcar como pago"}
                      </button>
                      <button onClick={() => setFormLancamento(l)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmacao({ tipo: "lancamento", id: l.id, nome: l.descricao })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
