import { useId } from "react";
import { TRONCO, FOLHAS, FRUTOS, FOLGA_FRUTO, caminhoFolha } from "./arvoreCedroDados";

// A árvore da marca Cedro (mesmo desenho do favicon, em arvoreCedroDados.js): tronco que se abre em
// galhos, folhas pontudas com nervura e frutinhas. Desenhada com máscara, então as nervuras são
// vazadas e funciona sobre qualquer fundo; usa a cor do texto (currentColor).
// Até 31 px as folhas ficam mais cheias e sem nervura (a fina some); acima disso, detalhada.
export function ArvoreCedro({ size = 24, className = "" }) {
  const id = useId().replace(/:/g, "");
  const detalhe = size >= 32;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="black" />
          <g fill="white">
            {TRONCO.map((d, i) => <path key={i} d={d} />)}
            {FOLHAS.map((f, i) => (
              <path key={i} d={caminhoFolha(f.c, !detalhe)} transform={`translate(${f.x} ${f.y}) rotate(${f.a})`} />
            ))}
          </g>
          {/* espaço vazado em volta de cada frutinha, que fica solta entre os galhos */}
          <g fill="black">
            {FRUTOS.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r={f.r + FOLGA_FRUTO} />)}
          </g>
          <g fill="white">
            {FRUTOS.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r={f.r} />)}
          </g>
          {detalhe && FOLHAS.map((f, i) => (
            <path
              key={i}
              d={`M${f.c * 0.14} 0 L${f.c * 0.86} 0`}
              stroke="black" strokeWidth="0.9" strokeLinecap="round" fill="none"
              transform={`translate(${f.x} ${f.y}) rotate(${f.a})`}
            />
          ))}
        </mask>
      </defs>
      <rect width="64" height="64" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}
