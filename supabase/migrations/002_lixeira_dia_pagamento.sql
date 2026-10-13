-- Caderneta do Fiado — migração 2: lixeira + dia de pagar
-- Rode DEPOIS do 001. Supabase: SQL Editor → New query → Run

alter table public.clientes
  add column if not exists dia_pagamento smallint check (dia_pagamento between 1 and 31);

-- Lixeira: "apagar" só esconde (apagado_em preenchido); some de vez depois de 30 dias
alter table public.clientes add column if not exists apagado_em timestamptz;
alter table public.lancamentos add column if not exists apagado_em timestamptz;

-- Lista de clientes com saldo, ignorando o que está na lixeira
drop view if exists public.clientes_saldo;
create view public.clientes_saldo
with (security_invoker = on) as
select
  c.*,
  coalesce(sum(case when l.tipo = 'compra' then l.valor else -l.valor end), 0) as saldo,
  max(l.data_hora) as ultima_movimentacao,
  max(l.data_hora) filter (where l.tipo = 'pagamento') as ultimo_pagamento,
  min(l.data_hora) filter (where l.tipo = 'compra') as primeira_compra
from public.clientes c
left join public.lancamentos l on l.cliente_id = c.id and l.apagado_em is null
where c.apagado_em is null
group by c.id;

grant select on public.clientes_saldo to authenticated;
