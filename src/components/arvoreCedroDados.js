// Desenho da árvore da marca Cedro (viewBox 64x64): tronco que se abre em galhos curvos, folhas
// pontudas e três bolinhas. É a fonte única do desenho: o componente ArvoreCedro
// e o favicon (scripts/gerar-favicon.mjs → public/favicon.svg) usam estes dados.

// Tronco e galhos (formas cheias, afinando até a ponta; todas entram no tronco para não ficar vão).
export const TRONCO = [
  "M22 62 C26 56 27.4 50 27.5 43 L36.5 43 C36.6 50 38 56 42 62 Z", // tronco com base aberta
  "M27.5 48 C26.8 38 22 30 13 22.5 C21 27 27.5 31 33 41 L33 48 Z", // galho esquerdo
  "M36.5 48 C37.2 38 42 30 51 22.5 C43 27 36.5 31 31 41 L31 48 Z", // galho direito
  "M30 40 C25 35.5 17 34 8 36 C17 37.5 24 39.5 30 46 Z", // galho lateral esquerdo
  "M34 40 C39 35.5 47 34 56 36 C47 37.5 40 39.5 34 46 Z", // galho lateral direito
];

// Folhas: origem (x, y), ângulo em graus (0 = aponta para a direita) e comprimento.
// Medidas tiradas do modelo desenhado pela usuária (sem nervuras).
export const FOLHAS = [
  { x: 32, y: 18.7, a: -90, c: 14 },
  { x: 25.4, y: 21.5, a: -114.5, c: 11.3 },
  { x: 38.8, y: 21.5, a: -66.4, c: 11.2 },
  { x: 12.8, y: 22.5, a: -148.8, c: 12.2 },
  { x: 51, y: 22.5, a: -32, c: 11.8 },
  { x: 9.5, y: 29.6, a: 184, c: 8.6 },
  { x: 55.2, y: 30.4, a: -24, c: 9 },
  { x: 14, y: 40.2, a: 146.6, c: 11.3 },
  { x: 50, y: 40.2, a: 33, c: 11.4 },
];

// Bolinhas: uma no centro, acima do encontro dos galhos, e uma de cada lado, entre as folhas e o galho.
// Ficam soltas (não encostam em galho nem folha) e nada é cortado em volta delas.
export const FRUTOS = [
  { x: 32, y: 26.6, r: 3.9 },
  { x: 14.4, y: 30.5, r: 3.7 },
  { x: 49.6, y: 30.5, r: 3.7 },
];

// Folha em coordenadas locais (aponta para +x): ponta em (c, 0) e barriga cheia perto da base,
// como no modelo. `cheia` engrossa a folha nos tamanhos muito pequenos (menu), onde a fina some.
export const caminhoFolha = (c, cheia = false) => {
  const k = cheia ? 0.4 : 0.31;
  return `M0 0 C${c * 0.3} ${-c * k} ${c * 0.66} ${-c * k} ${c} 0 C${c * 0.66} ${c * k} ${c * 0.3} ${c * k} 0 0 Z`;
};

// Mesmo desenho como texto SVG (favicon e prévias).
export function svgDaArvore({ cor = "#99f6e4", fundo = null, cheia = false } = {}) {
  const folhas = FOLHAS.map((f) => `<path d="${caminhoFolha(f.c, cheia)}" transform="translate(${f.x} ${f.y}) rotate(${f.a})"/>`).join("");
  const frutos = FRUTOS.map((f) => `<circle cx="${f.x}" cy="${f.y}" r="${f.r}"/>`).join("");
  const tronco = TRONCO.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${fundo ? `<rect width="64" height="64" rx="14" fill="${fundo}"/>` : ""}
  <g fill="${cor}">${tronco}${folhas}${frutos}</g>
</svg>`;
}
