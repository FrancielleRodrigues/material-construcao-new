import { useState } from "react";
import { Loader2 } from "lucide-react";
import { inputClasses } from "../../components/ui/inputClasses";
import { Campo } from "../../components/ui/Campo";
import { TelaAviso } from "./TelaAviso";

export function LoginScreen({ onEntrar }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      await onEntrar(email, senha);
    } catch (err) {
      setErro(err.message || "Não foi possível entrar.");
      setEnviando(false);
    }
  }

  return (
    <TelaAviso titulo="Entrar" subtitulo="Use o e-mail e a senha cadastrados pelo administrador.">
      <form onSubmit={enviar} className="space-y-4">
        <Campo label="E-mail">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
            placeholder="voce@empresa.com.br"
            autoFocus
          />
        </Campo>
        <Campo label="Senha">
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={inputClasses}
          />
        </Campo>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-60 transition-colors"
        >
          {enviando && <Loader2 size={15} className="animate-spin" />}
          Entrar
        </button>
      </form>
    </TelaAviso>
  );
}
