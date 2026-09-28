# Guia de autenticação com o Bitrix24

As três formas de autenticar/chamar a API do Bitrix24, com o passo a passo real — do cadastro no portal até o recebimento dos tokens.

Em todo exemplo de URL, uma tag indica se ela é do **Bitrix24** (você acessa o domínio do próprio portal ou da conta OAuth do Bitrix) ou da **nossa API** (o servidor Fastify deste projeto, rodando em `http://localhost:3000` ou na sua URL pública/túnel).

**Legenda:**
- `BITRIX24` — URL real do portal ou da conta OAuth do Bitrix24
- `SUA API` — URL do servidor deste projeto (Fastify)

## Sumário

- [Guia de autenticação com o Bitrix24](#guia-de-autenticação-com-o-bitrix24)
  - [Sumário](#sumário)
  - [1. Webhook de entrada fixo `BITRIX24`](#1-webhook-de-entrada-fixo-bitrix24)
  - [2. Contexto automático `app dentro do portal`](#2-contexto-automático-app-dentro-do-portal)
  - [3. OAuth2 completo `app fora do portal`](#3-oauth2-completo-app-fora-do-portal)
  - [Referência rápida](#referência-rápida)

---

## 1. Webhook de entrada fixo `BITRIX24`

A forma mais simples de chamar a API REST do Bitrix24: uma URL fixa, com um token embutido, gerada direto no painel do portal. Não envolve nosso servidor em nada — é uma chamada direta do seu script/curl para o Bitrix24. Ideal para integrações internas, scripts pontuais e automações que rodam sempre dentro do mesmo portal.

1. **Abra o painel de Webhooks no seu portal**
   No menu do Bitrix24: *Aplicativos → clique em "Webhooks" (ou em "Recursos para desenvolvedores → Outro → Webhook de entrada", dependendo da versão do portal)*.

2. **Clique em "Adicionar webhook" → "Webhook de entrada"**
   Selecione os escopos (permissões) que o webhook vai poder usar — por exemplo `crm` para métodos de CRM, ou `user` para dados de usuário. Marque só o que for realmente necessário.

3. **Copie a URL gerada**
   O Bitrix24 mostra uma URL no formato:

   ```
   https://SEU-PORTAL.bitrix24.com.br/rest/ID_DO_USUARIO/CHAVE_DO_WEBHOOK/
   ```

   Essa chave já **é** a autenticação — qualquer requisição pra essa URL é tratada como autenticada com as permissões escolhidas no passo 2.

4. **Chame um método da API anexando o nome dele**
   Teste real (lista os dados do usuário atual, exige só o escopo básico):

   ```
   curl "https://SEU-PORTAL.bitrix24.com.br/rest/ID_DO_USUARIO/CHAVE_DO_WEBHOOK/user.current.json"
   ```

   Outro exemplo, listando leads do CRM (exige escopo `crm`):

   ```
   curl "https://SEU-PORTAL.bitrix24.com.br/rest/ID_DO_USUARIO/CHAVE_DO_WEBHOOK/crm.lead.list.json?select[]=ID&select[]=TITLE"
   ```

> ⚠️ A URL do webhook **é** a credencial — quem tiver essa URL consegue chamar a API com as permissões escolhidas. Nunca commite ela em repositório público, nunca exponha em código client-side (frontend). Se vazar, revogue e gere uma nova no mesmo painel. Diferente dos fluxos 2 e 3, essa URL não expira e não tem refresh — por isso não precisa de cache/banco de dados para gerenciar token.

---

## 2. Contexto automático `app dentro do portal`

Usado quando o app roda **dentro** do Bitrix24 (num iframe). O próprio portal injeta os tokens a cada carregamento, chamando o handler cadastrado com um `POST` — sem tela de login, sem redirecionamento manual.

1. **Suba seu servidor com uma URL pública** `SUA API`
   O Bitrix24 precisa alcançar seu servidor pela internet. Rode `npm start` (o projeto sobe em `http://localhost:3000`) e exponha a porta com um túnel, por exemplo `ngrok http 3000` ou o Port Forwarding do VS Code.

2. **Cadastre o app local** `BITRIX24`
   No portal: *Desenvolvedores → Outro → Adicionar aplicativo local*. Em **"Caminho de instalação (handler)"**, informe:

   ```
   https://sua-url-publica/install
   ```

   Essa é a rota `POST /install` deste projeto — o Bitrix24 vai chamá-la sozinho.

3. **Instale/abra o app dentro do portal** `BITRIX24`
   Ao instalar (e a cada vez que o app for aberto dentro do painel do Bitrix24), o portal faz automaticamente um `POST` pro handler, com o corpo contendo, entre outros:

   ```
   AUTH_ID=<access_token>
   AUTH_EXPIRES=3600
   REFRESH_ID=<refresh_token>
   member_id=<id do portal>
   DOMAIN=seu-portal.bitrix24.com.br
   ```

4. **Receba e visualize os tokens** `SUA API`
   A rota `POST /install` deste projeto (`src/app.js`) loga tudo no console e devolve um HTML com o que chegou. Pra simular sem o Bitrix24:

   ```
   curl -X POST https://sua-url-publica/install \
     -d "AUTH_ID=token_de_teste" \
     -d "REFRESH_ID=refresh_de_teste" \
     -d "member_id=abc123"
   ```

5. **⚠️ Guarde o token — não confie só no contexto do iframe**
   O `AUTH_ID` (access token) expira em `AUTH_EXPIRES` segundos (normalmente 3600 = 1 hora). Ele só chega de novo automaticamente quando o app é reaberto dentro do portal — então, se seu backend precisa chamar a API do Bitrix24 fora desse momento (fila, cron job, webhook assíncrono, processamento em background), você **precisa persistir** `AUTH_ID`, `REFRESH_ID` e `member_id` num banco de dados ou cache (Redis, por exemplo), associados ao `member_id` (identifica o portal de forma única).

   Quando o access_token expirar, renove chamando o endpoint real de refresh do Bitrix24:

   ```
   https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=SEU_CLIENT_ID&client_secret=SEU_CLIENT_SECRET&refresh_token=REFRESH_ID_SALVO
   ```

   A resposta traz um novo par `access_token`/`refresh_token` — salve os dois de novo, substituindo os antigos.

---

## 3. OAuth2 completo `app fora do portal`

Usado quando o app é acessado **fora** do Bitrix24. Segue o protocolo OAuth2 "Authorization Code": o usuário autoriza numa tela do próprio Bitrix24 e seu servidor troca um código por tokens.

1. **Tenha client_id e client_secret** `BITRIX24`
   Use o mesmo app cadastrado em *Desenvolvedores → Outro → Adicionar aplicativo local* (fluxo 2) — ele já tem um `client_id` (formato `local.xxxxxxxxx.xxxxxxxx`) e um `client_secret` visíveis na tela de configuração do app.

2. **Configure o redirect_uri** `SUA API`
   No mesmo cadastro do app, defina a URL de redirecionamento exatamente como:

   ```
   https://sua-url-publica/oauth/callback
   ```

   Precisa ser **idêntica**, caractere por caractere, à que você vai usar no passo 3 — o Bitrix24 recusa a autorização se não bater.

3. **Preencha o `.env`** `SUA API`

   ```
   BITRIX_CLIENT_ID=local.xxxxxxxxx.xxxxxxxx
   BITRIX_CLIENT_SECRET=seu_client_secret
   BITRIX_PORTAL_DOMAIN=seu-portal.bitrix24.com.br
   BITRIX_REDIRECT_URI=https://sua-url-publica/oauth/callback
   ```

4. **Abra a URL de autorização**
   Com `npm start` rodando, abra no navegador o atalho deste projeto:

   ```
   https://sua-url-publica/oauth/authorize   [SUA API]
   ```

   Essa rota só monta a URL real do Bitrix24 (usando as variáveis do `.env`) e redireciona você pra lá. A URL real por trás dela é:

   ```
   https://seu-portal.bitrix24.com.br/oauth/authorize/?client_id=SEU_CLIENT_ID&response_type=code&redirect_uri=https://sua-url-publica/oauth/callback   [BITRIX24]
   ```

5. **Faça login e autorize o app** `BITRIX24`
   Na tela do Bitrix24 (login do portal), entre com sua conta e clique em autorizar o app.

   Se você já estiver logado no Bitrix24 nesse navegador, esse passo acontece automaticamente — o portal não pede login de novo, só redireciona direto (o que pode parecer que a etapa "sumiu"). Pra testar o login de verdade, execute esse passo numa **guia anônima** do navegador.

6. **Bitrix24 redireciona de volta com um "code"** `BITRIX24`
   O navegador é redirecionado (sempre via `GET`, feito pelo próprio navegador) para o seu redirect_uri, com `code`, `domain` e `member_id` na query string:

   ```
   https://sua-url-publica/oauth/callback?code=XXXXXXXX&domain=seu-portal.bitrix24.com.br&member_id=...
   ```

7. **Servidor troca o code por tokens** `SUA API` → `BITRIX24`
   A rota `GET /oauth/callback` deste projeto recebe o `code` e chama, internamente (server-to-server), o endpoint real de token do Bitrix24:

   ```
   https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=SEU_CLIENT_ID&client_secret=SEU_CLIENT_SECRET&code=XXXXXXXX
   ```

   O Bitrix24 responde em JSON com `access_token`, `refresh_token`, `expires_in`, `domain`, `member_id`, `scope`.

8. **Pronto — tokens na tela** `SUA API`
   A página final mostra tudo que o Bitrix24 devolveu; o console do servidor também loga a resposta completa.

9. **⚠️ Guarde o token — não é permanente**
   Assim como no fluxo 2, o `access_token` expira (normalmente em `expires_in` = 3600s). Persista `access_token`, `refresh_token` e `member_id` num banco de dados ou cache associados ao usuário/portal que autorizou, e renove antes de expirar chamando o mesmo endpoint de refresh:

   ```
   https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=SEU_CLIENT_ID&client_secret=SEU_CLIENT_SECRET&refresh_token=REFRESH_TOKEN_SALVO
   ```

Testando manualmente só a troca de tokens, com um code já obtido (sem passar pelo navegador de novo):

```
curl -X POST https://sua-url-publica/oauth/callback \
  -d "code=CODE_RECEBIDO_DO_BITRIX24" \
  -d "domain=seu-portal.bitrix24.com.br"
```

---

## Referência rápida

| URL | Origem | Quando é chamada |
|---|---|---|
| `.../rest/<id>/<chave>/<metodo>.json` | BITRIX24 | Webhook fixo — você chama direto, sem nosso servidor. |
| `POST /install` | SUA API | Automaticamente pelo Bitrix24, a cada abertura do app dentro do portal. |
| `GET /oauth/authorize` | SUA API | Manual, aberta por você no navegador — atalho que monta a URL de autorização real. |
| `.../oauth/authorize/?client_id=...` | BITRIX24 | Tela de login/autorização real, pra onde o atalho acima redireciona. |
| `GET /oauth/callback` | SUA API | Automaticamente, quando o Bitrix24 redireciona o navegador após a autorização (redirect_uri). |
| `POST /oauth/callback` | SUA API | Manual (curl/Insomnia), pra testar a troca de code por tokens sem navegador. |
| `.../oauth/token/?grant_type=...` | BITRIX24 | Chamada interna do servidor (troca de code e renovação de token). |

---

*auth-examples-bitrix24 — guia de referência, não substitui a documentação oficial do Bitrix24.*
