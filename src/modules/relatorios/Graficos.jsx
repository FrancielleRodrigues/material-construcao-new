import { useState } from "react";
import { cn } from "../../utils/format";
import { formatar, compacto, maximoDoEixo } from "./formatos";

// Cores das séries (validadas para daltonismo: azul e laranja). Texto nunca usa a cor da série.
const GRADE = "#e7e5e4";
const FUNDO_HOVER = "rgba(28, 25, 23, 0.05)";

function Cartao({ titulo, subtitulo, direita, children }) {
  return (
    <section className="bg-white rounded-xl border border-stone-200 p-4 min-w-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-stone-800">{titulo}</h3>
          {subtitulo && <p className="text-xs text-stone-400 mt-0.5">{subtitulo}</p>}
        </div>
        {direita}
      </div>
      {children}
    </section>
  );
}

function SemDados({ texto = "Sem movimento no período." }) {
  return <p className="text-sm text-stone-400 py-10 text-center">{texto}</p>;
}

function Legenda({ series }) {
  return (
    <ul className="flex items-center gap-3 text-xs text-stone-600 shrink-0">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 10, borderRadius: 2, background: s.cor, display: "inline-block" }} />
          {s.nome}
        </li>
      ))}
    </ul>
  );
}

// ---------- colunas ao longo do tempo (1 ou 2 séries) ----------

