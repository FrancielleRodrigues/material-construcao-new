import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Sessão do Supabase Auth. `carregando` é true até sabermos se há alguém logado.
export function useSessao() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova));
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { sessao, carregando };
}
