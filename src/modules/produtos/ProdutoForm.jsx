import { useState } from "react";
import { Barcode, Camera, Tag } from "lucide-react";
import { cn } from "../../utils/format";
import { CATEGORIAS } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";
import { BuscaFornecedor } from "../../components/BuscaFornecedor";
import { LeitorCodigo } from "../../components/LeitorCodigo";

export function ProdutoForm({ inicial, fornecedores, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { nome: "", categoria: CATEGORIAS[0].id, unidade: "un", preco: "", estoqueMin: "", codigoBarras: "", sku: "", fornecedorId: "", custo: "" }
  );
  const [erro, setErro] = useState("");
  const [camera, setCamera] = useState(false);

  function salvar() {
    if (!form.nome.trim() || form.preco === "") {
      setErro("Preencha nome e preço.");
      return;
    }
    if (!String(form.codigoBarras || "").trim() && !String(form.sku || "").trim()) {
      setErro("Informe o código de barras ou o SKU (pode ser os dois) para localizar o produto na Venda.");
      return;
    }
    const { estoque: _saldo, ...dados } = form; // o saldo não é editado aqui
    onSalvar({
      ...dados,
      codigoBarras: String(form.codigoBarras || "").trim(),
      sku: String(form.sku || "").trim(),
      preco: parseFloat(form.preco) || 0,
      estoqueMin: parseFloat(form.estoqueMin) || 0,
      custo: form.custo === "" || form.custo === null || form.custo === undefined ? null : parseFloat(form.custo),
      fornecedorId: form.fornecedorId ? Number(form.fornecedorId) : null,
    });
  }

  return (
    <>
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

        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-4">
          <p className="text-xs text-stone-500">
            Informe <strong className="font-semibold text-stone-700">pelo menos um</strong>: código de barras ou SKU. Os dois servem para achar o produto na Venda (PDV).
          </p>
          <Campo label="Código de barras">
            <div className="flex gap-2">
              <div style={{ position: "relative" }} className="flex-1 min-w-0">
                <Barcode size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                <input
                  value={form.codigoBarras}
                  onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                  className={cn(inputClasses, "pl-8")}
                  placeholder="Bipe ou digite o código"
                />
              </div>
              <button
                type="button"
                onClick={() => setCamera(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-stone-300 bg-white text-sm text-stone-600 hover:bg-stone-50"
                aria-label="Ler código de barras com a câmera"
              >
                <Camera size={15} /> <span className="hidden sm:inline">Câmera</span>
              </button>
            </div>
          </Campo>
          <Campo label="SKU (código interno)">
            <div style={{ position: "relative" }}>
                <Tag size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className={cn(inputClasses, "pl-8")}
                  placeholder="Ex: CIM-CP2-50"
                />
            </div>
          </Campo>
        </div>

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

        <Campo label="Preço de custo (R$) — opcional">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.custo ?? ""}
            onChange={(e) => setForm({ ...form, custo: e.target.value })}
            className={inputClasses}
            placeholder="0,00"
          />
          <p className="text-xs text-stone-400 mt-1.5">Quanto você paga pelo produto. Usado só para calcular a margem de lucro nos relatórios.</p>
        </Campo>

        <Campo label="Estoque mínimo (alerta)">
          <input
            type="number"
            step="any"
            min="0"
            value={form.estoqueMin}
            onChange={(e) => setForm({ ...form, estoqueMin: e.target.value })}
            className={inputClasses}
            placeholder="0"
          />
          <p className="text-xs text-stone-400 mt-1.5">A quantidade em estoque é lançada na aba Estoque (entrada, saída ou ajuste).</p>
        </Campo>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
    {camera && (
      <LeitorCodigo
        titulo="Ler código de barras"
        onFechar={() => setCamera(false)}
        onLer={(codigo) => setForm((f) => ({ ...f, codigoBarras: codigo }))}
      />
    )}
    </>
  );
}
