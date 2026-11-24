# ConstruGestão — contexto do projeto

Sistema de gestão (mini ERP) para loja de material de construção, usado no computador e no celular. Idioma da interface e dos dados: português (Brasil).

## Estado atual

- Projeto Vite + React + Tailwind v4 + Supabase (`npm run dev`, `build`, `lint`, `test:unit`, `test:db`, `test:e2e`). Passo a passo de instalação no `README.md`.
- Estrutura em `src/`: `utils/` (formatação, CEP), `hooks/`, `data/` (constantes e dados iniciais), `components/` (UI compartilhada e `ui/`), `modules/<modulo>/` (tela da aba `XView.jsx`, formulários, modais e chips de cada módulo).
- `src/App.jsx` só decide a tela (config do Supabase → login → sistema). `src/Sistema.jsx` é o shell: menu, estado, handlers. Cada aba é um `XView` com **props explícitas** (a barra de busca mobile chega como `barraBusca`).
- Dados: `src/data/api.js` (Supabase) + `mapeamento.js` (snake_case ↔ camelCase). O estado das listas em `Sistema.jsx` é um espelho do banco: toda ação passa por `executar(acao, listasParaRecarregar)`, que bloqueia clique duplo, mostra o erro (faixa vermelha) e recarrega as listas afetadas. O formulário só fecha se der certo.
- Próxima etapa da refatoração: mover para dentro de cada view o estado puramente de UI (PDV tem ~43 props) e extrair o estado de dados do `Sistema.jsx` para hooks.
- Dependências: React, Tailwind CSS, `lucide-react`.
- Dados no **Supabase (Postgres)**; login por e-mail/senha (Supabase Auth). O usuário logado é ligado a `usuarios` pelo **uid do login** (`usuarios.auth_id` = `auth.uid()`; o e-mail é só rótulo). Gatilhos ligam `auth.users` a `usuarios` pelo e-mail, mas só se o e-mail do login estiver CONFIRMADO; `auth_id` não é gravável pela API. Sem linha ativa em `usuarios` o sistema mostra "Sem acesso".
- Banco em `supabase/migrations/` (vários arquivos, em ordem de nome; para mudanças futuras crie arquivos novos, nunca edite a que já foi aplicada). Funções novas/tabelas novas recebem permissões padrão do Supabase para `anon`/`authenticated`: **sempre** repita o `revoke`/`grant` do fim da migração e ligue RLS.
- Funções de permissão (`nivel`, `pode_ver`, `pode_editar`, `app_usuario_ref`) ficam no schema `private`, que **nunca** pode entrar em Settings → API → Exposed schemas. Só as funções de negócio ficam em `public` e chamáveis por RPC (o teste `npm run test:db` garante a lista). Auditoria: tabela `auditoria` (só administradores leem), preenchida por gatilhos (`private.auditar`); aba *Usuários → Auditoria*.
- Hospedagem recomendada: Cloudflare (fluxo Workers Builds: build `npm run build` + `npx wrangler deploy`, configurado em `wrangler.jsonc`; as variáveis VITE_* precisam ser **variáveis de build**; a branch de produção é a que tem o código). Cabeçalhos de segurança em `public/_headers`, incluindo CSP: ao integrar um novo serviço externo, inclua o domínio em `connect-src`. GitHub Pages foi descartado (sem cabeçalhos de segurança). `.github/workflows/conferir.yml` só confere o código, não publica. Repositório deve ficar privado.
- Busca de CEP via `https://viacep.com.br/ws/{cep}/json/` (função `buscarCep`). Não funciona no preview do claude.ai (sandbox bloqueia chamadas externas); deve funcionar rodando localmente.

## Módulos já construídos

Início (dashboard), Clientes, Fornecedores, Compras, Produtos, Venda (PDV), Estoque, Financeiro, Fiscal, Entregas, Relatórios, Usuários.

