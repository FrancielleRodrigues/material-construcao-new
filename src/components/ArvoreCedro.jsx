import { TRONCO, FOLHAS, FRUTOS, caminhoFolha } from "./arvoreCedroDados";

// A árvore da marca Cedro (mesmo desenho do favicon, em arvoreCedroDados.js, seguindo o modelo da
// usuária): tronco que se abre em dois galhos, folhas pontudas ao redor e três bolinhas soltas.
// Usa a cor do texto (currentColor). Abaixo de 28 px as folhas ficam um pouco mais cheias.
// `animada`: as folhas e as bolinhas "brotam" uma a uma (tela de carregamento; ver index.css).
export function ArvoreCedro({ size = 24, className = "", animada = false }) {
  const cheia = size < 28;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      {TRONCO.map((d, i) => <path key={i} d={d} />)}
      {FOLHAS.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.a})`}>
          <path d={caminhoFolha(f.c, cheia)} className={animada ? "cedro-brota" : undefined} style={animada ? { animationDelay: `${i * 0.14}s` } : undefined} />
        </g>
      ))}
      {FRUTOS.map((f, i) => (
        <circle key={i} cx={f.x} cy={f.y} r={f.r} className={animada ? "cedro-brota cedro-brota-centro" : undefined} style={animada ? { animationDelay: `${(FOLHAS.length + i) * 0.14}s` } : undefined} />
      ))}
    </svg>
  );
}
