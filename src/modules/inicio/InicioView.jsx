import { Users, Package, AlertTriangle, Boxes, Landmark, TrendingUp, TrendingDown, ScanLine, Factory, PackageOpen, ArrowRightLeft, Wallet, ArrowRight } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { moeda, formatarData, cn } from "../../utils/format";
import { statusLancamento, StatusChip } from "../financeiro/financeiroUi";
import { CategoriaBadge } from "../../components/ui/CategoriaBadge";

export function InicioView({
  aPagar,
  aReceber,
  clientes,
  lancamentos,
  produtos,
  produtosEstoqueBaixo,
  saldoMes,
  setAba,
  setFormCliente,
  setFormFornecedor,
  setFormLancamento,
  setFormMovimentacao,
  setFormPedido,
  setFormProduto,
  setSubEstoque,
  valorEmEstoque,
  vencidos,
}) {
  return (
    <>
      <div className="space-y-6">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem" }}>
          <KpiCard label="Clientes cadastrados" valor={clientes.length} icon={Users} tom="bg-teal-50 text-teal-700" />
          <KpiCard label="Produtos cadastrados" valor={produtos.length} icon={Package} tom="bg-teal-50 text-teal-700" />
          <KpiCard label="Itens com estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
          <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Boxes} tom="bg-amber-50 text-amber-700" />
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

        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Ações rápidas</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>
            {[
              { label: "Nova venda", icon: ScanLine, onClick: () => setAba("venda") },
              { label: "Novo cliente", icon: Users, onClick: () => { setAba("clientes"); setFormCliente({}); } },
              { label: "Novo fornecedor", icon: Factory, onClick: () => { setAba("fornecedores"); setFormFornecedor({}); } },
              { label: "Novo pedido", icon: PackageOpen, onClick: () => { setAba("compras"); setFormPedido({}); } },
              { label: "Novo produto", icon: Package, onClick: () => { setAba("produtos"); setFormProduto({}); } },
              { label: "Movimentar estoque", icon: ArrowRightLeft, onClick: () => { setAba("estoque"); setFormMovimentacao({}); } },
              { label: "Novo lançamento", icon: Wallet, onClick: () => { setAba("financeiro"); setFormLancamento({}); } },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="bg-white border border-stone-200 rounded-xl px-4 py-4 flex flex-col items-center gap-2 text-center hover:border-teal-700/40 hover:bg-teal-50/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
                  <a.icon size={17} />
                </div>
                <span className="text-xs font-medium text-stone-700">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <p className="font-semibold text-stone-800 text-sm">Contas a vencer</p>
              <button
                onClick={() => setAba("financeiro")}
                className="text-xs text-teal-800 font-medium flex items-center gap-1 hover:underline"
              >
                Ver tudo <ArrowRight size={12} />
              </button>
            </div>
            {lancamentos.filter((l) => !l.pago).length === 0 ? (
              <p className="text-sm text-stone-400 px-5 py-6 text-center">Nenhuma conta pendente.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {[...lancamentos]
                  .filter((l) => !l.pago)
                  .sort((a, b) => (a.vencimento > b.vencimento ? 1 : -1))
                  .slice(0, 5)
                  .map((l) => {
                    const status = statusLancamento(l);
                    return (
                      <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{l.descricao}</p>
                          <p className="text-xs text-stone-400">{formatarData(l.vencimento)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-sm font-medium tabular-nums", l.tipo === "receita" ? "text-emerald-700" : "text-stone-700")}>
                            {moeda(l.valor)}
                          </span>
                          <StatusChip status={status} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <p className="font-semibold text-stone-800 text-sm">Estoque baixo</p>
              <button
                onClick={() => { setAba("estoque"); setSubEstoque("posicao"); }}
                className="text-xs text-teal-800 font-medium flex items-center gap-1 hover:underline"
              >
                Ver tudo <ArrowRight size={12} />
              </button>
            </div>
            {produtos.filter((p) => p.estoque <= p.estoqueMin).length === 0 ? (
              <p className="text-sm text-stone-400 px-5 py-6 text-center">Nenhum item abaixo do mínimo.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {produtos.filter((p) => p.estoque <= p.estoqueMin).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{p.nome}</p>
                      <div className="mt-1"><CategoriaBadge categoriaId={p.categoria} /></div>
                    </div>
                    <span className="text-sm font-medium text-red-600 tabular-nums shrink-0">
                      {p.estoque} {p.unidade}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
