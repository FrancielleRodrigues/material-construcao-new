// Leitura do XML da NF-e (modelo 55) de COMPRA. Roda no navegador (DOMParser) e traz só o que o
// sistema usa: fornecedor (emitente), itens, parcelas (duplicatas) e totais. Não valida a
// assinatura digital: serve para dar entrada na mercadoria, não como prova fiscal.

export const LIMITE_XML = 5 * 1024 * 1024; // 5 MB

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const arredonda = (n, casas = 2) => Math.round((n + Number.EPSILON) * 10 ** casas) / 10 ** casas;
const num = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

// Navega pelos nomes locais das tags (ignora o namespace da NF-e).
function filhos(el, nome) {
  return el ? Array.from(el.childNodes).filter((n) => n.nodeType === 1 && n.localName === nome) : [];
}
const primeiro = (el, ...caminho) => caminho.reduce((atual, nome) => filhos(atual, nome)[0], el);
const texto = (el, ...caminho) => (primeiro(el, ...caminho)?.textContent ?? "").trim();
function descendente(el, nome) {
  if (!el) return null;
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType !== 1) continue;
    if (n.localName === nome) return n;
    const achado = descendente(n, nome);
    if (achado) return achado;
  }
  return null;
}
const valorDesc = (el, nome) => num(descendente(el, nome)?.textContent);

