import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../utils/format";
import { TAMANHOS_PAGINA } from "../hooks/usePaginacao";

// Números de página com reticências: 1 … 4 [5] 6 … 20
function janela(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const meio = [pagina - 1, pagina, pagina + 1].filter((p) => p > 1 && p < total);
  const itens = [1];
  if (meio[0] > 2) itens.push("…");
  itens.push(...meio);
  if (meio[meio.length - 1] < total - 1) itens.push("…");
  itens.push(total);
  return itens;
}

const botao = "min-w-10 h-10 sm:min-w-8 sm:h-8 px-2 rounded-lg border text-sm flex items-center justify-center transition-colors";

// Controle de paginação para usar no rodapé de uma lista (junto com usePaginacao).
// No celular: "Anterior · Página x de y · Próxima" com botões grandes; no computador, números de página.
export function Paginacao({ pg, rotulo = "itens" }) {
  if (pg.total <= TAMANHOS_PAGINA[0]) return null; // cabe tudo na primeira página: nada a paginar
  return (
    <nav aria-label="Paginação" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-stone-100 bg-stone-50/60">
      <p className="text-xs text-stone-500" data-testid="paginacao-resumo">
        Mostrando <strong className="font-semibold text-stone-700">{pg.inicio}–{pg.fim}</strong> de <strong className="font-semibold text-stone-700">{pg.total}</strong> {rotulo}
      </p>
      <div className="flex items-center justify-between sm:justify-end gap-2">
        <select
          value={pg.tamanho}
          onChange={(e) => pg.mudarTamanho(Number(e.target.value))}
          aria-label="Itens por página"
          className="h-10 sm:h-8 rounded-lg border border-stone-300 bg-white text-xs text-stone-700 px-2"
        >
          {TAMANHOS_PAGINA.map((t) => (
            <option key={t} value={t}>{t} por página</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => pg.irPara(pg.pagina - 1)}
            disabled={pg.pagina <= 1}
            aria-label="Página anterior"
            className={cn(botao, "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed")}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="sm:hidden text-xs text-stone-600 tabular-nums px-1" data-testid="paginacao-pagina">
            Página {pg.pagina} de {pg.totalPaginas}
          </span>
          <div className="hidden sm:flex items-center gap-1.5">
            {janela(pg.pagina, pg.totalPaginas).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-stone-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => pg.irPara(p)}
                  aria-label={`Página ${p}`}
                  aria-current={p === pg.pagina ? "page" : undefined}
                  className={cn(botao, p === pg.pagina ? "bg-teal-800 border-teal-800 text-white font-medium" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50")}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() => pg.irPara(pg.pagina + 1)}
            disabled={pg.pagina >= pg.totalPaginas}
            aria-label="Próxima página"
            className={cn(botao, "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed")}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
