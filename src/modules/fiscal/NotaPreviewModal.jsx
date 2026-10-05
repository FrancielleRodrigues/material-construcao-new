import { useEffect } from "react";
import { X, FileText, Printer } from "lucide-react";
import { moeda, totalVenda } from "../../utils/format";

export function NotaPreviewModal({ nota, cliente, empresaFiscal, onFechar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const total = nota.venda ? totalVenda(nota.venda) : 0;

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
              <FileText size={16} className="text-stone-500" />
            </div>
            <h2 className="text-base font-semibold text-stone-900">NF-e nº {nota.numero} · Série {nota.serie}</h2>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ minHeight: 0 }}>
          <div className="text-center bg-stone-50 border border-dashed border-stone-300 rounded-lg px-4 py-3 mb-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Modelo — sem validade fiscal</p>
            <p className="text-xs text-stone-400 mt-1">Rascunho gerado localmente. Não foi transmitido à SEFAZ.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-5">
            <div>
              <p className="text-xs text-stone-400">Emitente</p>
              <p className="text-stone-800">{empresaFiscal.razaoSocial || "Razão social não configurada"}</p>
              <p className="text-xs text-stone-400 mt-0.5">{empresaFiscal.cnpj || "CNPJ não configurado"}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Destinatário</p>
              <p className="text-stone-800">{cliente ? cliente.nome : "Consumidor não identificado"}</p>
              {cliente && <p className="text-xs text-stone-400 mt-0.5">{cliente.documento}</p>}
            </div>
          </div>

          <div className="space-y-2.5 mb-5 pt-4 border-t border-stone-100">
            {nota.venda?.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="text-stone-800 truncate">{item.nome}</p>
                  <p className="text-xs text-stone-400">{item.quantidade} × {moeda(item.precoUnitario)}</p>
                </div>
                <span className="font-medium text-stone-700 tabular-nums shrink-0">{moeda(item.quantidade * item.precoUnitario)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <span className="text-sm font-semibold text-stone-900">Valor total</span>
            <span className="text-lg font-bold text-teal-800 tabular-nums">{moeda(total)}</span>
          </div>

          <p className="text-xs text-stone-400 mt-5">
            Chave de acesso: pendente de emissão · Ambiente: {empresaFiscal.ambiente === "producao" ? "Produção" : "Homologação"}
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-stone-100 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
          >
            <Printer size={15} /> Imprimir modelo
          </button>
          <button
            onClick={onFechar}
            className="flex-1 bg-stone-800 hover:bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
