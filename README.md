# ConstruGestão

Sistema de gestão (mini ERP) para loja de material de construção: clientes, fornecedores, compras, produtos, venda (PDV), estoque, financeiro, fiscal (rascunhos), entregas e usuários. React + Vite + Tailwind, dados no Supabase (Postgres).

## Colocar para rodar

1. **Banco** — no Supabase: *SQL Editor* → cole `supabase/migrations/20261005000000_schema_inicial.sql` → *Run*.
2. **Primeiro administrador**
   - Em `supabase/seed_admin.sql`, troque o e-mail pelo seu e rode no SQL Editor.
   - *Authentication → Users → Add user*: o mesmo e-mail, com senha e **Auto Confirm User** marcado.
   - *Authentication → Sign In / Providers*: desligue **Allow new users to sign up**.
3. **Variáveis** — copie `.env.example` para `.env.local` e preencha a URL e a chave **publishable** (*Project Settings → API*). Nunca use a chave secret/service_role no front-end.
4. `npm install` e `npm run dev`; entre com o e-mail/senha do passo 2.

Para cadastrar outras pessoas: em *Usuários* do sistema (papel e acesso) **e** em *Authentication → Users* do Supabase (senha), com o mesmo e-mail.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint (pega import esquecido, que o build não pega) |
| `npm run test:db` | roda a migração num Postgres local (PGlite) e testa RLS e funções |
| `npm run test:e2e` | abre o app no Chromium contra um Postgres local com a mesma migração e exercita os fluxos (precisa do Chromium; `CHROMIUM_PATH` se não estiver em `/opt/pw-browsers/chromium`) |

## Como a segurança funciona

- Todas as tabelas têm RLS. O papel do usuário (`papeis.permissoes`: nenhum / visualizar / editar por módulo) é conferido **no banco** a cada leitura e escrita; o menu do front-end é só conveniência.
- Venda, recebimento de compra, movimentação de estoque e pedido de compra são funções do banco (`finalizar_venda`, `registrar_recebimento`, `registrar_movimentacao`, `salvar_pedido_compra`): transação única, preço e estoque validados no servidor.
- NF-e/cupom gerados aqui são **rascunhos sem validade fiscal**. Emissão real exige certificado A1 num servidor + provedor (Focus NFe, eNotas, NFe.io), nunca no navegador.

## Estrutura

```
supabase/migrations   esquema, RLS e funções
supabase/tests        testes do banco (PGlite)
e2e/                  testes ponta a ponta (Playwright + PGlite)
src/lib/supabase.js   cliente do Supabase
src/data/api.js       leitura/escrita e tradução de erros; mapeamento.js converte snake_case ↔ camelCase
src/Sistema.jsx       shell: menu, estado, handlers
src/modules/<modulo>/ tela da aba (XView), formulários, modais
```
