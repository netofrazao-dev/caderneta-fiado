-- Caderneta do Fiado — migração 3: configuração do Pix
-- Rode DEPOIS do 001 e do 002. Supabase: SQL Editor → New query → Run

create table if not exists public.configuracoes (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  chave_pix text,
  tipo_pix text check (tipo_pix in ('cpf_cnpj', 'celular', 'email', 'aleatoria')),
  nome_recebedor text,
  cidade text,
  updated_at timestamptz not null default now()
);

alter table public.configuracoes enable row level security;

drop policy if exists "config do dono" on public.configuracoes;
create policy "config do dono" on public.configuracoes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
