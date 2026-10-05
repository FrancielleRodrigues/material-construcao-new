export function formatarEndereco(e) {
  if (!e) return "";
  const linha1 = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const linha2 = [e.bairro, e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade].filter(Boolean).join(" - ");
  return [linha1, linha2].filter(Boolean).join(" - ");
}

// Datas "de calendário" (sem hora) no fuso do navegador. toISOString() usaria UTC e,
// depois das 21h no Brasil, já devolveria o dia seguinte.
function paraISO(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function hojeISO() {
  return paraISO(new Date());
}

export function isoRelativo(diasDelta) {
  const d = new Date();
  d.setDate(d.getDate() + diasDelta);
  return paraISO(d);
}

export function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function cn(...arr) {
  return arr.filter(Boolean).join(" ");
}

export function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function totalVenda(venda) {
  return venda.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
}

export function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
}
