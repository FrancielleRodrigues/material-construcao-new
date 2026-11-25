import { useState } from "react";
import { CheckCircle2, Copy, Check, ShieldAlert } from "lucide-react";
import { Painel } from "../../components/ui/Painel";

// Mostra uma única vez o e-mail e a senha provisória para o administrador passar à pessoa.
export function AcessoCriadoModal({ credenciais, onFechar }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`E-mail: ${credenciais.email}\nSenha provisória: ${credenciais.senha}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* a senha está visível na tela */
    }
  }

  return (
    <Painel titulo={credenciais.criado ? "Acesso criado" : "Senha redefinida"} subtitulo={credenciais.nome} onFechar={onFechar}>
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {credenciais.criado ? "O login foi criado e já está ligado ao cadastro." : "A senha foi trocada."}
        </p>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2 text-sm">
          <p><span className="text-stone-500">E-mail: </span><strong className="text-stone-800 break-all" data-testid="acesso-email">{credenciais.email}</strong></p>
          <p><span className="text-stone-500">Senha provisória: </span><strong className="font-mono text-stone-900" data-testid="acesso-senha">{credenciais.senha}</strong></p>
        </div>
        <button
          onClick={copiar}
          className="w-full flex items-center justify-center gap-1.5 border border-teal-800 text-teal-800 hover:bg-teal-50 rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar e-mail e senha"}
        </button>
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
          <ShieldAlert size={14} className="shrink-0 mt-0.5" />
          <span>Passe estes dados à pessoa por um canal seguro (pessoalmente ou mensagem privada). No primeiro acesso ela será obrigada a criar uma senha própria. <strong>Esta senha não será mostrada de novo.</strong></span>
        </p>
        <button onClick={onFechar} className="w-full bg-teal-800 hover:bg-teal-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
          Fechar
        </button>
      </div>
    </Painel>
  );
}
