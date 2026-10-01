-- =============================================================================
-- Movi — schema do chat usuário ↔ agente
-- Execute no SQL Editor do Supabase (ou via `supabase db push`).
-- O script é idempotente: pode ser executado mais de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'Nova conversa',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null,
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_user_idx
  on public.messages (user_id);

-- -----------------------------------------------------------------------------
-- updated_at automático
--   * qualquer UPDATE em conversations atualiza updated_at
--   * cada nova mensagem (inclusive a do agente) "sobe" a conversa na lista
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- -----------------------------------------------------------------------------
-- Permissões e Row Level Security
-- O usuário só lê e escreve conversas e mensagens onde user_id = auth.uid().
-- O serviço externo (agente) grava as respostas com a service_role key, que
-- ignora RLS — por isso ele PRECISA preencher messages.user_id com o id do
-- dono da conversa (recebido no payload do webhook), senão o usuário não
-- enxerga a resposta.
-- -----------------------------------------------------------------------------

revoke all on public.conversations from anon;
revoke all on public.messages from anon;

grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- conversations ---------------------------------------------------------------

drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own"
  on public.conversations for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
  on public.conversations for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own"
  on public.conversations for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own"
  on public.conversations for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- messages --------------------------------------------------------------------

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
  on public.messages for select
  to authenticated
  using (user_id = (select auth.uid()));

-- O usuário só insere mensagens com role = 'user' em conversas que são dele.
-- Mensagens 'assistant' só podem ser gravadas pelo serviço externo
-- (service_role), impedindo que o cliente forje respostas do agente.
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'user'
    and exists (
      select 1
        from public.conversations c
       where c.id = conversation_id
         and c.user_id = (select auth.uid())
    )
  );

-- Mensagens são imutáveis para o cliente (sem UPDATE/DELETE). Ao excluir uma
-- conversa, as mensagens saem junto via ON DELETE CASCADE.

-- -----------------------------------------------------------------------------
-- Realtime: publica os INSERTs de messages (respeitando RLS)
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