Integrações entre módulos (já implementadas):
- Venda finalizada → baixa estoque + cria movimentação + cria receita no Financeiro + (opcional) cria entrega + (opcional) cria rascunho de NF-e.
- Pedido de compra → "Registrar recebimento" → entrada no estoque + despesa no Financeiro vinculada ao fornecedor.
- Produto tem **código de barras e SKU** (os dois opcionais no banco, únicos e sem colisão entre si via gatilho `private.produto_codigos_unicos`; o cadastro exige pelo menos um). O PDV acha o produto por um ou outro (sem diferenciar maiúsculas). A **quantidade em estoque não fica no cadastro do produto**: só entra/sai pelo módulo Estoque (movimentações). **Leitura por câmera** (`components/LeitorCodigo.jsx`, usada no cadastro e no PDV em modo contínuo): `BarcodeDetector` nativo quando existe, senão `@zxing/browser` (JS puro, carregado só ao abrir a câmera; sem WASM/Worker por causa do CSP). Exige HTTPS e `Permissions-Policy: camera=(self)` em `public/_headers`. O teste e2e usa a câmera falsa do Chromium com `e2e/fixtures/*.mjpeg` (EAN-13 precisa de dígito verificador válido).
- **Importar XML da NF-e de compra** (aba Compras → "Importar XML da nota"): `modules/compras/nfe.js` lê o XML no navegador (DOMParser; recusa DTD/entidades, limite 5 MB, só modelo 55, exige protocolo autorizado ou avisa), `conferirNota` associa cada item a um produto (código de barras → SKU = código do fornecedor → nome) e `ImportarNotaModal` mostra a conferência (fornecedor existente/novo, itens, preço de venda dos produtos novos, parcelas). A gravação é a função `importar_nota_compra` (SECURITY DEFINER, atômica; confere `compras` editar e, se criar, `fornecedores`/`produtos` editar): acha o fornecedor pelo CNPJ/CPF ou cadastra, cria produtos novos, cria o pedido **já recebido** (`chave_acesso` única impede importar a mesma nota duas vezes), dá entrada no estoque e cria uma despesa por duplicata (sem duplicatas: uma despesa com vencimento hoje). Linhas repetidas do mesmo produto na nota (mesmo código do fornecedor/unidade) são **juntas numa só**. O código do fornecedor **não vira SKU** da loja: produto novo usa o código de barras da nota (se for GTIN real) e o SKU que o usuário digitar; sem nenhum dos dois o banco gera `P00012`. Nota sem duplicatas pode ser marcada "já paga" (despesa já quitada). O custo unitário inclui frete/seguro/IPI/ST/outras e desconto (rateados) e fecha com o total da nota; `pedidos_compra_itens.preco_unitario` é numeric(14,4). Não valida a assinatura digital (serve para entrada de mercadoria, não como prova fiscal). Testes: `nfe.test.js`, `db.test.mjs`, `e2e/importar-nota.test.mjs` (XML de exemplo em `e2e/fixtures/nfe-votoran.xml`).
- Produto tem fornecedor (opcional); no pedido de compra, os produtos são filtrados pelo fornecedor escolhido.
- Relatórios (`src/modules/relatorios/`): filtro de período, análises (vendas, produtos/curva ABC, clientes, estoque, financeiro, compras) e exportação da base para Excel (`write-excel-file/universal`, sem Web Workers por causa do CSP; importado sob demanda). Os dados vêm das funções `rel_*` (migração `20261125000000_relatorios`), **SECURITY INVOKER**: valem a permissão `relatorios` E a RLS de cada módulo (quem não vê Financeiro não recebe lançamentos). Cálculos em JS puro (`calculos.js`, testados com `npm run test:unit`). Margem usa `produtos.custo` (opcional) copiado para `vendas_itens.custo_unitario` na venda; vendas antigas sem custo ficam fora da margem. Papéis: admin edita, gerente visualiza, vendedor/caixa sem acesso.
- Usuários/papéis: matriz de permissão por módulo (sem acesso / visualizar / editar). Menu lateral e botões "+ Novo" respeitam o papel atual. Há um seletor de sessão no rodapé do menu para testar cada papel.

## Preferências de UX pedidas pela usuária (manter)

