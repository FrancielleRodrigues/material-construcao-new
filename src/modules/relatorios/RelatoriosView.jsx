import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wallet, ShoppingCart, Receipt, TrendingUp, AlertTriangle, Package, Users, ArrowUpCircle, ArrowDownCircle,
  CalendarClock, Tag, Star, Clock, Download, RefreshCw, Loader2,
} from "lucide-react";
import { cn, hojeISO } from "../../utils/format";
import { FORMAS_PAGAMENTO } from "../../data/constantes";
import { carregarBaseRelatorio } from "../../data/api";
import { KpiCard } from "../../components/ui/KpiCard";
import { periodoDoPreset } from "./calculos";
import { formatar } from "./formatos";
import { RELATORIOS, montarRelatorio, planilhaDoRelatorio } from "./modelos";
import { baixarXlsx } from "./exportar";
import { FiltroPeriodo } from "./FiltroPeriodo";
import { Grafico } from "./Graficos";
import { TabelaRelatorio } from "./TabelaRelatorio";

const ICONES = {
  dinheiro: Wallet, carrinho: ShoppingCart, recibo: Receipt, etiqueta: Tag, grafico: TrendingUp, alerta: AlertTriangle,
  caixa: Package, estrela: Star, pessoas: Users, entrada: ArrowDownCircle, saida: ArrowUpCircle, relogio: CalendarClock, pausa: Clock,
};
const FORMAS = Object.fromEntries(FORMAS_PAGAMENTO.map((f) => [f.id, f.label]));
const MODULOS_ESTOQUE = ["produtos", "estoque", "venda", "compras"];

export function RelatoriosView({ podeVer }) {
  const disponiveis = RELATORIOS.filter((r) => r.modulos.some((m) => podeVer(m)));
  const [relId, setRelId] = useState(disponiveis[0]?.id);
  const [preset, setPreset] = useState("mes");
  const [periodo, setPeriodo] = useState(() => periodoDoPreset("mes", hojeISO()));
  const [exibido, setExibido] = useState(null); // { chave, relId, periodo, dados }: o último relatório pronto
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);
  const cache = useRef(new Map());

  const relatorio = RELATORIOS.find((r) => r.id === relId);
  const periodoValido = Boolean(periodo.inicio && periodo.fim && periodo.inicio <= periodo.fim);

  // Quais bases buscar: as obrigatórias + as opcionais a que a pessoa tem acesso.
  const basesNecessarias = useMemo(() => {
    if (!relatorio) return [];
    const opcionalOk = { emAberto: podeVer("financeiro"), estoque: MODULOS_ESTOQUE.some((m) => podeVer(m)) };
    return [...relatorio.precisa, ...(relatorio.opcionais || []).filter((n) => opcionalOk[n])];
  }, [relatorio]);

  useEffect(() => {
    if (!relatorio || !periodoValido) return undefined;
    let ativo = true;
    setCarregando(true);
    setErro("");
    (async () => {
      try {
        const dados = {};
        await Promise.all(
          basesNecessarias.map(async (nome) => {
            const chave = nome === "emAberto" ? "emAberto" : `${nome}|${periodo.inicio}|${periodo.fim}`;
            if (!cache.current.has(chave)) cache.current.set(chave, await carregarBaseRelatorio(nome, periodo));
            dados[nome] = cache.current.get(chave);
          })
        );
        if (ativo) setExibido({ relId, periodo, dados });
      } catch (e) {
        if (ativo) setErro(e.message || "Não foi possível carregar o relatório.");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [relId, periodo.inicio, periodo.fim, versao, basesNecessarias]);

  const modelo = useMemo(
    () => (exibido ? montarRelatorio(exibido.relId, exibido.dados, exibido.periodo, { formas: FORMAS }) : null),
    [exibido]
  );

  function escolherPreset(id) {
    setPreset(id);
    setPeriodo(periodoDoPreset(id, hojeISO()));
  }
  function digitarPeriodo(novo) {
    setPreset("personalizado");
    setPeriodo(novo);
  }
  function atualizar() {
    cache.current.clear();
    setVersao((v) => v + 1);
  }

  async function exportar() {
    if (!modelo) return;
    setExportando(true);
    setErro("");
    try {
      const plano = planilhaDoRelatorio(modelo, exibido.periodo, hojeISO());
      await baixarXlsx(plano.arquivo, plano.abas);
    } catch (e) {
      setErro(e.message || "Não foi possível gerar o arquivo do Excel.");
    } finally {
      setExportando(false);
    }
  }

  if (disponiveis.length === 0) {
    return <p className="text-sm text-stone-500">Seu perfil não tem acesso aos dados dos relatórios. Peça ao administrador para liberar o acesso aos módulos correspondentes.</p>;
  }

  const defasado = exibido && (exibido.relId !== relId || exibido.periodo.inicio !== periodo.inicio || exibido.periodo.fim !== periodo.fim);

  return (
    <div className="space-y-5">
      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Relatórios">
        {disponiveis.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRelId(r.id)}
            aria-current={relId === r.id ? "page" : undefined}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              relId === r.id ? "bg-white text-teal-800 shadow-sm border border-stone-200" : "text-stone-500 hover:text-stone-800"
            )}
          >
            {r.rotulo}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <FiltroPeriodo preset={preset} periodo={periodo} onPreset={escolherPreset} onPeriodo={digitarPeriodo} />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button" onClick={atualizar} disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={carregando ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            type="button" onClick={exportar} disabled={!modelo || exportando || defasado}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-teal-800 hover:bg-teal-900 text-white disabled:opacity-60 transition-colors"
          >
            {exportando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exportar para Excel
          </button>
        </div>
      </div>

      {erro && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">
          <span>{erro}</span>
          <button type="button" onClick={atualizar} className="text-xs font-medium underline shrink-0">Tentar de novo</button>
        </div>
      )}

      {!modelo && carregando && <p className="text-sm text-stone-500 py-10 text-center">Carregando relatório...</p>}

      {modelo && (
        // Ao trocar período ou relatório, o conteúdo anterior continua na tela, apagado, até o novo chegar.
        <div className="space-y-5" style={{ opacity: carregando || defasado ? 0.55 : 1, transition: "opacity .15s" }} aria-busy={carregando}>
          <p className="text-xs text-stone-500">
            {modelo.titulo} · {formatar(exibido.periodo.inicio, "data")} a {formatar(exibido.periodo.fim, "data")}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem" }}>
            {modelo.indicadores.map((i) => (
              <div key={i.id} data-testid={`kpi-${i.id}`} title={i.nota || undefined}>
                <KpiCard label={i.rotulo} valor={formatar(i.valor, i.tipo)} icon={ICONES[i.icone] || Package} tom={i.tom} />
              </div>
            ))}
          </div>
          {modelo.indicadores.some((i) => i.nota && i.valor === null) && (
            <p className="text-xs text-stone-500 -mt-2">{modelo.indicadores.find((i) => i.nota && i.valor === null).nota}</p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "1rem" }}>
            {modelo.graficos.map((g) => <Grafico key={g.id} grafico={g} />)}
          </div>

          {modelo.tabelas.filter((t) => !t.soExcel).map((t) => <TabelaRelatorio key={t.id} tabela={t} />)}

          <p className="text-xs text-stone-400">
            O arquivo do Excel traz o resumo do período e a base completa, linha a linha, de todas as tabelas deste relatório.
          </p>
        </div>
      )}
    </div>
  );
}
