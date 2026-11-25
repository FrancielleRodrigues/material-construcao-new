import { useState } from "react";
import { Painel } from "../../components/ui/Painel";
import { CampoSenhaProvisoria } from "../../components/CampoSenhaProvisoria";
import { gerarSenhaProvisoria, MINIMO_SENHA } from "../../utils/senha";

// Cria o login de quem ainda não tem, ou redefine a senha de quem esqueceu: sempre com senha
// provisória, que a pessoa troca no primeiro acesso.
export function SenhaUsuarioModal({ usuario, onSalvar, onCancelar }) {
  const [senha, setSenha] = useState(() => gerarSenhaProvisoria());
  const [erro, setErro] = useState("");

  function salvar() {
    if (senha.length < MINIMO_SENHA) return setErro(`Use pelo menos ${MINIMO_SENHA} caracteres.`);
    setErro("");
    onSalvar(senha);
  }

  return (
    <Painel titulo="Definir senha provisória" subtitulo={`${usuario.nome} · ${usuario.email}`} onFechar={onCancelar}>
      <div className="space-y-5">
        <p className="text-sm text-stone-600">
          Cria o login desta pessoa (se ainda não existir) ou troca a senha dela. No próximo acesso ela será obrigada a escolher uma senha só dela.
        </p>
        <CampoSenhaProvisoria valor={senha} onChange={setSenha} />
        {erro && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={salvar} className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            Definir senha
          </button>
          <button onClick={onCancelar} className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </Painel>
  );
}
