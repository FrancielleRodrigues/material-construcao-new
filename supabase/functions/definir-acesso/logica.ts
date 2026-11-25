// Edge Function "definir-acesso": cria (ou redefine) o LOGIN de um usuário já cadastrado em Usuários,
// com uma senha provisória que a pessoa é obrigada a trocar no primeiro acesso.
//
// Por que existe: criar login no Supabase Auth exige a chave de administrador (service_role), que NUNCA
// pode ir para o navegador. Ela só existe aqui, no servidor (o Supabase a injeta na função).
//
// Segurança:
//  * verify_jwt ligado: só chega aqui quem está logado;
//  * confere, com o login de quem chamou (a RLS garante que os dados são dele), se o usuário está ativo e
//    se o papel dele tem "usuarios: editar";
//  * só cria login para e-mail que já está cadastrado em Usuários;
//  * a senha nunca é registrada em log nem devolvida.
// A lógica fica separada de index.ts (que só liga ao Supabase) para poder ser testada fora do Supabase,
// com clientes simulados: supabase/functions/definir-acesso/logica.test.mjs.

// deno-lint-ignore-file no-explicit-any
export interface Ambiente {
  /** cliente com o login de QUEM CHAMOU (respeita a RLS) */
  criarChamador: (cabecalhoAuthorization: string) => any;
  /** cliente com a chave de administrador (service_role): só existe no servidor */
  criarAdmin: () => any;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MIN_SENHA = 12;
const MAX_SENHA = 72; // limite do bcrypt usado pelo Supabase Auth

function traduzir(mensagem: string): string {
  if (/weak|pwned|known to be|easy to guess/i.test(mensagem)) return "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.";
  if (/at least|characters|short/i.test(mensagem)) return `A senha é curta demais (mínimo ${MIN_SENHA} caracteres).`;
  return "Não foi possível definir o acesso agora. Tente de novo em instantes.";
}

export async function tratar(req: Request, ambiente: Ambiente): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);

  const cabecalho = req.headers.get("Authorization") ?? "";
  if (!cabecalho.startsWith("Bearer ")) return json({ erro: "Faça login para continuar." }, 401);

  // 1) quem está chamando (validado pelo Supabase Auth)
  const chamador = ambiente.criarChamador(cabecalho);
  const { data: sessao, error: erroSessao } = await chamador.auth.getUser();
  if (erroSessao || !sessao?.user) return json({ erro: "Sessão inválida. Entre de novo." }, 401);

  // 2) tem permissão de editar Usuários?
  const { data: eu } = await chamador.from("usuarios").select("ativo, papel_id").eq("auth_id", sessao.user.id).maybeSingle();
  if (!eu?.ativo) return json({ erro: "Seu usuário não tem acesso ao sistema." }, 403);
  const { data: papel } = await chamador.from("papeis").select("permissoes").eq("id", eu.papel_id).maybeSingle();
  if (papel?.permissoes?.usuarios !== "editar") return json({ erro: "Você não tem permissão para gerenciar usuários." }, 403);

  // 3) dados recebidos
  let corpo: { email?: unknown; senha?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const email = String(corpo?.email ?? "").trim().toLowerCase();
  const senha = String(corpo?.senha ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ erro: "E-mail inválido." }, 400);
  if (senha.length < MIN_SENHA || senha.length > MAX_SENHA) {
    return json({ erro: `A senha provisória deve ter de ${MIN_SENHA} a ${MAX_SENHA} caracteres.` }, 400);
  }

  const admin = ambiente.criarAdmin();

  // 4) o login só é criado para quem já está cadastrado em Usuários
  const { data: cadastrados, error: erroLista } = await admin.from("usuarios").select("id, email, auth_id");
  if (erroLista) {
    console.error("definir-acesso: falha ao ler usuarios");
    return json({ erro: "Não foi possível consultar os usuários agora." }, 500);
  }
  const alvo = (cadastrados ?? []).find((u: { email: string }) => u.email.trim().toLowerCase() === email);
  if (!alvo) return json({ erro: "Esse e-mail não está cadastrado em Usuários. Cadastre a pessoa primeiro." }, 404);

  // 5) já tem login? (então só redefine a senha)
  let idLogin: string | null = alvo.auth_id ?? null;
  if (!idLogin) {
    const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    idLogin = lista?.users.find((u: { email?: string }) => u.email?.toLowerCase() === email)?.id ?? null;
  }

  const atributos = { password: senha, email_confirm: true, user_metadata: { trocar_senha: true } };
  if (idLogin) {
    const { error } = await admin.auth.admin.updateUserById(idLogin, atributos);
    if (error) {
      console.error("definir-acesso: updateUserById falhou:", error.message);
      return json({ erro: traduzir(error.message) }, 400);
    }
    return json({ ok: true, criado: false });
  }

  const { error } = await admin.auth.admin.createUser({ email, ...atributos });
  if (error) {
    console.error("definir-acesso: createUser falhou:", error.message);
    return json({ erro: traduzir(error.message) }, 400);
  }
  return json({ ok: true, criado: true });
}
