import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, hojeISO } from "../../utils/format";
import { FORMAS_PAGAMENTO } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";
import { BuscaFornecedor } from "../../components/BuscaFornecedor";

export function LancamentoForm({ inicial, clientes, fornecedores, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || {
      tipo: "receita", descricao: "", valor: "", vencimento: hojeISO(),
      clienteId: "", fornecedorId: "", contraparte: "", formaPagamento: "pix", observacao: "", pago: false, dataPagamento: null,
    }
  );
  const [erro, setErro] = useState("");

  function salvar() {
    if (!form.descricao.trim()) {
      setErro("Informe uma descrição.");
      return;
    }
    const valor = parseFloat(form.valor);
    if (!valor || valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (!form.vencimento) {
      setErro("Informe a data de vencimento.");
      return;
    }
    onSalvar({
      ...form,
      valor,
      clienteId: form.tipo === "receita" && form.clienteId ? Number(form.clienteId) : null,
      fornecedorId: form.tipo === "despesa" && form.fornecedorId ? Number(form.fornecedorId) : null,
      contraparte: form.tipo === "despesa" ? form.contraparte : "",
    });
  }

  return (
    <Painel
      titulo={inicial ? "Editar lançamento" : "Novo lançamento"}
      subtitulo={form.tipo === "receita" ? "Conta a receber" : "Conta a pagar"}
      onFechar={onCancelar}
    >
      <div className="space-y-5">
        <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
          {[
            { id: "receita", label: "Receita (a receber)", icon: TrendingUp },
            { id: "despesa", label: "Despesa (a pagar)", icon: TrendingDown },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setForm({ ...form, tipo: t.id })}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                form.tipo === t.id ? "bg-white shadow-sm" : "text-stone-500",
                form.tipo === t.id && t.id === "receita" && "text-teal-800",
                form.tipo === t.id && t.id === "despesa" && "text-stone-800"
              )}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <Campo label="Descrição">
          <input
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className={inputClasses}
            placeholder={form.tipo === "receita" ? "Ex: Venda de materiais - obra X" : "Ex: Compra de cimento, aluguel..."}
            autoFocus
          />
        </Campo>

        {form.tipo === "receita" ? (
          <Campo label="Cliente (opcional)">
            <select
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              className={cn(inputClasses, "bg-white")}
            >
              <option value="">Nenhum</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Campo>
        ) : (
          <>
            <Campo label="Fornecedor">
              <BuscaFornecedor
                fornecedores={fornecedores}
                value={form.fornecedorId}
                onChange={(fid) => {
                  const forn = fornecedores.find((f) => f.id === Number(fid));
                  setForm({ ...form, fornecedorId: fid, contraparte: forn ? forn.nome : form.contraparte });
                }}
                placeholder="Buscar fornecedor ou digitar manualmente..."
              />
            </Campo>
            {!form.fornecedorId && (
              <Campo label="Nome do fornecedor / beneficiário">
                <input
                  value={form.contraparte}
                  onChange={(e) => setForm({ ...form, contraparte: e.target.value })}
                  className={inputClasses}
                  placeholder="Ex: Votoran Distribuidora"
                />
              </Campo>
            )}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className={inputClasses}
              placeholder="0,00"
            />
          </Campo>
          <Campo label="Vencimento">
            <input
              type="date"
              value={form.vencimento}
              onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
              className={inputClasses}
            />
          </Campo>
        </div>

        <Campo label="Forma de pagamento">
          <select
            value={form.formaPagamento}
            onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Ex: número da NF, parcela..."
          />
        </Campo>

        <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.pago}
            onChange={(e) => setForm({ ...form, pago: e.target.checked, dataPagamento: e.target.checked ? hojeISO() : null })}
            className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
          />
          Já {form.tipo === "receita" ? "recebido" : "pago"}
        </label>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}