export function ColunasTempo({ grafico }) {
  const { titulo, series, pontos, formato } = grafico;
  const [ativo, setAtivo] = useState(null); // índice da coluna sob o mouse/foco
  const [comoTabela, setComoTabela] = useState(false);

  const maior = Math.max(0, ...pontos.flatMap((p) => series.map((s) => p.valores[s.id] || 0)));
  const max = maximoDoEixo(maior);
  const marcas = [0, 0.25, 0.5, 0.75, 1];
  const passo = Math.max(1, Math.ceil(pontos.length / 8)); // rótulos do eixo X: no máximo ~8
  const textoDe = (p) => `${p.rotulo}: ${series.map((s) => `${s.nome} ${formatar(p.valores[s.id] || 0, formato)}`).join(", ")}`;

  const botaoTabela = (
    <button type="button" onClick={() => setComoTabela((v) => !v)} className="text-xs text-teal-700 hover:text-teal-900 shrink-0">
      {comoTabela ? "Ver gráfico" : "Ver como tabela"}
    </button>
  );

  return (
    <Cartao titulo={titulo} direita={<div className="flex items-center gap-3">{series.length > 1 && <Legenda series={series} />}{botaoTabela}</div>}>
      {maior === 0 ? (
        <SemDados />
      ) : comoTabela ? (
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-200">
                <th className="text-left font-medium py-1.5">Período</th>
                {series.map((s) => <th key={s.id} className="text-right font-medium py-1.5">{s.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.chave} className="border-b border-stone-100">
                  <td className="py-1 text-stone-700">{p.rotulo}</td>
                  {series.map((s) => <td key={s.id} className="py-1 text-right text-stone-700">{formatar(p.valores[s.id] || 0, formato)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="group" aria-label={titulo} style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column-reverse", justifyContent: "space-between", height: 200, width: 62, flexShrink: 0 }}>
            {marcas.map((f) => (
              <span key={f} className="text-[10px] text-stone-400 text-right" style={{ lineHeight: 1, transform: f === 0 ? "none" : "translateY(0)" }}>
                {compacto(max * f, formato)}
              </span>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ position: "relative", height: 200 }} onPointerLeave={() => setAtivo(null)}>
              {marcas.map((f) => (
                <div key={f} style={{ position: "absolute", left: 0, right: 0, bottom: `${f * 100}%`, borderTop: `1px solid ${GRADE}` }} />
              ))}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
                {pontos.map((p, i) => (
                  <div
                    key={p.chave}
                    tabIndex={0}
                    role="img"
                    aria-label={textoDe(p)}
                    onPointerMove={() => setAtivo(i)}
                    onFocus={() => setAtivo(i)}
                    onBlur={() => setAtivo(null)}
                    style={{
                      flex: 1, minWidth: 0, height: "100%", padding: "0 1px", display: "flex", alignItems: "flex-end",
                      justifyContent: "center", gap: 2, background: ativo === i ? FUNDO_HOVER : "transparent", outline: "none",
                    }}
                  >
                    {series.map((s) => {
                      const v = p.valores[s.id] || 0;
                      return (
                        <div
                          key={s.id}
                          style={{
                            flex: "1 1 0", maxWidth: series.length > 1 ? 12 : 24, height: `${(v / max) * 100}%`, background: s.cor,
                            borderRadius: "4px 4px 0 0", opacity: ativo === null || ativo === i ? 1 : 0.55,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              {ativo !== null && (
                <div
                  style={{
                    position: "absolute", top: 0, pointerEvents: "none", zIndex: 5, whiteSpace: "nowrap",
                    left: `${((ativo + 0.5) / pontos.length) * 100}%`,
                    transform: ativo < pontos.length * 0.2 ? "translateX(-10%)" : ativo > pontos.length * 0.8 ? "translateX(-90%)" : "translateX(-50%)",
                  }}
                  className="bg-white border border-stone-200 rounded-lg shadow-md px-3 py-2 text-xs"
                  data-testid="dica-grafico"
                >
                  <p className="text-stone-500 mb-1">{pontos[ativo].rotulo}</p>
                  {series.map((s) => (
                    <p key={s.id} className="flex items-center gap-2 text-stone-500">
                      <span style={{ width: 10, height: 3, background: s.cor, display: "inline-block", borderRadius: 2 }} />
                      <strong className="text-stone-900 font-semibold">{formatar(pontos[ativo].valores[s.id] || 0, formato)}</strong>
                      {series.length > 1 && <span>{s.nome}</span>}
                    </p>
                  ))}
                  {pontos[ativo].extra && <p className="text-stone-400 mt-0.5">{pontos[ativo].extra}</p>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", marginTop: 4 }}>
              {pontos.map((p, i) => (
                <span key={p.chave} className="text-[10px] text-stone-400 text-center" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "visible" }}>
                  {i % passo === 0 ? p.rotulo : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Cartao>
  );
}

// ---------- ranking em barras horizontais ----------

export function BarrasRanking({ grafico }) {
  const { titulo, subtitulo, itens, formato } = grafico;
  const [ativo, setAtivo] = useState(null);
  const max = Math.max(0, ...itens.map((i) => i.valor));

  return (
    <Cartao titulo={titulo} subtitulo={subtitulo}>
      {max <= 0 ? (
        <SemDados texto="Sem dados no período." />
      ) : (
        <ul role="list" className="space-y-3" onPointerLeave={() => setAtivo(null)}>
          {itens.map((item, i) => (
            <li
              key={`${item.rotulo}-${i}`}
              tabIndex={0}
              onPointerEnter={() => setAtivo(i)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              title={`${item.rotulo}: ${formatar(item.valor, formato)}${item.detalhe ? ` (${item.detalhe})` : ""}`}
              style={{ outline: "none", opacity: ativo === null || ativo === i ? 1 : 0.6 }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-stone-700 truncate">{item.rotulo}</span>
                <span className="text-xs font-semibold text-stone-900 shrink-0">{formatar(item.valor, formato)}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ width: `${Math.max((item.valor / max) * 100, item.valor > 0 ? 1.5 : 0)}%`, height: 10, background: "#2a78d6", borderRadius: "0 4px 4px 0" }} />
                </div>
                {item.detalhe && <span className={cn("text-[11px] text-stone-400 shrink-0 text-right")} style={{ maxWidth: "55%" }}>{item.detalhe}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

export function Grafico({ grafico }) {
  return grafico.tipo === "colunas" ? <ColunasTempo grafico={grafico} /> : <BarrasRanking grafico={grafico} />;
}
