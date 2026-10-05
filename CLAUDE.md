# ConstruGestão — contexto do projeto

Sistema de gestão (mini ERP) para loja de material de construção, usado no computador e no celular. Idioma da interface e dos dados: português (Brasil).

## Estado atual

- Projeto Vite + React + Tailwind v4 + Supabase (`npm run dev`, `build`, `lint`, `test:db`, `test:e2e`). Passo a passo de instalação no `README.md`.
- Estrutura em `src/`: `utils/` (formatação, CEP), `hooks/`, `data/` (constantes e dados iniciais), `components/` (UI compartilhada e `ui/`), `modules/<modulo>/` (tela da aba `XView.jsx`, formulários, modais e chips de cada módulo).
- `src/App.jsx` só decide a tela (config do Supabase → login → sistema). `src/Sistema.jsx` é o shell: menu, estado, handlers. Cada aba é um `XView` com **props explícitas** (a barra de busca mobile chega como `barraBusca`).
- Dados: `src/data/api.js` (Supabase) + `mapeamento.js` (snake_case ↔ camelCase). O estado das listas em `Sistema.jsx` é um espelho do banco: toda ação passa por `executar(acao, listasParaRecarregar)`, que bloqueia clique duplo, mostra o erro (faixa vermelha) e recarrega as listas afetadas. O formulário só fecha se der certo.
- Próxima etapa da refatoração: mover para dentro de cada view o estado puramente de UI (PDV tem ~43 props) e extrair o estado de dados do `Sistema.jsx` para hooks.
- Dependências: React, Tailwind CSS, `lucide-react`.
- Dados no **Supabase (Postgres)**; login por e-mail/senha (Supabase Auth). O usuário logado é ligado a `usuarios` pelo e-mail; sem linha ativa em `usuarios` o sistema mostra "Sem acesso".
- Banco em `supabase/migrations/` (uma migração; para mudanças futuras crie arquivos novos, nunca edite a que já foi aplicada). Funções novas/tabelas novas recebem permissões padrão do Supabase para `anon`/`authenticated`: **sempre** repita o `revoke`/`grant` do fim da migração e ligue RLS.
- Busca de CEP via `https://viacep.com.br/ws/{cep}/json/` (função `buscarCep`). Não funciona no preview do claude.ai (sandbox bloqueia chamadas externas); deve funcionar rodando localmente.

## Módulos já construídos

Início (dashboard), Clientes, Fornecedores, Compras, Produtos, Venda (PDV), Estoque, Financeiro, Fiscal, Entregas, Usuários.

Integrações entre módulos (já implementadas):
- Venda finalizada → baixa estoque + cria movimentação + cria receita no Financeiro + (opcional) cria entrega + (opcional) cria rascunho de NF-e.
- Pedido de compra → "Registrar recebimento" → entrada no estoque + despesa no Financeiro vinculada ao fornecedor.
- Produto tem fornecedor (opcional); no pedido de compra, os produtos são filtrados pelo fornecedor escolhido.
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
2. ~~Banco (Supabase)~~ — feito, testado localmente (PGlite). **Ainda não foi exercitado contra o projeto Supabase real**: aplicar a migração e conferir o primeiro login.
3. ~~Autenticação + RLS por papel~~ — feito. Falta: convidar usuários pelo sistema (hoje a senha é criada no painel do Supabase) e recuperação de senha.
4. **Fiscal real** via provedor de NF-e, com função no backend (certificado nunca no navegador).
5. Faltantes levantados: abertura/fechamento de caixa, orçamento/cotação, devolução (estorno + volta ao estoque), comissão de vendedor, conta por obra/projeto (construtoras), relatórios (curva ABC, margem, inadimplência), etiqueta de código de barras, alertas de estoque baixo/contas a vencer.

## Verificação

Rodar `npm run test:db` e `npm run test:e2e` ao mexer no banco, na camada de dados ou nos fluxos; `npm run lint` (pega identificador sem import, que o build não pega; a lista de globais do navegador é curta de propósito — ícones do lucide como `History` colidem com globais do navegador e viram `Illegal constructor` em runtime) e `npm run build` a cada etapa grande; abrir cada módulo no navegador para checar erros de execução.
