-- Cria o PRIMEIRO administrador. Rode no SQL Editor depois da migração.
--
-- 1. Troque o e-mail abaixo pelo e-mail com que você vai fazer login.
-- 2. Crie o login em Supabase → Authentication → Users → Add user (e-mail + senha,
--    marcando "Auto Confirm User"). O e-mail tem que ser o mesmo daqui.
-- 3. Em Authentication → Sign In / Providers, desligue "Allow new users to sign up":
--    quem não está na tabela `usuarios` não enxerga nada, mas não precisa nem poder criar conta.

insert into public.usuarios (nome, email, papel_id)
values ('Administrador', 'TROQUE-PELO-SEU-EMAIL@exemplo.com', 'admin');
