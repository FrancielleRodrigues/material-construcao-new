import { supabaseConfigurado, variaveisFaltando } from "./lib/supabase";
import { useSessao } from "./hooks/useSessao";
import { entrar, sair, enviarRecuperacao, definirNovaSenha } from "./data/api";
import Sistema from "./Sistema";
import { LoginScreen } from "./modules/auth/LoginScreen";
import { NovaSenhaScreen } from "./modules/auth/NovaSenhaScreen";
import { TelaAviso } from "./modules/auth/TelaAviso";
import { TelaCarregando } from "./modules/auth/TelaCarregando";

function Autenticado() {
  const { sessao, carregando, recuperando, concluirRecuperacao, erroLink } = useSessao();
  if (carregando) return <TelaCarregando mensagem="Verificando seu acesso" />;
  // Chegou pelo link do e-mail: primeiro define a nova senha, depois entra no sistema.
  if (sessao && recuperando) {
    return (
      <NovaSenhaScreen
        onSalvar={async (senha) => {
          await definirNovaSenha(senha);
          concluirRecuperacao();
        }}
        onCancelar={sair}
      />
    );
  }
  if (!sessao) return <LoginScreen onEntrar={entrar} onRecuperar={enviarRecuperacao} avisoInicial={erroLink} />;
  // key: trocar de usuário descarta todo o estado do usuário anterior.
  return <Sistema key={sessao.user.id} userId={sessao.user.id} email={sessao.user.email} onSair={sair} />;
}

export default function App() {
  if (!supabaseConfigurado) {
    const code = "text-xs bg-stone-100 px-1 rounded";
    return (
      <TelaAviso titulo="Falta configurar o Supabase" subtitulo="O sistema precisa do endereço e da chave do seu projeto.">
        <p className="text-sm text-stone-700 mb-3">
          Variáveis que não chegaram ao site:{" "}
          {variaveisFaltando.map((v) => (
            <code key={v} className={code + " mr-1"}>{v}</code>
          ))}
        </p>
        {import.meta.env.PROD ? (
          <ol className="list-decimal pl-5 text-sm text-stone-600 space-y-1.5">
            <li>Na hospedagem (Cloudflare), crie essas variáveis como variáveis de <strong>build</strong>, com o nome exatamente igual.</li>
            <li>Rode o build de novo (as de execução não servem: o site as lê ao ser construído).</li>
          </ol>
        ) : (
          <ol className="list-decimal pl-5 text-sm text-stone-600 space-y-1.5">
            <li>Copie <code className={code}>.env.example</code> para <code className={code}>.env.local</code>.</li>
            <li>Preencha as variáveis acima.</li>
            <li>Reinicie o <code className={code}>npm run dev</code>.</li>
          </ol>
        )}
      </TelaAviso>
    );
  }
  return <Autenticado />;
}
