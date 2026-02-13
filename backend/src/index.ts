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
import { notificationService } from './services/notificationService.js';
import { chatService } from './services/chatService.js';

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

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

app.set('io', io);

const startServer = () => {
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
};

connectDB()
  .then(startServer)
  .catch((err) => {
    console.error('Starting server without MongoDB connection');
    console.error(err);
    startServer();
  });

export default app;
