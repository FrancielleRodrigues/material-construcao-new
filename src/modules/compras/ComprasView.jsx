import { PackageOpen, Wallet, AlertTriangle, PackageCheck, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { moeda, cn, hojeISO, formatarData } from "../../utils/format";
import { EmptyState } from "../../components/ui/EmptyState";

export function ComprasView({
  barraBusca,
  filtroPedido,
  fornecedoresPorId,
  pedidosAtrasados,
  pedidosFiltrados,
  pedidosPendentesCount,
  registrarRecebimento,
  setConfirmacao,
  setFiltroPedido,
  setFormPedido,
  totalPedido,
  valorPedidosPendentes,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiCard label="Pedidos pendentes" valor={pedidosPendentesCount} icon={PackageOpen} tom="bg-amber-50 text-amber-700" />
        <KpiCard label="Valor pendente" valor={moeda(valorPedidosPendentes)} icon={Wallet} tom="bg-teal-50 text-teal-700" />
        <KpiCard label="Atrasados" valor={pedidosAtrasados} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
      </div>
      <div className="flex gap-2 p-1 bg-stone-100 rounded-lg overflow-x-auto mb-4">
        {[
          { id: "todos", label: "Todos" },
          { id: "pendente", label: "Pendentes" },
          { id: "recebido", label: "Recebidos" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltroPedido(f.id)}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              filtroPedido === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {barraBusca}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {pedidosFiltrados.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Nenhum pedido de compra encontrado"
            subtitle="Registre um pedido ao fornecedor; quando a mercadoria chegar, transforme em compra num clique."
            acao="Novo"
            onAcao={() => setFormPedido({})}
          />
        ) : (
          <div className="divide-y divide-stone-100">
            {pedidosFiltrados.map((p) => {
              const fornecedor = fornecedoresPorId[p.fornecedorId];
              const atrasado = p.status === "pendente" && p.dataPrevista < hojeISO();
              return (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-stone-800">Pedido nº {p.numero} · {fornecedor ? fornecedor.nome : "Fornecedor removido"}</p>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                        p.status === "recebido" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {p.status === "recebido" ? <PackageCheck size={11} /> : <PackageOpen size={11} />}
                        {p.status === "recebido" ? "Recebido" : "Pendente"}
                      </span>
                      {atrasado && (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={11} /> Atrasado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400">
                      {p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Previsão: {formatarData(p.dataPrevista)}</span>
                      {p.dataRecebimento && <span className="inline-flex items-center gap-1"><PackageCheck size={11} /> Recebido: {formatarData(p.dataRecebimento)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium text-stone-700 tabular-nums">{moeda(totalPedido(p))}</span>
                    {p.status === "pendente" && (
                      <button
                        onClick={() => registrarRecebimento(p)}
                        className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                      >
                        <PackageCheck size={13} /> Registrar recebimento
                      </button>
                    )}
                    {p.status === "pendente" && (
                      <button onClick={() => setFormPedido(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                        <Pencil size={14} />
                      </button>
                    )}
                    {p.status === "pendente" && (
                      <button onClick={() => setConfirmacao({ tipo: "pedido", id: p.id, nome: `Pedido nº ${p.numero}` })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
