import { moeda, totalVenda } from "../../utils/format";
import { soDigitos, mascararCnpj, mascararCpf } from "../../utils/mascaras";
import { FORMAS_PAGAMENTO } from "../../data/constantes";

const num = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

// "15/11/2026 18:23:00" (ou só o dia, nas vendas antigas, que não guardaram a hora)
function emissao(venda) {
  if (venda.criadaEm) {
    const d = new Date(venda.criadaEm);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;
  }
  const [a, m, dia] = venda.data.split("-");
  return `${dia}/${m}/${a}`;
}

function enderecoEmpresa(e) {
  if (!e) return "";
  const l1 = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const l2 = [e.bairro, e.cidade && e.uf ? `${e.cidade} - ${e.uf}` : e.cidade].filter(Boolean).join(", ");
  return [l1, l2].filter(Boolean).join(" - ");
}

const Linha = ({ children }) => <div className="border-t border-dashed border-stone-400 my-2" role="separator">{children}</div>;
const Par = ({ rotulo, valor, forte }) => (
  <div className={`flex justify-between gap-3 ${forte ? "font-bold" : ""}`}>
    <span>{rotulo}</span>
    <span className="tabular-nums">{valor}</span>
  </div>
);

// Cupom no formato de um DANFE NFC-e (bobina de 80 mm), mas SEM validade fiscal: é um comprovante
// de venda / rascunho. Não traz chave de acesso, protocolo nem QR Code, que só existem na emissão
// real pela SEFAZ (certificado digital + provedor). Nunca apresentar como nota fiscal válida.
export function CupomPapel({ venda, cliente, empresa, produtosPorId, operador, nota }) {
  const subtotal = venda.subtotal ?? totalVenda(venda);
  const desconto = venda.desconto?.valorCalculado || 0;
  const total = venda.total ?? subtotal;
  const qtdItens = venda.itens.reduce((s, i) => s + i.quantidade, 0);
  const nome = empresa?.nomeFantasia || empresa?.razaoSocial || "Empresa não configurada";
  const endereco = enderecoEmpresa(empresa?.endereco);
  const docCliente = cliente ? soDigitos(cliente.documento) : "";
  const forma = FORMAS_PAGAMENTO.find((f) => f.id === venda.formaPagamento)?.label || venda.formaPagamento;

  return (
    <div className="font-mono text-[11px] leading-snug text-stone-900 bg-white" data-testid="cupom-papel">
      <p className="text-center font-bold border-2 border-stone-900 py-1 mb-2 tracking-wide">SEM VALIDADE FISCAL</p>

      <div className="text-center">
        <p className="font-bold text-xs uppercase">{nome}</p>
        {empresa?.razaoSocial && empresa.nomeFantasia && <p className="uppercase">{empresa.razaoSocial}</p>}
        <p>{empresa?.cnpj ? `CNPJ: ${mascararCnpj(empresa.cnpj)}` : "CNPJ não informado (Fiscal → dados do emitente)"}</p>
        {endereco && <p>{endereco}</p>}
        {empresa?.telefone && <p>Tel.: {empresa.telefone}</p>}
      </div>

      <Linha />
      <p className="text-center font-bold">COMPROVANTE DE VENDA</p>
      <p className="text-center">Rascunho de NFC-e: não emitido na SEFAZ</p>
      <Linha />

      <div className="flex justify-between font-bold mb-1">
        <span>CÓDIGO / DESCRIÇÃO</span>
        <span>TOTAL</span>
      </div>
      {venda.itens.map((item, i) => {
        const p = produtosPorId?.[item.produtoId];
        const codigo = p ? p.sku || p.codigoBarras : "";
        return (
          <div key={i} className="mb-1.5" data-testid="cupom-item">
            <p className="break-words">{[codigo, item.nome].filter(Boolean).join(" ")}</p>
            <div className="flex justify-between gap-3">
              <span>{num(item.quantidade)} {(p?.unidade || "un").toUpperCase()} x {moeda(item.precoUnitario)}</span>
              <span className="tabular-nums">{moeda(item.quantidade * item.precoUnitario)}</span>
            </div>
          </div>
        );
      })}

      <Linha />
      <Par rotulo="QTD. TOTAL DE ITENS" valor={num(qtdItens)} />
      <Par rotulo="VALOR TOTAL R$" valor={moeda(subtotal).replace("R$", "").trim()} />
      {desconto > 0 && (
        <Par rotulo={`DESCONTO R$${venda.desconto?.tipo === "percentual" ? ` (${venda.desconto.valor}%)` : ""}`} valor={`-${moeda(desconto).replace("R$", "").trim()}`} />
      )}
      <Par rotulo="VALOR A PAGAR R$" valor={moeda(total).replace("R$", "").trim()} forte />
      <Par rotulo={forma.toUpperCase()} valor={moeda(total).replace("R$", "").trim()} />

      <Linha />
      <p className="text-center font-bold">
        Venda nº {venda.numero}{nota ? ` · Rascunho NFC-e ${nota.numero} Série ${nota.serie}` : ""}
      </p>
      <p className="text-center">Emissão {emissao(venda)}</p>
      <p className="text-center mt-1">Chave de acesso: não emitida (rascunho)</p>
      <p className="text-center mt-1 font-bold" data-testid="cupom-consumidor">
        {cliente
          ? `CONSUMIDOR ${docCliente.length === 14 ? "CNPJ" : "CPF"}: ${docCliente.length === 14 ? mascararCnpj(docCliente) : mascararCpf(docCliente)}`
          : "CONSUMIDOR NÃO IDENTIFICADO"}
      </p>
      {cliente && <p className="text-center break-words">{cliente.nome}</p>}

      {venda.tipoEntrega === "entrega" && (
        <>
          <Linha />
          <p className="font-bold">ENTREGA</p>
          <p className="break-words">{venda.enderecoEntrega || "Endereço não informado"}</p>
        </>
      )}

      <Linha />
      <p className="text-center border border-stone-900 px-1.5 py-1">
        QR Code e protocolo de autorização só existem na nota fiscal emitida pela SEFAZ. Este comprovante NÃO substitui a nota fiscal.
      </p>
      <p className="mt-2 break-words">Venda: {venda.numero}{operador ? ` · Operador: ${operador}` : ""}</p>
    </div>
  );
}
