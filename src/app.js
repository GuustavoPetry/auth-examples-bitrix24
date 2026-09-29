import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { PORT } from './env/config.js';
import { authRoutes } from './routes/auth.routes.js';

const app = Fastify({ logger: true });

app.register(formbody); // Bitrix24 manda form-urlencoded, não JSON

app.register(authRoutes);

app.listen({ port: PORT, host: '0.0.0.0' }, (erro, endereco) => {
  if (erro) {
    app.log.error(erro);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${endereco}`);
});
