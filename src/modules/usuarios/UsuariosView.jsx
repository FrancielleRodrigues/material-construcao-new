import { Lock, UserCog, Plus, Pencil, Trash2, ScrollText } from "lucide-react";
import { cn, iniciais } from "../../utils/format";
import { MODULOS_PERMISSAO } from "../../data/constantes";

const ROTULO_TABELA = {
  produtos: "Produto", clientes: "Cliente", fornecedores: "Fornecedor", lancamentos: "Lançamento",
  entregas: "Entrega", pedidos_compra: "Pedido de compra", usuarios: "Usuário", papeis: "Papel",
  empresa_fiscal: "Configuração fiscal",
};
const ROTULO_OPERACAO = { INSERT: "Criou", UPDATE: "Alterou", DELETE: "Excluiu" };

function textoValor(v) {
  if (v === null || v === undefined || v === "") return "vazio";
  if (typeof v === "object") return "…";
  return String(v);
}

// Resumo de uma linha: o que mudou (UPDATE) ou qual registro (INSERT/DELETE).
function resumoAuditoria(a) {
  if (a.operacao === "UPDATE") {
    const campos = Object.keys(a.depois || {});
    const itens = campos.slice(0, 3).map((c) => `${c.replace(/_/g, " ")}: ${textoValor(a.antes?.[c])} → ${textoValor(a.depois[c])}`);
    return itens.join(" · ") + (campos.length > 3 ? ` · +${campos.length - 3}` : "");
  }
  const r = (a.operacao === "INSERT" ? a.depois : a.antes) || {};
  return r.nome || r.descricao || (r.numero ? `nº ${r.numero}` : "") || "";
}

export function UsuariosView({
  barraBusca,
  auditoria,
  podeAuditar,
  papeis,
  papeisPorId,
  setConfirmacao,
  setFormPapel,
  setFormUsuario,
  setSubUsuarios,
  subUsuarios,
  usuarioLogadoId,
  usuarios,
}) {
  return (
    <>
      {barraBusca}
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5">
          <Lock size={16} className="text-stone-400 shrink-0 mt-0.5" />
          <p className="text-sm text-stone-600">
            Isso controla o que cada papel <strong>vê e pode editar</strong>. As permissões são conferidas no banco de dados a cada ação, então esconder um menu não é a única barreira. Use com cuidado a permissão de editar Usuários: quem a tem pode dar acesso a si mesmo.
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-md">
          {[
            { id: "usuarios", label: "Usuários", icon: UserCog },
            { id: "papeis", label: "Papéis", icon: Lock },
            ...(podeAuditar ? [{ id: "auditoria", label: "Auditoria", icon: ScrollText }] : []),
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSubUsuarios(s.id)}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                subUsuarios === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
              )}
            >
              <s.icon size={14} /> {s.label}
            </button>
          ))}
        </div>

        {subUsuarios === "usuarios" && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex justify-end p-3 border-b border-stone-100">
              <button
                onClick={() => setFormUsuario({})}
                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus size={14} /> Novo usuário
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {usuarios.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                      {iniciais(u.nome)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-stone-800 truncate">{u.nome}</p>
                        {!u.ativo && (
                          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Bloqueado</span>
                        )}
                        {u.id === usuarioLogadoId && (
                          <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Sessão atual</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 truncate">{u.email} · {papeisPorId[u.papelId]?.nome}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setFormUsuario(u)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                      <Pencil size={14} />
                    </button>
                    {u.id !== usuarioLogadoId && (
                      <button onClick={() => setConfirmacao({ tipo: "usuario", id: u.id, nome: u.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subUsuarios === "auditoria" && podeAuditar && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <p className="text-xs text-stone-500 px-4 py-3 border-b border-stone-100">
              Últimas 300 alterações em cadastros, financeiro, entregas, compras e usuários. O estoque tem histórico próprio em Estoque → Histórico.
            </p>
            {auditoria.length === 0 ? (
              <p className="text-sm text-stone-400 p-6 text-center">Nenhuma alteração registrada ainda.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {auditoria.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-stone-800 min-w-0">
                        <strong>{a.quem}</strong> {ROTULO_OPERACAO[a.operacao].toLowerCase()}{" "}
                        {(ROTULO_TABELA[a.tabela] || a.tabela).toLowerCase()}
                        {a.registroId && a.tabela !== "empresa_fiscal" ? ` nº ${a.registroId}` : ""}
                      </p>
                      <time className="text-xs text-stone-400 shrink-0">
                        {new Date(a.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </time>
                    </div>
                    {resumoAuditoria(a) && <p className="text-xs text-stone-500 mt-0.5 break-words">{resumoAuditoria(a)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {subUsuarios === "papeis" && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex justify-end p-3 border-b border-stone-100">
              <button
                onClick={() => setFormPapel({})}
                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus size={14} /> Novo papel
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {papeis.map((p) => {
                const emUso = usuarios.some((u) => u.papelId === p.id);
                const nivelEditar = MODULOS_PERMISSAO.filter((m) => p.permissoes[m.id] === "editar").length;
                const nivelVer = MODULOS_PERMISSAO.filter((m) => p.permissoes[m.id] === "visualizar").length;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-stone-800">{p.nome}</p>
                        {p.fixo && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Acesso total</span>}
                      </div>
                      <p className="text-xs text-stone-400">
                        {nivelEditar} {nivelEditar === 1 ? "módulo" : "módulos"} com edição · {nivelVer} só visualização
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!p.fixo && (
                        <button onClick={() => setFormPapel(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                          <Pencil size={14} />
                        </button>
                      )}
                      {!p.fixo && !emUso && (
                        <button onClick={() => setConfirmacao({ tipo: "papel", id: p.id, nome: p.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
