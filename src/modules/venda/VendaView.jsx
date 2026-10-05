import { ScanLine, Plus, Search, CheckCircle2, X, ShoppingCart, Minus, Trash2, Loader2, Receipt } from "lucide-react";
import { Campo } from "../../components/ui/Campo";
import { cn, moeda, formatarEndereco } from "../../utils/format";
import { inputClasses } from "../../components/ui/inputClasses";
import { EmptyState } from "../../components/ui/EmptyState";
import { FORMAS_PAGAMENTO } from "../../data/constantes";

export function VendaView({
  adicionarAoCarrinho,
  alterarQtdCarrinho,
  bipCodigo,
  bipQuantidade,
  carrinho,
  cepVenda,
  clienteVendaEncontrado,
  clienteVendaNaoEncontrado,
  dataEntregaVenda,
  descontoTipo,
  descontoValor,
  digitosDocVenda,
  docClienteVenda,
  enderecoEntregaVenda,
  erroBip,
  etapaVenda,
  finalizarVenda,
  formaPagamentoVenda,
  gerarNotaVenda,
  numeroVenda,
  onCepVendaChange,
  onNumeroVendaChange,
  produtos,
  produtosPorId,
  removerDoCarrinho,
  setBipCodigo,
  setBipQuantidade,
  setDataEntregaVenda,
  setDescontoTipo,
  setDescontoValor,
  setDocClienteVenda,
  setEnderecoEntregaVenda,
  setErroBip,
  setEtapaVenda,
  setFormCliente,
  setFormaPagamentoVenda,
  setGerarNotaVenda,
  setTipoEntregaVenda,
  statusCepVenda,
  subtotalCarrinho,
  tipoEntregaVenda,
  totalComDesconto,
  valorDesconto,
}) {
  return (
    <>
      {etapaVenda === "inicio" && (
        <div className="max-w-md mx-auto bg-white rounded-xl border border-stone-200 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <ScanLine size={24} className="text-teal-700" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 mb-1.5">Nova venda</h2>
          <p className="text-sm text-stone-500 mb-6">Identifique o cliente para começar a venda.</p>
          <button
            onClick={() => setEtapaVenda("cliente")}
            className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Iniciar venda
          </button>
        </div>
      )}
      {etapaVenda === "cliente" && (
        <div className="max-w-md mx-auto bg-white rounded-xl border border-stone-200 p-6 space-y-4">
          <p className="text-xs font-semibold text-teal-800">Cliente</p>
          <Campo label="CPF ou CNPJ">
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
              <input
                autoFocus
                value={docClienteVenda}
                onChange={(e) => setDocClienteVenda(e.target.value)}
                className={cn(inputClasses, "pl-8")}
                placeholder="Digite o CPF ou CNPJ"
                inputMode="numeric"
                onKeyDown={(e) => { if (e.key === "Enter" && clienteVendaEncontrado) setEtapaVenda("produtos"); }}
              />
            </div>
  
            {clienteVendaEncontrado ? (
              <div className="flex items-center justify-between gap-2 mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <div className="min-w-0 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-800 truncate">{clienteVendaEncontrado.nome}</span>
                </div>
                <button
                  onClick={() => setDocClienteVenda("")}
                  className="text-emerald-700 hover:text-emerald-900 shrink-0"
                  aria-label="Remover cliente"
                >
                  <X size={14} />
                </button>
              </div>
            ) : clienteVendaNaoEncontrado ? (
              <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <p className="text-sm text-amber-800 mb-2">Cliente não encontrado.</p>
                <button
                  onClick={() => setFormCliente({
                    tipo: digitosDocVenda.length === 14 ? "PJ" : "PF",
                    documento: docClienteVenda,
                  })}
                  className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus size={14} /> Cadastrar cliente agora
                </button>
              </div>
            ) : (
              <p className="text-xs text-stone-400 mt-1.5">Deixe em branco para consumidor não identificado.</p>
            )}
          </Campo>
  
          <div className="pt-2">
            {clienteVendaEncontrado ? (
              <button
                onClick={() => setEtapaVenda("produtos")}
                className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={() => { setDocClienteVenda(""); setEtapaVenda("produtos"); }}
                className="w-full text-sm text-stone-500 hover:text-stone-700 py-2"
              >
                Continuar sem identificar cliente
              </button>
            )}
          </div>
        </div>
      )}
      {etapaVenda === "produtos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5">
              <p className="text-xs font-semibold text-teal-800 mb-3">1. Produtos <span className="text-stone-400 font-normal normal-case">— bipe ou digite o código, o estoque é validado automaticamente</span></p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div style={{ position: "relative" }} className="flex-1">
                  <ScanLine size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                  <input
                    value={bipCodigo}
                    onChange={(e) => { setBipCodigo(e.target.value); setErroBip(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") adicionarAoCarrinho(); }}
                    placeholder="Bipe ou digite o código de barras"
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-shadow"
                  />
                </div>
                <div className="flex gap-3">
                  <input
                    value={bipQuantidade}
                    onChange={(e) => setBipQuantidade(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") adicionarAoCarrinho(); }}
                    placeholder="Qtd"
                    inputMode="numeric"
                    style={{ width: "4.5rem" }}
                    className="shrink-0 px-3 py-2.5 border border-stone-300 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-shadow"
                  />
                  <button
                    onClick={adicionarAoCarrinho}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>
              {erroBip && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{erroBip}</p>
              )}
              <p className="text-xs text-stone-400 mt-3">
                Códigos de exemplo: {produtos.slice(0, 3).map((p) => p.codigoBarras).join(" · ")}
              </p>
            </div>
  
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {carrinho.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Carrinho vazio" subtitle="Bipe o código de um produto para começar a venda." />
              ) : (
                <div className="divide-y divide-stone-100">
                  {carrinho.map((item) => {
                    const produto = produtosPorId[item.produtoId];
                    if (!produto) return null;
                    return (
                      <div key={item.produtoId} className="flex items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-stone-800 truncate">{produto.nome}</p>
                          <p className="text-xs text-stone-400">{moeda(produto.preco)} / {produto.unidade}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => alterarQtdCarrinho(item.produtoId, item.quantidade - 1)}
                            className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50"
                            aria-label="Diminuir"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantidade}</span>
                          <button
                            onClick={() => alterarQtdCarrinho(item.produtoId, item.quantidade + 1)}
                            className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 disabled:opacity-30"
                            disabled={item.quantidade >= produto.estoque}
                            aria-label="Aumentar"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="w-24 text-right font-medium text-stone-800 tabular-nums shrink-0">
                          {moeda(item.quantidade * produto.preco)}
                        </span>
                        <button
                          onClick={() => removerDoCarrinho(item.produtoId)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-red-600 shrink-0"
                          aria-label="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
  
          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 space-y-5 lg:sticky lg:top-6">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Resumo da venda</p>
  
            <div>
              <p className="text-xs font-semibold text-teal-800 mb-2">2. Cliente</p>
              <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5">
                <div className="min-w-0 flex items-center gap-1.5">
                  {clienteVendaEncontrado ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span className="text-sm text-stone-800 truncate">{clienteVendaEncontrado.nome}</span>
                    </>
                  ) : (
                    <span className="text-sm text-stone-500">Consumidor não identificado</span>
                  )}
                </div>
                <button
                  onClick={() => setEtapaVenda("cliente")}
                  className="text-xs font-medium text-teal-700 hover:text-teal-900 shrink-0"
                >
                  Trocar
                </button>
              </div>
            </div>
  
            <div className="pt-4 border-t border-stone-100">
              <p className="text-xs font-semibold text-teal-800 mb-2">3. Desconto</p>
              <div className="flex gap-2">
                <div className="flex gap-1 p-1 bg-stone-100 rounded-lg shrink-0">
                  {[{ id: "percentual", label: "%" }, { id: "valor", label: "R$" }].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDescontoTipo(t.id)}
                      className={cn(
                        "w-10 py-1.5 rounded-md text-xs font-medium transition-colors",
                        descontoTipo === t.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(e.target.value)}
                  placeholder="0"
                  className={inputClasses}
                />
              </div>
              {valorDesconto > 0 && (
                <p className="text-xs text-emerald-700 mt-1.5">Desconto de {moeda(valorDesconto)} aplicado</p>
              )}
            </div>
  
            <div className="pt-4 border-t border-stone-100">
              <p className="text-xs font-semibold text-teal-800 mb-2">4. Entrega ou retirada</p>
              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg mb-3">
                <button
                  onClick={() => setTipoEntregaVenda("retirada")}
                  className={cn(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                    tipoEntregaVenda === "retirada" ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  Retirada no balcão
                </button>
                <button
                  onClick={() => {
                    setTipoEntregaVenda("entrega");
                    if (!enderecoEntregaVenda && clienteVendaEncontrado) {
                      setEnderecoEntregaVenda(formatarEndereco(clienteVendaEncontrado.endereco));
                    }
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                    tipoEntregaVenda === "entrega" ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  Entrega
                </button>
              </div>
              {tipoEntregaVenda === "entrega" && (
                <div className="space-y-3">
                  <Campo label="Buscar endereço por CEP (opcional)">
                    <div className="flex gap-2">
                      <div style={{ position: "relative" }} className="flex-1">
                        <input
                          value={cepVenda}
                          onChange={(e) => onCepVendaChange(e.target.value)}
                          className={inputClasses}
                          placeholder="00000-000"
                          inputMode="numeric"
                        />
                        <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
                          {statusCepVenda === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                          {statusCepVenda === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
                        </div>
                      </div>
                      <input
                        value={numeroVenda}
                        onChange={(e) => onNumeroVendaChange(e.target.value)}
                        className={inputClasses}
                        placeholder="Número"
                        style={{ width: "100px" }}
                      />
                    </div>
                    {statusCepVenda === "nao_encontrado" && (
                      <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha abaixo manualmente.</p>
                    )}
                  </Campo>
                  <Campo label="Endereço de entrega">
                    <input
                      value={enderecoEntregaVenda}
                      onChange={(e) => setEnderecoEntregaVenda(e.target.value)}
                      className={inputClasses}
                      placeholder="Rua, número - Bairro, Cidade/UF"
                    />
                  </Campo>
                  <Campo label="Data prevista">
                    <input
                      type="date"
                      value={dataEntregaVenda}
                      onChange={(e) => setDataEntregaVenda(e.target.value)}
                      className={inputClasses}
                    />
                  </Campo>
                </div>
              )}
            </div>
  
            <div className="pt-4 border-t border-stone-100">
              <p className="text-xs font-semibold text-teal-800 mb-2">5. Pagamento</p>
              <Campo label="Forma de pagamento">
                <select
                  value={formaPagamentoVenda}
                  onChange={(e) => setFormaPagamentoVenda(e.target.value)}
                  className={cn(inputClasses, "bg-white")}
                >
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </Campo>
            </div>
  
            <div className="pt-4 border-t border-stone-100">
              <p className="text-xs font-semibold text-teal-800 mb-2">6. Documento fiscal</p>
              <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gerarNotaVenda}
                  onChange={(e) => setGerarNotaVenda(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
                />
                Gerar rascunho de NF-e ao finalizar
              </label>
              <p className="text-xs text-stone-400 mt-1">Sem validade fiscal — fica disponível em Fiscal → Rascunhos.</p>
            </div>
  
            <div className="pt-4 border-t border-stone-200 space-y-1.5">
              <div className="flex items-center justify-between text-sm text-stone-500">
                <span>Itens</span>
                <span className="tabular-nums">{carrinho.reduce((s, i) => s + i.quantidade, 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-stone-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{moeda(subtotalCarrinho)}</span>
              </div>
              {valorDesconto > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-700">
                  <span>Desconto</span>
                  <span className="tabular-nums">− {moeda(valorDesconto)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-stone-900">Total</span>
                <span className="text-xl font-bold text-teal-800 tabular-nums">{moeda(totalComDesconto)}</span>
              </div>
            </div>
  
            <button
              onClick={finalizarVenda}
              disabled={carrinho.length === 0 || (tipoEntregaVenda === "entrega" && !enderecoEntregaVenda.trim())}
              className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
            >
              <Receipt size={16} /> Finalizar venda
            </button>
          </div>
        </div>
      )}
    </>
  );
}
