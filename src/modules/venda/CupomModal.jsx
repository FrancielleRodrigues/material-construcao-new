import { useEffect } from "react";
import { X, Truck, CheckCircle2, FileCheck2 } from "lucide-react";
import { moeda, formatarData, totalVenda } from "../../utils/format";
import { FORMAS_PAGAMENTO } from "../../data/constantes";

export function CupomModal({ venda, cliente, onNovaVenda, onFechar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const subtotal = venda.subtotal ?? totalVenda(venda);
  const desconto = venda.desconto?.valorCalculado || 0;
  const total = venda.total ?? subtotal;

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-stone-900">Venda concluída</h2>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ minHeight: 0 }}>
          <div className="text-center mb-5 pb-5 border-b border-dashed border-stone-200">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Comprovante de venda nº {venda.numero}</p>
            <p className="text-xs text-stone-400 mt-0.5">{formatarData(venda.data)} · {cliente ? cliente.nome : "Consumidor não identificado"}</p>
          </div>

          <div className="space-y-2.5 mb-5">
            {venda.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="text-stone-800 truncate">{item.nome}</p>
                  <p className="text-xs text-stone-400">{item.quantidade} × {moeda(item.precoUnitario)}</p>
                </div>
                <span className="font-medium text-stone-700 tabular-nums shrink-0">{moeda(item.quantidade * item.precoUnitario)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{moeda(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-700">
                <span>Desconto{venda.desconto?.tipo === "percentual" ? ` (${venda.desconto.valor}%)` : ""}</span>
                <span className="tabular-nums">− {moeda(desconto)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-sm font-semibold text-stone-900">Total</span>
              <span className="text-lg font-bold text-teal-800 tabular-nums">{moeda(total)}</span>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {FORMAS_PAGAMENTO.find((f) => f.id === venda.formaPagamento)?.label}
          </p>

          {(venda.tipoEntrega === "entrega" || venda.notaGerada) && (
            <div className="flex flex-col gap-1.5 mt-4">
              {venda.tipoEntrega === "entrega" && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-sky-50 text-sky-700 px-2.5 py-1.5 rounded-lg w-fit">
                  <Truck size={12} /> Entrega registrada em Entregas
                </span>
              )}
              {venda.notaGerada && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-teal-50 text-teal-700 px-2.5 py-1.5 rounded-lg w-fit">
                  <FileCheck2 size={12} /> Rascunho de NF-e gerado em Fiscal
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-stone-400 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 mt-4">
            Este é um comprovante interno, sem valor fiscal. A emissão de NFC-e/NF-e será feita pelo módulo Fiscal quando integrado à SEFAZ.
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-stone-100 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
          >
            Imprimir
          </button>
          <button
            onClick={onNovaVenda}
            className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Nova venda
          </button>
        </div>
      </div>
    </div>
  );
}
