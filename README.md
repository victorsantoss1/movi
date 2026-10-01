# Movi

Chat web entre o usuário e um agente de IA. Cada mensagem do usuário vai para um
serviço externo via webhook. O agente responde de forma assíncrona: o serviço
grava a resposta no Supabase e ela aparece no chat em tempo real (Realtime, com
polling como reserva).

**Stack:** React 18, TypeScript (estrito), Vite, Tailwind CSS 4, React Router,
Zustand, Supabase (Auth, Postgres, Realtime), react-markdown + remark-gfm, Lucide.

## Como rodar

```bash
npm install
cp .env.example .env   # preencha as variáveis
npm run dev            # http://localhost:5173
```

| Script              | O que faz                                  |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | servidor de desenvolvimento                |
| `npm run build`     | typecheck + build de produção em `dist/`   |
| `npm run typecheck` | só o typecheck                             |
| `npm run lint`      | oxlint (inclui proibição de `any`)         |

Variáveis (`.env`):

```
VITE_SUPABASE_URL=            # Project Settings → API
VITE_SUPABASE_ANON_KEY=       # chave pública (anon/publishable)
VITE_WEBHOOK_URL=https://thompson-management-horizons.api.integrasky.cloud/s7jUF8iYvC
```

## Configuração do Supabase (obrigatória)

1. **Schema:** execute `supabase/schema.sql` no SQL Editor. Ele cria as tabelas,
   índices, triggers de `updated_at`, permissões, RLS e adiciona `messages` à
   publicação `supabase_realtime`. Pode ser executado mais de uma vez.
2. **Usuários:** o app não tem cadastro. Crie/convide os usuários em
   Authentication → Users.
3. **Desative cadastros públicos** (nas configurações de Authentication, opção
   "Allow new users to sign up"; o caminho exato no painel muda de tempos em
   tempos). A anon key é pública por definição: com o
   cadastro ligado, qualquer pessoa cria conta pela API mesmo sem tela de
   cadastro e passa a usar o seu agente.
4. **URLs de redirecionamento** (Authentication → URL Configuration): defina o
   Site URL e adicione `https://SEU_DOMINIO/redefinir-senha` (e
   `http://localhost:5173/redefinir-senha` para desenvolvimento) em Redirect URLs.
   Sem isso o link do "Esqueci minha senha" não volta para a tela certa.
5. **SMTP próprio:** o SMTP padrão do Supabase só envia e-mails para membros do
   time do projeto e tem limite baixo por hora. Para usuários reais, configure
   um SMTP nas configurações de e-mail/SMTP de Authentication.

## Contrato com o serviço externo (webhook)

A cada mensagem o front faz `POST VITE_WEBHOOK_URL` com
`Content-Type: application/json`:

```json
{
  "conversation_id": "uuid da conversa",
  "message_id": "uuid da mensagem do usuário",
  "user_id": "uuid do usuário logado",
  "user_email": "email do usuário",
  "message": "texto enviado",
  "timestamp": "2026-10-01T12:00:00.000Z"
}
```

- Qualquer resposta 2xx = recebido. O corpo da resposta é ignorado.
- O webhook é chamado **pelo navegador**: o endpoint precisa responder ao
  preflight de CORS (`OPTIONS`) liberando a origem do app e o header
  `content-type`. Sem isso o navegador bloqueia o POST e toda mensagem cai em
  "Tentar novamente".
- Para responder, o serviço grava em `public.messages` usando a **service_role
  key** (ignora RLS):

  ```sql
  insert into public.messages (conversation_id, user_id, role, content)
  values (:conversation_id, :user_id, 'assistant', :resposta);
  ```

  - `user_id` **tem** que ser o do payload; com outro valor o usuário não vê a
    resposta (RLS).
  - Não preencha `created_at` (deixe o `now()` do banco): a ordem das mensagens
    e o desbloqueio dependem dele.
- **Idempotência:** "Tentar novamente" reenvia exatamente o mesmo payload (mesmo
  `message_id`), inclusive depois de um timeout de 2 minutos em que o agente
  pode apenas estar lento. O serviço deve ignorar `message_id` já processado,
  senão o usuário recebe duas respostas.

## Regras de envio (uma mensagem por vez)

- Ao enviar, a conversa fica bloqueada (campo e botão desabilitados, Enter não
  envia, "Aguardando resposta do agente...") até: chegar uma mensagem `assistant`
  na conversa, o POST do webhook falhar ou passar 2 minutos.
- O bloqueio é por conversa (`envio[conversationId]` no Zustand, com
  `aguardandoResposta` e `enviadoEm`). Ele é persistido no `localStorage`, então
  recarregar a página mantém o "aguardando" (ou mostra o timeout, se passou de
  2 minutos).
- O `conversation_id` é gerado no front (`crypto.randomUUID()`) no primeiro
  envio, e o INSERT da conversa termina antes do webhook ser chamado.
- Falhas de rede ou de INSERT também mostram "Tentar novamente", que reaproveita
  os mesmos ids e nunca duplica a mensagem no banco.

## Estrutura

```
src/
  components/  Sidebar, ChatWindow, MessageBubble, MessageInput, TypingIndicator, ...
  pages/       Login, EsqueciSenha, RedefinirSenha, Chat
  services/    auth.ts, agent.ts (enviarMensagem/reenviarMensagem),
               conversations.ts (CRUD), supabase.ts
  store/       chatStore (conversas, mensagens, bloqueio/timeout), authStore, uiStore, toastStore
  hooks/       useMensagensRealtime (Realtime + polling), useHistoricoConversa, useBuscaConversas
  types/       tipos do domínio e do banco
supabase/schema.sql
```

Rotas: `/login`, `/esqueci-senha`, `/redefinir-senha` (destino do link do
e-mail), `/chat` e `/chat/:conversationId` (protegidas).
