// Gera public/favicon.svg a partir do desenho da árvore (src/components/arvoreCedroDados.js).
// Rodar depois de mexer no desenho:  node scripts/gerar-favicon.mjs
import { writeFileSync } from "node:fs";
import { svgDaArvore } from "../src/components/arvoreCedroDados.js";

writeFileSync(new URL("../public/favicon.svg", import.meta.url), svgDaArvore({ cor: "#99f6e4", fundo: "#115e59" }) + "\n");
console.log("public/favicon.svg atualizado");
