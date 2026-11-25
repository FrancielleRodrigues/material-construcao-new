import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Truck, CheckCircle2, FileCheck2, Printer } from "lucide-react";
import { CupomPapel } from "./CupomPapel";

export function CupomModal({ venda, cliente, empresa, produtosPorId, operador, nota, onNovaVenda, onFechar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const papel = <CupomPapel venda={venda} cliente={cliente} empresa={empresa} produtosPorId={produtosPorId} operador={operador} nota={nota} />;

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
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

        <div className="flex-1 overflow-y-auto px-4 py-4 bg-stone-100" style={{ minHeight: 0 }}>
          {/* o "papel": largura de bobina, como o cupom impresso */}
          <div className="mx-auto bg-white shadow-sm border border-stone-200 px-3 py-3" style={{ maxWidth: "320px" }}>
            {papel}
          </div>

          {(venda.tipoEntrega === "entrega" || venda.notaGerada) && (
            <div className="flex flex-col gap-1.5 mt-3">
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

          <p className="text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2.5 mt-3">
            Comprovante interno, <strong>sem valor fiscal</strong>. A nota fiscal de verdade (com chave de acesso, protocolo e QR Code) só sai da SEFAZ, quando o módulo Fiscal estiver integrado a um provedor.
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-stone-100 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
          >
            <Printer size={15} /> Imprimir
          </button>
          <button
            onClick={onNovaVenda}
            className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Nova venda
          </button>
        </div>
      </div>

      {/* cópia só para impressão, fora do #root: ao imprimir, some o sistema e sobra só o cupom */}
      {createPortal(<div className="so-impressao">{papel}</div>, document.body)}
    </div>
  );
}
