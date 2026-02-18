import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { connectDB } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { requireDbConnection } from './middlewares/dbReady.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notificationService } from './services/notificationService.js';
import { chatService } from './services/chatService.js';
import { sendTrialRemindersOnce } from './services/billingReminderService.js';
import { getReadiness } from './services/healthService.js';
import { metricsService } from './services/metricsService.js';
import { startAuditRetentionCleanupScheduler } from './services/auditRetentionCleanupService.js';
import { reportScheduleService } from './services/reportScheduleService.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

// Inicializar serviço de notificações com socket.io
notificationService.setIO(io);

// Chat realtime (autenticacao via JWT, join em rooms do tenant/chat)
chatService.initialize(io);

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(requestLogger);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit only in production (dev needs lots of reload/API calls)
if (config.nodeEnv === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP',
  });
  app.use('/api', limiter);
}

 // Most API routes require MongoDB. If DB is down, return 503 instead of hanging.
 app.use('/api', requireDbConnection);
 app.use('/api', routes);

app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', async (_req, res) => {
  const out = await getReadiness();
  res.status(out.ready ? 200 : 503).json({
    status: out.ready ? 'ok' : 'degraded',
    ready: out.ready,
    timestamp: new Date().toISOString(),
    deps: out.deps,
  });
});

app.use(notFound);
app.use(errorHandler);

app.set('io', io);

const startServer = () => {
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });

  // Best-effort load persisted metrics.
  metricsService.initialize().catch(() => undefined);

  startAuditRetentionCleanupScheduler();
  reportScheduleService.startScheduler();

  if (config.billing.remindersEnabled) {
    const run = async () => {
      try {
        await sendTrialRemindersOnce();
      } catch {
        // ignore
      }
    };

    // initial and periodic run (every 12h)
    run();
    setInterval(run, 12 * 60 * 60 * 1000);
  }
};

connectDB()
  .then(startServer)
  .catch((err) => {
    console.error('Starting server without MongoDB connection');
    console.error(err);
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
    startServer();
  });

export default app;
