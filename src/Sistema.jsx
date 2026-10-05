import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Search, X, Boxes, ChevronRight, Menu, ChevronDown, Eye, LogOut } from "lucide-react";
import { cn, iniciais, hojeISO, formatarEndereco } from "./utils/format";
import { buscarCep } from "./utils/cep";
import { NAV_ITEMS, TITULOS_ABA } from "./data/constantes";
import { EMPRESA_FISCAL_INICIAL } from "./data/iniciais";
import * as api from "./data/api";
import { TelaAviso } from "./modules/auth/TelaAviso";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { ClienteForm } from "./modules/clientes/ClienteForm";
import { FornecedorForm } from "./modules/fornecedores/FornecedorForm";
import { ProdutoForm } from "./modules/produtos/ProdutoForm";
import { MovimentacaoForm } from "./modules/estoque/MovimentacaoForm";
import { PedidoForm } from "./modules/compras/PedidoForm";
import { UsuarioForm } from "./modules/usuarios/UsuarioForm";
import { PapelForm } from "./modules/usuarios/PapelForm";
import { statusLancamento } from "./modules/financeiro/financeiroUi";
import { LancamentoForm } from "./modules/financeiro/LancamentoForm";
import { CupomModal } from "./modules/venda/CupomModal";
import { NotaPreviewModal } from "./modules/fiscal/NotaPreviewModal";
import { InicioView } from "./modules/inicio/InicioView";
import { ProdutosView } from "./modules/produtos/ProdutosView";
import { ClientesView } from "./modules/clientes/ClientesView";
import { FornecedoresView } from "./modules/fornecedores/FornecedoresView";
import { EstoqueView } from "./modules/estoque/EstoqueView";
import { FinanceiroView } from "./modules/financeiro/FinanceiroView";
import { EntregasView } from "./modules/entregas/EntregasView";
import { ComprasView } from "./modules/compras/ComprasView";
import { VendaView } from "./modules/venda/VendaView";
import { FiscalView } from "./modules/fiscal/FiscalView";
import { UsuariosView } from "./modules/usuarios/UsuariosView";
import { EntregaForm } from "./modules/entregas/EntregaForm";

