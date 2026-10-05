import { supabaseConfigurado } from "./lib/supabase";
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
  return <Sistema key={sessao.user.id} email={sessao.user.email} onSair={sair} />;
}

export default function App() {
  if (!supabaseConfigurado) {
    return (
      <TelaAviso titulo="Falta configurar o Supabase" subtitulo="O sistema precisa do endereço e da chave do seu projeto.">
        <ol className="list-decimal pl-5 text-sm text-stone-600 space-y-1.5">
          <li>Copie <code className="text-xs bg-stone-100 px-1 rounded">.env.example</code> para <code className="text-xs bg-stone-100 px-1 rounded">.env.local</code>.</li>
          <li>Preencha <code className="text-xs bg-stone-100 px-1 rounded">VITE_SUPABASE_URL</code> e <code className="text-xs bg-stone-100 px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code>.</li>
          <li>Reinicie o <code className="text-xs bg-stone-100 px-1 rounded">npm run dev</code>.</li>
        </ol>
      </TelaAviso>
    );
  }
  return <Autenticado />;
}
