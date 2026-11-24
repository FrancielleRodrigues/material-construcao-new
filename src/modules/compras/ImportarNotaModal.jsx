import { useMemo, useState } from "react";
import { FileUp, FileCheck2, AlertTriangle, AlertCircle, CheckCircle2, Loader2, PackagePlus, Building2, CalendarDays } from "lucide-react";
import { cn, moeda, formatarData } from "../../utils/format";
import { CATEGORIAS } from "../../data/constantes";
import { Painel } from "../../components/ui/Painel";
import { Campo } from "../../components/ui/Campo";
import { inputClasses } from "../../components/ui/inputClasses";
import { lerNfe, conferirNota, montarPayload, LIMITE_XML } from "./nfe";

const custoFmt = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const qtdFmt = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

function formatarDocumento(d) {
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return d;
}

// Importa o XML de uma NF-e de compra: lê no navegador, mostra uma conferência (fornecedor, itens
// associados aos produtos, parcelas) e só então grava, tudo de uma vez, pela função do banco.
export function ImportarNotaModal({ produtos, fornecedores, pedidos, cnpjEmpresa, onImportar, buscarVinculos, onCancelar }) {
  const [nota, setNota] = useState(null); // resultado de conferirNota
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);
  const [ajustes, setAjustes] = useState({}); // { [n]: { produtoId, preco } }
  const [atualizarCusto, setAtualizarCusto] = useState(true);
  const [categoria, setCategoria] = useState(CATEGORIAS[0].id);
  const [margem, setMargem] = useState("30");
  const [enviando, setEnviando] = useState(false);
  const [jaPago, setJaPago] = useState(false);

  const produtosOrdenados = useMemo(() => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [produtos]);

  async function escolherArquivo(arquivo) {
    setErro("");
    setNota(null);
    setAjustes({});
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    if (arquivo.size > LIMITE_XML) {
      setErro("O arquivo é grande demais para ser uma NF-e (limite de 5 MB).");
      return;
    }
    setLendo(true);
    try {
      const resultado = lerNfe(await arquivo.text());
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      const jaImportada = pedidos.find((p) => p.chaveAcesso === resultado.nota.chave);
      if (jaImportada) {
        setErro(`Esta nota já foi importada (pedido nº ${jaImportada.numero}). Não é possível importar a mesma nota duas vezes.`);
        return;
      }
      // fornecedor já cadastrado: usa o que o sistema aprendeu nas notas anteriores dele
      const fornecedor = fornecedores.find((f) => f.documento.replace(/\D/g, "") === resultado.nota.fornecedor.documento);
      let vinculos = [];
      if (fornecedor) {
        try {
          vinculos = await buscarVinculos(fornecedor.id);
        } catch {
          vinculos = []; // sem os vínculos a conferência continua, só não reconhece pelo código dele
        }
      }
      setNota(conferirNota(resultado.nota, { produtos, fornecedores, cnpjEmpresa, vinculos }));
    } catch {
      setErro("Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
    }
  }

  const escolhido = (item) => (ajustes[item.n]?.produtoId !== undefined ? ajustes[item.n].produtoId : item.produtoId);
  const precoDe = (item) => ajustes[item.n]?.preco ?? "";
  const ajustar = (n, parte) => setAjustes((a) => ({ ...a, [n]: { ...a[n], ...parte } }));

  const novos = nota ? nota.itens.filter((i) => !escolhido(i)) : [];
  // o que impede de importar (cada item novo precisa de preço de venda e de um código)
  const pendencias = nota ? novos.filter((i) => !(Number(precoDe(i)) > 0)).map((i) => `Informe o preço de venda de "${i.nome}".`) : [];

  function aplicarMargem() {
    const m = Number(String(margem).replace(",", "."));
    if (!(m >= 0)) return;
    setAjustes((a) => {
      const prox = { ...a };
      novos.forEach((i) => {
        if (!(Number(precoDe(i)) > 0)) prox[i.n] = { ...prox[i.n], preco: (Math.round(i.custoUnitario * (1 + m / 100) * 100) / 100).toFixed(2) };
      });
      return prox;
    });
  }

  async function importar() {
    if (!nota || pendencias.length || enviando) return;
    setEnviando(true);
    try {
      await onImportar(montarPayload(nota, { atualizarCusto, categoria, ajustes, jaPago }));
    } finally {
      setEnviando(false);
    }
  }

  const totalItens = nota ? nota.itens.reduce((s, i) => s + i.custoTotal, 0) : 0;

  return (
    <Painel titulo="Importar NF-e de compra (XML)" subtitulo={nota ? `NF-e nº ${nota.numero} · série ${nota.serie || "—"}` : "Dá entrada na mercadoria e lança as contas a pagar"} onFechar={onCancelar} largo>
      <div className="space-y-4">
        <div>
          <label
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 text-center rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition-colors",
              nota ? "border-stone-200 bg-stone-50" : "border-teal-700/40 bg-teal-50/40 hover:bg-teal-50"
            )}
          >
            {lendo ? <Loader2 size={20} className="animate-spin text-teal-800" /> : nota ? <FileCheck2 size={20} className="text-teal-800" /> : <FileUp size={20} className="text-teal-800" />}
            <span className="text-sm font-medium text-stone-700">{nota ? "Escolher outro arquivo" : "Selecionar o arquivo XML da nota"}</span>
            <span className="text-xs text-stone-400">{nomeArquivo || "Use o XML completo da NF-e (o que o fornecedor envia por e-mail), não o PDF."}</span>
            <input type="file" accept=".xml,text/xml,application/xml" className="sr-only" data-testid="arquivo-xml" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
          </label>
        </div>

        {erro && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            <AlertCircle size={15} className="shrink-0 mt-0.5" /> <span>{erro}</span>
          </p>
        )}

        {nota && (
          <>
            {nota.avisos.map((a) => (
              <p key={a} className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" /> <span>{a}</span>
              </p>
            ))}

            <div className="rounded-xl border border-stone-200 p-3.5 text-sm space-y-1">
              <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5"><Building2 size={13} /> Fornecedor</p>
              <p className="font-medium text-stone-800">{nota.fornecedor.nome}</p>
              <p className="text-xs text-stone-500">{formatarDocumento(nota.fornecedor.documento)}</p>
              {nota.fornecedorExistente ? (
                <p className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Já cadastrado: {nota.fornecedorExistente.nome}</p>
              ) : (
                <p className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"><PackagePlus size={11} /> Será cadastrado como novo fornecedor</p>
              )}
              <p className="text-xs text-stone-400">Emitida em {formatarData(nota.emissao)} · {nota.naturezaOperacao}</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-teal-800">Itens ({nota.itens.length})</p>
                {novos.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-stone-500">Margem</span>
                    <input
                      value={margem}
                      onChange={(e) => setMargem(e.target.value.replace(/[^\d.,]/g, ""))}
                      inputMode="decimal"
                      aria-label="Margem de lucro em porcentagem"
                      style={{ width: "3.5rem" }}
                      className="px-2 py-1 border border-stone-300 rounded-md text-xs text-center"
                    />
                    <span className="text-xs text-stone-500">%</span>
                    <button type="button" onClick={aplicarMargem} className="text-xs font-medium text-teal-800 border border-teal-800 rounded-md px-2 py-1 hover:bg-teal-50">
                      Sugerir preços
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2.5">
                {nota.itens.map((item) => {
                  const produtoId = escolhido(item);
                  return (
                    <div key={item.n} data-testid={`item-nota-${item.n}`} className="rounded-xl border border-stone-200 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-stone-800 min-w-0 break-words">{item.n}. {item.nome}</p>
                        <p className="text-xs text-stone-600 tabular-nums text-right shrink-0">
                          {qtdFmt(item.quantidade)} {item.unidade} × {custoFmt(item.custoUnitario)}
                          <span className="block font-medium text-stone-800">{moeda(item.custoTotal)}</span>
                        </p>
                      </div>
                      <p className="text-xs text-stone-400">
                        {item.codigo && <>Cód. do fornecedor: {item.codigo}</>}
                        {item.codigoBarras && <> · Cód. de barras: {item.codigoBarras}</>}
                      </p>
                      {item.linhasNota.length > 1 && (
                        <p className="text-xs text-sky-700 bg-sky-50 rounded-md px-2 py-1">
                          Juntei as linhas {item.linhasNota.join(" e ")} da nota: é o mesmo produto.
                        </p>
                      )}
                      <select
                        value={produtoId ?? ""}
                        onChange={(e) => ajustar(item.n, { produtoId: e.target.value ? Number(e.target.value) : null })}
                        aria-label={`Produto do item ${item.n}`}
                        className={cn(inputClasses, "bg-white")}
                      >
                        <option value="">➕ Cadastrar como produto novo</option>
                        {produtosOrdenados.map((p) => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                      {produtoId ? (
                        item.produtoId === produtoId && item.casou ? (
                          <p className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Associado automaticamente por {item.casou}</p>
                        ) : (
                          <p className="text-xs text-stone-400">A entrada será somada ao estoque deste produto.</p>
                        )
                      ) : (
                        <div className="space-y-3">
                          <Campo label="Preço de venda do produto novo (R$)">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={precoDe(item)}
                              onChange={(e) => ajustar(item.n, { preco: e.target.value })}
                              className={inputClasses}
                              placeholder={`Custo: ${custoFmt(item.custoUnitario)}`}
                              aria-label={`Preço de venda do item ${item.n}`}
                            />
                          </Campo>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Campo label="Código de barras (opcional)">
                              <input
                                value={ajustes[item.n]?.codigoBarras ?? item.codigoBarras}
                                onChange={(e) => ajustar(item.n, { codigoBarras: e.target.value })}
                                className={inputClasses}
                                placeholder="Sem código na nota"
                                aria-label={`Código de barras do item ${item.n}`}
                              />
                            </Campo>
                            <Campo label="SKU da sua loja (opcional)">
                              <input
                                value={ajustes[item.n]?.sku ?? ""}
                                onChange={(e) => ajustar(item.n, { sku: e.target.value })}
                                className={inputClasses}
                                placeholder="Em branco: o sistema gera"
                                aria-label={`SKU do item ${item.n}`}
                              />
                            </Campo>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {novos.length > 0 && (
              <Campo label="Categoria dos produtos novos">
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={cn(inputClasses, "bg-white")}>
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Campo>
            )}

            <div className="rounded-xl border border-stone-200 p-3.5 text-sm space-y-1.5">
              <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5"><CalendarDays size={13} /> Contas a pagar</p>
              {nota.parcelas.length ? (
                nota.parcelas.map((p, i) => (
                  <p key={i} className="flex justify-between text-stone-700">
                    <span>Parcela {i + 1}/{nota.parcelas.length} · vence {formatarData(p.vencimento)}</span>
                    <span className="tabular-nums font-medium">{moeda(p.valor)}</span>
                  </p>
                ))
              ) : (
                <>
                  <p className="text-stone-600">A nota não traz duplicatas: será lançada uma despesa de {moeda(totalItens)} com vencimento hoje.</p>
                  <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
                    <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} />
                    <span>Já foi paga (compra à vista)</span>
                  </label>
                </>
              )}
              <p className="flex justify-between border-t border-stone-100 pt-1.5 text-stone-800 font-medium">
                <span>Total da nota</span><span className="tabular-nums">{moeda(nota.totalNota)}</span>
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" checked={atualizarCusto} onChange={(e) => setAtualizarCusto(e.target.checked)} className="mt-0.5" />
              <span>Atualizar o preço de custo dos produtos com o valor desta compra <span className="text-stone-400">(usado na margem dos relatórios)</span></span>
            </label>

            {pendencias.length > 0 && (
              <ul className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 space-y-1 list-disc list-inside">
                {pendencias.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
            <p className="text-xs text-stone-400">Ao importar, a nota entra como compra <strong className="font-semibold text-stone-500">já recebida</strong>: soma no estoque e cria as contas a pagar. Não dá para importar a mesma nota duas vezes.</p>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={importar}
            disabled={!nota || pendencias.length > 0 || enviando}
            className="flex-1 bg-teal-800 hover:bg-teal-900 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {enviando ? "Importando…" : "Importar e dar entrada"}
          </button>
          <button onClick={onCancelar} className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </Painel>
  );
}
