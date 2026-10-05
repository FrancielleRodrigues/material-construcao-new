import { useState } from "react";
import { Barcode } from "lucide-react";
import { cn } from "../../utils/format";
import { CATEGORIAS } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";
import { BuscaFornecedor } from "../../components/BuscaFornecedor";

export function ProdutoForm({ inicial, fornecedores, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { nome: "", categoria: CATEGORIAS[0].id, unidade: "un", preco: "", estoque: "", estoqueMin: "", codigoBarras: "", fornecedorId: "" }
  );
  const [erro, setErro] = useState("");

  function salvar() {
    if (!form.nome.trim() || form.preco === "") {
      setErro("Preencha nome e preço.");
      return;
    }
    onSalvar({
      ...form,
      preco: parseFloat(form.preco) || 0,
      estoque: parseInt(form.estoque) || 0,
      estoqueMin: parseInt(form.estoqueMin) || 0,
      fornecedorId: form.fornecedorId ? Number(form.fornecedorId) : null,
    });
  }

  return (
    <Painel titulo={inicial ? "Editar produto" : "Novo produto"} onFechar={onCancelar}>
      <div className="space-y-5">
        <Campo label="Nome do produto">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={inputClasses}
            placeholder="Ex: Cimento CP-II 50kg"
          />
        </Campo>

        <Campo label="Código de barras (opcional)">
          <div style={{ position: "relative" }}>
            <Barcode size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
            <input
              value={form.codigoBarras}
              onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
              className={cn(inputClasses, "pl-8")}
              placeholder="Bipe ou digite o código"
            />
          </div>
          <p className="text-xs text-stone-400 mt-1.5">Usado para localizar o produto rapidamente na Venda (PDV).</p>
        </Campo>

        <Campo label="Categoria">
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Fornecedor (opcional)">
          <BuscaFornecedor
            fornecedores={fornecedores}
            value={form.fornecedorId}
            onChange={(id) => setForm({ ...form, fornecedorId: id })}
          />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Unidade">
            <input
              value={form.unidade}
              onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              className={inputClasses}
              placeholder="sc, un, m²..."
            />
          </Campo>
          <Campo label="Preço (R$)">
            <input
              type="number"
              step="0.01"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              className={inputClasses}
              placeholder="0,00"
            />
          </Campo>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Estoque atual">
            <input
              type="number"
              value={form.estoque}
              onChange={(e) => setForm({ ...form, estoque: e.target.value })}
              className={inputClasses}
              placeholder="0"
            />
          </Campo>
          <Campo label="Estoque mínimo">
            <input
              type="number"
              value={form.estoqueMin}
              onChange={(e) => setForm({ ...form, estoqueMin: e.target.value })}
              className={inputClasses}
              placeholder="0"
            />
          </Campo>
        </div>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}
