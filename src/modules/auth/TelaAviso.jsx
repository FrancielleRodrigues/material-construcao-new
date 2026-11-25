import { ArvoreCedro } from "../../components/ArvoreCedro";

// Tela cheia simples, usada para login, "sem acesso", erros de carga etc.
export function TelaAviso({ titulo, subtitulo, children }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-800 text-teal-100 flex items-center justify-center">
            <ArvoreCedro size={44} />
          </div>
          <span className="font-semibold text-stone-800 text-2xl tracking-tight">Cedro</span>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <h1 className="text-base font-semibold text-stone-800">{titulo}</h1>
          {subtitulo && <p className="text-sm text-stone-500 mt-1">{subtitulo}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
