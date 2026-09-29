import { renderHtml } from "../views/html.js";

export function authRoutes(app) {
    // ROTA 1: POST /install — Bitrix24 injeta o contexto automaticamente quando
    // o app abre dentro do portal. Sem login, sem redirect.
    app.post('/install', async (request, reply) => {
      const contexto = request.body || {};
      console.log('[POST /install] contexto recebido do Bitrix24:', contexto);
      reply
        .type('text/html')
        .send(
          renderHtml(
            'Autenticação via contexto do Bitrix24',
            'Dados recebidos automaticamente no POST enviado pelo Bitrix24 ao abrir o app.',
            contexto
          )
        );
    });
    
    // ROTA 2: POST /oauth/callback — recebe "code" via body. Fluxo OAuth2
    // completo (app fora do Bitrix).
    app.post('/oauth/callback', async (request, reply) => {
      const { code, domain } = request.body || {};

      if (!code) {
        reply.status(400).type('text/html').send(renderHtml('Erro na autenticação OAuth2', 'Parâmetro "code" ausente.', {}));
        return;
      }

      try {
        const url = new URL('https://oauth.bitrix.info/oauth/token/');
        url.searchParams.set('grant_type', 'authorization_code');
        url.searchParams.set('client_id', BITRIX_CLIENT_ID);
        url.searchParams.set('client_secret', BITRIX_CLIENT_SECRET);
        url.searchParams.set('code', code);

        const resposta = await fetch(url);
        const tokens = resposta.json();

        console.log('[oauth/callback] tokens recebidos do Bitrix24:', tokens);

        reply
          .type('text/html')
          .send(renderHtml('Autenticação OAuth2 concluída', 'Tokens devolvidos pelo Bitrix24.', { code, domain, ...tokens }));
        } catch (erro) {
          console.log('[oauth/callback] erro ao trocar code por tokens:', erro.message);
          reply.status(502).type('text/html').send(renderHtml('Erro na autenticação OAuth2', erro.message, {}));
        }
    });
}
