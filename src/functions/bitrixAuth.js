// Fala com o Bitrix24 para o fluxo OAuth2: troca "code" por tokens e monta
// a URL de autorização.

import { BITRIX_CLIENT_ID, BITRIX_CLIENT_SECRET, BITRIX_PORTAL_DOMAIN, BITRIX_REDIRECT_URI } from '../env/config.js';
import { renderHtml } from './html.js';

// Troca o "code" por tokens reais no endpoint oficial do Bitrix24.
export async function trocarCodePorTokens(code) {
  const url = new URL('https://oauth.bitrix.info/oauth/token/');
  url.searchParams.set('grant_type', 'authorization_code');
  url.searchParams.set('client_id', BITRIX_CLIENT_ID);
  url.searchParams.set('client_secret', BITRIX_CLIENT_SECRET);
  url.searchParams.set('code', code);
  const resposta = await fetch(url);
  return resposta.json();
}

// Lógica comum às rotas POST e GET de /oauth/callback.
export async function responderComTokens(reply, code, domain) {
  if (!code) {
    reply.status(400).type('text/html').send(renderHtml('Erro na autenticação OAuth2', 'Parâmetro "code" ausente.', {}));
    return;
  }
  try {
    const tokens = await trocarCodePorTokens(code);
    console.log('[oauth/callback] tokens recebidos do Bitrix24:', tokens);
    reply
      .type('text/html')
      .send(renderHtml('Autenticação OAuth2 concluída', 'Tokens devolvidos pelo Bitrix24.', { code, domain, ...tokens }));
  } catch (erro) {
    console.log('[oauth/callback] erro ao trocar code por tokens:', erro.message);
    reply.status(502).type('text/html').send(renderHtml('Erro na autenticação OAuth2', erro.message, {}));
  }
}

// Monta a URL de autorização do Bitrix24 (passo 1 do fluxo OAuth2).
export function montarUrlAutorizacao() {
  const url = new URL(`https://${BITRIX_PORTAL_DOMAIN}/oauth/authorize/`);
  url.searchParams.set('client_id', BITRIX_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', BITRIX_REDIRECT_URI);
  return url.toString();
}
