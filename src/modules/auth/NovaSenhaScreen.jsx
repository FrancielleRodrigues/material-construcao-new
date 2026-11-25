import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Campo } from "../../components/ui/Campo";
import { InputSenha } from "../../components/InputSenha";
import { TelaAviso } from "./TelaAviso";

const MINIMO = 12;

export function NovaSenhaScreen({
  onSalvar,
  onCancelar,
  titulo = "Defina uma nova senha",
  subtitulo = `Escolha uma senha com pelo menos ${MINIMO} caracteres. Evite datas, nomes e senhas usadas em outros sites.`,
  rotuloBotao = "Salvar nova senha",
}) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (senha.length < MINIMO) return setErro(`Use pelo menos ${MINIMO} caracteres.`);
    if (senha !== confirmacao) return setErro("As duas senhas não são iguais.");
    setEnviando(true);
    setErro("");
    try {
      await onSalvar(senha);
    } catch (err) {
      setErro(err.message || "Não foi possível salvar a nova senha.");
      setEnviando(false);
    }
  }

  return (
    <TelaAviso titulo={titulo} subtitulo={subtitulo}>
      <form onSubmit={enviar} className="space-y-4">
        <Campo label="Nova senha">
          <InputSenha
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoFocus
          />
        </Campo>
        <Campo label="Repita a nova senha">
          <InputSenha
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </Campo>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-60 transition-colors"
        >
          {enviando && <Loader2 size={15} className="animate-spin" />}
          {rotuloBotao}
        </button>
        <button type="button" onClick={onCancelar} className="w-full text-sm text-stone-500 hover:text-stone-700">
          Cancelar e sair
        </button>
      </form>
    </TelaAviso>
  );
}
