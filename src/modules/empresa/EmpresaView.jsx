import { useState } from "react";
import { CheckCircle2, AlertTriangle, Lock, Loader2 } from "lucide-react";
import { cn } from "../../utils/format";
import { REGIMES_TRIBUTARIOS } from "../../data/constantes";
import { Campo } from "../../components/ui/Campo";
import { inputClasses } from "../../components/ui/inputClasses";
import { buscarCep } from "../../utils/cep";
import { mascararCnpj, mascararTelefone, mascararCep, soDigitos, telefoneValido } from "../../utils/mascaras";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const campoVazio = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };

// O que o cupom e a NF-e precisam para sair com cabeçalho completo.
export function faltaPreencher(e) {
  const falta = [];
  if (!e.razaoSocial.trim()) falta.push("razão social");
  if (soDigitos(e.cnpj).length !== 14) falta.push("CNPJ");
  const end = e.endereco || {};
  if (!end.logradouro || !end.numero || !end.cidade || !end.uf) falta.push("endereço completo");
  return falta;
}

function Secao({ titulo, descricao, children }) {
  return (
    <div className="pt-5 first:pt-0 border-t first:border-t-0 border-stone-100">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{titulo}</p>
      {descricao && <p className="text-xs text-stone-400 mt-0.5">{descricao}</p>}
      <div className="space-y-4 mt-3">{children}</div>
    </div>
  );
}

