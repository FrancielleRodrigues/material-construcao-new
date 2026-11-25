import { useEffect, useState } from "react";
import { ArvoreCedro } from "../../components/ArvoreCedro";

// Tela de carregamento do Cedro: a árvore brota, uma barrinha corre e, se demorar, explica por quê.
export function TelaCarregando({ mensagem = "Carregando seus dados" }) {
  const [demora, setDemora] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDemora(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div role="status" aria-live="polite" className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-28 h-28 rounded-[2rem] bg-teal-800 text-teal-100 flex items-center justify-center shadow-lg shadow-teal-900/10">
        <ArvoreCedro size={84} animada />
      </div>
      <p className="mt-6 text-2xl font-semibold tracking-tight text-stone-800">Cedro</p>
      <p className="mt-1.5 text-sm text-stone-500" data-testid="mensagem-carregando">{mensagem}…</p>
      <div className="mt-5 h-1 w-44 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
        <div className="cedro-barra h-full w-1/3 rounded-full bg-teal-700" />
      </div>
      <p className={`mt-5 max-w-xs text-xs leading-relaxed text-stone-400 transition-opacity duration-500 ${demora ? "opacity-100" : "opacity-0"}`}>
        Está demorando um pouco mais que o normal. Se o sistema ficou parado por vários dias, o banco de dados leva alguns segundos para acordar.
      </p>
    </div>
  );
}
