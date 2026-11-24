import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// O link do e-mail de redefinição abre o site com "#access_token=...&type=recovery"
// (ou "#error_code=otp_expired..." se o link venceu). Lemos isso uma vez, no primeiro render,
// antes de o Supabase limpar o endereço.
function lerLinkDoEmail() {
  if (typeof window === "undefined") return { recuperando: false, erroLink: "" };
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const venceu = h.get("error_code") === "otp_expired" || h.get("error") === "access_denied";
  return {
    recuperando: h.get("type") === "recovery",
    erroLink: venceu ? "Esse link venceu ou já foi usado. Peça um novo em \"Esqueci minha senha\"." : "",
  };
}

// Sessão do Supabase Auth. `carregando` é true até sabermos se há alguém logado.
// `recuperando` fica true quando a pessoa chegou pelo link de "Esqueci minha senha".
export function useSessao() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [inicial] = useState(lerLinkDoEmail);
  const [recuperando, setRecuperando] = useState(inicial.recuperando);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, nova) => {
      if (evento === "PASSWORD_RECOVERY") setRecuperando(true);
      if (evento === "SIGNED_OUT") setRecuperando(false);
      setSessao(nova);
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { sessao, carregando, recuperando, concluirRecuperacao: () => setRecuperando(false), erroLink: inicial.erroLink };
}
