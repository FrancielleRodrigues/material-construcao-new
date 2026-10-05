import { Users, Building2, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { iniciais, formatarEndereco } from "../../utils/format";

export function ClientesView({
  barraBusca,
  clientes,
  clientesFiltrados,
  setConfirmacao,
  setFormCliente,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiCard label="Clientes cadastrados" valor={clientes.length} icon={Users} tom="bg-teal-50 text-teal-700" />
        <KpiCard label="Pessoas jurídicas" valor={clientes.filter((c) => c.tipo === "PJ").length} icon={Building2} tom="bg-slate-50 text-slate-700" />
        <KpiCard label="Pessoas físicas" valor={clientes.filter((c) => c.tipo === "PF").length} icon={Users} tom="bg-amber-50 text-amber-700" />
      </div>
      {barraBusca}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {clientesFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum cliente encontrado"
            subtitle="Cadastre o primeiro cliente para começar a usar o sistema."
            acao="Novo"
            onAcao={() => setFormCliente({})}
          />
        ) : (
          <>
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium">Documento</th>
                  <th className="text-left px-5 py-3 font-medium">Contato</th>
                  <th className="text-left px-5 py-3 font-medium">Endereço</th>
                  <th className="px-5 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {clientesFiltrados.map((c) => (
                  <tr key={c.id} className="group hover:bg-stone-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                          {iniciais(c.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-800 truncate">{c.nome}</p>
                          <p className="text-xs text-stone-400">{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{c.documento}</td>
                    <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-stone-400" />{c.telefone}</span>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-stone-400 shrink-0" />{formatarEndereco(c.endereco)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setFormCliente(c)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmacao({ tipo: "cliente", id: c.id, nome: c.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="divide-y divide-stone-100 md:hidden">
              {clientesFiltrados.map((c) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                      {iniciais(c.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-800 truncate">{c.nome}</p>
                      <p className="text-xs text-stone-400 mb-2">{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"} · {c.documento}</p>
                      <p className="text-xs text-stone-600 flex items-center gap-1.5 mb-1">
                        <Phone size={12} className="text-stone-400 shrink-0" />{c.telefone}
                      </p>
                      <p className="text-xs text-stone-600 flex items-start gap-1.5">
                        <MapPin size={12} className="text-stone-400 shrink-0 mt-0.5" />{formatarEndereco(c.endereco)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => setFormCliente(c)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmacao({ tipo: "cliente", id: c.id, nome: c.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
