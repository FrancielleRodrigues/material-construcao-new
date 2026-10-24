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

## Publicar (recomendado: Cloudflare Pages + domínio próprio)

Por que não o GitHub Pages: ele não permite configurar cabeçalhos de segurança (CSP, HSTS), não oferece proteção contra ataques e, com repositório privado, só funciona em plano pago. O Cloudflare Pages é gratuito, aceita uso comercial e repositório privado, dá HTTPS, proteção contra DDoS e lê o arquivo `public/_headers` (política de segurança já pronta).

1. Em **dash.cloudflare.com** crie a conta → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → autorize o GitHub (pode limitar a este repositório; funciona com repositório privado).
2. Escolha o repositório e a branch de produção (a que tem o código).
3. Build: *Framework preset* **Vite** (ou None), *Build command* `npm run build`, *Output directory* `dist`.
4. *Environment variables*: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (mesmos valores do `.env.local`) e `NODE_VERSION` = `22`.
5. *Save and Deploy*. O endereço sai como `https://<projeto>.pages.dev`.
6. Domínio próprio: no projeto, *Custom domains → Set up a custom domain* e siga as instruções de DNS.
7. No Supabase: *Authentication → URL Configuration* → *Site URL* = o endereço final.

Os nomes dos menus mudam de tempos em tempos; a ideia é sempre essa. A cada push na branch de produção o site é republicado. O workflow `.github/workflows/conferir.yml` roda lint, testes do banco e build em cada push/pull request (não publica).

## Checklist de segurança antes de usar de verdade

- [ ] Repositório **privado** (GitHub → *Settings → General → Danger Zone → Change visibility*).
- [ ] Supabase: *Allow new users to sign up* **desligado** e confirmação de e-mail **ligada**.
- [ ] Senhas fortes e MFA para os administradores (*Authentication → Multi-Factor*).
- [ ] Supabase em plano pago (Pro) quando a loja operar de verdade: sem pausa por inatividade e com backup diário.
- [ ] Ninguém além de administradores com permissão de editar *Usuários*.
- [ ] Nenhuma chave `secret`/`service_role` no código, no `.env` versionado ou em variáveis de build.

## Outras hospedagens (Vercel, Netlify)

Serviços como Vercel, Netlify ou Cloudflare Pages (planos gratuitos) pegam o código do GitHub, rodam `npm run build` e publicam a pasta `dist`. Exemplo na Vercel:

1. Entre em vercel.com com a conta do GitHub → *Add New → Project* → escolha este repositório.
2. Em *Environment Variables*, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (os mesmos valores do `.env.local`).
3. Se o código estiver numa branch que não é a `main`, em *Settings → Git → Production Branch* informe o nome dela.
4. *Deploy*. A Vercel entrega um endereço `https://….vercel.app` para abrir em qualquer navegador.

Depois, no Supabase: *Authentication → URL Configuration* → coloque esse endereço em *Site URL* (necessário para links de e-mail).

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
