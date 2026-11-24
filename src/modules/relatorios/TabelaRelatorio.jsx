import { cn } from "../../utils/format";
import { formatar } from "./formatos";

const LIMITE_NA_TELA = 200;
const NUMERICOS = new Set(["moeda", "numero", "inteiro", "percentual", "quantidade"]);

// Selos para colunas de situação/classe.
const SELOS = {
  "Abaixo do mínimo": "bg-red-50 text-red-700",
  "Sem giro no período": "bg-amber-50 text-amber-700",
  Normal: "bg-stone-100 text-stone-600",
  Vencido: "bg-red-50 text-red-700",
  Pago: "bg-emerald-50 text-emerald-700",
  Recebido: "bg-emerald-50 text-emerald-700",
  "A vencer": "bg-stone-100 text-stone-600",
  Pendente: "bg-amber-50 text-amber-700",
  A: "bg-teal-50 text-teal-800",
  B: "bg-sky-50 text-sky-700",
  C: "bg-stone-100 text-stone-600",
};

function Celula({ coluna, valor }) {
  const texto = formatar(valor, coluna.tipo);
  if ((coluna.campo === "situacao" || coluna.campo === "classe") && SELOS[valor]) {
    return <span className={cn("inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap", SELOS[valor])}>{texto}</span>;
  }
  return texto;
}

export function TabelaRelatorio({ tabela }) {
  const { titulo, subtitulo, colunas, linhas } = tabela;
  const visiveis = linhas.slice(0, LIMITE_NA_TELA);
  return (
    <section className="bg-white rounded-xl border border-stone-200 overflow-hidden" data-testid={`tabela-${tabela.id}`}>
      <div className="px-4 py-3 border-b border-stone-100">
        <h3 className="text-sm font-semibold text-stone-800">
          {titulo} <span className="text-stone-400 font-normal">({linhas.length})</span>
        </h3>
        {subtitulo && <p className="text-xs text-stone-400 mt-0.5">{subtitulo}</p>}
      </div>
      {linhas.length === 0 ? (
        <p className="text-sm text-stone-400 p-6 text-center">Nenhum registro no período.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm" style={{ minWidth: "max-content" }}>
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                {colunas.map((c) => (
                  <th key={c.campo} className={cn("px-4 py-2.5 font-medium whitespace-nowrap", NUMERICOS.has(c.tipo) || c.tipo === "data" ? "text-right" : "text-left")}>
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visiveis.map((l, i) => (
                <tr key={i} className="hover:bg-stone-50/60">
                  {colunas.map((c) => (
                    <td key={c.campo} className={cn("px-4 py-2 text-stone-700 whitespace-nowrap", NUMERICOS.has(c.tipo) || c.tipo === "data" ? "text-right" : "text-left")}>
                      <Celula coluna={c} valor={l[c.campo]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {linhas.length > LIMITE_NA_TELA && (
        <p className="text-xs text-stone-500 px-4 py-2.5 border-t border-stone-100 bg-stone-50">
          Mostrando {LIMITE_NA_TELA} de {linhas.length} linhas. O arquivo do Excel traz todas.
        </p>
      )}
    </section>
  );
}
