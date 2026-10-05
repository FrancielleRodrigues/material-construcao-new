import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "../../utils/format";
import { buscarCep } from "../../utils/cep";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { CATEGORIAS, ETAPAS_FORNECEDOR } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { Stepper } from "../../components/ui/Stepper";
import { inputClasses } from "../../components/ui/inputClasses";

export function FornecedorForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || {
      tipo: "PJ", nome: "", documento: "", telefone: "", email: "",
      categoria: CATEGORIAS[0].id, condicaoPagamento: "", observacao: "",
      endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
    }
  );
  const [erro, setErro] = useState("");
  const [statusCep, setStatusCep] = useState("idle");
  const [etapa, setEtapa] = useState(0);
  const isSm = useMediaQuery("(min-width: 640px)");

  function setEndereco(campo, valor) {
    setForm((f) => ({ ...f, endereco: { ...f.endereco, [campo]: valor } }));
  }

  async function onCepChange(valor) {
    const mascarado = valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    setEndereco("cep", mascarado);
    if (mascarado.replace(/\D/g, "").length === 8) {
      setStatusCep("buscando");
      const resultado = await buscarCep(mascarado);
      if (resultado) {
        setForm((f) => ({ ...f, endereco: { ...f.endereco, ...resultado, cep: mascarado } }));
        setStatusCep("encontrado");
      } else {
        setStatusCep("nao_encontrado");
      }
    } else {
      setStatusCep("idle");
    }
  }

  function validarEtapaAtual() {
    if (etapa === 0 && (!form.nome.trim() || !form.documento.trim())) {
      setErro("Preencha nome/razão social e CPF/CNPJ.");
      return false;
    }
    setErro("");
    return true;
  }

  function avancar() {
    if (!validarEtapaAtual()) return;
    setEtapa((e) => Math.min(e + 1, ETAPAS_FORNECEDOR.length - 1));
  }

  function voltar() {
    setErro("");
    setEtapa((e) => Math.max(e - 1, 0));
  }

  function salvar() {
    if (!validarEtapaAtual()) return;
    onSalvar(form);
  }

  return (
    <Painel
      titulo={inicial ? "Editar fornecedor" : "Novo fornecedor"}
      subtitulo={`Etapa ${etapa + 1} de ${ETAPAS_FORNECEDOR.length} — ${ETAPAS_FORNECEDOR[etapa].titulo}`}
      onFechar={onCancelar}
    >
      <Stepper etapas={ETAPAS_FORNECEDOR} etapaAtual={etapa} />

      {etapa === 0 && (
        <div className="space-y-5">
          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs">
            {["PJ", "PF"].map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, tipo: t })}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  form.tipo === t ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                )}
              >
                {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
              </button>
            ))}
          </div>

          <Campo label="Nome / Razão social">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className={inputClasses}
              placeholder="Ex: Votoran Distribuidora de Materiais"
              autoFocus
            />
          </Campo>

          <Campo label={form.tipo === "PF" ? "CPF" : "CNPJ"}>
            <input
              value={form.documento}
              onChange={(e) => setForm({ ...form, documento: e.target.value })}
              className={inputClasses}
              placeholder={form.tipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className={inputClasses}
                placeholder="(00) 00000-0000"
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
                  placeholder="fornecedor@email.com"
                />
              </div>
            </Campo>
          </div>
        </div>
      )}

      {etapa === 1 && (
        <div className="space-y-5">
          <Campo label="O que fornece">
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className={cn(inputClasses, "bg-white")}
              autoFocus
            >
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Condição de pagamento">
            <input
              value={form.condicaoPagamento}
              onChange={(e) => setForm({ ...form, condicaoPagamento: e.target.value })}
              className={inputClasses}
              placeholder="Ex: 30 dias, à vista..."
            />
          </Campo>

          <Campo label="Observação (opcional)">
            <input
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              className={inputClasses}
              placeholder="Contato preferencial, prazo de entrega..."
            />
          </Campo>
        </div>
      )}

      {etapa === 2 && (
        <div className="space-y-5">
          <Campo label="CEP">
            <div style={{ position: "relative" }} className="max-w-[200px]">
              <input
                value={form.endereco.cep}
                onChange={(e) => onCepChange(e.target.value)}
                className={inputClasses}
                placeholder="00000-000"
                inputMode="numeric"
                autoFocus
              />
              <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
                {statusCep === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                {statusCep === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
              </div>
            </div>
            {statusCep === "nao_encontrado" && (
              <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha o endereço manualmente.</p>
            )}
            {statusCep === "idle" && (
              <p className="text-xs text-stone-400 mt-1.5">Digite o CEP para buscar o endereço automaticamente.</p>
            )}
          </Campo>

          <Campo label="Logradouro">
            <input
              value={form.endereco.logradouro}
              onChange={(e) => setEndereco("logradouro", e.target.value)}
              className={inputClasses}
              placeholder="Preenchido automaticamente pelo CEP"
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Número">
              <input
                value={form.endereco.numero}
                onChange={(e) => setEndereco("numero", e.target.value)}
                className={inputClasses}
                placeholder="Ex: 500"
              />
            </Campo>
            <Campo label="Complemento">
              <input
                value={form.endereco.complemento}
                onChange={(e) => setEndereco("complemento", e.target.value)}
                className={inputClasses}
                placeholder="Sala, bloco... (opcional)"
              />
            </Campo>
          </div>

          <Campo label="Bairro">
            <input
              value={form.endereco.bairro}
              onChange={(e) => setEndereco("bairro", e.target.value)}
              className={inputClasses}
              placeholder="Preenchido automaticamente pelo CEP"
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-[1fr_100px]" : "grid-cols-1")}>
            <Campo label="Cidade">
              <input
                value={form.endereco.cidade}
                onChange={(e) => setEndereco("cidade", e.target.value)}
                className={inputClasses}
                placeholder="Preenchido pelo CEP"
              />
            </Campo>
            <Campo label="UF">
              <input
                value={form.endereco.uf}
                onChange={(e) => setEndereco("uf", e.target.value.toUpperCase().slice(0, 2))}
                className={inputClasses}
                placeholder="ES"
              />
            </Campo>
          </div>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-5">{erro}</p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-6 mt-6 border-t border-stone-100">
        <div className="flex gap-2">
          {etapa > 0 && (
            <button
              onClick={voltar}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            onClick={onCancelar}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
        <div className="hidden sm:block flex-1" />
        {etapa < ETAPAS_FORNECEDOR.length - 1 ? (
          <button
            onClick={avancar}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-800 hover:bg-teal-900 text-white transition-colors"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={salvar}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-800 hover:bg-teal-900 text-white transition-colors"
          >
            Salvar fornecedor
          </button>
        )}
      </div>
    </Painel>
  );
}
