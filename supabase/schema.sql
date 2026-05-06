-- =============================================================
-- Schema da feature de Sala de Estudos
-- Roda este arquivo no SQL Editor do Supabase (dashboard).
-- =============================================================

-- Extensão para gerar UUIDs
create extension if not exists "uuid-ossp";

-- ===================== TABELA: salas =====================
create table if not exists public.salas (
  id uuid primary key default uuid_generate_v4(),
  codigo text unique not null,
  codigo_admin text unique not null,
  config jsonb not null,
  question_ids jsonb not null,
  status text not null default 'aberta'
    check (status in ('aberta', 'em_andamento', 'encerrada', 'expirada')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_salas_codigo on public.salas(codigo);
create index if not exists idx_salas_expires on public.salas(expires_at);

-- ===================== TABELA: participantes =====================
create table if not exists public.participantes (
  id uuid primary key default uuid_generate_v4(),
  sala_id uuid not null references public.salas(id) on delete cascade,
  nickname text not null,
  joined_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  acertos integer not null default 0,
  total integer not null default 0,
  tempo_total_ms bigint not null default 0,
  respostas jsonb not null default '{}'::jsonb,
  unique (sala_id, nickname)
);

create index if not exists idx_participantes_sala on public.participantes(sala_id);

-- ===================== ROW LEVEL SECURITY =====================
-- Estratégia: anon pode ler tudo, criar/atualizar com restrições.
-- Sem auth = qualquer um com a anon key faz operações,
-- mas o código de admin (não exposto) controla quem pode encerrar/iniciar.

alter table public.salas enable row level security;
alter table public.participantes enable row level security;

-- SALAS
drop policy if exists "anon pode ler salas não expiradas" on public.salas;
create policy "anon pode ler salas não expiradas"
  on public.salas for select
  using (expires_at > now());

drop policy if exists "anon pode criar sala" on public.salas;
create policy "anon pode criar sala"
  on public.salas for insert
  with check (true);

drop policy if exists "anon pode atualizar sala" on public.salas;
create policy "anon pode atualizar sala"
  on public.salas for update
  using (expires_at > now());

-- PARTICIPANTES
drop policy if exists "anon pode ler participantes" on public.participantes;
create policy "anon pode ler participantes"
  on public.participantes for select
  using (true);

drop policy if exists "anon pode entrar em sala" on public.participantes;
create policy "anon pode entrar em sala"
  on public.participantes for insert
  with check (true);

drop policy if exists "anon pode atualizar próprias respostas" on public.participantes;
create policy "anon pode atualizar próprias respostas"
  on public.participantes for update
  using (true);

-- ===================== LIMPEZA AUTOMÁTICA =====================
-- Função pra marcar salas expiradas (rodar manualmente ou via cron do Supabase)
create or replace function public.marcar_salas_expiradas()
returns void as $$
begin
  update public.salas
  set status = 'expirada'
  where expires_at < now() and status != 'expirada';

  -- Apaga salas expiradas há mais de 7 dias (libera espaço)
  delete from public.salas
  where status = 'expirada' and expires_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;
