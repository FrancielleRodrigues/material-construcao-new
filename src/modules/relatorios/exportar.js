// Exportação para Excel (.xlsx). Cada aba da planilha vem de uma tabela do relatório:
//   { nome, colunas: [{ titulo, campo, tipo }], linhas: [{...}] }
// Os tipos viram células de verdade no Excel (número é número, data é data), não texto.

const FORMATO = {
  moeda: '"R$" #,##0.00',
  numero: "#,##0.00",
  inteiro: "#,##0",
  percentual: "0.0%",
  data: "dd/mm/yyyy",
};

const CABECALHO = { fontWeight: "bold", backgroundColor: "#e7e5e4" };
const NUMERICOS = new Set(["moeda", "numero", "inteiro", "percentual", "quantidade"]);

// "2026-10-05" → data do Excel (meia-noite UTC, como a biblioteca espera).
function paraData(iso) {
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

export function celula(valor, tipo = "texto") {
  if (valor === null || valor === undefined || valor === "") return null;
  if (tipo === "data") return { value: paraData(valor), type: Date, format: FORMATO.data, align: "right" };
  if (tipo === "booleano") return { value: valor ? "Sim" : "Não" };
  if (tipo === "quantidade") {
    // quantidades podem ser fracionadas (m³, kg); inteiras não mostram casas
    return { value: Number(valor), type: Number, format: Number.isInteger(Number(valor)) ? FORMATO.inteiro : "#,##0.000" };
  }
  if (NUMERICOS.has(tipo)) return { value: Number(valor), type: Number, format: FORMATO[tipo] };
  return { value: String(valor) };
}

// O Excel limita o nome da aba a 31 caracteres e proíbe  [ ] : * ? / \
export function nomeDeAba(nome) {
  return nome.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Planilha";
}

function larguraDaColuna(coluna, linhas) {
  const maior = linhas.reduce((m, l) => Math.max(m, String(l[coluna.campo] ?? "").length), 0);
  const minimo = { moeda: 14, data: 12, percentual: 11, inteiro: 10, numero: 12, quantidade: 12 }[coluna.tipo] ?? 10;
  const desejada = coluna.tipo && coluna.tipo !== "texto" ? Math.max(minimo, coluna.titulo.length + 2) : Math.max(minimo, coluna.titulo.length + 2, maior + 2);
  return Math.min(desejada, 50);
}

// Aba de "indicador / valor" (resumo do relatório). Cada linha tem o seu próprio tipo.
function abaIndicadores(aba) {
  const data = [[{ value: "Indicador", ...CABECALHO }, { value: "Valor", ...CABECALHO, align: "right" }]];
  for (const l of aba.linhas) {
    const c = celula(l.valor, l.tipo || "texto");
    data.push([{ value: l.rotulo, fontWeight: l.destaque ? "bold" : undefined }, c && { ...c, align: "right" }]);
  }
  return { data, sheet: nomeDeAba(aba.nome), columns: [{ width: 42 }, { width: 24 }] };
}

function abaTabela(aba) {
  const cabecalho = aba.colunas.map((c) => ({ value: c.titulo, ...CABECALHO, align: NUMERICOS.has(c.tipo) ? "right" : "left" }));
  const data = [cabecalho, ...aba.linhas.map((l) => aba.colunas.map((c) => celula(l[c.campo], c.tipo)))];
  return {
    data, sheet: nomeDeAba(aba.nome), stickyRowsCount: 1,
    columns: aba.colunas.map((c) => ({ width: larguraDaColuna(c, aba.linhas) })),
  };
}

export function montarPlanilhas(abas) {
  return abas.map((a) => (a.indicadores ? abaIndicadores({ nome: a.nome, linhas: a.indicadores }) : abaTabela(a)));
}

// Gera o arquivo. Usa a versão "universal" da biblioteca (sem Web Workers, que a política de
// segurança do site bloquearia) e só é carregada quando alguém exporta.
export async function gerarXlsx(abas) {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  return writeXlsxFile(montarPlanilhas(abas)).toBlob();
}

export async function baixarXlsx(nomeArquivo, abas) {
  const blob = await gerarXlsx(abas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