function formatarTelefone(v) {
  const d = soDigitos(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export function formatarCep(v) {
  const d = soDigitos(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Reparte `diferenca` entre os itens proporcionalmente ao valor de cada um.
function ratear(itens, campo, diferenca) {
  const base = itens.reduce((s, i) => s + i.valorProdutos, 0);
  if (!diferenca || !base) return;
  itens.forEach((i) => { i[campo] += (diferenca * i.valorProdutos) / base; });
}

// Devolve { ok: true, nota } ou { ok: false, erro }. `Analisador` é o DOMParser (injetável nos testes).
export function lerNfe(xml, Analisador = globalThis.DOMParser) {
  const texto0 = String(xml ?? "");
  if (!texto0.trim()) return { ok: false, erro: "O arquivo está vazio." };
  if (texto0.length > LIMITE_XML) return { ok: false, erro: "O arquivo é grande demais para ser uma NF-e (limite de 5 MB)." };
  // NF-e não usa DTD; recusar evita ataques de expansão de entidades.
  if (/<!DOCTYPE|<!ENTITY/i.test(texto0)) return { ok: false, erro: "XML não aceito (contém declarações DTD)." };

  let doc;
  try {
    doc = new Analisador().parseFromString(texto0, "text/xml");
  } catch {
    return { ok: false, erro: "Não foi possível ler o arquivo: ele não é um XML válido." };
  }
  if (!doc?.documentElement || doc.getElementsByTagName("parsererror").length) {
    return { ok: false, erro: "Não foi possível ler o arquivo: ele não é um XML válido." };
  }

  const inf = descendente(doc.documentElement, "infNFe");
  if (!inf) {
    const tag = doc.documentElement.localName;
    return { ok: false, erro: /^(procEventoNFe|retEnviNFe|resNFe)$/.test(tag) || tag === "CTe" ? `Este XML é "${tag}", não uma NF-e completa. Use o XML da nota (nfeProc).` : "Este arquivo não parece ser o XML de uma NF-e." };
  }
  const chave = soDigitos(inf.getAttribute("Id"));
  if (chave.length !== 44) return { ok: false, erro: "A chave de acesso da NF-e não foi encontrada no XML." };
  const modelo = texto(inf, "ide", "mod");
  if (modelo && modelo !== "55") return { ok: false, erro: `Só NF-e modelo 55 é aceita (este XML é modelo ${modelo}).` };

  const avisos = [];
  const prot = descendente(doc.documentElement, "infProt");
  const cStat = prot ? texto(prot, "cStat") : "";
  if (prot && cStat && !["100", "150"].includes(cStat)) {
    return { ok: false, erro: `A nota não está autorizada na SEFAZ (situação ${cStat}: ${texto(prot, "xMotivo") || "sem detalhe"}).` };
  }
  if (!prot) avisos.push("O XML não traz o protocolo de autorização da SEFAZ (não é o arquivo nfeProc). Confira a nota antes de importar.");

  const emit = primeiro(inf, "emit");
  const documento = soDigitos(texto(emit, "CNPJ") || texto(emit, "CPF"));
  if (![11, 14].includes(documento.length)) return { ok: false, erro: "A nota não traz CNPJ/CPF válido do emitente." };
  const end = primeiro(emit, "enderEmit");
  const fornecedor = {
    documento,
    nome: texto(emit, "xNome"),
    fantasia: texto(emit, "xFant"),
    telefone: formatarTelefone(texto(end, "fone")),
    endereco: {
      cep: formatarCep(texto(end, "CEP")), logradouro: texto(end, "xLgr"), numero: texto(end, "nro"),
      complemento: texto(end, "xCpl"), bairro: texto(end, "xBairro"), cidade: texto(end, "xMun"), uf: texto(end, "UF"),
    },
  };

  const dest = primeiro(inf, "dest");
  const destinatario = soDigitos(texto(dest, "CNPJ") || texto(dest, "CPF"));
  if (texto(inf, "ide", "tpNF") === "0") avisos.push("Esta nota está marcada como de ENTRADA (emitida por você). Confirme se é mesmo uma compra.");

  const dets = filhos(inf, "det");
  if (!dets.length) return { ok: false, erro: "A nota não tem itens." };
  const itens = dets.map((det, idx) => {
    const prod = primeiro(det, "prod");
    const gtin = (v) => (/^\d{8,14}$/.test(v) && !/^0+$/.test(v) ? v : "");
    const imposto = primeiro(det, "imposto");
    const quantidade = num(texto(prod, "qCom"));
    return {
      n: idx + 1,
      codigo: texto(prod, "cProd"),
      codigoBarras: gtin(texto(prod, "cEAN")) || gtin(texto(prod, "cEANTrib")),
      nome: texto(prod, "xProd"),
      ncm: texto(prod, "NCM"),
      unidade: texto(prod, "uCom").toLowerCase() || "un",
      quantidade,
      valorUnitarioNota: num(texto(prod, "vUnCom")),
      valorProdutos: num(texto(prod, "vProd")),
      frete: num(texto(prod, "vFrete")),
      seguro: num(texto(prod, "vSeg")),
      outras: num(texto(prod, "vOutro")),
      desconto: num(texto(prod, "vDesc")),
      ipi: valorDesc(imposto, "vIPI"),
      st: valorDesc(imposto, "vICMSST"),
    };
  });
  if (itens.some((i) => !(i.quantidade > 0) || !i.nome)) return { ok: false, erro: "A nota tem item sem nome ou sem quantidade." };

  // Totais da nota (para ratear o que vem só no total: frete, seguro, outras despesas, desconto).
  const tot = primeiro(inf, "total", "ICMSTot");
  const totais = {
    produtos: num(texto(tot, "vProd")), frete: num(texto(tot, "vFrete")), seguro: num(texto(tot, "vSeg")),
    desconto: num(texto(tot, "vDesc")), outras: num(texto(tot, "vOutro")), ipi: num(texto(tot, "vIPI")),
    st: num(texto(tot, "vST")), nota: num(texto(tot, "vNF")),
  };
  const soma = (campo) => itens.reduce((s, i) => s + i[campo], 0);
  ratear(itens, "frete", totais.frete - soma("frete"));
  ratear(itens, "seguro", totais.seguro - soma("seguro"));
  ratear(itens, "outras", totais.outras - soma("outras"));
  ratear(itens, "desconto", totais.desconto - soma("desconto"));
  ratear(itens, "ipi", totais.ipi - soma("ipi"));
  ratear(itens, "st", totais.st - soma("st"));

  // Custo de aquisição: o que o item realmente custou (com frete, IPI, ST etc., menos desconto).
  itens.forEach((i) => {
    i.custoTotal = i.valorProdutos + i.frete + i.seguro + i.outras + i.ipi + i.st - i.desconto;
  });
  if (totais.nota > 0) {
    // qualquer resíduo (outros tributos, arredondamento) é rateado: o custo dos itens fecha com o total da nota
    const base = itens.reduce((s, i) => s + i.valorProdutos, 0);
    const resto = totais.nota - itens.reduce((s, i) => s + i.custoTotal, 0);
    if (Math.abs(resto) > 0.005 && base) itens.forEach((i) => { i.custoTotal += (resto * i.valorProdutos) / base; });
  }
  itens.forEach((i) => {
    i.custoUnitario = arredonda(i.custoTotal / i.quantidade, 4);
    i.custoTotal = arredonda(i.custoTotal, 2);
  });

  const parcelas = filhos(primeiro(inf, "cobr"), "dup")
    .map((d) => ({ numero: texto(d, "nDup"), vencimento: texto(d, "dVenc"), valor: num(texto(d, "vDup")) }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.vencimento) && p.valor > 0);

  const emissao = (texto(inf, "ide", "dhEmi") || texto(inf, "ide", "dEmi")).slice(0, 10);
  return {
    ok: true,
    nota: {
      chave,
      numero: texto(inf, "ide", "nNF"),
      serie: texto(inf, "ide", "serie"),
      emissao: /^\d{4}-\d{2}-\d{2}$/.test(emissao) ? emissao : "",
      naturezaOperacao: texto(inf, "ide", "natOp"),
      fornecedor,
      destinatario,
      itens,
      parcelas,
      totalNota: totais.nota || arredonda(itens.reduce((s, i) => s + i.custoTotal, 0), 2),
      avisos,
    },
  };
}

// Descobre a que produto cadastrado cada item corresponde (ordem: código de barras → SKU igual ao
// código do fornecedor → mesmo nome). Quem não casa vira "produto novo" (o usuário pode trocar).
export function conferirNota(nota, { produtos = [], fornecedores = [], cnpjEmpresa = "" } = {}) {
  const norm = (s) => String(s ?? "").trim().toUpperCase();
  const semAcento = (s) => norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  const forn = fornecedores.find((f) => soDigitos(f.documento) === nota.fornecedor.documento) || null;
  const avisos = [...nota.avisos];
  if (cnpjEmpresa && nota.destinatario && soDigitos(cnpjEmpresa) !== nota.destinatario) {
    avisos.push("O destinatário desta nota não é o CNPJ da sua empresa. Confirme se a nota é mesmo sua.");
  }
  const itens = nota.itens.map((item) => {
    const porBarras = item.codigoBarras && produtos.find((p) => p.codigoBarras && norm(p.codigoBarras) === norm(item.codigoBarras));
    const porSku = !porBarras && item.codigo && produtos.find((p) => p.sku && norm(p.sku) === norm(item.codigo));
    const porNome = !porBarras && !porSku && produtos.find((p) => semAcento(p.nome) === semAcento(item.nome));
    const produto = porBarras || porSku || porNome || null;
    return { ...item, produtoId: produto ? produto.id : null, casou: porBarras ? "código de barras" : porSku ? "SKU" : porNome ? "nome" : null };
  });
  return { ...nota, avisos, fornecedorExistente: forn, itens };
}

// Monta o JSON que a função do banco recebe (importar_nota_compra).
// `ajustes`: { [n do item]: { produtoId, preco } } com o que o usuário escolheu na conferência.
export function montarPayload(nota, { atualizarCusto = true, categoria = "", ajustes = {} } = {}) {
  return {
    chave: nota.chave,
    numero_nf: nota.numero,
    serie: nota.serie,
    data_emissao: nota.emissao || null,
    atualizar_custo: atualizarCusto,
    fornecedor: { documento: nota.fornecedor.documento, nome: nota.fornecedor.nome, telefone: nota.fornecedor.telefone, endereco: nota.fornecedor.endereco },
    itens: nota.itens.map((i) => {
      const aj = ajustes[i.n] || {};
      const produtoId = aj.produtoId !== undefined ? aj.produtoId : i.produtoId;
      const base = { nome: i.nome, quantidade: i.quantidade, preco_unitario: i.custoUnitario };
      if (produtoId) return { ...base, produto_id: Number(produtoId) };
      return {
        ...base,
        produto_id: null,
        novo_produto: {
          nome: i.nome, unidade: i.unidade, categoria, preco: Number(aj.preco) || 0,
          codigo_barras: i.codigoBarras || null, sku: i.codigo || null,
        },
      };
    }),
    parcelas: nota.parcelas.map((p) => ({ vencimento: p.vencimento, valor: p.valor })),
  };
}
