import { AlertTriangle, Wallet, ArrowRightLeft, ClipboardList, History, Warehouse } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { moeda, cn, formatarData } from "../../utils/format";
import { EmptyState } from "../../components/ui/EmptyState";
import { CategoriaBadge } from "../../components/ui/CategoriaBadge";
import { BarraEstoque, TipoMovimentoChip } from "./estoqueUi";
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA } from "../../data/constantes";

export function EstoqueView({
  barraBusca,
  movimentacoesFiltradas,
  movimentacoesHoje,
  produtosEstoqueBaixo,
  produtosFiltrados,
  produtosPorId,
  setFormMovimentacao,
  setSubEstoque,
  subEstoque,
  valorEmEstoque,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiCard label="Itens com estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
        <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Wallet} tom="bg-amber-50 text-amber-700" />
        <KpiCard label="Movimentações hoje" valor={movimentacoesHoje} icon={ArrowRightLeft} tom="bg-teal-50 text-teal-700" />
      </div>
      <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs mb-4">
        {[
          { id: "posicao", label: "Posição atual", icon: ClipboardList },
          { id: "historico", label: "Histórico", icon: History },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSubEstoque(s.id)}
            className={cn(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
              subEstoque === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
            )}
          >
            <s.icon size={14} /> {s.label}
          </button>
        ))}
      </div>
      {barraBusca}
      {subEstoque === "posicao" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {produtosFiltrados.length === 0 ? (
            <EmptyState icon={Warehouse} title="Nenhum produto encontrado" subtitle="Cadastre produtos para começar a controlar o estoque." />
          ) : (
            <>
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                    <th className="text-left px-5 py-3 font-medium">Produto</th>
                    <th className="text-left px-5 py-3 font-medium">Categoria</th>
                    <th className="text-left px-5 py-3 font-medium">Estoque</th>
                    <th className="text-left px-5 py-3 font-medium">Nível</th>
                    <th className="text-left px-5 py-3 font-medium">Mínimo</th>
                    <th className="px-5 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {produtosFiltrados.map((p) => (
                    <tr key={p.id} className="group hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-stone-800">{p.nome}</td>
                      <td className="px-5 py-3.5"><CategoriaBadge categoriaId={p.categoria} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                            {p.estoque} {p.unidade}
                          </span>
                          {p.estoque <= p.estoqueMin && (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={11} /> Baixo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><BarraEstoque produto={p} /></td>
                      <td className="px-5 py-3.5 text-stone-500 tabular-nums">{p.estoqueMin} {p.unidade}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setFormMovimentacao({ produtoId: p.id })}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200"
                            aria-label="Movimentar"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
  
              <div className="divide-y divide-stone-100 md:hidden">
                {produtosFiltrados.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-stone-800 min-w-0">{p.nome}</p>
                      <button
                        onClick={() => setFormMovimentacao({ produtoId: p.id })}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 shrink-0"
                        aria-label="Movimentar"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                    </div>
                    <div className="mb-2"><CategoriaBadge categoriaId={p.categoria} /></div>
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
                      <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                        {p.estoque} {p.unidade}
                      </span>
                      <span className="text-stone-400">mínimo: {p.estoqueMin} {p.unidade}</span>
                    </div>
                    <BarraEstoque produto={p} />
                    {p.estoque <= p.estoqueMin && (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full mt-2">
                        <AlertTriangle size={11} /> Estoque baixo
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {subEstoque === "historico" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {movimentacoesFiltradas.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhuma movimentação encontrada"
              subtitle="Registre entradas e saídas para acompanhar o histórico do estoque."
              acao="Nova"
              onAcao={() => setFormMovimentacao({})}
            />
          ) : (
            <>
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                    <th className="text-left px-5 py-3 font-medium">Data</th>
                    <th className="text-left px-5 py-3 font-medium">Produto</th>
                    <th className="text-left px-5 py-3 font-medium">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium">Quantidade</th>
                    <th className="text-left px-5 py-3 font-medium">Motivo</th>
                    <th className="text-left px-5 py-3 font-medium">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {movimentacoesFiltradas.map((m) => {
                    const produto = produtosPorId[m.produtoId];
                    const motivo = (m.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).find((mo) => mo.id === m.motivo);
                    return (
                      <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{formatarData(m.data)}</td>
                        <td className="px-5 py-3.5 font-medium text-stone-800">{produto?.nome || "—"}</td>
                        <td className="px-5 py-3.5"><TipoMovimentoChip tipo={m.tipo} /></td>
                        <td className="px-5 py-3.5 tabular-nums">
                          <span className={cn("font-medium", m.tipo === "entrada" ? "text-emerald-700" : "text-red-600")}>
                            {m.tipo === "entrada" ? "+" : "-"}{m.quantidade} {produto?.unidade}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-stone-600">{motivo?.label || "—"}</td>
                        <td className="px-5 py-3.5 text-stone-400 max-w-[220px] truncate">{m.observacao || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
  
              <div className="divide-y divide-stone-100 md:hidden">
                {movimentacoesFiltradas.map((m) => {
                  const produto = produtosPorId[m.produtoId];
                  const motivo = (m.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).find((mo) => mo.id === m.motivo);
                  return (
                    <div key={m.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="font-medium text-stone-800 min-w-0">{produto?.nome || "—"}</p>
                        <TipoMovimentoChip tipo={m.tipo} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                        <span>{formatarData(m.data)}</span>
                        <span className={cn("font-medium tabular-nums", m.tipo === "entrada" ? "text-emerald-700" : "text-red-600")}>
                          {m.tipo === "entrada" ? "+" : "-"}{m.quantidade} {produto?.unidade}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">{motivo?.label}</p>
                      {m.observacao && <p className="text-xs text-stone-400 mt-1">{m.observacao}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
