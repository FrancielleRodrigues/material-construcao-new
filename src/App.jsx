import { supabaseConfigurado, variaveisFaltando } from "./lib/supabase";
import { useSessao } from "./hooks/useSessao";
import { entrar, sair } from "./data/api";
import Sistema from "./Sistema";
import { LoginScreen } from "./modules/auth/LoginScreen";
import { TelaAviso } from "./modules/auth/TelaAviso";

function Autenticado() {
  const { sessao, carregando } = useSessao();
  if (carregando) return <TelaAviso titulo="Carregando..." />;
  if (!sessao) return <LoginScreen onEntrar={entrar} />;
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