export default function Sistema({ email, onSair }) {
  const [aba, setAba] = useState("inicio");
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [formPedido, setFormPedido] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [papeis, setPapeis] = useState([]);
  const [formUsuario, setFormUsuario] = useState(null);
  const [formPapel, setFormPapel] = useState(null);
  const [subUsuarios, setSubUsuarios] = useState("usuarios");
  const [menuSessaoAberto, setMenuSessaoAberto] = useState(false);
  const [filtroPedido, setFiltroPedido] = useState("todos");
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [busca, setBusca] = useState("");
  const [formCliente, setFormCliente] = useState(null);
  const [formFornecedor, setFormFornecedor] = useState(null);
  const [formProduto, setFormProduto] = useState(null);
  const [formMovimentacao, setFormMovimentacao] = useState(null);
  const [formLancamento, setFormLancamento] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [bipCodigo, setBipCodigo] = useState("");
  const [bipQuantidade, setBipQuantidade] = useState("1");
  const [erroBip, setErroBip] = useState("");
  const [docClienteVenda, setDocClienteVenda] = useState("");
  const [formaPagamentoVenda, setFormaPagamentoVenda] = useState("pix");
  const [cupomAtual, setCupomAtual] = useState(null);
  const [descontoTipo, setDescontoTipo] = useState("percentual");
  const [descontoValor, setDescontoValor] = useState("");
  const [tipoEntregaVenda, setTipoEntregaVenda] = useState("retirada");
  const [enderecoEntregaVenda, setEnderecoEntregaVenda] = useState("");
  const [dataEntregaVenda, setDataEntregaVenda] = useState(hojeISO());
  const [cepVenda, setCepVenda] = useState("");
  const [numeroVenda, setNumeroVenda] = useState("");
  const [statusCepVenda, setStatusCepVenda] = useState("idle");
  const [enderecoEncontradoVenda, setEnderecoEncontradoVenda] = useState(null);
  const [gerarNotaVenda, setGerarNotaVenda] = useState(true);
  const [etapaVenda, setEtapaVenda] = useState("inicio"); // inicio | cliente | produtos
  const [empresaFiscal, setEmpresaFiscal] = useState(EMPRESA_FISCAL_INICIAL);
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [subFiscal, setSubFiscal] = useState("pendentes");
  const [notaPreview, setNotaPreview] = useState(null);
  const [entregas, setEntregas] = useState([]);
  const [formEntrega, setFormEntrega] = useState(null);
  const [filtroEntrega, setFiltroEntrega] = useState("todas");
  const [subEstoque, setSubEstoque] = useState("posicao");
  const [filtroFinanceiro, setFiltroFinanceiro] = useState("todos");
  const [menuAberto, setMenuAberto] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [falhaCarga, setFalhaCarga] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const ocupadoRef = useRef(false);

  const SETTERS = {
    clientes: setClientes, fornecedores: setFornecedores, produtos: setProdutos, movimentacoes: setMovimentacoes,
    lancamentos: setLancamentos, pedidos: setPedidos, vendas: setVendas, entregas: setEntregas,
    notasFiscais: setNotasFiscais, usuarios: setUsuarios, papeis: setPapeis,
    // sem acesso ao módulo fiscal o banco devolve vazio: mantém o padrão
    empresaFiscal: (v) => v && setEmpresaFiscal(v),
  };

  async function recarregar(nomes) {
    const dados = await api.carregar(nomes);
    for (const n of nomes) SETTERS[n](dados[n]);
    return dados;
  }

  function carregarTudo() {
    setCarregando(true);
    setFalhaCarga("");
    return recarregar(api.TODAS_AS_LISTAS)
      .catch((e) => setFalhaCarga(e.message || "Não foi possível carregar os dados."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // Executa uma ação no servidor: ignora clique duplo, mostra o erro e recarrega o que mudou.
  // Devolve { valor, dados } em caso de sucesso e null em caso de erro (o formulário continua aberto).
  async function executar(acao, listas = []) {
    if (ocupadoRef.current) return null;
    ocupadoRef.current = true;
    setOcupado(true);
    setErro("");
    try {
      const valor = await acao();
      const dados = listas.length ? await recarregar(listas) : {};
      return { valor, dados };
    } catch (e) {
      setErro(e.message || "Algo deu errado. Tente de novo.");
      return null;
    } finally {
      ocupadoRef.current = false;
      setOcupado(false);
    }
  }

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const atualizar = () => setIsDesktop(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);

  const clientesFiltrados = useMemo(
    () => clientes.filter((c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) || c.documento.includes(busca)
    ),
    [clientes, busca]
  );

  const fornecedoresFiltrados = useMemo(
    () => fornecedores.filter((f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) || f.documento.includes(busca)
    ),
    [fornecedores, busca]
  );

  const fornecedoresPorId = useMemo(
    () => Object.fromEntries(fornecedores.map((f) => [f.id, f])),
    [fornecedores]
  );

  const papeisPorId = useMemo(
    () => Object.fromEntries(papeis.map((p) => [p.id, p])),
    [papeis]
  );
  const usuarioAtual = usuarios.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  const papelAtual = usuarioAtual ? papeisPorId[usuarioAtual.papelId] : null;
  const nivelPermissao = (moduloId) => papelAtual?.permissoes?.[moduloId] || "nenhum";
  const podeVer = (moduloId) => nivelPermissao(moduloId) !== "nenhum";
  const podeEditar = (moduloId) => nivelPermissao(moduloId) === "editar";

  useEffect(() => {
    if (aba !== "inicio" && aba !== "venda" && !podeVer(aba)) {
      setAba("inicio");
    }
  }, [papelAtual]);

  const pedidosFiltrados = useMemo(
    () =>
      [...pedidos]
        .filter((p) => filtroPedido === "todos" || p.status === filtroPedido)
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)),
    [pedidos, filtroPedido]
  );
  const totalPedido = (p) => p.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
  const pedidosPendentesCount = pedidos.filter((p) => p.status === "pendente").length;
  const valorPedidosPendentes = pedidos.filter((p) => p.status === "pendente").reduce((s, p) => s + totalPedido(p), 0);
  const pedidosAtrasados = pedidos.filter((p) => p.status === "pendente" && p.dataPrevista < hojeISO()).length;

  const produtosFiltrados = useMemo(
    () => produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())),
    [produtos, busca]
  );

  const produtosPorId = useMemo(
    () => Object.fromEntries(produtos.map((p) => [p.id, p])),
    [produtos]
  );

  const clientesPorId = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])),
    [clientes]
  );

  const digitosDocVenda = docClienteVenda.replace(/\D/g, "");
  const clienteVendaEncontrado = useMemo(() => {
    if (digitosDocVenda.length !== 11 && digitosDocVenda.length !== 14) return null;
    return clientes.find((c) => c.documento.replace(/\D/g, "") === digitosDocVenda) || null;
  }, [digitosDocVenda, clientes]);
  const clienteVendaNaoEncontrado = (digitosDocVenda.length === 11 || digitosDocVenda.length === 14) && !clienteVendaEncontrado;

  const subtotalCarrinho = carrinho.reduce((s, i) => s + i.quantidade * (produtosPorId[i.produtoId]?.preco || 0), 0);
  const valorDescontoBruto = descontoTipo === "percentual"
    ? subtotalCarrinho * ((parseFloat(descontoValor) || 0) / 100)
    : (parseFloat(descontoValor) || 0);
  const valorDesconto = Math.min(Math.max(valorDescontoBruto, 0), subtotalCarrinho);
  const totalComDesconto = subtotalCarrinho - valorDesconto;

  const movimentacoesFiltradas = useMemo(
    () =>
      [...movimentacoes]
        .filter((m) => (produtosPorId[m.produtoId]?.nome || "").toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id)),
    [movimentacoes, produtosPorId, busca]
  );

  const lancamentosFiltrados = useMemo(
    () =>
      [...lancamentos]
        .filter((l) => filtroFinanceiro === "todos" || (filtroFinanceiro === "receber" ? l.tipo === "receita" : l.tipo === "despesa"))
        .filter((l) => {
          const nomeContraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "") : l.contraparte;
          return l.descricao.toLowerCase().includes(busca.toLowerCase()) || nomeContraparte.toLowerCase().includes(busca.toLowerCase());
        })
        .sort((a, b) => (a.vencimento < b.vencimento ? 1 : a.vencimento > b.vencimento ? -1 : b.id - a.id)),
    [lancamentos, clientesPorId, busca, filtroFinanceiro]
  );

  const vendasComNota = useMemo(() => new Set(notasFiscais.map((n) => n.vendaId)), [notasFiscais]);
  const vendasPendentesNota = useMemo(
    () => vendas.filter((v) => !vendasComNota.has(v.id)),
    [vendas, vendasComNota]
  );
  const notasComVenda = useMemo(
    () => notasFiscais.map((n) => ({ ...n, venda: vendas.find((v) => v.id === n.vendaId) })),
    [notasFiscais, vendas]
  );
  const integracaoConfigurada = Boolean(empresaFiscal.cnpj && empresaFiscal.provedor && empresaFiscal.certificadoInstalado);

  const entregasFiltradas = useMemo(() => {
    const digitosBusca = busca.replace(/\D/g, "");
    return [...entregas]
      .filter((e) => filtroEntrega === "todas" || e.status === filtroEntrega)
      .filter((e) => {
        if (!busca.trim()) return true;
        const cliente = e.clienteId ? clientesPorId[e.clienteId] : null;
        if (!cliente) return false;
        const nomeMatch = cliente.nome.toLowerCase().includes(busca.toLowerCase());
        const docMatch = digitosBusca && cliente.documento.replace(/\D/g, "").includes(digitosBusca);
        return nomeMatch || docMatch;
      })
      .sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : a.dataPrevista > b.dataPrevista ? 1 : 0));
  }, [entregas, filtroEntrega, busca, clientesPorId]);
  const entregasPendentes = entregas.filter((e) => e.status === "pendente").length;
  const entregasEmRota = entregas.filter((e) => e.status === "em_rota").length;
  const entregasAtrasadas = entregas.filter((e) => (e.status === "pendente" || e.status === "em_rota") && e.dataPrevista < hojeISO()).length;
  const entregasHoje = entregas.filter((e) => e.status === "entregue" && e.dataPrevista === hojeISO()).length;

  const produtosEstoqueBaixo = produtos.filter((p) => p.estoque <= p.estoqueMin).length;
  const valorEmEstoque = produtos.reduce((soma, p) => soma + p.preco * p.estoque, 0);
  const movimentacoesHoje = movimentacoes.filter((m) => m.data === hojeISO()).length;

  const aReceber = lancamentos.filter((l) => l.tipo === "receita" && !l.pago).reduce((s, l) => s + l.valor, 0);
  const aPagar = lancamentos.filter((l) => l.tipo === "despesa" && !l.pago).reduce((s, l) => s + l.valor, 0);
  const vencidos = lancamentos.filter((l) => statusLancamento(l) === "vencido").length;
  const saldoMes = lancamentos
    .filter((l) => l.pago && l.dataPagamento && l.dataPagamento.slice(0, 7) === hojeISO().slice(0, 7))
    .reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0);

  async function salvarCliente(dados) {
    if (!(await executar(() => api.salvarCliente(dados), ["clientes"]))) return;
    setFormCliente(null);
    if (aba === "venda" && !dados.id) {
      setDocClienteVenda(dados.documento);
      setEtapaVenda("produtos");
    }
  }

  async function salvarFornecedor(dados) {
    if (!(await executar(() => api.salvarFornecedor(dados), ["fornecedores"]))) return;
    setFormFornecedor(null);
  }

  async function salvarPedido(dados) {
    if (!(await executar(() => api.salvarPedido(dados), ["pedidos"]))) return;
    setFormPedido(null);
  }

  async function salvarUsuario(dados) {
    if (!(await executar(() => api.salvarUsuario(dados), ["usuarios"]))) return;
    setFormUsuario(null);
  }

  async function salvarPapel(dados) {
    if (!(await executar(() => api.salvarPapel(dados), ["papeis"]))) return;
    setFormPapel(null);
  }

  // Entrada no estoque + despesa no Financeiro: feito numa transação no banco.
  async function registrarRecebimento(pedido) {
    await executar(() => api.registrarRecebimento(pedido.id), ["pedidos", "produtos", "movimentacoes", "lancamentos"]);
  }

  async function salvarProduto(dados) {
    // alterar o estoque pelo cadastro gera um movimento de ajuste no banco
    if (!(await executar(() => api.salvarProduto(dados), ["produtos", "movimentacoes"]))) return;
    setFormProduto(null);
  }

  async function salvarMovimentacao(dados) {
    if (!(await executar(() => api.registrarMovimentacao(dados), ["produtos", "movimentacoes"]))) return;
    setFormMovimentacao(null);
  }

  async function salvarLancamento(dados) {
    if (!(await executar(() => api.salvarLancamento(dados), ["lancamentos"]))) return;
    setFormLancamento(null);
  }

  async function alternarPago(lancamento) {
    await executar(() => api.alternarPago(lancamento, hojeISO()), ["lancamentos"]);
  }

  // tipo da confirmação → tabela e listas que mudam junto (vínculos viram vazio no banco)
  const EXCLUSAO = {
    cliente: { tabela: "clientes", listas: ["clientes", "lancamentos", "vendas", "entregas"] },
    fornecedor: { tabela: "fornecedores", listas: ["fornecedores", "produtos", "pedidos", "lancamentos"] },
    pedido: { tabela: "pedidos_compra", listas: ["pedidos"] },
    usuario: { tabela: "usuarios", listas: ["usuarios"] },
    papel: { tabela: "papeis", listas: ["papeis"] },
    produto: { tabela: "produtos", listas: ["produtos"] },
    lancamento: { tabela: "lancamentos", listas: ["lancamentos"] },
  };

  async function confirmarExclusao() {
    if (!confirmacao) return;
    const alvo = EXCLUSAO[confirmacao.tipo];
    const ok = alvo && (await executar(() => api.excluir(alvo.tabela, confirmacao.id), alvo.listas));
    if (ok || !alvo) setConfirmacao(null);
  }

  function adicionarAoCarrinho() {
    const codigo = bipCodigo.trim();
    const qtd = parseInt(bipQuantidade) || 1;
    if (!codigo) {
      setErroBip("Informe ou bipe o código de barras do produto.");
      return;
    }

    const produto = produtos.find((p) => p.codigoBarras === codigo);
    if (!produto) {
      setErroBip("Produto não encontrado para esse código.");
      return;
    }

    const jaNoCarrinho = carrinho.find((i) => i.produtoId === produto.id);
    const qtdAtual = jaNoCarrinho ? jaNoCarrinho.quantidade : 0;
    if (qtdAtual + qtd > produto.estoque) {
      setErroBip(`Estoque insuficiente. Disponível: ${produto.estoque} ${produto.unidade}.`);
      return;
    }

    setCarrinho(
      jaNoCarrinho
        ? carrinho.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + qtd } : i))
        : [...carrinho, { produtoId: produto.id, quantidade: qtd }]
    );
    setBipCodigo("");
    setBipQuantidade("1");
    setErroBip("");
  }

  function alterarQtdCarrinho(produtoId, novaQtd) {
    const produto = produtosPorId[produtoId];
    if (novaQtd < 1) {
      setCarrinho(carrinho.filter((i) => i.produtoId !== produtoId));
      return;
    }
    if (produto && novaQtd > produto.estoque) return;
    setCarrinho(carrinho.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: novaQtd } : i)));
  }

  function removerDoCarrinho(produtoId) {
    setCarrinho(carrinho.filter((i) => i.produtoId !== produtoId));
  }

  async function onCepVendaChange(valor) {
    const mascarado = valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    setCepVenda(mascarado);
    if (mascarado.replace(/\D/g, "").length === 8) {
      setStatusCepVenda("buscando");
      const resultado = await buscarCep(mascarado);
      if (resultado) {
        setEnderecoEncontradoVenda(resultado);
        setStatusCepVenda("encontrado");
        setEnderecoEntregaVenda(formatarEndereco({ ...resultado, numero: numeroVenda }));
      } else {
        setStatusCepVenda("nao_encontrado");
      }
    } else {
      setStatusCepVenda("idle");
    }
  }

  function onNumeroVendaChange(valor) {
    setNumeroVenda(valor);
    if (enderecoEncontradoVenda) {
      setEnderecoEntregaVenda(formatarEndereco({ ...enderecoEncontradoVenda, numero: valor }));
    }
  }

  // Preço, estoque e permissão são conferidos no banco; ele cria venda, movimentações,
  // receita, entrega e rascunho de nota numa transação só.
  async function finalizarVenda() {
    if (carrinho.length === 0) return;
    const r = await executar(
      () => api.finalizarVenda({
        clienteId: clienteVendaEncontrado ? clienteVendaEncontrado.id : null,
        formaPagamento: formaPagamentoVenda,
        itens: carrinho,
        descontoTipo,
        descontoValor,
        tipoEntrega: tipoEntregaVenda,
        enderecoEntrega: enderecoEntregaVenda,
        dataEntrega: dataEntregaVenda,
        gerarNota: gerarNotaVenda,
      }),
      ["produtos", "movimentacoes", "lancamentos", "vendas", "entregas", "notasFiscais", "empresaFiscal"]
    );
    if (!r) return;

    setCupomAtual(r.dados.vendas.find((v) => v.id === r.valor) || null);
    setCarrinho([]);
    setDocClienteVenda("");
    setDescontoTipo("percentual");
    setDescontoValor("");
    setTipoEntregaVenda("retirada");
    setEnderecoEntregaVenda("");
    setDataEntregaVenda(hojeISO());
    setGerarNotaVenda(true);
    setEtapaVenda("inicio");
    setCepVenda("");
    setNumeroVenda("");
    setStatusCepVenda("idle");
    setEnderecoEncontradoVenda(null);
  }

  async function salvarConfigFiscal(dados) {
    await executar(() => api.salvarConfigFiscal(dados), ["empresaFiscal"]);
  }

  async function gerarRascunhoNota(venda) {
    await executar(() => api.gerarRascunhoNota(venda.id), ["notasFiscais", "empresaFiscal"]);
  }

  async function salvarEntrega(dados) {
    if (!(await executar(() => api.salvarEntrega(dados), ["entregas"]))) return;
    setFormEntrega(null);
  }

  async function avancarStatusEntrega(entrega) {
    const ordem = ["pendente", "em_rota", "entregue"];
    const idx = ordem.indexOf(entrega.status);
    if (idx === -1 || idx === ordem.length - 1) return;
    await executar(() => api.mudarStatusEntrega(entrega.id, ordem[idx + 1]), ["entregas"]);
  }

  async function cancelarEntrega(id) {
    await executar(() => api.mudarStatusEntrega(id, "cancelada"), ["entregas"]);
  }

  if (carregando) return <TelaAviso titulo="Carregando seus dados..." />;
  if (falhaCarga) {
    return (
      <TelaAviso titulo="Não foi possível carregar" subtitulo={falhaCarga}>
        <div className="flex gap-2">
          <button onClick={carregarTudo} className="flex-1 px-4 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800">Tentar de novo</button>
          <button onClick={onSair} className="px-4 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50">Sair</button>
        </div>
      </TelaAviso>
    );
  }
  if (!usuarioAtual) {
    return (
      <TelaAviso titulo="Sem acesso" subtitulo={`O e-mail ${email} não está cadastrado como usuário ativo deste sistema. Peça ao administrador para liberar seu acesso.`}>
        <button onClick={onSair} className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50">Sair</button>
      </TelaAviso>
    );
  }

  const barraBusca = !isDesktop && aba !== "inicio" && aba !== "venda" && aba !== "fiscal" && (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div style={{ position: "relative" }} className="flex-1 sm:max-w-sm">
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              aba === "clientes" ? "Buscar por nome ou documento..." :
                aba === "fornecedores" ? "Buscar por nome ou documento..." :
              aba === "financeiro" ? "Buscar por descrição ou cliente/fornecedor..." :
              aba === "entregas" ? "Buscar cliente por CPF ou CNPJ..." :
              aba === "compras" ? "Buscar por fornecedor..." :
              "Buscar produto..."
            }
            className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white transition-shadow"
          />
        </div>
        {podeEditar(aba) && (aba === "estoque" ? (
          <button
            onClick={() => setFormMovimentacao({})}
            className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
          >
            <Plus size={16} /> Nova
          </button>
        ) : aba === "financeiro" ? (
          <button
            onClick={() => setFormLancamento({})}
            className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
          >
            <Plus size={16} /> Novo
          </button>
        ) : aba === "entregas" ? (
          <button
            onClick={() => setFormEntrega({})}
            className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
          >
            <Plus size={16} /> Nova
          </button>
        ) : aba === "compras" ? (
          <button
            onClick={() => setFormPedido({})}
            className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
          >
            <Plus size={16} /> Novo
          </button>
        ) : (
          <button
            onClick={() => (aba === "clientes" ? setFormCliente({}) : aba === "fornecedores" ? setFormFornecedor({}) : setFormProduto({}))}
            className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
          >
            <Plus size={16} /> Novo
          </button>
        ))}
      </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans">
      {ocupado && <div className="bg-teal-600 animate-pulse" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 1000 }} />}
      {erro && (
        <div
          role="alert"
          className="bg-red-600 text-white text-sm rounded-lg shadow-lg px-4 py-2.5 flex items-start gap-3"
          style={{ position: "fixed", top: "0.75rem", left: "50%", transform: "translateX(-50%)", zIndex: 1000, maxWidth: "calc(100vw - 2rem)" }}
        >
          <span>{erro}</span>
          <button onClick={() => setErro("")} aria-label="Fechar aviso" className="shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>
      )}
      {!isDesktop && menuAberto && (
        <div
          className="fixed inset-0 bg-stone-900/50 z-40"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        className={cn(
          "w-64 sm:w-56 bg-stone-900 flex flex-col shrink-0 z-50 transition-transform duration-200",
          isDesktop
            ? "sticky top-0 h-screen"
            : cn("fixed inset-y-0 left-0", menuAberto ? "translate-x-0" : "-translate-x-full")
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-800 flex items-center justify-center">
              <Boxes size={17} className="text-teal-200" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">ConstruGestão</span>
          </div>
          {!isDesktop && (
            <button
              onClick={() => setMenuAberto(false)}
              className="text-stone-400 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.filter((item) => item.id === "inicio" || !item.ativo || podeVer(item.id)).map((item) => {
            const Icon = item.icon;
            const ativoAgora = aba === item.id;
            return (
              <button
                key={item.id}
                disabled={!item.ativo}
                onClick={() => { setAba(item.id); setBusca(""); setMenuAberto(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                  !item.ativo && "text-stone-600 cursor-not-allowed",
                  item.ativo && ativoAgora && "bg-teal-800 text-white font-medium",
                  item.ativo && !ativoAgora && "text-stone-300 hover:bg-stone-800 hover:text-white"
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {!item.ativo && <span className="text-[10px] text-stone-600">em breve</span>}
                {item.ativo && item.id !== "inicio" && nivelPermissao(item.id) === "visualizar" && (
                  <Eye size={12} className="text-stone-500 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ position: "relative" }} className="border-t border-stone-800 p-3">
          <button
            onClick={() => setMenuSessaoAberto(!menuSessaoAberto)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-stone-800 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-teal-800 text-teal-100 text-xs font-semibold flex items-center justify-center shrink-0">
              {iniciais(usuarioAtual?.nome || "?")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{usuarioAtual?.nome}</p>
              <p className="text-[11px] text-stone-400 truncate">{papelAtual?.nome}</p>
            </div>
            <ChevronDown size={14} className="text-stone-500 shrink-0" />
          </button>
          {menuSessaoAberto && (
            <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
              <p className="text-xs text-stone-500 px-3 pt-2.5 pb-2 truncate border-b border-stone-100">{usuarioAtual.email}</p>
              <button
                onClick={onSair}
                className="w-full text-left px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-stone-200 px-4 sm:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {!isDesktop && (
                <button
                  onClick={() => setMenuAberto(true)}
                  className="text-stone-500 hover:text-stone-800 -ml-1 p-1 shrink-0"
                  aria-label="Abrir menu"
                >
                  <Menu size={22} />
                </button>
              )}
              <div className="min-w-0">
                {aba !== "inicio" && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                    <span>Cadastros</span>
                    <ChevronRight size={12} />
                    <span className="text-stone-600 font-medium">{TITULOS_ABA[aba]}</span>
                  </div>
                )}
                <h1 className="text-lg sm:text-xl font-semibold text-stone-900 truncate">
                  {TITULOS_ABA[aba]}
                </h1>
              </div>
            </div>

            {isDesktop && aba !== "inicio" && aba !== "venda" && aba !== "fiscal" && (
              <div className="flex items-center gap-3 shrink-0">
                <div style={{ position: "relative", width: "260px" }}>
                  <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder={
                      aba === "clientes" ? "Buscar por nome ou documento..." :
                      aba === "fornecedores" ? "Buscar por nome ou documento..." :
                      aba === "financeiro" ? "Buscar por descrição..." :
                      aba === "entregas" ? "Buscar cliente por CPF ou CNPJ..." :
                      aba === "compras" ? "Buscar por fornecedor..." :
                      "Buscar produto..."
                    }
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white transition-shadow"
                  />
                </div>
                {podeEditar(aba) && (aba === "estoque" ? (
                  <button
                    onClick={() => setFormMovimentacao({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Nova
                  </button>
                ) : aba === "financeiro" ? (
                  <button
                    onClick={() => setFormLancamento({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Novo
                  </button>
                ) : aba === "entregas" ? (
                  <button
                    onClick={() => setFormEntrega({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Nova
                  </button>
                ) : aba === "compras" ? (
                  <button
                    onClick={() => setFormPedido({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Novo
                  </button>
                ) : (
                  <button
                    onClick={() => (aba === "clientes" ? setFormCliente({}) : aba === "fornecedores" ? setFormFornecedor({}) : setFormProduto({}))}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Novo
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="px-4 sm:px-8 py-5 sm:py-6 max-w-6xl">
          {aba === "inicio" && (
            <InicioView
              aPagar={aPagar}
              aReceber={aReceber}
              clientes={clientes}
              lancamentos={lancamentos}
              produtos={produtos}
              produtosEstoqueBaixo={produtosEstoqueBaixo}
              saldoMes={saldoMes}
              setAba={setAba}
              setFormCliente={setFormCliente}
              setFormFornecedor={setFormFornecedor}
              setFormLancamento={setFormLancamento}
              setFormMovimentacao={setFormMovimentacao}
              setFormPedido={setFormPedido}
              setFormProduto={setFormProduto}
              setSubEstoque={setSubEstoque}
              valorEmEstoque={valorEmEstoque}
              vencidos={vencidos}
            />
          )}
          {aba === "produtos" && (
            <ProdutosView
              barraBusca={barraBusca}
              fornecedoresPorId={fornecedoresPorId}
              produtos={produtos}
              produtosEstoqueBaixo={produtosEstoqueBaixo}
              produtosFiltrados={produtosFiltrados}
              setConfirmacao={setConfirmacao}
              setFormProduto={setFormProduto}
              valorEmEstoque={valorEmEstoque}
              barraBusca={barraBusca}
            />
          )}
          {aba === "clientes" && (
            <ClientesView
              barraBusca={barraBusca}
              clientes={clientes}
              clientesFiltrados={clientesFiltrados}
              setConfirmacao={setConfirmacao}
              setFormCliente={setFormCliente}
              barraBusca={barraBusca}
            />
          )}
          {aba === "fornecedores" && (
            <FornecedoresView
              barraBusca={barraBusca}
              fornecedores={fornecedores}
              fornecedoresFiltrados={fornecedoresFiltrados}
              setConfirmacao={setConfirmacao}
              setFormFornecedor={setFormFornecedor}
              barraBusca={barraBusca}
            />
          )}
          {aba === "estoque" && (
            <EstoqueView
              barraBusca={barraBusca}
              movimentacoesFiltradas={movimentacoesFiltradas}
              movimentacoesHoje={movimentacoesHoje}
              produtosEstoqueBaixo={produtosEstoqueBaixo}
              produtosFiltrados={produtosFiltrados}
              produtosPorId={produtosPorId}
              setFormMovimentacao={setFormMovimentacao}
              setSubEstoque={setSubEstoque}
              subEstoque={subEstoque}
              valorEmEstoque={valorEmEstoque}
              barraBusca={barraBusca}
            />
          )}
          {aba === "financeiro" && (
            <FinanceiroView
              aPagar={aPagar}
              aReceber={aReceber}
              alternarPago={alternarPago}
              barraBusca={barraBusca}
              clientesPorId={clientesPorId}
              filtroFinanceiro={filtroFinanceiro}
              lancamentosFiltrados={lancamentosFiltrados}
              saldoMes={saldoMes}
              setConfirmacao={setConfirmacao}
              setFiltroFinanceiro={setFiltroFinanceiro}
              setFormLancamento={setFormLancamento}
              vencidos={vencidos}
              barraBusca={barraBusca}
            />
          )}
          {aba === "entregas" && (
            <EntregasView
              avancarStatusEntrega={avancarStatusEntrega}
              barraBusca={barraBusca}
              cancelarEntrega={cancelarEntrega}
              clientesPorId={clientesPorId}
              entregasAtrasadas={entregasAtrasadas}
              entregasEmRota={entregasEmRota}
              entregasFiltradas={entregasFiltradas}
              entregasHoje={entregasHoje}
              entregasPendentes={entregasPendentes}
              filtroEntrega={filtroEntrega}
              setFiltroEntrega={setFiltroEntrega}
              setFormEntrega={setFormEntrega}
              barraBusca={barraBusca}
            />
          )}
          {aba === "compras" && (
            <ComprasView
              barraBusca={barraBusca}
              filtroPedido={filtroPedido}
              fornecedoresPorId={fornecedoresPorId}
              pedidosAtrasados={pedidosAtrasados}
              pedidosFiltrados={pedidosFiltrados}
              pedidosPendentesCount={pedidosPendentesCount}
              registrarRecebimento={registrarRecebimento}
              setConfirmacao={setConfirmacao}
              setFiltroPedido={setFiltroPedido}
              setFormPedido={setFormPedido}
              totalPedido={totalPedido}
              valorPedidosPendentes={valorPedidosPendentes}
              barraBusca={barraBusca}
            />
          )}
          {aba === "venda" && (
            <VendaView
              adicionarAoCarrinho={adicionarAoCarrinho}
              alterarQtdCarrinho={alterarQtdCarrinho}
              bipCodigo={bipCodigo}
              bipQuantidade={bipQuantidade}
              carrinho={carrinho}
              cepVenda={cepVenda}
              clienteVendaEncontrado={clienteVendaEncontrado}
              clienteVendaNaoEncontrado={clienteVendaNaoEncontrado}
              dataEntregaVenda={dataEntregaVenda}
              descontoTipo={descontoTipo}
              descontoValor={descontoValor}
              digitosDocVenda={digitosDocVenda}
              docClienteVenda={docClienteVenda}
              enderecoEntregaVenda={enderecoEntregaVenda}
              erroBip={erroBip}
              etapaVenda={etapaVenda}
              finalizarVenda={finalizarVenda}
              formaPagamentoVenda={formaPagamentoVenda}
              gerarNotaVenda={gerarNotaVenda}
              numeroVenda={numeroVenda}
              onCepVendaChange={onCepVendaChange}
              onNumeroVendaChange={onNumeroVendaChange}
              produtos={produtos}
              produtosPorId={produtosPorId}
              removerDoCarrinho={removerDoCarrinho}
              setBipCodigo={setBipCodigo}
              setBipQuantidade={setBipQuantidade}
              setDataEntregaVenda={setDataEntregaVenda}
              setDescontoTipo={setDescontoTipo}
              setDescontoValor={setDescontoValor}
              setDocClienteVenda={setDocClienteVenda}
              setEnderecoEntregaVenda={setEnderecoEntregaVenda}
              setErroBip={setErroBip}
              setEtapaVenda={setEtapaVenda}
              setFormCliente={setFormCliente}
              setFormaPagamentoVenda={setFormaPagamentoVenda}
              setGerarNotaVenda={setGerarNotaVenda}
              setTipoEntregaVenda={setTipoEntregaVenda}
              statusCepVenda={statusCepVenda}
              subtotalCarrinho={subtotalCarrinho}
              tipoEntregaVenda={tipoEntregaVenda}
              totalComDesconto={totalComDesconto}
              valorDesconto={valorDesconto}
            />
          )}
          {aba === "fiscal" && (
            <FiscalView
              clientesPorId={clientesPorId}
              empresaFiscal={empresaFiscal}
              gerarRascunhoNota={gerarRascunhoNota}
              integracaoConfigurada={integracaoConfigurada}
              notasComVenda={notasComVenda}
              notasFiscais={notasFiscais}
              salvarConfigFiscal={salvarConfigFiscal}
              setNotaPreview={setNotaPreview}
              setSubFiscal={setSubFiscal}
              subFiscal={subFiscal}
              vendasPendentesNota={vendasPendentesNota}
            />
          )}
          {aba === "usuarios" && (
            <UsuariosView
              barraBusca={barraBusca}
              papeis={papeis}
              papeisPorId={papeisPorId}
              setConfirmacao={setConfirmacao}
              setFormPapel={setFormPapel}
              setFormUsuario={setFormUsuario}
              setSubUsuarios={setSubUsuarios}
              subUsuarios={subUsuarios}
              usuarioLogadoId={usuarioAtual.id}
              usuarios={usuarios}
              barraBusca={barraBusca}
            />
          )}
        </main>
      </div>

      {formCliente !== null && (
        <ClienteForm inicial={formCliente} onSalvar={salvarCliente} onCancelar={() => setFormCliente(null)} />
      )}
      {formFornecedor !== null && (
        <FornecedorForm inicial={formFornecedor.id ? formFornecedor : null} onSalvar={salvarFornecedor} onCancelar={() => setFormFornecedor(null)} />
      )}
      {formPedido !== null && (
        <PedidoForm
          inicial={formPedido.id ? formPedido : null}
          fornecedores={fornecedores}
          produtos={produtos}
          onSalvar={salvarPedido}
          onCancelar={() => setFormPedido(null)}
        />
      )}
      {formUsuario !== null && (
        <UsuarioForm
          inicial={formUsuario.id ? formUsuario : null}
          papeis={papeis}
          onSalvar={salvarUsuario}
          onCancelar={() => setFormUsuario(null)}
        />
      )}
      {formPapel !== null && (
        <PapelForm
          inicial={formPapel.id ? formPapel : null}
          onSalvar={salvarPapel}
          onCancelar={() => setFormPapel(null)}
        />
      )}
      {formProduto !== null && (
        <ProdutoForm inicial={formProduto.id ? formProduto : null} fornecedores={fornecedores} onSalvar={salvarProduto} onCancelar={() => setFormProduto(null)} />
      )}
      {formMovimentacao !== null && (
        <MovimentacaoForm
          produtos={produtos}
          produtoInicial={formMovimentacao.produtoId ? produtosPorId[formMovimentacao.produtoId] : null}
          onSalvar={salvarMovimentacao}
          onCancelar={() => setFormMovimentacao(null)}
        />
      )}
      {formLancamento !== null && (
        <LancamentoForm
          inicial={formLancamento.id ? formLancamento : null}
          clientes={clientes}
          fornecedores={fornecedores}
          onSalvar={salvarLancamento}
          onCancelar={() => setFormLancamento(null)}
        />
      )}
      {confirmacao && (
        <ConfirmDialog
          titulo={
            confirmacao.tipo === "cliente" ? "Excluir cliente?" :
            confirmacao.tipo === "fornecedor" ? "Excluir fornecedor?" :
            confirmacao.tipo === "pedido" ? "Cancelar pedido?" :
            confirmacao.tipo === "usuario" ? "Excluir usuário?" :
            confirmacao.tipo === "papel" ? "Excluir papel?" :
            confirmacao.tipo === "produto" ? "Excluir produto?" :
            "Excluir lançamento?"
          }
          descricao={`"${confirmacao.nome}" será removido permanentemente. Essa ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
      {cupomAtual && (
        <CupomModal
          venda={cupomAtual}
          cliente={cupomAtual.clienteId ? clientesPorId[cupomAtual.clienteId] : null}
          onNovaVenda={() => setCupomAtual(null)}
          onFechar={() => setCupomAtual(null)}
        />
      )}
      {notaPreview && (
        <NotaPreviewModal
          nota={notaPreview}
          cliente={notaPreview.venda?.clienteId ? clientesPorId[notaPreview.venda.clienteId] : null}
          empresaFiscal={empresaFiscal}
          onFechar={() => setNotaPreview(null)}
        />
      )}
      {formEntrega !== null && (
        <EntregaForm
          inicial={formEntrega.id ? formEntrega : null}
          vendas={vendas}
          clientes={clientes}
          clientesPorId={clientesPorId}
          onSalvar={salvarEntrega}
          onCancelar={() => setFormEntrega(null)}
        />
      )}
    </div>
  );
}
