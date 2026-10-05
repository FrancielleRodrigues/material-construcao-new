import { useState } from "react";
import { Plus, Trash2, Minus } from "lucide-react";
import { cn, moeda, hojeISO } from "../../utils/format";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";
import { BuscaFornecedor } from "../../components/BuscaFornecedor";

export function PedidoForm({ inicial, fornecedores, produtos, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { fornecedorId: "", dataPrevista: hojeISO(), itens: [], observacao: "" }
  );
  const [produtoAdd, setProdutoAdd] = useState(produtos[0]?.id || "");
  const [qtdAdd, setQtdAdd] = useState("1");
  const [precoAdd, setPrecoAdd] = useState(produtos[0]?.preco?.toFixed(2) || "");
  const [erro, setErro] = useState("");
  const isSm = useMediaQuery("(min-width: 640px)");

  function aoTrocarProdutoAdd(id) {
    setProdutoAdd(id);
    const p = produtos.find((x) => x.id === Number(id));
    if (p) setPrecoAdd(p.preco.toFixed(2));
  }

  const produtosDoFornecedor = form.fornecedorId
    ? produtos.filter((p) => p.fornecedorId === Number(form.fornecedorId))
    : [];
  const opcoesProduto = produtosDoFornecedor.length > 0 ? produtosDoFornecedor : produtos;

  function adicionarItem() {
    const produto = produtos.find((p) => p.id === Number(produtoAdd));
    const qtd = parseInt(qtdAdd) || 0;
    const preco = parseFloat(precoAdd) || 0;
    if (!produto || qtd <= 0) {
      setErro("Selecione um produto e uma quantidade válida.");
      return;
    }
    const existente = form.itens.find((i) => i.produtoId === produto.id);
    setForm({
      ...form,
      itens: existente
        ? form.itens.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + qtd, precoUnitario: preco } : i))
        : [...form.itens, { produtoId: produto.id, nome: produto.nome, quantidade: qtd, precoUnitario: preco }],
    });
    setQtdAdd("1");
    setErro("");
  }

  function removerItem(produtoId) {
    setForm({ ...form, itens: form.itens.filter((i) => i.produtoId !== produtoId) });
  }

  function alterarQtdItem(produtoId, novaQtd) {
    if (novaQtd < 1) return removerItem(produtoId);
    setForm({ ...form, itens: form.itens.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: novaQtd } : i)) });
  }

  const total = form.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);

  function salvar() {
    if (!form.fornecedorId) {
      setErro("Selecione o fornecedor.");
      return;
    }
    if (form.itens.length === 0) {
      setErro("Adicione ao menos um item ao pedido.");
      return;
    }
    onSalvar({ ...form, fornecedorId: Number(form.fornecedorId) });
  }

  return (
    <Painel titulo={inicial ? "Editar pedido de compra" : "Novo pedido de compra"} onFechar={onCancelar} largo>
      <div className="space-y-5">
        <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
          <Campo label="Fornecedor">
            <BuscaFornecedor
              fornecedores={fornecedores}
              value={form.fornecedorId}
              onChange={(fid) => {
                setForm({ ...form, fornecedorId: fid });
                const filtrados = fid ? produtos.filter((p) => p.fornecedorId === Number(fid)) : [];
                const primeiro = (filtrados.length > 0 ? filtrados : produtos)[0];
                if (primeiro) {
                  setProdutoAdd(primeiro.id);
                  setPrecoAdd(primeiro.preco.toFixed(2));
                }
              }}
            />
          </Campo>
          <Campo label="Previsão de entrega">
            <input
              type="date"
              value={form.dataPrevista}
              onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })}
              className={inputClasses}
            />
          </Campo>
        </div>

        <div className="pt-1 border-t border-stone-100" />
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Itens do pedido</p>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={produtoAdd}
            onChange={(e) => aoTrocarProdutoAdd(e.target.value)}
            className={cn(inputClasses, "bg-white flex-1")}
          >
            {opcoesProduto.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <input
            value={qtdAdd}
            onChange={(e) => setQtdAdd(e.target.value.replace(/\D/g, ""))}
            placeholder="Qtd"
            inputMode="numeric"
            style={{ width: "80px" }}
            className={cn(inputClasses, "shrink-0 text-center")}
          />
          <input
            value={precoAdd}
            onChange={(e) => setPrecoAdd(e.target.value)}
            placeholder="Preço unit."
            type="number"
            step="0.01"
            style={{ width: "110px" }}
            className={cn(inputClasses, "shrink-0")}
          />
          <button
            onClick={adicionarItem}
            className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {form.itens.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6 bg-stone-50 rounded-lg border border-stone-100">Nenhum item adicionado ainda.</p>
        ) : (
          <div className="border border-stone-200 rounded-lg divide-y divide-stone-100">
            {form.itens.map((item) => (
              <div key={item.produtoId} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{item.nome}</p>
                  <p className="text-xs text-stone-400">{moeda(item.precoUnitario)} / un.</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => alterarQtdItem(item.produtoId, item.quantidade - 1)} className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50">
                    <Minus size={13} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantidade}</span>
                  <button onClick={() => alterarQtdItem(item.produtoId, item.quantidade + 1)} className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50">
                    <Plus size={13} />
                  </button>
                </div>
                <span className="w-24 text-right text-sm font-medium text-stone-800 tabular-nums shrink-0">{moeda(item.quantidade * item.precoUnitario)}</span>
                <button onClick={() => removerItem(item.produtoId)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-red-600 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-3 bg-stone-50">
              <span className="text-sm font-semibold text-stone-900">Total do pedido</span>
              <span className="text-lg font-bold text-teal-800 tabular-nums">{moeda(total)}</span>
            </div>
          </div>
        )}

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Condições combinadas, prazo, contato..."
          />
        </Campo>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}
