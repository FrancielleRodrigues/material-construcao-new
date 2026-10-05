import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn, hojeISO, formatarEndereco } from "../../utils/format";
import { buscarCep } from "../../utils/cep";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Campo } from "../../components/ui/Campo";
import { Painel } from "../../components/ui/Painel";
import { RodapePainel } from "../../components/ui/RodapePainel";
import { inputClasses } from "../../components/ui/inputClasses";

export function EntregaForm({ inicial, vendas, clientes, clientesPorId, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || {
      vendaId: "", clienteId: "", endereco: "", itensDescricao: "",
      dataPrevista: hojeISO(), motorista: "", veiculo: "", observacao: "",
    }
  );
  const [erro, setErro] = useState("");
  const isSm = useMediaQuery("(min-width: 640px)");
  const modoAvulsa = !form.vendaId;

  const [cepEntrega, setCepEntrega] = useState("");
  const [numeroEntrega, setNumeroEntrega] = useState("");
  const [statusCepEntrega, setStatusCepEntrega] = useState("idle");
  const [enderecoEncontrado, setEnderecoEncontrado] = useState(null);

  async function onCepEntregaChange(valor) {
    const mascarado = valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    setCepEntrega(mascarado);
    if (mascarado.replace(/\D/g, "").length === 8) {
      setStatusCepEntrega("buscando");
      const resultado = await buscarCep(mascarado);
      if (resultado) {
        setEnderecoEncontrado(resultado);
        setStatusCepEntrega("encontrado");
        setForm((f) => ({ ...f, endereco: formatarEndereco({ ...resultado, numero: numeroEntrega }) }));
      } else {
        setStatusCepEntrega("nao_encontrado");
      }
    } else {
      setStatusCepEntrega("idle");
    }
  }

  function onNumeroEntregaChange(valor) {
    setNumeroEntrega(valor);
    if (enderecoEncontrado) {
      setForm((f) => ({ ...f, endereco: formatarEndereco({ ...enderecoEncontrado, numero: valor }) }));
    }
  }

  function selecionarVenda(vendaId) {
    if (!vendaId) {
      setForm({ ...form, vendaId: "" });
      return;
    }
    const venda = vendas.find((v) => v.id === Number(vendaId));
    if (!venda) return;
    const cliente = venda.clienteId ? clientesPorId[venda.clienteId] : null;
    setForm({
      ...form,
      vendaId: venda.id,
      clienteId: venda.clienteId || "",
      endereco: cliente ? formatarEndereco(cliente.endereco) : form.endereco,
      itensDescricao: venda.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", "),
    });
  }

  function selecionarClienteAvulso(clienteId) {
    const cliente = clienteId ? clientesPorId[Number(clienteId)] : null;
    setForm({
      ...form,
      clienteId,
      endereco: cliente ? formatarEndereco(cliente.endereco) : "",
    });
  }

  function salvar() {
    if (!form.clienteId && !form.endereco.trim()) {
      setErro("Informe o cliente ou o endereço de entrega.");
      return;
    }
    if (!form.dataPrevista) {
      setErro("Informe a data prevista.");
      return;
    }
    onSalvar({ ...form, vendaId: form.vendaId ? Number(form.vendaId) : null, clienteId: form.clienteId ? Number(form.clienteId) : null });
  }

  return (
    <Painel titulo={inicial ? "Editar entrega" : "Nova entrega"} onFechar={onCancelar}>
      <div className="space-y-5">
        <Campo label="Vincular a uma venda (opcional)">
          <select
            value={form.vendaId}
            onChange={(e) => selecionarVenda(e.target.value)}
            className={cn(inputClasses, "bg-white")}
          >
            <option value="">Entrega avulsa (sem venda vinculada)</option>
            {vendas.map((v) => (
              <option key={v.id} value={v.id}>
                Venda nº {v.numero} · {v.clienteId ? clientesPorId[v.clienteId]?.nome : "Consumidor não identificado"}
              </option>
            ))}
          </select>
        </Campo>

        {modoAvulsa && (
          <Campo label="Cliente">
            <select
              value={form.clienteId}
              onChange={(e) => selecionarClienteAvulso(e.target.value)}
              className={cn(inputClasses, "bg-white")}
            >
              <option value="">Nenhum (informar endereço manualmente)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Campo>
        )}

        <Campo label="Buscar endereço por CEP (opcional)">
          <div className="flex gap-2">
            <div style={{ position: "relative" }} className="flex-1">
              <input
                value={cepEntrega}
                onChange={(e) => onCepEntregaChange(e.target.value)}
                className={inputClasses}
                placeholder="00000-000"
                inputMode="numeric"
              />
              <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
                {statusCepEntrega === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                {statusCepEntrega === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
              </div>
            </div>
            <input
              value={numeroEntrega}
              onChange={(e) => onNumeroEntregaChange(e.target.value)}
              className={inputClasses}
              placeholder="Número"
              style={{ width: "110px" }}
            />
          </div>
          {statusCepEntrega === "nao_encontrado" && (
            <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha o endereço manualmente abaixo.</p>
          )}
        </Campo>

        <Campo label="Endereço de entrega">
          <input
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            className={inputClasses}
            placeholder="Rua, número - Bairro, Cidade/UF"
          />
        </Campo>

        <Campo label="Itens / carga">
          <input
            value={form.itensDescricao}
            onChange={(e) => setForm({ ...form, itensDescricao: e.target.value })}
            className={inputClasses}
            placeholder="Ex: 2x Torneira, 5x Cimento CP-II"
          />
        </Campo>

        <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
          <Campo label="Data prevista">
            <input
              type="date"
              value={form.dataPrevista}
              onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })}
              className={inputClasses}
            />
          </Campo>
          <Campo label="Motorista (opcional)">
            <input
              value={form.motorista}
              onChange={(e) => setForm({ ...form, motorista: e.target.value })}
              className={inputClasses}
              placeholder="Nome do motorista"
            />
          </Campo>
        </div>

        <Campo label="Veículo (opcional)">
          <input
            value={form.veiculo}
            onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
            className={inputClasses}
            placeholder="Ex: Caminhão ABC-1234"
          />
        </Campo>

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Instruções para a entrega"
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
