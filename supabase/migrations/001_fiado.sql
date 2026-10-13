-- Caderneta do Fiado — estrutura inicial
-- Cole no Supabase: SQL Editor → New query → Run

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  observacao text,
  created_at timestamptz not null default now()
);

create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null check (tipo in ('compra', 'pagamento')),
  descricao text,
  valor numeric(12,2) not null check (valor > 0),
  data_hora timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists lancamentos_cliente_idx on public.lancamentos (cliente_id, data_hora desc);
create index if not exists clientes_user_idx on public.clientes (user_id);

alter table public.clientes enable row level security;
alter table public.lancamentos enable row level security;

drop policy if exists "clientes do dono" on public.clientes;
create policy "clientes do dono" on public.clientes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "lancamentos do dono" on public.lancamentos;
create policy "lancamentos do dono" on public.lancamentos
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lista de clientes já com o saldo (compras − pagamentos)
create or replace view public.clientes_saldo
with (security_invoker = on) as
select
  c.*,
  coalesce(sum(case when l.tipo = 'compra' then l.valor else -l.valor end), 0) as saldo,
  max(l.data_hora) as ultima_movimentacao
from public.clientes c
left join public.lancamentos l on l.cliente_id = c.id
group by c.id;

grant select on public.clientes_saldo to authenticated;
