import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { celula, nomeDeAba, gerarXlsx } from "./exportar.js";

async function abrir(blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const texto = async (caminho) => zip.file(caminho).async("string");
  const compartilhadas = zip.file("xl/sharedStrings.xml") ? [...(await texto("xl/sharedStrings.xml")).matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]) : [];
  return { zip, texto, compartilhadas, arquivos: Object.keys(zip.files) };
}

test("células: tipos viram número, data e moeda de verdade; vazio vira célula vazia", () => {
  assert.equal(celula(null), null);
  assert.equal(celula(""), null);
  assert.equal(celula(undefined, "moeda"), null);
  assert.deepEqual(celula("Cimento"), { value: "Cimento" });
  assert.deepEqual(celula(652.5, "moeda"), { value: 652.5, type: Number, format: '"R$" #,##0.00' });
  assert.deepEqual(celula(0.375, "percentual"), { value: 0.375, type: Number, format: "0.0%" });
  assert.deepEqual(celula(12, "quantidade"), { value: 12, type: Number, format: "#,##0" });
  assert.equal(celula(2.5, "quantidade").format, "#,##0.000");
  assert.equal(celula(true, "booleano").value, "Sim");
  const d = celula("2026-10-05", "data");
  assert.equal(d.type, Date);
  assert.equal(d.value.toISOString(), "2026-10-05T00:00:00.000Z");
});

test("nome de aba: sem caracteres proibidos e até 31 caracteres", () => {
  assert.equal(nomeDeAba("Vendas/Itens: [2026]"), "Vendas Itens   2026");
  assert.equal(nomeDeAba("x".repeat(40)).length, 31);
  assert.equal(nomeDeAba("///"), "Planilha");
});

test("gera um .xlsx válido com várias abas, textos com acento e valores tipados", async () => {
  const blob = await gerarXlsx([
    { nome: "Resumo", indicadores: [
      { rotulo: "Período", valor: "01/10/2026 a 31/10/2026" },
      { rotulo: "Faturamento", valor: 652, tipo: "moeda", destaque: true },
      { rotulo: "Margem", valor: 0.375, tipo: "percentual" },
    ] },
    { nome: "Vendas", colunas: [
      { titulo: "Nº", campo: "numero", tipo: "inteiro" },
      { titulo: "Data", campo: "data", tipo: "data" },
      { titulo: "Cliente", campo: "cliente" },
      { titulo: "Total", campo: "total", tipo: "moeda" },
      { titulo: "NF", campo: "nf", tipo: "booleano" },
    ], linhas: [
      { numero: 1001, data: "2026-10-05", cliente: "João & Maria Ltda", total: 400, nf: true },
      { numero: 1002, data: "2026-10-20", cliente: null, total: 252.5, nf: false },
    ] },
  ]);
  assert.ok(blob.size > 1000);
  const { arquivos, texto, compartilhadas } = await abrir(blob);
  assert.ok(arquivos.includes("xl/worksheets/sheet1.xml") && arquivos.includes("xl/worksheets/sheet2.xml"), "duas abas");
  const livro = await texto("xl/workbook.xml");
  assert.match(livro, /name="Resumo"/);
  assert.match(livro, /name="Vendas"/);

  // textos (com acento e &) ficam na tabela de textos do arquivo
  for (const t of ["Faturamento", "Cliente", "João &amp; Maria Ltda", "Sim", "Não"]) assert.ok(compartilhadas.includes(t), `faltou o texto ${t}`);

  const vendas = await texto("xl/worksheets/sheet2.xml");
  // números são números (valor sem aspas), não texto
  assert.match(vendas, /<v>1001<\/v>/);
  assert.match(vendas, /<v>400<\/v>/);
  assert.match(vendas, /<v>252\.5<\/v>/);
  // data 2026-10-05 = serial 46300 no Excel (dias desde 30/12/1899)
  const serial = (Date.UTC(2026, 9, 5) - Date.UTC(1899, 11, 30)) / 86400000;
  assert.match(vendas, new RegExp(`<v>${serial}</v>`));
  // o cliente vazio não gera célula de texto; cabeçalho fixo
  assert.match(vendas, /<pane [^>]*ySplit="1"/);

  // formatos de moeda, percentual e data existem nos estilos
  const estilos = await texto("xl/styles.xml");
  for (const f of ["R$", "0.0%", "dd/mm/yyyy"]) assert.ok(estilos.includes(f), `faltou o formato ${f}`);
});
