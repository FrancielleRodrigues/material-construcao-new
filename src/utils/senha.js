// Senha provisória legível para ditar/copiar: 12 caracteres sem os que se confundem (0/O, 1/l/I),
// no formato xxxx-xxxx-xxxx (14 com os hifens, acima do mínimo de 12 do sistema).
// Usa o gerador aleatório seguro do navegador (nunca Math.random).
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export const MINIMO_SENHA = 12;

export function gerarSenhaProvisoria(aleatorio = (n) => crypto.getRandomValues(new Uint32Array(n))) {
  const sorteio = aleatorio(12);
  const letras = Array.from(sorteio, (n) => ALFABETO[n % ALFABETO.length]);
  return [letras.slice(0, 4), letras.slice(4, 8), letras.slice(8, 12)].map((g) => g.join("")).join("-");
}
