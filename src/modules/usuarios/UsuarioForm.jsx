import { useState } from "react";
import { Mail } from "lucide-react";
import { cn } from "../../utils/format";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";

export function UsuarioForm({ inicial, papeis, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { nome: "", email: "", papelId: papeis.find((p) => !p.fixo)?.id || papeis[0]?.id || "", ativo: true }
  );
  const [erro, setErro] = useState("");

  function salvar() {
    if (!form.nome.trim() || !form.email.trim()) {
      setErro("Preencha nome e e-mail.");
      return;
    }
    if (!form.papelId) {
      setErro("Selecione um papel.");
      return;
    }
    onSalvar(form);
  }

  return (
    <Painel titulo={inicial ? "Editar usuário" : "Novo usuário"} onFechar={onCancelar}>
      <div className="space-y-5">
        <Campo label="Nome">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={inputClasses}
            placeholder="Nome completo"
            autoFocus
          />
        </Campo>

        <Campo label="E-mail">
          <div style={{ position: "relative" }}>
            <Mail size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={cn(inputClasses, "pl-8")}
              placeholder="usuario@empresa.com"
            />
          </div>
        </Campo>

        <Campo label="Papel">
          <select
            value={form.papelId}
            onChange={(e) => setForm({ ...form, papelId: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {papeis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <p className="text-xs text-stone-400 mt-1.5">Define o que esse usuário pode ver e editar no sistema.</p>
        </Campo>

        <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
          />
          Usuário ativo (desmarque para bloquear o acesso sem excluir o cadastro)
        </label>

        {!inicial && (
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
            Este cadastro define o papel e o acesso. A senha de login é criada à parte, no painel do Supabase
            (Authentication → Users → Add user), usando o mesmo e-mail.
          </p>
        )}

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}
