import { useState } from "react";
import { Loader2 } from "lucide-react";
import { inputClasses } from "../../components/ui/inputClasses";
import { Campo } from "../../components/ui/Campo";
import { TelaAviso } from "./TelaAviso";

const BOTAO = "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-60 transition-colors";

export function LoginScreen({ onEntrar, onRecuperar, avisoInicial = "" }) {
  const [modo, setModo] = useState("entrar"); // entrar | recuperar | enviado
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(avisoInicial);
  const [enviando, setEnviando] = useState(false);

  function trocarModo(novo) {
    setModo(novo);
    setErro("");
    setEnviando(false);
  }

  async function enviar(e) {
    e.preventDefault();
    if (!email.trim() || (modo === "entrar" && !senha)) {
      setErro(modo === "entrar" ? "Informe e-mail e senha." : "Informe o seu e-mail.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      if (modo === "entrar") {
        await onEntrar(email, senha);
      } else {
        await onRecuperar(email);
        trocarModo("enviado");
      }
    } catch (err) {
      setErro(err.message || "Não foi possível concluir.");
      setEnviando(false);
    }
  }

  if (modo === "enviado") {
    return (
      <TelaAviso titulo="Confira o seu e-mail" subtitulo="Se este e-mail estiver cadastrado, enviamos um link para criar uma nova senha.">
        <p className="text-sm text-stone-600 mb-4">
          O link vale por pouco tempo. Se não chegar em alguns minutos, olhe a caixa de spam ou peça de novo.
        </p>
        <button type="button" onClick={() => trocarModo("entrar")} className={BOTAO}>
          Voltar ao login
        </button>
      </TelaAviso>
    );
  }

  const recuperando = modo === "recuperar";
  return (
    <TelaAviso
      titulo={recuperando ? "Esqueci minha senha" : "Entrar"}
      subtitulo={recuperando ? "Informe o e-mail do seu cadastro e enviaremos um link para criar uma nova senha." : "Use o e-mail e a senha cadastrados pelo administrador."}
    >
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
        {!recuperando && (
          <Campo label="Senha">
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputClasses}
            />
          </Campo>
        )}
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={enviando} className={BOTAO}>
          {enviando && <Loader2 size={15} className="animate-spin" />}
          {recuperando ? "Enviar link" : "Entrar"}
        </button>
        <button
          type="button"
          onClick={() => trocarModo(recuperando ? "entrar" : "recuperar")}
          className="w-full text-sm text-teal-700 hover:text-teal-900"
        >
          {recuperando ? "Voltar ao login" : "Esqueci minha senha"}
        </button>
      </form>
    </TelaAviso>
  );
}
