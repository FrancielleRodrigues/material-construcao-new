import { useState, useMemo, useEffect } from "react";
import { Users, Package, Plus, Search, X, Pencil, Trash2, Phone, MapPin, Ruler, Boxes, Warehouse, Wallet, FileText, Truck, AlertTriangle, ChevronRight, Building2, Loader2, CheckCircle2, Menu, History, ClipboardList, ArrowRightLeft, TrendingUp, TrendingDown, CalendarClock, Check, Landmark, ArrowRight, ShoppingCart, Receipt, Minus, ScanLine, FileClock, FileCheck2, Settings2, ShieldAlert, Info, ShieldCheck, Navigation, PackageCheck, PackageX, UserRound, CalendarDays, Factory, PackageOpen, UserCog, ChevronDown, Eye, Lock } from "lucide-react";
import { cn, moeda, formatarData, iniciais, hojeISO, formatarEndereco, totalVenda } from "./utils/format";
import { buscarCep } from "./utils/cep";
import { NAV_ITEMS, TITULOS_ABA, MOTIVOS_ENTRADA, MOTIVOS_SAIDA, FORMAS_PAGAMENTO, MODULOS_PERMISSAO, STATUS_ENTREGA } from "./data/constantes";
import { CLIENTES_INICIAIS, FORNECEDORES_INICIAIS, PEDIDOS_INICIAIS, PAPEIS_INICIAIS, USUARIOS_INICIAIS, PRODUTOS_INICIAIS, MOVIMENTACOES_INICIAIS, LANCAMENTOS_INICIAIS, VENDAS_INICIAIS, EMPRESA_FISCAL_INICIAL, ENTREGAS_INICIAIS } from "./data/iniciais";
import { CategoriaBadge } from "./components/ui/CategoriaBadge";
import { KpiCard } from "./components/ui/KpiCard";
import { EmptyState } from "./components/ui/EmptyState";
import { Campo } from "./components/ui/Campo";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { inputClasses } from "./components/ui/inputClasses";
import { ClienteForm } from "./modules/clientes/ClienteForm";
import { FornecedorForm } from "./modules/fornecedores/FornecedorForm";
import { ProdutoForm } from "./modules/produtos/ProdutoForm";
import { TipoMovimentoChip, BarraEstoque } from "./modules/estoque/estoqueUi";
import { MovimentacaoForm } from "./modules/estoque/MovimentacaoForm";
import { PedidoForm } from "./modules/compras/PedidoForm";
import { UsuarioForm } from "./modules/usuarios/UsuarioForm";
import { PapelForm } from "./modules/usuarios/PapelForm";
import { statusLancamento, StatusChip, TipoLancamentoChip } from "./modules/financeiro/financeiroUi";
import { LancamentoForm } from "./modules/financeiro/LancamentoForm";
import { CupomModal } from "./modules/venda/CupomModal";
import { ConfigFiscalForm } from "./modules/fiscal/ConfigFiscalForm";
import { NotaPreviewModal } from "./modules/fiscal/NotaPreviewModal";
import { StatusEntregaChip } from "./modules/entregas/entregasUi";
import { EntregaForm } from "./modules/entregas/EntregaForm";

