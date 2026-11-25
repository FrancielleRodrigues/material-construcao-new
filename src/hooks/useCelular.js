import { useMediaQuery } from "./useMediaQuery";

// "Celular/tablet" = aparelho de toque (o dedo é o ponteiro principal). Nele o cadastro e o PDV oferecem a
// câmera para ler código de barras. No computador (mouse) fica só o leitor de código de barras USB, que
// funciona como teclado: basta o campo estar em foco. Não depende da largura da janela.
export function useCelular() {
  return useMediaQuery("(pointer: coarse)");
}
