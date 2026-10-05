import { FileClock, AlertTriangle, PackageCheck, Truck, MapPin, CalendarDays, UserRound, Navigation, Pencil, PackageX } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { STATUS_ENTREGA } from "../../data/constantes";
import { cn, hojeISO, formatarData } from "../../utils/format";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusEntregaChip } from "./entregasUi";

export function EntregasView({
  barraBusca,
  avancarStatusEntrega,
  cancelarEntrega,
  clientesPorId,
  entregasAtrasadas,
  entregasEmRota,
  entregasFiltradas,
  entregasHoje,
  entregasPendentes,
  filtroEntrega,
  setFiltroEntrega,
  setFormEntrega,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiCard label="Pendentes" valor={entregasPendentes} icon={FileClock} tom="bg-amber-50 text-amber-700" />
        <KpiCard label="Em rota" valor={entregasEmRota} icon={Navigation} tom="bg-sky-50 text-sky-700" />
        <KpiCard label="Atrasadas" valor={entregasAtrasadas} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
        <KpiCard label="Entregues hoje" valor={entregasHoje} icon={PackageCheck} tom="bg-emerald-50 text-emerald-700" />
      </div>
      <div className="flex gap-2 p-1 bg-stone-100 rounded-lg overflow-x-auto mb-4">
        {[{ id: "todas", label: "Todas" }, ...STATUS_ENTREGA].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltroEntrega(f.id)}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              filtroEntrega === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {barraBusca}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {entregasFiltradas.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhuma entrega encontrada"
              subtitle="Cadastre uma entrega vinculada a uma venda ou avulsa."
              acao="Nova"
              onAcao={() => setFormEntrega({})}
            />
          ) : (
            <div className="divide-y divide-stone-100">
              {entregasFiltradas.map((e) => {
                const cliente = e.clienteId ? clientesPorId[e.clienteId] : null;
                const atrasada = (e.status === "pendente" || e.status === "em_rota") && e.dataPrevista < hojeISO();
                return (
                  <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-stone-800">{cliente ? cliente.nome : "Cliente não identificado"}</p>
                        <StatusEntregaChip status={e.status} />
                        {atrasada && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={11} /> Atrasada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 flex items-start gap-1.5 mb-0.5">
                        <MapPin size={12} className="text-stone-400 shrink-0 mt-0.5" /> {e.endereco || "Endereço não informado"}
                      </p>
                      <p className="text-xs text-stone-400">{e.itensDescricao}</p>
                      <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {formatarData(e.dataPrevista)}</span>
                        {e.motorista && <span className="inline-flex items-center gap-1"><UserRound size={11} /> {e.motorista}</span>}
                        {e.veiculo && <span className="inline-flex items-center gap-1"><Truck size={11} /> {e.veiculo}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(e.status === "pendente" || e.status === "em_rota") && (
                        <button
                          onClick={() => avancarStatusEntrega(e)}
                          className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                        >
                          {e.status === "pendente" ? <><Navigation size={13} /> Sair para entrega</> : <><PackageCheck size={13} /> Confirmar entrega</>}
                        </button>
                      )}
                      <button onClick={() => setFormEntrega(e)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                        <Pencil size={14} />
                      </button>
                      {e.status !== "cancelada" && e.status !== "entregue" && (
                        <button onClick={() => cancelarEntrega(e.id)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                          <PackageX size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
