import { moeda } from "../../utils/format.js";

const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const dec2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dec3 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const compactoBR = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function formatarPct(v) {
  return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}

// Valor → texto para a tela, de acordo com o tipo da coluna/indicador.
export function formatar(v, tipo = "texto") {
  if (v === null || v === undefined || v === "") return "—";
  switch (tipo) {
    case "moeda": return moeda(Number(v));
    case "percentual": return formatarPct(Number(v));
    case "inteiro": return int.format(Number(v));
    case "numero": return dec2.format(Number(v));
    case "quantidade": return dec3.format(Number(v));
    case "data": {
      const [a, m, d] = String(v).slice(0, 10).split("-");
      return `${d}/${m}/${a}`;
    }
    case "booleano": return v ? "Sim" : "Não";
    default: return String(v);
  }
}

// Valores compactos para os eixos dos gráficos (R$ 1,2 mil).
export function compacto(v, tipo = "moeda") {
  const n = compactoBR.format(v);
  return tipo === "moeda" ? `R$ ${n}` : n;
}

// Maior valor "redondo" acima do máximo, para o eixo terminar numa marca limpa (1, 2, 2,5, 5 × 10^k).
export function maximoDoEixo(max) {
  if (!(max > 0)) return 1;
  const potencia = 10 ** Math.floor(Math.log10(max));
  const fracao = max / potencia;
  const passo = fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 2.5 ? 2.5 : fracao <= 5 ? 5 : 10;
  return passo * potencia;
}
