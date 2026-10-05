import { useState } from "react";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn, hojeISO } from "../../utils/format";
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";

export function MovimentacaoForm({ produtos, produtoInicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    produtoId: produtoInicial?.id || (produtos[0]?.id ?? ""),
    tipo: "entrada",
    quantidade: "",
    motivo: "",
    observacao: "",
    data: hojeISO(),
  });
  const [erro, setErro] = useState("");

  const produtoSelecionado = produtos.find((p) => p.id === Number(form.produtoId));
  const motivos = form.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA;

  function salvar() {
    const qtd = parseFloat(form.quantidade);
    if (!form.produtoId) {
      setErro("Selecione um produto.");
      return;
    }
    if (!qtd || qtd <= 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    if (!form.motivo) {
      setErro("Selecione o motivo da movimentação.");
      return;
    }
    if (form.tipo === "saida" && produtoSelecionado && qtd > produtoSelecionado.estoque) {
      setErro(`Estoque insuficiente. Disponível: ${produtoSelecionado.estoque} ${produtoSelecionado.unidade}.`);
      return;
    }
    onSalvar({ ...form, produtoId: Number(form.produtoId), quantidade: qtd });
  }

  return (
    <Painel titulo="Nova movimentação de estoque" subtitulo="Entrada ou saída de produtos" onFechar={onCancelar}>
      <div className="space-y-5">
        <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
          {[
            { id: "entrada", label: "Entrada", icon: ArrowUpCircle },
            { id: "saida", label: "Saída", icon: ArrowDownCircle },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setForm({ ...form, tipo: t.id, motivo: "" })}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                form.tipo === t.id ? "bg-white shadow-sm" : "text-stone-500",
                form.tipo === t.id && t.id === "entrada" && "text-emerald-700",
                form.tipo === t.id && t.id === "saida" && "text-red-700"
              )}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <Campo label="Produto">
          <select
            value={form.produtoId}
            onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          {produtoSelecionado && (
            <p className="text-xs text-stone-400 mt-1.5">
              Estoque atual: {produtoSelecionado.estoque} {produtoSelecionado.unidade}
            </p>
          )}
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label={`Quantidade${produtoSelecionado ? ` (${produtoSelecionado.unidade})` : ""}`}>
            <input
              type="number"
              min="0"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              className={inputClasses}
              placeholder="0"
              autoFocus
            />
          </Campo>
          <Campo label="Data">
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className={inputClasses}
            />
          </Campo>
        </div>

        <Campo label="Motivo">
          <select
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            <option value="">Selecione...</option>
            {motivos.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Ex: nota fiscal, cliente, condição do item..."
          />
        </Campo>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}
