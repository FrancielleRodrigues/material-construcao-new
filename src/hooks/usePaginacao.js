import { useState, useRef, useMemo, useCallback } from "react";
import { useMediaQuery } from "./useMediaQuery";

export const TAMANHOS_PAGINA = [10, 25, 50, 100];

// Paginação no navegador (as listas já estão carregadas). A página volta para a 1ª quando a `chave`
// muda (busca ou filtro da tela) e é ajustada sozinha se a lista encolher (ex.: excluiu o último
// item da última página). Padrão: 10 por página no celular e 25 no computador; o usuário pode trocar.
export function usePaginacao(lista, { chave = "" } = {}) {
  const ehDesktop = useMediaQuery("(min-width: 768px)");
  const [escolhido, setEscolhido] = useState(null);
  const [estado, setEstado] = useState({ pagina: 1, chave });
  const ref = useRef(null);

  const tamanho = escolhido ?? (ehDesktop ? 25 : 10);
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  // mudou a busca/filtro: começa de novo pela primeira página. O estado é atualizado já na renderização
  // (padrão recomendado pelo React), senão voltar à busca anterior reviveria a página antiga.
  if (estado.chave !== chave) setEstado({ pagina: 1, chave });
  const pagina = Math.min(estado.chave === chave ? estado.pagina : 1, totalPaginas);

  const itens = useMemo(() => lista.slice((pagina - 1) * tamanho, pagina * tamanho), [lista, pagina, tamanho]);

  const irPara = useCallback(
    (nova) => {
      setEstado({ pagina: Math.min(Math.max(1, nova), totalPaginas), chave });
      // ao trocar de página com o topo da lista fora da tela (comum no celular), volta para o começo dela
      const el = ref.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
    },
    [chave, totalPaginas]
  );

  const mudarTamanho = useCallback(
    (novo) => {
      setEscolhido(novo);
      setEstado({ pagina: 1, chave });
    },
    [chave]
  );

  return {
    itens, pagina, totalPaginas, total, tamanho, ref,
    inicio: total === 0 ? 0 : (pagina - 1) * tamanho + 1,
    fim: Math.min(pagina * tamanho, total),
    irPara, mudarTamanho,
  };
}
