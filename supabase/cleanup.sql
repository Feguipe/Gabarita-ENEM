-- =============================================================
-- Limpeza automática de salas e oficinas órfãs / expiradas.
-- Roda este arquivo no SQL Editor do Supabase.
--
-- Configura também o Supabase Cron pra rodar diariamente.
-- =============================================================

-- =============== EXTENSÃO PG_CRON (necessária para schedule) ===============
create extension if not exists pg_cron;

-- =============== FUNÇÃO DE LIMPEZA ===============
create or replace function public.limpar_salas_oficinas()
returns void as $$
declare
  qt_expiradas_aberta int;
  qt_expiradas_andamento int;
  qt_deletadas_salas int;
  qt_deletadas_oficinas int;
begin
  -- (A) Salas "abertas" há mais de 1h sem ser iniciadas → expiradas
  with x as (
    update public.salas
    set status = 'expirada'
    where status = 'aberta'
      and created_at < now() - interval '1 hour'
    returning 1
  )
  select count(*) into qt_expiradas_aberta from x;

  with x as (
    update public.oficinas
    set status = 'expirada'
    where status = 'aberta'
      and created_at < now() - interval '1 hour'
    returning 1
  )
  select count(*) into qt_expiradas_aberta from x;

  -- (B) Salas em andamento há mais de 3h → encerradas
  with x as (
    update public.salas
    set status = 'encerrada'
    where status = 'em_andamento'
      and started_at < now() - interval '3 hours'
    returning 1
  )
  select count(*) into qt_expiradas_andamento from x;

  with x as (
    update public.oficinas
    set status = 'encerrada'
    where status = 'em_andamento'
      and started_at < now() - interval '3 hours'
    returning 1
  )
  select count(*) into qt_expiradas_andamento from x;

  -- (C) Marca expirada qualquer sala/oficina cujo expires_at já passou
  update public.salas
  set status = 'expirada'
  where expires_at < now() and status not in ('expirada', 'encerrada');

  update public.oficinas
  set status = 'expirada'
  where expires_at < now() and status not in ('expirada', 'encerrada');

  -- (D) Hard delete: salas/oficinas expiradas/encerradas há mais de 2 dias
  -- (cascade apaga participantes automaticamente)
  with x as (
    delete from public.salas
    where status in ('expirada', 'encerrada')
      and coalesce(started_at, created_at) < now() - interval '2 days'
    returning 1
  )
  select count(*) into qt_deletadas_salas from x;

  with x as (
    delete from public.oficinas
    where status in ('expirada', 'encerrada')
      and coalesce(started_at, created_at) < now() - interval '2 days'
    returning 1
  )
  select count(*) into qt_deletadas_oficinas from x;

  raise notice
    'Limpeza concluída — abertas->expiradas: %, andamento->encerradas: %, deletadas (sala/oficina): %/%',
    qt_expiradas_aberta, qt_expiradas_andamento, qt_deletadas_salas, qt_deletadas_oficinas;
end;
$$ language plpgsql security definer;

-- =============== AGENDAR EXECUÇÃO DIÁRIA ===============
-- Remove agendamento anterior caso exista (idempotente)
do $$
begin
  perform cron.unschedule('limpar-salas-oficinas-diario');
exception when others then
  null;
end;
$$;

-- Agenda pra rodar todo dia às 04:00 UTC (01:00 BRT padrão / 00:00 BRT verão)
-- Horário escolhido: madrugada quando ninguém está usando o app
select cron.schedule(
  'limpar-salas-oficinas-diario',
  '0 4 * * *',
  $$ select public.limpar_salas_oficinas(); $$
);

-- =============== EXECUTA UMA VEZ AGORA PARA VALIDAR ===============
select public.limpar_salas_oficinas();
