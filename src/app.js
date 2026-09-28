// Demo de autenticação Bitrix24 com Fastify: contexto automático (app dentro
// do Bitrix) e OAuth2 completo (app fora do Bitrix). Este arquivo só define
// as rotas — as funções estão em /src. Guia completo em /docs/index.html.

import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { PORT, BITRIX_CLIENT_ID, BITRIX_PORTAL_DOMAIN } from './env/config.js';
import { renderHtml } from './functions/html.js';
import { responderComTokens, montarUrlAutorizacao } from './functions/bitrixAuth.js';

const fastify = Fastify({ logger: true });
fastify.register(formbody); // Bitrix24 manda form-urlencoded, não JSON

// ROTA 1: POST /install — Bitrix24 injeta o contexto automaticamente quando
// o app abre dentro do portal. Sem login, sem redirect.
fastify.post('/install', async (request, reply) => {
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
// completo (app fora do Bitrix). Útil para testar com curl/Postman.
fastify.post('/oauth/callback', async (request, reply) => {
  const { code, domain } = request.body || {};
  await responderComTokens(reply, code, domain);
});

// GET /oauth/callback — mesma lógica, lendo "code" da query string. É pra
// ESTA URL que o Bitrix24 redireciona o navegador de verdade.
fastify.get('/oauth/callback', async (request, reply) => {
  const { code, domain } = request.query || {};
  await responderComTokens(reply, code, domain);
});

// GET /oauth/authorize — atalho pra testar o fluxo completo pelo navegador.
fastify.get('/oauth/authorize', async (request, reply) => {
  if (!BITRIX_PORTAL_DOMAIN || !BITRIX_CLIENT_ID) {
    reply
      .status(400)
      .type('text/html')
      .send(renderHtml('Configuração incompleta', 'Preencha BITRIX_PORTAL_DOMAIN e BITRIX_CLIENT_ID no .env.', {}));
    return;
  }
  reply.redirect(montarUrlAutorizacao());
});

fastify.listen({ port: PORT, host: '0.0.0.0' }, (erro, endereco) => {
  if (erro) {
    fastify.log.error(erro);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${endereco}`);
});