- Cadastros de cliente e fornecedor em **wizard de 3 etapas**; demais formulários em modal único.
- Modais **centralizados**, com largura menor que a tela; cabeçalho e rodapé fixos, só o miolo rola.
- Busca + botão "+ Novo" no **canto superior direito** da barra do topo (desktop); botões minimalistas ("+ Novo" / "+ Nova").
- Cards de indicador compactos (ícone e título pequenos), lado a lado.
- Confirmação antes de excluir; Esc fecha modais.
- Campo de fornecedor é **busca por nome**, não dropdown.
- PDV: fluxo numa tela só — Iniciar venda → identificar cliente por CPF/CNPJ (cadastra na hora se não existir) → produtos (bipar código de barras) → desconto → entrega/retirada → pagamento → documento fiscal. Endereço de entrega com busca por CEP.
- Responsivo: celular e computador.

## Armadilhas conhecidas

- No preview do claude.ai, classes responsivas do Tailwind (`sm:`, `md:`, `absolute`/`relative` em alguns casos) se mostraram pouco confiáveis. Por isso há `style={{...}}` inline em ícones de input e grids de KPI, e o hook `useMediaQuery` em vez de breakpoints. Num projeto Vite com Tailwind real isso pode ser simplificado de volta para classes.
- Flex com rolagem interna precisa de `min-height: 0` (já corrigido nos modais).
- Barra lateral no desktop é `sticky top-0 h-screen` (senão o seletor de sessão some em páginas longas).

## Regras que NÃO podem ser quebradas

- **NF-e/cupom fiscal gerados aqui são rascunhos sem validade fiscal.** A interface já avisa isso; nunca apresentar como nota válida. Emissão real exige certificado digital A1 no servidor + provedor (Focus NFe, eNotas, NFe.io) ou SEFAZ direto, sempre pelo backend.
- **Permissões só no front-end não são segurança.** Aqui elas valem no banco (RLS por papel + funções `SECURITY DEFINER` que conferem a permissão). Ao criar tabela ou função nova, ligue RLS e confira a permissão no banco — não confie no menu.
- **Nunca** colocar a chave `secret`/`service_role` no front-end nem no repositório; só a `publishable` (em `.env.local`, fora do git).

## Próximos passos sugeridos (ordem)

1. Criar projeto Vite + Tailwind, copiar o arquivo para `src/App.jsx`, confirmar que roda (`npm run dev`). Depois **dividir o arquivo em módulos** (`components/`, `modules/`, `data/`, `utils/`).
2. ~~Banco (Supabase)~~ — migrações aplicadas no projeto `material_construcao` (ref `xuzazjuhbrwonsiieguq`) em 23/10/2026, por partes (a ferramenta travava com a migração inteira). Em 26/10/2026 foi aplicada a migração de segurança (login por uid, schema `private`, auditoria), também por partes. O primeiro administrador e `salvar_pedido_compra` já existem. Nenhum login pelo site foi testado ainda. Avisos restantes do Supabase: as 6 funções de negócio (intencionais) e "leaked password protection" (liga-se em Authentication; é recurso do plano Pro).
3. ~~Autenticação + RLS por papel~~ — feito, incluindo "Esqueci minha senha" (login → e-mail com link → tela de nova senha; precisa de Site URL e, para outros e-mails além da equipe, SMTP próprio no Supabase: ver README). Falta: convidar usuários pelo sistema (hoje o login é criado no painel do Supabase).
4. **Fiscal real** via provedor de NF-e, com função no backend (certificado nunca no navegador).
5. Faltantes levantados: abertura/fechamento de caixa, orçamento/cotação, devolução (estorno + volta ao estoque), comissão de vendedor, conta por obra/projeto (construtoras), relatórios (curva ABC, margem, inadimplência), etiqueta de código de barras, alertas de estoque baixo/contas a vencer.

## Verificação

Rodar `npm run test:db` e `npm run test:e2e` ao mexer no banco, na camada de dados ou nos fluxos; `npm run lint` (pega identificador sem import, que o build não pega; a lista de globais do navegador é curta de propósito — ícones do lucide como `History` colidem com globais do navegador e viram `Illegal constructor` em runtime) e `npm run build` a cada etapa grande; abrir cada módulo no navegador para checar erros de execução.
