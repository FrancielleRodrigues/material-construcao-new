import { Package, AlertTriangle, Wallet, Ruler, Pencil, Trash2, Factory } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { moeda, cn } from "../../utils/format";
import { EmptyState } from "../../components/ui/EmptyState";
import { CategoriaBadge } from "../../components/ui/CategoriaBadge";

export function ProdutosView({
  barraBusca,
  fornecedoresPorId,
  produtos,
  produtosEstoqueBaixo,
  produtosFiltrados,
  setConfirmacao,
  setFormProduto,
  valorEmEstoque,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiCard label="Produtos cadastrados" valor={produtos.length} icon={Package} tom="bg-teal-50 text-teal-700" />
        <KpiCard label="Estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
        <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Wallet} tom="bg-amber-50 text-amber-700" />
      </div>
      {barraBusca}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {produtosFiltrados.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto encontrado"
            subtitle="Cadastre o primeiro produto para começar a controlar o estoque."
            acao="Novo"
            onAcao={() => setFormProduto({})}
          />
        ) : (
          <>
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                  <th className="text-left px-5 py-3 font-medium">Produto</th>
                  <th className="text-left px-5 py-3 font-medium">Categoria</th>
                  <th className="text-left px-5 py-3 font-medium">Fornecedor</th>
                  <th className="text-left px-5 py-3 font-medium">Unidade</th>
                  <th className="text-left px-5 py-3 font-medium">Preço</th>
                  <th className="text-left px-5 py-3 font-medium">Estoque</th>
                  <th className="px-5 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {produtosFiltrados.map((p) => (
                  <tr key={p.id} className="group hover:bg-stone-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-stone-800">{p.nome}</td>
                    <td className="px-5 py-3.5"><CategoriaBadge categoriaId={p.categoria} /></td>
                    <td className="px-5 py-3.5 text-stone-500">
                      {p.fornecedorId && fornecedoresPorId[p.fornecedorId] ? fornecedoresPorId[p.fornecedorId].nome : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      <span className="inline-flex items-center gap-1.5"><Ruler size={13} className="text-stone-400" />{p.unidade}</span>
                    </td>
                    <td className="px-5 py-3.5 text-stone-700 tabular-nums">{moeda(p.preco)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                          {p.estoque}
                        </span>
                        {p.estoque <= p.estoqueMin && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={11} /> Baixo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setFormProduto(p)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmacao({ tipo: "produto", id: p.id, nome: p.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                          <Trash2 size={14} />
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
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setFormProduto(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmacao({ tipo: "produto", id: p.id, nome: p.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mb-2"><CategoriaBadge categoriaId={p.categoria} /></div>
                  {p.fornecedorId && fornecedoresPorId[p.fornecedorId] && (
                    <p className="text-xs text-stone-400 mb-2 flex items-center gap-1"><Factory size={11} />{fornecedoresPorId[p.fornecedorId].nome}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span className="inline-flex items-center gap-1.5"><Ruler size={12} className="text-stone-400" />{p.unidade}</span>
                    <span className="tabular-nums font-medium text-stone-700">{moeda(p.preco)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn("text-xs font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-500")}>
                      Estoque: {p.estoque}
                    </span>
                    {p.estoque <= p.estoqueMin && (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} /> Baixo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
