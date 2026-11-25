// Desenho da árvore da marca Cedro (viewBox 64x64): tronco que se abre em galhos curvos, folhas
// pontudas com nervura e algumas frutinhas. É a fonte única do desenho: o componente ArvoreCedro
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
export const FOLHAS = [
  { x: 32, y: 19, a: -90, c: 14 },
  { x: 25, y: 22, a: -112, c: 11.5 },
  { x: 39, y: 22, a: -68, c: 11.5 },
  { x: 13, y: 22.5, a: -152, c: 12.5 },
  { x: 51, y: 22.5, a: -28, c: 12.5 },
  { x: 17, y: 31, a: 188, c: 12 },
  { x: 47, y: 31, a: -8, c: 12 },
  { x: 14, y: 40, a: 148, c: 11.5 },
  { x: 50, y: 40, a: 32, c: 11.5 },
];

// Frutinhas: ficam soltas no vão aberto entre os dois galhos, sem tocar em galho nem folha
// (nada é cortado em volta delas).
export const FRUTOS = [
  { x: 32, y: 25.3, r: 2.9 },
  { x: 27.4, y: 29.6, r: 2.1 },
  { x: 36.6, y: 29.6, r: 2.1 },
];

// Folha em coordenadas locais (aponta para +x): amêndoa fina com a ponta em (c, 0).
// `cheia` engrossa a folha para os tamanhos pequenos, onde a fina some.
export const caminhoFolha = (c, cheia = false) => {
  const k = cheia ? 0.64 : 0.46;
  return `M0 0 Q${c * 0.5} ${-c * k} ${c} 0 Q${c * 0.5} ${c * k} 0 0 Z`;
};

// Mesmo desenho como texto SVG (favicon e prévias).
export function svgDaArvore({ cor = "#99f6e4", fundo = null, nervuras = true, cheia = !nervuras } = {}) {
  const folhas = FOLHAS.map((f) => `<g transform="translate(${f.x} ${f.y}) rotate(${f.a})"><path d="${caminhoFolha(f.c, cheia)}"/></g>`).join("");
  const veias = nervuras
    ? FOLHAS.map((f) => `<g transform="translate(${f.x} ${f.y}) rotate(${f.a})"><path d="M${f.c * 0.14} 0 L${f.c * 0.86} 0" stroke="black" stroke-width="0.9" stroke-linecap="round"/></g>`).join("")
    : "";
  const frutos = FRUTOS.map((f) => `<circle cx="${f.x}" cy="${f.y}" r="${f.r}"/>`).join("");
  const tronco = TRONCO.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${fundo ? `<rect width="64" height="64" rx="14" fill="${fundo}"/>` : ""}
  <defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
    <rect width="64" height="64" fill="black"/>
    <g fill="white">${tronco}${folhas}${frutos}</g>
    <g fill="none">${veias}</g>
  </mask></defs>
  <rect width="64" height="64" fill="${cor}" mask="url(#m)"/>
</svg>`;
}