export function EmpresaView({ empresa, podeEditar, onSalvar, ocupado }) {
  const [form, setForm] = useState(() => ({
    ...empresa,
    cnpj: mascararCnpj(empresa.cnpj),
    telefone: mascararTelefone(empresa.telefone),
    endereco: { ...campoVazio, ...(empresa.endereco || {}) },
  }));
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const isSm = useMediaQuery("(min-width: 640px)");
  const grade = (colunas) => cn("grid gap-4", isSm ? colunas : "grid-cols-1");
  const trava = !podeEditar;
  const entrada = cn(inputClasses, trava && "bg-stone-50 text-stone-600");

  const set = (campo, valor) => { setSalvo(false); setForm((f) => ({ ...f, [campo]: valor })); };
  const setEnd = (campo, valor) => { setSalvo(false); setForm((f) => ({ ...f, endereco: { ...f.endereco, [campo]: valor } })); };

  async function aoMudarCep(valor) {
    const cep = mascararCep(valor);
    setEnd("cep", cep);
    if (cep.length === 9) {
      setBuscandoCep(true);
      const achado = await buscarCep(cep);
      setBuscandoCep(false);
      if (achado) setForm((f) => ({ ...f, endereco: { ...f.endereco, ...achado, cep } }));
    }
  }

  async function salvar() {
    setSalvo(false);
    if (!form.razaoSocial.trim()) return setErro("Preencha a razão social.");
    if (form.cnpj && soDigitos(form.cnpj).length !== 14) return setErro("O CNPJ deve ter 14 números.");
    if (!telefoneValido(form.telefone)) return setErro("O telefone deve ter DDD + 8 ou 9 números.");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return setErro("Confira o e-mail da empresa.");
    setErro("");
    if (await onSalvar({ ...form, razaoSocial: form.razaoSocial.trim(), email: form.email.trim() })) setSalvo(true);
  }

  const falta = faltaPreencher(form);

  return (
    <div className="max-w-3xl space-y-4">
      {trava ? (
        <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5">
          <Lock size={16} className="text-stone-400 shrink-0 mt-0.5" />
          <p className="text-sm text-stone-600">Você pode ver os dados da empresa, mas só quem tem permissão de editar o módulo Empresa pode alterá-los.</p>
        </div>
      ) : falta.length > 0 ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5" data-testid="empresa-incompleta">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Falta preencher: <strong>{falta.join(", ")}</strong>. Esses dados aparecem no cabeçalho do cupom de venda e na NF-e.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5" data-testid="empresa-completa">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800">Dados completos. Eles saem no cabeçalho do cupom e na NF-e.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 space-y-5">
        <Secao titulo="Identificação">
          <Campo label="Razão social">
            <input value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} className={entrada} disabled={trava} maxLength={120} placeholder="Ex: Minha Empresa Ltda" />
          </Campo>
          <div className={grade("grid-cols-2")}>
            <Campo label="Nome fantasia">
              <input value={form.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} className={entrada} disabled={trava} maxLength={80} placeholder="Nome usado no dia a dia" />
            </Campo>
            <Campo label="CNPJ">
              <input value={form.cnpj} onChange={(e) => set("cnpj", mascararCnpj(e.target.value))} className={entrada} disabled={trava} inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00" />
            </Campo>
          </div>
          <div className={grade("grid-cols-3")}>
            <Campo label="Inscrição estadual">
              <input value={form.ie} onChange={(e) => set("ie", e.target.value)} className={entrada} disabled={trava} maxLength={20} placeholder="Número da IE" />
            </Campo>
            <Campo label="Inscrição municipal">
              <input value={form.im} onChange={(e) => set("im", e.target.value)} className={entrada} disabled={trava} maxLength={20} placeholder="Opcional" />
            </Campo>
            <Campo label="Regime tributário">
              <select value={form.regimeTributario} onChange={(e) => set("regimeTributario", e.target.value)} className={cn(entrada, "bg-white")} disabled={trava}>
                {REGIMES_TRIBUTARIOS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Endereço" descricao="Digite o CEP para preencher o restante.">
          <div style={{ position: "relative" }} className="max-w-[220px]">
            <Campo label="CEP">
              <input value={form.endereco.cep} onChange={(e) => aoMudarCep(e.target.value)} className={entrada} disabled={trava} inputMode="numeric" maxLength={9} placeholder="00000-000" />
            </Campo>
            {buscandoCep && <Loader2 size={14} className="animate-spin text-stone-400" style={{ position: "absolute", right: "0.75rem", bottom: "0.8rem" }} />}
          </div>
          <Campo label="Logradouro">
            <input value={form.endereco.logradouro} onChange={(e) => setEnd("logradouro", e.target.value)} className={entrada} disabled={trava} maxLength={120} placeholder="Rua, avenida..." />
          </Campo>
          <div className={grade("grid-cols-2")}>
            <Campo label="Número">
              <input value={form.endereco.numero} onChange={(e) => setEnd("numero", e.target.value)} className={entrada} disabled={trava} maxLength={10} placeholder="Ex: 1200" />
            </Campo>
            <Campo label="Complemento">
              <input value={form.endereco.complemento} onChange={(e) => setEnd("complemento", e.target.value)} className={entrada} disabled={trava} maxLength={60} placeholder="Loja, galpão... (opcional)" />
            </Campo>
          </div>
          <Campo label="Bairro">
            <input value={form.endereco.bairro} onChange={(e) => setEnd("bairro", e.target.value)} className={entrada} disabled={trava} maxLength={80} />
          </Campo>
          <div className={cn("grid gap-4", isSm ? "grid-cols-[1fr_100px]" : "grid-cols-1")}>
            <Campo label="Cidade">
              <input value={form.endereco.cidade} onChange={(e) => setEnd("cidade", e.target.value)} className={entrada} disabled={trava} maxLength={80} />
            </Campo>
            <Campo label="UF">
              <input value={form.endereco.uf} onChange={(e) => setEnd("uf", e.target.value.toUpperCase().slice(0, 2))} className={entrada} disabled={trava} placeholder="ES" />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Contato">
          <div className={grade("grid-cols-2")}>
            <Campo label="Telefone">
              <input value={form.telefone} onChange={(e) => set("telefone", mascararTelefone(e.target.value))} className={entrada} disabled={trava} inputMode="tel" maxLength={15} placeholder="(00) 00000-0000" />
            </Campo>
            <Campo label="E-mail">
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={entrada} disabled={trava} maxLength={120} placeholder="contato@sualoja.com.br" />
            </Campo>
          </div>
          <Campo label="Site (opcional)">
            <input value={form.site} onChange={(e) => set("site", e.target.value)} className={entrada} disabled={trava} maxLength={120} placeholder="www.sualoja.com.br" />
          </Campo>
        </Secao>

        <Secao titulo="Cupom de venda">
          <Campo label="Mensagem no rodapé do cupom (opcional)">
            <input value={form.mensagemCupom} onChange={(e) => set("mensagemCupom", e.target.value)} className={entrada} disabled={trava} maxLength={120} placeholder="Ex: Obrigado pela preferência! Volte sempre." />
          </Campo>
        </Secao>

        {erro && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}

        {!trava && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={salvar}
              disabled={ocupado}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-800 hover:bg-teal-900 disabled:bg-stone-300 text-white transition-colors"
            >
              {ocupado ? "Salvando…" : "Salvar dados da empresa"}
            </button>
            {salvo && (
              <span role="status" className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 size={15} /> Salvo
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

