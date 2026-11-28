import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '@/config/env';
import { testConnection, closePool } from '@/config/database';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandler';
import authRoutes from '@/routes/auth.routes';
import estabelecimentoRoutes from '@/routes/estabelecimento.routes';
import servicoRoutes from '@/routes/servico.routes';
import profissionalRoutes from '@/routes/profissional.routes';
import agendamentoRoutes from '@/routes/agendamento.routes';
import feedRoutes from '@/routes/feed.routes';
import notificacaoRoutes from '@/routes/notificacao.routes';
import assinaturaRoutes from '@/routes/assinatura.routes';
import adminRoutes from '@/routes/admin.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
  credentials: true,
}));
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { erro: 'Muitas requisições, tente novamente mais tarde' },
}));

app.get('/api/health', async (_req, res) => {
  const dbOk = await testConnection();
  res.json({ status: 'ok', database: dbOk ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/estabelecimentos', estabelecimentoRoutes);
app.use('/api/estabelecimentos/:estabelecimentoId/servicos', servicoRoutes);
app.use('/api/estabelecimentos/:estabelecimentoId/profissionais', profissionalRoutes);
app.use('/api/estabelecimentos/:estabelecimentoId/agendamentos', agendamentoRoutes);
app.use('/api/estabelecimentos/:estabelecimentoId/feed', feedRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/assinaturas', assinaturaRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('❌ Não foi possível conectar ao banco de dados');
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${env.PORT}`);
    console.log(`📍 Ambiente: ${env.NODE_ENV}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, encerrando...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT, encerrando...');
  await closePool();
  process.exit(0);
});

start();