import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "../../utils/format";
import { buscarCep } from "../../utils/cep";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { IE_OPCOES, ETAPAS_CLIENTE } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { Stepper } from "../../components/ui/Stepper";
import { inputClasses } from "../../components/ui/inputClasses";

export function ClienteForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(() => {
    const base = {
      tipo: "PF", nome: "", documento: "", telefone: "", email: "",
      inscricaoEstadual: "", indicadorIE: "nao_contribuinte",
      endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
    };
    if (!inicial) return base;
    return { ...base, ...inicial, endereco: { ...base.endereco, ...(inicial.endereco || {}) } };
  });
  const [erro, setErro] = useState("");
  const [statusCep, setStatusCep] = useState("idle"); // idle | buscando | encontrado | nao_encontrado
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
      setErro("Preencha nome e CPF/CNPJ.");
      return false;
    }
    if (etapa === 2 && (!form.endereco.cep || !form.endereco.numero.trim())) {
      setErro("Preencha o CEP e o número do endereço.");
      return false;
    }
    setErro("");
    return true;
  }

  function avancar() {
    if (!validarEtapaAtual()) return;
    setEtapa((e) => Math.min(e + 1, ETAPAS_CLIENTE.length - 1));
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
      titulo={inicial?.id ? "Editar cliente" : "Novo cliente"}
      subtitulo={`Etapa ${etapa + 1} de ${ETAPAS_CLIENTE.length} — ${ETAPAS_CLIENTE[etapa].titulo}`}
      onFechar={onCancelar}
    >
      <Stepper etapas={ETAPAS_CLIENTE} etapaAtual={etapa} />

      {etapa === 0 && (
        <div className="space-y-5">
          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs">
            {["PF", "PJ"].map((t) => (
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
              placeholder="Ex: Construtora Horizonte Ltda"
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
                  placeholder="cliente@email.com"
                />
              </div>
            </Campo>
          </div>
        </div>
      )}

      {etapa === 1 && (
        <div className="space-y-5">
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5">
            Esses dados são usados para preencher a nota fiscal eletrônica automaticamente quando o módulo fiscal for ativado.
          </p>

          {form.tipo === "PJ" && (
            <Campo label="Inscrição estadual">
              <input
                value={form.inscricaoEstadual}
                onChange={(e) => setForm({ ...form, inscricaoEstadual: e.target.value })}
                className={inputClasses}
                placeholder="Número da IE"
                disabled={form.indicadorIE === "isento"}
                autoFocus
              />
            </Campo>
          )}

          <Campo label="Indicador de inscrição estadual">
            <select
              value={form.indicadorIE}
              onChange={(e) => setForm({ ...form, indicadorIE: e.target.value })}
              className={cn(inputClasses, "bg-white")}
              autoFocus={form.tipo === "PF"}
            >
              {IE_OPCOES.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
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
              <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
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
                placeholder="Ex: 1200"
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
                placeholder="RJ"
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
        {etapa < ETAPAS_CLIENTE.length - 1 ? (
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
            Salvar cliente
          </button>
        )}
      </div>
    </Painel>
  );
}
