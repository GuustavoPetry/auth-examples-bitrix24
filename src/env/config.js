// Variáveis de ambiente do projeto (veja .env.example).

export const PORT = process.env.PORT || 3000;

export const BITRIX_CLIENT_ID = process.env.BITRIX_CLIENT_ID;
export const BITRIX_CLIENT_SECRET = process.env.BITRIX_CLIENT_SECRET;

export const BITRIX_PORTAL_DOMAIN = process.env.BITRIX_PORTAL_DOMAIN;
export const BITRIX_REDIRECT_URI =
  process.env.BITRIX_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/oauth/callback`;