export default function CadastroClientesProdutos() {
  const [aba, setAba] = useState("inicio");
  const [clientes, setClientes] = useState(CLIENTES_INICIAIS);
  const [fornecedores, setFornecedores] = useState(FORNECEDORES_INICIAIS);
  const [pedidos, setPedidos] = useState(PEDIDOS_INICIAIS);
  const [formPedido, setFormPedido] = useState(null);
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIAIS);
  const [papeis, setPapeis] = useState(PAPEIS_INICIAIS);
  const [usuarioLogadoId, setUsuarioLogadoId] = useState(1);
  const [formUsuario, setFormUsuario] = useState(null);
  const [formPapel, setFormPapel] = useState(null);
  const [subUsuarios, setSubUsuarios] = useState("usuarios");
  const [menuSessaoAberto, setMenuSessaoAberto] = useState(false);
  const [filtroPedido, setFiltroPedido] = useState("todos");
  const [produtos, setProdutos] = useState(PRODUTOS_INICIAIS);
  const [movimentacoes, setMovimentacoes] = useState(MOVIMENTACOES_INICIAIS);
  const [lancamentos, setLancamentos] = useState(LANCAMENTOS_INICIAIS);
  const [busca, setBusca] = useState("");
  const [formCliente, setFormCliente] = useState(null);
  const [formFornecedor, setFormFornecedor] = useState(null);
  const [formProduto, setFormProduto] = useState(null);
  const [formMovimentacao, setFormMovimentacao] = useState(null);
  const [formLancamento, setFormLancamento] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [vendas, setVendas] = useState(VENDAS_INICIAIS);
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
  const [entregas, setEntregas] = useState(ENTREGAS_INICIAIS);
  const [formEntrega, setFormEntrega] = useState(null);
  const [filtroEntrega, setFiltroEntrega] = useState("todas");
  const [subEstoque, setSubEstoque] = useState("posicao");
  const [filtroFinanceiro, setFiltroFinanceiro] = useState("todos");
  const [menuAberto, setMenuAberto] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

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
  const usuarioAtual = usuarios.find((u) => u.id === usuarioLogadoId) || usuarios[0];
  const papelAtual = usuarioAtual ? papeisPorId[usuarioAtual.papelId] : null;
  const nivelPermissao = (moduloId) => papelAtual?.permissoes?.[moduloId] || "nenhum";
  const podeVer = (moduloId) => nivelPermissao(moduloId) !== "nenhum";
  const podeEditar = (moduloId) => nivelPermissao(moduloId) === "editar";

  useEffect(() => {
    if (aba !== "inicio" && aba !== "venda" && !podeVer(aba)) {
      setAba("inicio");
    }
  }, [usuarioLogadoId]);

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

  function salvarCliente(dados) {
    setClientes(dados.id ? clientes.map((c) => (c.id === dados.id ? dados : c)) : [...clientes, { ...dados, id: Date.now() }]);
    setFormCliente(null);
    if (aba === "venda" && !dados.id) {
      setDocClienteVenda(dados.documento);
      setEtapaVenda("produtos");
    }
  }

  function salvarFornecedor(dados) {
    setFornecedores(dados.id ? fornecedores.map((f) => (f.id === dados.id ? dados : f)) : [...fornecedores, { ...dados, id: Date.now() }]);
    setFormFornecedor(null);
  }

  function salvarPedido(dados) {
    if (dados.id) {
      setPedidos(pedidos.map((p) => (p.id === dados.id ? dados : p)));
    } else {
      const numero = 5000 + pedidos.length + 1;
      setPedidos([{ ...dados, id: Date.now(), numero, data: hojeISO(), status: "pendente", dataRecebimento: null }, ...pedidos]);
    }
    setFormPedido(null);
  }

  function salvarUsuario(dados) {
    setUsuarios(dados.id ? usuarios.map((u) => (u.id === dados.id ? dados : u)) : [...usuarios, { ...dados, id: Date.now() }]);
    setFormUsuario(null);
  }

  function salvarPapel(dados) {
    setPapeis(dados.id ? papeis.map((p) => (p.id === dados.id ? dados : p)) : [...papeis, { ...dados, id: `papel_${Date.now()}` }]);
    setFormPapel(null);
  }


  function registrarRecebimento(pedido) {
    setProdutos(produtos.map((p) => {
      const item = pedido.itens.find((i) => i.produtoId === p.id);
      return item ? { ...p, estoque: p.estoque + item.quantidade } : p;
    }));

    setMovimentacoes([
      ...pedido.itens.map((i) => ({
        id: Date.now() + i.produtoId,
        produtoId: i.produtoId,
        tipo: "entrada",
        quantidade: i.quantidade,
        motivo: "compra",
        observacao: `Pedido de compra nº ${pedido.numero}`,
        data: hojeISO(),
      })),
      ...movimentacoes,
    ]);

    const fornecedor = fornecedoresPorId[pedido.fornecedorId];
    setLancamentos([
      {
        id: Date.now() + 1,
        tipo: "despesa",
        descricao: `Compra - Pedido nº ${pedido.numero}`,
        valor: totalPedido(pedido),
        vencimento: hojeISO(),
        pago: false,
        dataPagamento: null,
        clienteId: null,
        fornecedorId: pedido.fornecedorId,
        contraparte: fornecedor ? fornecedor.nome : "",
        formaPagamento: "boleto",
        observacao: "",
      },
      ...lancamentos,
    ]);

    setPedidos(pedidos.map((p) => (p.id === pedido.id ? { ...p, status: "recebido", dataRecebimento: hojeISO() } : p)));
  }

  function salvarProduto(dados) {
    setProdutos(dados.id ? produtos.map((p) => (p.id === dados.id ? dados : p)) : [...produtos, { ...dados, id: Date.now() }]);
    setFormProduto(null);
  }

  function salvarMovimentacao(dados) {
    setProdutos(produtos.map((p) => {
      if (p.id !== dados.produtoId) return p;
      const delta = dados.tipo === "entrada" ? dados.quantidade : -dados.quantidade;
      return { ...p, estoque: Math.max(0, p.estoque + delta) };
    }));
    setMovimentacoes([{ ...dados, id: Date.now() }, ...movimentacoes]);
    setFormMovimentacao(null);
  }

  function salvarLancamento(dados) {
    setLancamentos(dados.id ? lancamentos.map((l) => (l.id === dados.id ? dados : l)) : [...lancamentos, { ...dados, id: Date.now() }]);
    setFormLancamento(null);
  }

  function alternarPago(lancamento) {
    setLancamentos(lancamentos.map((l) =>
      l.id === lancamento.id ? { ...l, pago: !l.pago, dataPagamento: !l.pago ? hojeISO() : null } : l
    ));
  }

  function confirmarExclusao() {
    if (!confirmacao) return;
    if (confirmacao.tipo === "cliente") setClientes(clientes.filter((c) => c.id !== confirmacao.id));
    if (confirmacao.tipo === "fornecedor") setFornecedores(fornecedores.filter((f) => f.id !== confirmacao.id));
    if (confirmacao.tipo === "pedido") setPedidos(pedidos.filter((p) => p.id !== confirmacao.id));
    if (confirmacao.tipo === "usuario") setUsuarios(usuarios.filter((u) => u.id !== confirmacao.id));
    if (confirmacao.tipo === "papel") setPapeis(papeis.filter((p) => p.id !== confirmacao.id));
    if (confirmacao.tipo === "produto") setProdutos(produtos.filter((p) => p.id !== confirmacao.id));
    if (confirmacao.tipo === "lancamento") setLancamentos(lancamentos.filter((l) => l.id !== confirmacao.id));
    setConfirmacao(null);
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

  function finalizarVenda() {
    if (carrinho.length === 0) return;

    const itens = carrinho.map((i) => {
      const produto = produtosPorId[i.produtoId];
      return { produtoId: i.produtoId, nome: produto.nome, quantidade: i.quantidade, precoUnitario: produto.preco };
    });
    const subtotal = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    const desconto = Math.min(Math.max(
      descontoTipo === "percentual" ? subtotal * ((parseFloat(descontoValor) || 0) / 100) : (parseFloat(descontoValor) || 0),
      0
    ), subtotal);
    const total = subtotal - desconto;
    const numero = 1000 + vendas.length + 1;
    const clienteId = clienteVendaEncontrado ? clienteVendaEncontrado.id : null;
    const novaVendaObj = {
      id: Date.now(),
      numero,
      data: hojeISO(),
      clienteId,
      formaPagamento: formaPagamentoVenda,
      itens,
      subtotal,
      desconto: { tipo: descontoTipo, valor: parseFloat(descontoValor) || 0, valorCalculado: desconto },
      total,
      tipoEntrega: tipoEntregaVenda,
      enderecoEntrega: tipoEntregaVenda === "entrega" ? enderecoEntregaVenda : "",
      notaGerada: gerarNotaVenda,
    };

    setProdutos(produtos.map((p) => {
      const item = carrinho.find((i) => i.produtoId === p.id);
      return item ? { ...p, estoque: p.estoque - item.quantidade } : p;
    }));

    setMovimentacoes([
      ...itens.map((i) => ({
        id: Date.now() + i.produtoId,
        produtoId: i.produtoId,
        tipo: "saida",
        quantidade: i.quantidade,
        motivo: "venda",
        observacao: `Venda PDV nº ${numero}`,
        data: hojeISO(),
      })),
      ...movimentacoes,
    ]);

    setLancamentos([
      {
        id: Date.now() + 1,
        tipo: "receita",
        descricao: `Venda PDV nº ${numero}`,
        valor: total,
        vencimento: hojeISO(),
        pago: formaPagamentoVenda !== "boleto",
        dataPagamento: formaPagamentoVenda !== "boleto" ? hojeISO() : null,
        clienteId,
        contraparte: "",
        formaPagamento: formaPagamentoVenda,
        observacao: "",
      },
      ...lancamentos,
    ]);

    if (tipoEntregaVenda === "entrega") {
      setEntregas([
        {
          id: Date.now() + 2,
          vendaId: novaVendaObj.id,
          clienteId,
          endereco: enderecoEntregaVenda,
          itensDescricao: itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", "),
          dataPrevista: dataEntregaVenda,
          motorista: "", veiculo: "", status: "pendente", observacao: `Gerada a partir da venda PDV nº ${numero}`,
        },
        ...entregas,
      ]);
    }

    if (gerarNotaVenda) {
      setNotasFiscais([
        {
          id: Date.now() + 3,
          vendaId: novaVendaObj.id,
          numero: empresaFiscal.proximoNumero,
          serie: empresaFiscal.serieNFe,
          status: "rascunho",
          dataGeracao: hojeISO(),
        },
        ...notasFiscais,
      ]);
      setEmpresaFiscal({ ...empresaFiscal, proximoNumero: empresaFiscal.proximoNumero + 1 });
    }

    setVendas([novaVendaObj, ...vendas]);
    setCupomAtual(novaVendaObj);
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


  function salvarConfigFiscal(dados) {
    setEmpresaFiscal(dados);
  }

  function gerarRascunhoNota(venda) {
    const nota = {
      id: Date.now(),
      vendaId: venda.id,
      numero: empresaFiscal.proximoNumero,
      serie: empresaFiscal.serieNFe,
      status: "rascunho",
      dataGeracao: hojeISO(),
    };
    setNotasFiscais([nota, ...notasFiscais]);
    setEmpresaFiscal({ ...empresaFiscal, proximoNumero: empresaFiscal.proximoNumero + 1 });
  }

  function salvarEntrega(dados) {
    setEntregas(dados.id ? entregas.map((e) => (e.id === dados.id ? dados : e)) : [...entregas, { ...dados, id: Date.now(), status: "pendente" }]);
    setFormEntrega(null);
  }

  function avancarStatusEntrega(entrega) {
    const ordem = ["pendente", "em_rota", "entregue"];
    const idx = ordem.indexOf(entrega.status);
    if (idx === -1 || idx === ordem.length - 1) return;
    setEntregas(entregas.map((e) => (e.id === entrega.id ? { ...e, status: ordem[idx + 1] } : e)));
  }

  function cancelarEntrega(id) {
    setEntregas(entregas.map((e) => (e.id === id ? { ...e, status: "cancelada" } : e)));
  }

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans">
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
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide px-3 pt-2.5 pb-1">Trocar sessão (teste)</p>
              {usuarios.filter((u) => u.ativo).map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setUsuarioLogadoId(u.id); setMenuSessaoAberto(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center justify-between gap-2",
                    u.id === usuarioLogadoId ? "text-teal-800 font-medium" : "text-stone-600"
                  )}
                >
                  <span className="truncate">{u.nome}</span>
                  <span className="text-xs text-stone-400 shrink-0">{papeisPorId[u.papelId]?.nome}</span>
                </button>
              ))}
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
            <div className="space-y-6">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem" }}>
                <KpiCard label="Clientes cadastrados" valor={clientes.length} icon={Users} tom="bg-teal-50 text-teal-700" />
                <KpiCard label="Produtos cadastrados" valor={produtos.length} icon={Package} tom="bg-teal-50 text-teal-700" />
                <KpiCard label="Itens com estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
                <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Boxes} tom="bg-amber-50 text-amber-700" />
                <KpiCard
                  label="Saldo do mês"
                  valor={moeda(saldoMes)}
                  icon={Landmark}
                  tom={saldoMes >= 0 ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}
                />
                <KpiCard label="A receber" valor={moeda(aReceber)} icon={TrendingUp} tom="bg-emerald-50 text-emerald-700" />
                <KpiCard label="A pagar" valor={moeda(aPagar)} icon={TrendingDown} tom="bg-amber-50 text-amber-700" />
                <KpiCard label="Lançamentos vencidos" valor={vencidos} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Ações rápidas</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>
                  {[
                    { label: "Nova venda", icon: ScanLine, onClick: () => setAba("venda") },
                    { label: "Novo cliente", icon: Users, onClick: () => { setAba("clientes"); setFormCliente({}); } },
                    { label: "Novo fornecedor", icon: Factory, onClick: () => { setAba("fornecedores"); setFormFornecedor({}); } },
                    { label: "Novo pedido", icon: PackageOpen, onClick: () => { setAba("compras"); setFormPedido({}); } },
                    { label: "Novo produto", icon: Package, onClick: () => { setAba("produtos"); setFormProduto({}); } },
                    { label: "Movimentar estoque", icon: ArrowRightLeft, onClick: () => { setAba("estoque"); setFormMovimentacao({}); } },
                    { label: "Novo lançamento", icon: Wallet, onClick: () => { setAba("financeiro"); setFormLancamento({}); } },
                  ].map((a) => (
                    <button
                      key={a.label}
                      onClick={a.onClick}
                      className="bg-white border border-stone-200 rounded-xl px-4 py-4 flex flex-col items-center gap-2 text-center hover:border-teal-700/40 hover:bg-teal-50/30 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
                        <a.icon size={17} />
                      </div>
                      <span className="text-xs font-medium text-stone-700">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <p className="font-semibold text-stone-800 text-sm">Contas a vencer</p>
                    <button
                      onClick={() => setAba("financeiro")}
                      className="text-xs text-teal-800 font-medium flex items-center gap-1 hover:underline"
                    >
                      Ver tudo <ArrowRight size={12} />
                    </button>
                  </div>
                  {lancamentos.filter((l) => !l.pago).length === 0 ? (
                    <p className="text-sm text-stone-400 px-5 py-6 text-center">Nenhuma conta pendente.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {[...lancamentos]
                        .filter((l) => !l.pago)
                        .sort((a, b) => (a.vencimento > b.vencimento ? 1 : -1))
                        .slice(0, 5)
                        .map((l) => {
                          const status = statusLancamento(l);
                          return (
                            <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-stone-800 truncate">{l.descricao}</p>
                                <p className="text-xs text-stone-400">{formatarData(l.vencimento)}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn("text-sm font-medium tabular-nums", l.tipo === "receita" ? "text-emerald-700" : "text-stone-700")}>
                                  {moeda(l.valor)}
                                </span>
                                <StatusChip status={status} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <p className="font-semibold text-stone-800 text-sm">Estoque baixo</p>
                    <button
                      onClick={() => { setAba("estoque"); setSubEstoque("posicao"); }}
                      className="text-xs text-teal-800 font-medium flex items-center gap-1 hover:underline"
                    >
                      Ver tudo <ArrowRight size={12} />
                    </button>
                  </div>
                  {produtos.filter((p) => p.estoque <= p.estoqueMin).length === 0 ? (
                    <p className="text-sm text-stone-400 px-5 py-6 text-center">Nenhum item abaixo do mínimo.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {produtos.filter((p) => p.estoque <= p.estoqueMin).slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{p.nome}</p>
                            <div className="mt-1"><CategoriaBadge categoriaId={p.categoria} /></div>
                          </div>
                          <span className="text-sm font-medium text-red-600 tabular-nums shrink-0">
                            {p.estoque} {p.unidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {aba === "produtos" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Produtos cadastrados" valor={produtos.length} icon={Package} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Wallet} tom="bg-amber-50 text-amber-700" />
            </div>
          )}
          {aba === "clientes" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Clientes cadastrados" valor={clientes.length} icon={Users} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Pessoas jurídicas" valor={clientes.filter((c) => c.tipo === "PJ").length} icon={Building2} tom="bg-slate-50 text-slate-700" />
              <KpiCard label="Pessoas físicas" valor={clientes.filter((c) => c.tipo === "PF").length} icon={Users} tom="bg-amber-50 text-amber-700" />
            </div>
          )}
          {aba === "fornecedores" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Fornecedores cadastrados" valor={fornecedores.length} icon={Factory} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Pessoas jurídicas" valor={fornecedores.filter((f) => f.tipo === "PJ").length} icon={Building2} tom="bg-slate-50 text-slate-700" />
              <KpiCard label="Pessoas físicas" valor={fornecedores.filter((f) => f.tipo === "PF").length} icon={Users} tom="bg-amber-50 text-amber-700" />
            </div>
          )}
          {aba === "estoque" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Itens com estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Wallet} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Movimentações hoje" valor={movimentacoesHoje} icon={ArrowRightLeft} tom="bg-teal-50 text-teal-700" />
            </div>
          )}

          {aba === "estoque" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs mb-4">
              {[
                { id: "posicao", label: "Posição atual", icon: ClipboardList },
                { id: "historico", label: "Histórico", icon: History },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubEstoque(s.id)}
                  className={cn(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                    subEstoque === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  <s.icon size={14} /> {s.label}
                </button>
              ))}
            </div>
          )}

          {aba === "financeiro" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard
                label="Saldo do mês"
                valor={moeda(saldoMes)}
                icon={Landmark}
                tom={saldoMes >= 0 ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}
              />
              <KpiCard label="A receber" valor={moeda(aReceber)} icon={TrendingUp} tom="bg-emerald-50 text-emerald-700" />
              <KpiCard label="A pagar" valor={moeda(aPagar)} icon={TrendingDown} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Lançamentos vencidos" valor={vencidos} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
            </div>
          )}

          {aba === "financeiro" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-md mb-4">
              {[
                { id: "todos", label: "Todos" },
                { id: "receber", label: "A receber" },
                { id: "pagar", label: "A pagar" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroFinanceiro(f.id)}
                  className={cn(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                    filtroFinanceiro === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {aba === "entregas" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Pendentes" valor={entregasPendentes} icon={FileClock} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Em rota" valor={entregasEmRota} icon={Navigation} tom="bg-sky-50 text-sky-700" />
              <KpiCard label="Atrasadas" valor={entregasAtrasadas} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              <KpiCard label="Entregues hoje" valor={entregasHoje} icon={PackageCheck} tom="bg-emerald-50 text-emerald-700" />
            </div>
          )}

          {aba === "entregas" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg overflow-x-auto mb-4">
              {[{ id: "todas", label: "Todas" }, ...STATUS_ENTREGA].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroEntrega(f.id)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                    filtroEntrega === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {aba === "compras" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Pedidos pendentes" valor={pedidosPendentesCount} icon={PackageOpen} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Valor pendente" valor={moeda(valorPedidosPendentes)} icon={Wallet} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Atrasados" valor={pedidosAtrasados} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
            </div>
          )}

          {aba === "compras" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg overflow-x-auto mb-4">
              {[
                { id: "todos", label: "Todos" },
                { id: "pendente", label: "Pendentes" },
                { id: "recebido", label: "Recebidos" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroPedido(f.id)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                    filtroPedido === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {!isDesktop && aba !== "inicio" && aba !== "venda" && aba !== "fiscal" && (
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
          )}

          {aba === "venda" && etapaVenda === "inicio" && (
            <div className="max-w-md mx-auto bg-white rounded-xl border border-stone-200 p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                <ScanLine size={24} className="text-teal-700" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1.5">Nova venda</h2>
              <p className="text-sm text-stone-500 mb-6">Identifique o cliente para começar a venda.</p>
              <button
                onClick={() => setEtapaVenda("cliente")}
                className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus size={16} /> Iniciar venda
              </button>
            </div>
          )}

          {aba === "venda" && etapaVenda === "cliente" && (
            <div className="max-w-md mx-auto bg-white rounded-xl border border-stone-200 p-6 space-y-4">
              <p className="text-xs font-semibold text-teal-800">Cliente</p>
              <Campo label="CPF ou CNPJ">
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                  <input
                    autoFocus
                    value={docClienteVenda}
                    onChange={(e) => setDocClienteVenda(e.target.value)}
                    className={cn(inputClasses, "pl-8")}
                    placeholder="Digite o CPF ou CNPJ"
                    inputMode="numeric"
                    onKeyDown={(e) => { if (e.key === "Enter" && clienteVendaEncontrado) setEtapaVenda("produtos"); }}
                  />
                </div>

                {clienteVendaEncontrado ? (
                  <div className="flex items-center justify-between gap-2 mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span className="text-sm text-emerald-800 truncate">{clienteVendaEncontrado.nome}</span>
                    </div>
                    <button
                      onClick={() => setDocClienteVenda("")}
                      className="text-emerald-700 hover:text-emerald-900 shrink-0"
                      aria-label="Remover cliente"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : clienteVendaNaoEncontrado ? (
                  <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                    <p className="text-sm text-amber-800 mb-2">Cliente não encontrado.</p>
                    <button
                      onClick={() => setFormCliente({
                        tipo: digitosDocVenda.length === 14 ? "PJ" : "PF",
                        documento: docClienteVenda,
                      })}
                      className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={14} /> Cadastrar cliente agora
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 mt-1.5">Deixe em branco para consumidor não identificado.</p>
                )}
              </Campo>

              <div className="pt-2">
                {clienteVendaEncontrado ? (
                  <button
                    onClick={() => setEtapaVenda("produtos")}
                    className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={() => { setDocClienteVenda(""); setEtapaVenda("produtos"); }}
                    className="w-full text-sm text-stone-500 hover:text-stone-700 py-2"
                  >
                    Continuar sem identificar cliente
                  </button>
                )}
              </div>
            </div>
          )}

          {aba === "venda" && etapaVenda === "produtos" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5">
                  <p className="text-xs font-semibold text-teal-800 mb-3">1. Produtos <span className="text-stone-400 font-normal normal-case">— bipe ou digite o código, o estoque é validado automaticamente</span></p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div style={{ position: "relative" }} className="flex-1">
                      <ScanLine size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                      <input
                        value={bipCodigo}
                        onChange={(e) => { setBipCodigo(e.target.value); setErroBip(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") adicionarAoCarrinho(); }}
                        placeholder="Bipe ou digite o código de barras"
                        className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-shadow"
                      />
                    </div>
                    <div className="flex gap-3">
                      <input
                        value={bipQuantidade}
                        onChange={(e) => setBipQuantidade(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => { if (e.key === "Enter") adicionarAoCarrinho(); }}
                        placeholder="Qtd"
                        inputMode="numeric"
                        style={{ width: "4.5rem" }}
                        className="shrink-0 px-3 py-2.5 border border-stone-300 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-shadow"
                      />
                      <button
                        onClick={adicionarAoCarrinho}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                      >
                        <Plus size={16} /> Adicionar
                      </button>
                    </div>
                  </div>
                  {erroBip && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{erroBip}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-3">
                    Códigos de exemplo: {produtos.slice(0, 3).map((p) => p.codigoBarras).join(" · ")}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {carrinho.length === 0 ? (
                    <EmptyState icon={ShoppingCart} title="Carrinho vazio" subtitle="Bipe o código de um produto para começar a venda." />
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {carrinho.map((item) => {
                        const produto = produtosPorId[item.produtoId];
                        if (!produto) return null;
                        return (
                          <div key={item.produtoId} className="flex items-center gap-3 p-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-stone-800 truncate">{produto.nome}</p>
                              <p className="text-xs text-stone-400">{moeda(produto.preco)} / {produto.unidade}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => alterarQtdCarrinho(item.produtoId, item.quantidade - 1)}
                                className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50"
                                aria-label="Diminuir"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantidade}</span>
                              <button
                                onClick={() => alterarQtdCarrinho(item.produtoId, item.quantidade + 1)}
                                className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 disabled:opacity-30"
                                disabled={item.quantidade >= produto.estoque}
                                aria-label="Aumentar"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <span className="w-24 text-right font-medium text-stone-800 tabular-nums shrink-0">
                              {moeda(item.quantidade * produto.preco)}
                            </span>
                            <button
                              onClick={() => removerDoCarrinho(item.produtoId)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-red-600 shrink-0"
                              aria-label="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 space-y-5 lg:sticky lg:top-6">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Resumo da venda</p>

                <div>
                  <p className="text-xs font-semibold text-teal-800 mb-2">2. Cliente</p>
                  <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5">
                    <div className="min-w-0 flex items-center gap-1.5">
                      {clienteVendaEncontrado ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span className="text-sm text-stone-800 truncate">{clienteVendaEncontrado.nome}</span>
                        </>
                      ) : (
                        <span className="text-sm text-stone-500">Consumidor não identificado</span>
                      )}
                    </div>
                    <button
                      onClick={() => setEtapaVenda("cliente")}
                      className="text-xs font-medium text-teal-700 hover:text-teal-900 shrink-0"
                    >
                      Trocar
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">3. Desconto</p>
                  <div className="flex gap-2">
                    <div className="flex gap-1 p-1 bg-stone-100 rounded-lg shrink-0">
                      {[{ id: "percentual", label: "%" }, { id: "valor", label: "R$" }].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setDescontoTipo(t.id)}
                          className={cn(
                            "w-10 py-1.5 rounded-md text-xs font-medium transition-colors",
                            descontoTipo === t.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={descontoValor}
                      onChange={(e) => setDescontoValor(e.target.value)}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                  {valorDesconto > 0 && (
                    <p className="text-xs text-emerald-700 mt-1.5">Desconto de {moeda(valorDesconto)} aplicado</p>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">4. Entrega ou retirada</p>
                  <div className="flex gap-2 p-1 bg-stone-100 rounded-lg mb-3">
                    <button
                      onClick={() => setTipoEntregaVenda("retirada")}
                      className={cn(
                        "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                        tipoEntregaVenda === "retirada" ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                      )}
                    >
                      Retirada no balcão
                    </button>
                    <button
                      onClick={() => {
                        setTipoEntregaVenda("entrega");
                        if (!enderecoEntregaVenda && clienteVendaEncontrado) {
                          setEnderecoEntregaVenda(formatarEndereco(clienteVendaEncontrado.endereco));
                        }
                      }}
                      className={cn(
                        "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                        tipoEntregaVenda === "entrega" ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                      )}
                    >
                      Entrega
                    </button>
                  </div>
                  {tipoEntregaVenda === "entrega" && (
                    <div className="space-y-3">
                      <Campo label="Buscar endereço por CEP (opcional)">
                        <div className="flex gap-2">
                          <div style={{ position: "relative" }} className="flex-1">
                            <input
                              value={cepVenda}
                              onChange={(e) => onCepVendaChange(e.target.value)}
                              className={inputClasses}
                              placeholder="00000-000"
                              inputMode="numeric"
                            />
                            <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
                              {statusCepVenda === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                              {statusCepVenda === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
                            </div>
                          </div>
                          <input
                            value={numeroVenda}
                            onChange={(e) => onNumeroVendaChange(e.target.value)}
                            className={inputClasses}
                            placeholder="Número"
                            style={{ width: "100px" }}
                          />
                        </div>
                        {statusCepVenda === "nao_encontrado" && (
                          <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha abaixo manualmente.</p>
                        )}
                      </Campo>
                      <Campo label="Endereço de entrega">
                        <input
                          value={enderecoEntregaVenda}
                          onChange={(e) => setEnderecoEntregaVenda(e.target.value)}
                          className={inputClasses}
                          placeholder="Rua, número - Bairro, Cidade/UF"
                        />
                      </Campo>
                      <Campo label="Data prevista">
                        <input
                          type="date"
                          value={dataEntregaVenda}
                          onChange={(e) => setDataEntregaVenda(e.target.value)}
                          className={inputClasses}
                        />
                      </Campo>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">5. Pagamento</p>
                  <Campo label="Forma de pagamento">
                    <select
                      value={formaPagamentoVenda}
                      onChange={(e) => setFormaPagamentoVenda(e.target.value)}
                      className={cn(inputClasses, "bg-white")}
                    >
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </Campo>
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">6. Documento fiscal</p>
                  <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gerarNotaVenda}
                      onChange={(e) => setGerarNotaVenda(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
                    />
                    Gerar rascunho de NF-e ao finalizar
                  </label>
                  <p className="text-xs text-stone-400 mt-1">Sem validade fiscal — fica disponível em Fiscal → Rascunhos.</p>
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-stone-500">
                    <span>Itens</span>
                    <span className="tabular-nums">{carrinho.reduce((s, i) => s + i.quantidade, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-stone-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{moeda(subtotalCarrinho)}</span>
                  </div>
                  {valorDesconto > 0 && (
                    <div className="flex items-center justify-between text-sm text-emerald-700">
                      <span>Desconto</span>
                      <span className="tabular-nums">− {moeda(valorDesconto)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-semibold text-stone-900">Total</span>
                    <span className="text-xl font-bold text-teal-800 tabular-nums">{moeda(totalComDesconto)}</span>
                  </div>
                </div>

                <button
                  onClick={finalizarVenda}
                  disabled={carrinho.length === 0 || (tipoEntregaVenda === "entrega" && !enderecoEntregaVenda.trim())}
                  className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Receipt size={16} /> Finalizar venda
                </button>
              </div>
            </div>
          )}

          {aba === "clientes" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {clientesFiltrados.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum cliente encontrado"
                  subtitle="Cadastre o primeiro cliente para começar a usar o sistema."
                  acao="Novo"
                  onAcao={() => setFormCliente({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Cliente</th>
                        <th className="text-left px-5 py-3 font-medium">Documento</th>
                        <th className="text-left px-5 py-3 font-medium">Contato</th>
                        <th className="text-left px-5 py-3 font-medium">Endereço</th>
                        <th className="px-5 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {clientesFiltrados.map((c) => (
                        <tr key={c.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                                {iniciais(c.nome)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-stone-800 truncate">{c.nome}</p>
                                <p className="text-xs text-stone-400">{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{c.documento}</td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-stone-400" />{c.telefone}</span>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600">
                            <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-stone-400 shrink-0" />{formatarEndereco(c.endereco)}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setFormCliente(c)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setConfirmacao({ tipo: "cliente", id: c.id, nome: c.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {clientesFiltrados.map((c) => (
                      <div key={c.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                            {iniciais(c.nome)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-stone-800 truncate">{c.nome}</p>
                            <p className="text-xs text-stone-400 mb-2">{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"} · {c.documento}</p>
                            <p className="text-xs text-stone-600 flex items-center gap-1.5 mb-1">
                              <Phone size={12} className="text-stone-400 shrink-0" />{c.telefone}
                            </p>
                            <p className="text-xs text-stone-600 flex items-start gap-1.5">
                              <MapPin size={12} className="text-stone-400 shrink-0 mt-0.5" />{formatarEndereco(c.endereco)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => setFormCliente(c)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "cliente", id: c.id, nome: c.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "fornecedores" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {fornecedoresFiltrados.length === 0 ? (
                <EmptyState
                  icon={Factory}
                  title="Nenhum fornecedor encontrado"
                  subtitle="Cadastre o primeiro fornecedor para começar a usar o sistema."
                  acao="Novo"
                  onAcao={() => setFormFornecedor({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Fornecedor</th>
                        <th className="text-left px-5 py-3 font-medium">Documento</th>
                        <th className="text-left px-5 py-3 font-medium">Fornece</th>
                        <th className="text-left px-5 py-3 font-medium">Contato</th>
                        <th className="text-left px-5 py-3 font-medium">Pagamento</th>
                        <th className="px-5 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {fornecedoresFiltrados.map((f) => (
                        <tr key={f.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                                {iniciais(f.nome)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-stone-800 truncate">{f.nome}</p>
                                <p className="text-xs text-stone-400">{f.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{f.documento}</td>
                          <td className="px-5 py-3.5"><CategoriaBadge categoriaId={f.categoria} /></td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-stone-400" />{f.telefone}</span>
                          </td>
                          <td className="px-5 py-3.5 text-stone-500">{f.condicaoPagamento || "—"}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setFormFornecedor(f)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setConfirmacao({ tipo: "fornecedor", id: f.id, nome: f.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {fornecedoresFiltrados.map((f) => (
                      <div key={f.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                            {iniciais(f.nome)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-stone-800 truncate">{f.nome}</p>
                            <p className="text-xs text-stone-400 mb-2">{f.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"} · {f.documento}</p>
                            <div className="mb-2"><CategoriaBadge categoriaId={f.categoria} /></div>
                            <p className="text-xs text-stone-600 flex items-center gap-1.5 mb-1">
                              <Phone size={12} className="text-stone-400 shrink-0" />{f.telefone}
                            </p>
                            {f.condicaoPagamento && (
                              <p className="text-xs text-stone-400">Pagamento: {f.condicaoPagamento}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => setFormFornecedor(f)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "fornecedor", id: f.id, nome: f.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "produtos" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {produtosFiltrados.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhum produto encontrado"
                  subtitle="Cadastre o primeiro produto para começar a controlar o estoque."
                  acao="Novo"
                  onAcao={() => setFormProduto({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Produto</th>
                        <th className="text-left px-5 py-3 font-medium">Categoria</th>
                        <th className="text-left px-5 py-3 font-medium">Fornecedor</th>
                        <th className="text-left px-5 py-3 font-medium">Unidade</th>
                        <th className="text-left px-5 py-3 font-medium">Preço</th>
                        <th className="text-left px-5 py-3 font-medium">Estoque</th>
                        <th className="px-5 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {produtosFiltrados.map((p) => (
                        <tr key={p.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-stone-800">{p.nome}</td>
                          <td className="px-5 py-3.5"><CategoriaBadge categoriaId={p.categoria} /></td>
                          <td className="px-5 py-3.5 text-stone-500">
                            {p.fornecedorId && fornecedoresPorId[p.fornecedorId] ? fornecedoresPorId[p.fornecedorId].nome : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-stone-600">
                            <span className="inline-flex items-center gap-1.5"><Ruler size={13} className="text-stone-400" />{p.unidade}</span>
                          </td>
                          <td className="px-5 py-3.5 text-stone-700 tabular-nums">{moeda(p.preco)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                                {p.estoque}
                              </span>
                              {p.estoque <= p.estoqueMin && (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={11} /> Baixo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setFormProduto(p)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setConfirmacao({ tipo: "produto", id: p.id, nome: p.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {produtosFiltrados.map((p) => (
                      <div key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-medium text-stone-800 min-w-0">{p.nome}</p>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setFormProduto(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "produto", id: p.id, nome: p.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mb-2"><CategoriaBadge categoriaId={p.categoria} /></div>
                        {p.fornecedorId && fornecedoresPorId[p.fornecedorId] && (
                          <p className="text-xs text-stone-400 mb-2 flex items-center gap-1"><Factory size={11} />{fornecedoresPorId[p.fornecedorId].nome}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-stone-600">
                          <span className="inline-flex items-center gap-1.5"><Ruler size={12} className="text-stone-400" />{p.unidade}</span>
                          <span className="tabular-nums font-medium text-stone-700">{moeda(p.preco)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn("text-xs font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-500")}>
                            Estoque: {p.estoque}
                          </span>
                          {p.estoque <= p.estoqueMin && (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={11} /> Baixo
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "estoque" && subEstoque === "posicao" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {produtosFiltrados.length === 0 ? (
                <EmptyState icon={Warehouse} title="Nenhum produto encontrado" subtitle="Cadastre produtos para começar a controlar o estoque." />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Produto</th>
                        <th className="text-left px-5 py-3 font-medium">Categoria</th>
                        <th className="text-left px-5 py-3 font-medium">Estoque</th>
                        <th className="text-left px-5 py-3 font-medium">Nível</th>
                        <th className="text-left px-5 py-3 font-medium">Mínimo</th>
                        <th className="px-5 py-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {produtosFiltrados.map((p) => (
                        <tr key={p.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-stone-800">{p.nome}</td>
                          <td className="px-5 py-3.5"><CategoriaBadge categoriaId={p.categoria} /></td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                                {p.estoque} {p.unidade}
                              </span>
                              {p.estoque <= p.estoqueMin && (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={11} /> Baixo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><BarraEstoque produto={p} /></td>
                          <td className="px-5 py-3.5 text-stone-500 tabular-nums">{p.estoqueMin} {p.unidade}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setFormMovimentacao({ produtoId: p.id })}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200"
                                aria-label="Movimentar"
                              >
                                <ArrowRightLeft size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {produtosFiltrados.map((p) => (
                      <div key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-medium text-stone-800 min-w-0">{p.nome}</p>
                          <button
                            onClick={() => setFormMovimentacao({ produtoId: p.id })}
                            className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 shrink-0"
                            aria-label="Movimentar"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        </div>
                        <div className="mb-2"><CategoriaBadge categoriaId={p.categoria} /></div>
                        <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
                          <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                            {p.estoque} {p.unidade}
                          </span>
                          <span className="text-stone-400">mínimo: {p.estoqueMin} {p.unidade}</span>
                        </div>
                        <BarraEstoque produto={p} />
                        {p.estoque <= p.estoqueMin && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full mt-2">
                            <AlertTriangle size={11} /> Estoque baixo
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "estoque" && subEstoque === "historico" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {movimentacoesFiltradas.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Nenhuma movimentação encontrada"
                  subtitle="Registre entradas e saídas para acompanhar o histórico do estoque."
                  acao="Nova"
                  onAcao={() => setFormMovimentacao({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Data</th>
                        <th className="text-left px-5 py-3 font-medium">Produto</th>
                        <th className="text-left px-5 py-3 font-medium">Tipo</th>
                        <th className="text-left px-5 py-3 font-medium">Quantidade</th>
                        <th className="text-left px-5 py-3 font-medium">Motivo</th>
                        <th className="text-left px-5 py-3 font-medium">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {movimentacoesFiltradas.map((m) => {
                        const produto = produtosPorId[m.produtoId];
                        const motivo = (m.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).find((mo) => mo.id === m.motivo);
                        return (
                          <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{formatarData(m.data)}</td>
                            <td className="px-5 py-3.5 font-medium text-stone-800">{produto?.nome || "—"}</td>
                            <td className="px-5 py-3.5"><TipoMovimentoChip tipo={m.tipo} /></td>
                            <td className="px-5 py-3.5 tabular-nums">
                              <span className={cn("font-medium", m.tipo === "entrada" ? "text-emerald-700" : "text-red-600")}>
                                {m.tipo === "entrada" ? "+" : "-"}{m.quantidade} {produto?.unidade}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-stone-600">{motivo?.label || "—"}</td>
                            <td className="px-5 py-3.5 text-stone-400 max-w-[220px] truncate">{m.observacao || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {movimentacoesFiltradas.map((m) => {
                      const produto = produtosPorId[m.produtoId];
                      const motivo = (m.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).find((mo) => mo.id === m.motivo);
                      return (
                        <div key={m.id} className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <p className="font-medium text-stone-800 min-w-0">{produto?.nome || "—"}</p>
                            <TipoMovimentoChip tipo={m.tipo} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                            <span>{formatarData(m.data)}</span>
                            <span className={cn("font-medium tabular-nums", m.tipo === "entrada" ? "text-emerald-700" : "text-red-600")}>
                              {m.tipo === "entrada" ? "+" : "-"}{m.quantidade} {produto?.unidade}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500">{motivo?.label}</p>
                          {m.observacao && <p className="text-xs text-stone-400 mt-1">{m.observacao}</p>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "financeiro" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {lancamentosFiltrados.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Nenhum lançamento encontrado"
                  subtitle="Registre contas a receber e a pagar para acompanhar o financeiro."
                  acao="Novo"
                  onAcao={() => setFormLancamento({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Descrição</th>
                        <th className="text-left px-5 py-3 font-medium">Tipo</th>
                        <th className="text-left px-5 py-3 font-medium">Cliente / Fornecedor</th>
                        <th className="text-left px-5 py-3 font-medium">Vencimento</th>
                        <th className="text-left px-5 py-3 font-medium">Valor</th>
                        <th className="text-left px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {lancamentosFiltrados.map((l) => {
                        const status = statusLancamento(l);
                        const contraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "—") : (l.contraparte || "—");
                        return (
                          <tr key={l.id} className="group hover:bg-stone-50/70 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-stone-800">{l.descricao}</td>
                            <td className="px-5 py-3.5"><TipoLancamentoChip tipo={l.tipo} /></td>
                            <td className="px-5 py-3.5 text-stone-600">{contraparte}</td>
                            <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} className="text-stone-400" />{formatarData(l.vencimento)}</span>
                            </td>
                            <td className="px-5 py-3.5 tabular-nums font-medium">
                              <span className={l.tipo === "receita" ? "text-emerald-700" : "text-stone-700"}>{moeda(l.valor)}</span>
                            </td>
                            <td className="px-5 py-3.5"><StatusChip status={status} /></td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => alternarPago(l)}
                                  className={cn(
                                    "w-7 h-7 rounded-md flex items-center justify-center border",
                                    l.pago ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-stone-400 hover:bg-white hover:text-emerald-700 hover:border-stone-200 border-transparent"
                                  )}
                                  aria-label="Marcar como pago"
                                  title={l.pago ? "Marcado como pago" : "Marcar como pago"}
                                >
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setFormLancamento(l)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => setConfirmacao({ tipo: "lancamento", id: l.id, nome: l.descricao })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {lancamentosFiltrados.map((l) => {
                      const status = statusLancamento(l);
                      const contraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "—") : (l.contraparte || "—");
                      return (
                        <div key={l.id} className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <p className="font-medium text-stone-800 min-w-0">{l.descricao}</p>
                            <span className={cn("font-medium tabular-nums shrink-0", l.tipo === "receita" ? "text-emerald-700" : "text-stone-700")}>
                              {moeda(l.valor)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <TipoLancamentoChip tipo={l.tipo} />
                            <StatusChip status={status} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-stone-500">
                            <span>{contraparte}</span>
                            <span className="inline-flex items-center gap-1"><CalendarClock size={12} />{formatarData(l.vencimento)}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => alternarPago(l)}
                              className={cn(
                                "flex-1 py-1.5 rounded-md text-xs font-medium border flex items-center justify-center gap-1",
                                l.pago ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-stone-600 border-stone-200"
                              )}
                            >
                              <Check size={13} /> {l.pago ? "Pago" : "Marcar como pago"}
                            </button>
                            <button onClick={() => setFormLancamento(l)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "lancamento", id: l.id, nome: l.descricao })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "fiscal" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Este módulo organiza a emissão fiscal, mas ainda não está integrado à SEFAZ. As notas geradas aqui são <strong>rascunhos sem validade fiscal</strong> — a emissão oficial exige certificado digital e um provedor de NF-e conectado a um backend.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem" }}>
                <KpiCard label="Vendas pendentes de nota" valor={vendasPendentesNota.length} icon={FileClock} tom="bg-amber-50 text-amber-700" />
                <KpiCard label="Rascunhos gerados" valor={notasFiscais.length} icon={FileCheck2} tom="bg-teal-50 text-teal-700" />
                <KpiCard
                  label="Integração"
                  valor={integracaoConfigurada ? "Configurada" : "Não configurada"}
                  icon={integracaoConfigurada ? ShieldCheck : ShieldAlert}
                  tom={integracaoConfigurada ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
                />
              </div>

              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-md">
                {[
                  { id: "pendentes", label: "Pendentes", icon: FileClock },
                  { id: "rascunhos", label: "Rascunhos", icon: FileCheck2 },
                  { id: "config", label: "Configurações", icon: Settings2 },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubFiscal(s.id)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                      subFiscal === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                    )}
                  >
                    <s.icon size={14} /> {s.label}
                  </button>
                ))}
              </div>

              {subFiscal === "pendentes" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {vendasPendentesNota.length === 0 ? (
                    <EmptyState icon={FileCheck2} title="Nenhuma venda pendente" subtitle="Todas as vendas já têm um rascunho de NF-e gerado." />
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {vendasPendentesNota.map((v) => {
                        const cliente = v.clienteId ? clientesPorId[v.clienteId] : null;
                        return (
                          <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                            <div className="min-w-0">
                              <p className="font-medium text-stone-800">Venda nº {v.numero}</p>
                              <p className="text-xs text-stone-400">{formatarData(v.data)} · {cliente ? cliente.nome : "Consumidor não identificado"}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-medium text-stone-700 tabular-nums">{moeda(v.total ?? totalVenda(v))}</span>
                              <button
                                onClick={() => gerarRascunhoNota(v)}
                                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                              >
                                <FileCheck2 size={14} /> Gerar rascunho
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {subFiscal === "rascunhos" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {notasComVenda.length === 0 ? (
                    <EmptyState icon={FileText} title="Nenhum rascunho gerado" subtitle="Gere rascunhos a partir das vendas pendentes na aba anterior." />
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {notasComVenda.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setNotaPreview(n)}
                          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-stone-50/70 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-stone-800">NF-e nº {n.numero} · Série {n.serie}</p>
                            <p className="text-xs text-stone-400">Venda nº {n.venda?.numero} · gerada em {formatarData(n.dataGeracao)}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                              <FileClock size={12} /> Rascunho
                            </span>
                            <ChevronRight size={16} className="text-stone-300" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subFiscal === "config" && (
                <ConfigFiscalForm inicial={empresaFiscal} onSalvar={salvarConfigFiscal} />
              )}
            </div>
          )}

          {aba === "entregas" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {entregasFiltradas.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="Nenhuma entrega encontrada"
                    subtitle="Cadastre uma entrega vinculada a uma venda ou avulsa."
                    acao="Nova"
                    onAcao={() => setFormEntrega({})}
                  />
                ) : (
                  <div className="divide-y divide-stone-100">
                    {entregasFiltradas.map((e) => {
                      const cliente = e.clienteId ? clientesPorId[e.clienteId] : null;
                      const atrasada = (e.status === "pendente" || e.status === "em_rota") && e.dataPrevista < hojeISO();
                      return (
                        <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-medium text-stone-800">{cliente ? cliente.nome : "Cliente não identificado"}</p>
                              <StatusEntregaChip status={e.status} />
                              {atrasada && (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={11} /> Atrasada
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 flex items-start gap-1.5 mb-0.5">
                              <MapPin size={12} className="text-stone-400 shrink-0 mt-0.5" /> {e.endereco || "Endereço não informado"}
                            </p>
                            <p className="text-xs text-stone-400">{e.itensDescricao}</p>
                            <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {formatarData(e.dataPrevista)}</span>
                              {e.motorista && <span className="inline-flex items-center gap-1"><UserRound size={11} /> {e.motorista}</span>}
                              {e.veiculo && <span className="inline-flex items-center gap-1"><Truck size={11} /> {e.veiculo}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(e.status === "pendente" || e.status === "em_rota") && (
                              <button
                                onClick={() => avancarStatusEntrega(e)}
                                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                              >
                                {e.status === "pendente" ? <><Navigation size={13} /> Sair para entrega</> : <><PackageCheck size={13} /> Confirmar entrega</>}
                              </button>
                            )}
                            <button onClick={() => setFormEntrega(e)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                              <Pencil size={14} />
                            </button>
                            {e.status !== "cancelada" && e.status !== "entregue" && (
                              <button onClick={() => cancelarEntrega(e.id)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                                <PackageX size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {aba === "compras" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {pedidosFiltrados.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title="Nenhum pedido de compra encontrado"
                  subtitle="Registre um pedido ao fornecedor; quando a mercadoria chegar, transforme em compra num clique."
                  acao="Novo"
                  onAcao={() => setFormPedido({})}
                />
              ) : (
                <div className="divide-y divide-stone-100">
                  {pedidosFiltrados.map((p) => {
                    const fornecedor = fornecedoresPorId[p.fornecedorId];
                    const atrasado = p.status === "pendente" && p.dataPrevista < hojeISO();
                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-stone-800">Pedido nº {p.numero} · {fornecedor ? fornecedor.nome : "Fornecedor removido"}</p>
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                              p.status === "recebido" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {p.status === "recebido" ? <PackageCheck size={11} /> : <PackageOpen size={11} />}
                              {p.status === "recebido" ? "Recebido" : "Pendente"}
                            </span>
                            {atrasado && (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={11} /> Atrasado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400">
                            {p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
                          </p>
                          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Previsão: {formatarData(p.dataPrevista)}</span>
                            {p.dataRecebimento && <span className="inline-flex items-center gap-1"><PackageCheck size={11} /> Recebido: {formatarData(p.dataRecebimento)}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium text-stone-700 tabular-nums">{moeda(totalPedido(p))}</span>
                          {p.status === "pendente" && (
                            <button
                              onClick={() => registrarRecebimento(p)}
                              className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                            >
                              <PackageCheck size={13} /> Registrar recebimento
                            </button>
                          )}
                          {p.status === "pendente" && (
                            <button onClick={() => setFormPedido(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                              <Pencil size={14} />
                            </button>
                          )}
                          {p.status === "pendente" && (
                            <button onClick={() => setConfirmacao({ tipo: "pedido", id: p.id, nome: `Pedido nº ${p.numero}` })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {aba === "usuarios" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5">
                <Lock size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <p className="text-sm text-stone-600">
                  Isso controla o que cada papel <strong>vê e pode editar dentro do sistema</strong>. Importante: essa é uma organização no nível da interface — a segurança de verdade (impedir alguém de burlar isso) só existe quando houver um backend validando cada ação. Use o seletor de sessão no rodapé do menu lateral pra testar como fica pra cada papel.
                </p>
              </div>

              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs">
                {[
                  { id: "usuarios", label: "Usuários", icon: UserCog },
                  { id: "papeis", label: "Papéis", icon: Lock },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubUsuarios(s.id)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                      subUsuarios === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                    )}
                  >
                    <s.icon size={14} /> {s.label}
                  </button>
                ))}
              </div>

              {subUsuarios === "usuarios" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex justify-end p-3 border-b border-stone-100">
                    <button
                      onClick={() => setFormUsuario({})}
                      className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={14} /> Novo usuário
                    </button>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {usuarios.map((u) => (
                      <div key={u.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                            {iniciais(u.nome)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-stone-800 truncate">{u.nome}</p>
                              {!u.ativo && (
                                <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Bloqueado</span>
                              )}
                              {u.id === usuarioLogadoId && (
                                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Sessão atual</span>
                              )}
                            </div>
                            <p className="text-xs text-stone-400 truncate">{u.email} · {papeisPorId[u.papelId]?.nome}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setFormUsuario(u)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                            <Pencil size={14} />
                          </button>
                          {u.id !== usuarioLogadoId && (
                            <button onClick={() => setConfirmacao({ tipo: "usuario", id: u.id, nome: u.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {subUsuarios === "papeis" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex justify-end p-3 border-b border-stone-100">
                    <button
                      onClick={() => setFormPapel({})}
                      className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={14} /> Novo papel
                    </button>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {papeis.map((p) => {
                      const emUso = usuarios.some((u) => u.papelId === p.id);
                      const nivelEditar = MODULOS_PERMISSAO.filter((m) => p.permissoes[m.id] === "editar").length;
                      const nivelVer = MODULOS_PERMISSAO.filter((m) => p.permissoes[m.id] === "visualizar").length;
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-stone-800">{p.nome}</p>
                              {p.fixo && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Acesso total</span>}
                            </div>
                            <p className="text-xs text-stone-400">
                              {nivelEditar} {nivelEditar === 1 ? "módulo" : "módulos"} com edição · {nivelVer} só visualização
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {!p.fixo && (
                              <button onClick={() => setFormPapel(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                                <Pencil size={14} />
                              </button>
                            )}
                            {!p.fixo && !emUso && (
                              <button onClick={() => setConfirmacao({ tipo: "papel", id: p.id, nome: p.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
