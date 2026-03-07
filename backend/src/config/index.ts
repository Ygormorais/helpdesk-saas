import dotenv from 'dotenv';

dotenv.config();

const parseCsv = (value: string | undefined): string[] =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const corsAllowedOrigins = Array.from(
  new Set([...parseCsv(process.env.CORS_ALLOWED_ORIGINS), frontendUrl])
);

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk',

  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    previousSecret: process.env.JWT_SECRET_PREVIOUS || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  frontendUrl,
  corsAllowedOrigins,

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.AWS_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
  },

  asaasApiKey: process.env.ASAAS_API_KEY || '',
  asaasWebhookSecret: process.env.ASAAS_WEBHOOK_SECRET || '',

  platformAdminEmails: String(process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  billing: {
    remindersEnabled: String(process.env.BILLING_REMINDERS_ENABLED || '').toLowerCase() === 'true',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
  },

  aiEmbeddingsProvider: (process.env.AI_EMBEDDINGS_PROVIDER || '').toLowerCase() as
    | 'openai'
    | 'ollama'
    | 'none'
    | '',
};

const validateProductionConfig = (): void => {
  if (config.nodeEnv !== 'production') {
    return;
  }

  const errors: string[] = [];

  const jwtSecret = config.jwt.secret.trim();
  if (!jwtSecret || jwtSecret === 'super-secret-key-change-in-production') {
    errors.push('JWT_SECRET ausente ou usando valor padrao inseguro.');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET deve ter ao menos 32 caracteres em producao.');
  }

  const frontend = config.frontendUrl.trim();
  if (!frontend) {
    errors.push('FRONTEND_URL e obrigatorio em producao.');
  } else {
    if (frontend.includes('localhost')) {
      errors.push('FRONTEND_URL nao pode usar localhost em producao.');
    }
    if (!/^https:\/\//i.test(frontend)) {
      errors.push('FRONTEND_URL deve usar https em producao.');
    }
  }

  const insecureCorsOrigins = config.corsAllowedOrigins.filter(
    (origin) => origin.includes('localhost') || /^http:\/\//i.test(origin)
  );
  if (insecureCorsOrigins.length > 0) {
    errors.push(`CORS_ALLOWED_ORIGINS contem origem insegura em producao: ${insecureCorsOrigins.join(', ')}`);
  }

  if (errors.length > 0) {
    const header = 'Configuracao invalida para producao';
    throw new Error(`${header}:\n- ${errors.join('\n- ')}`);
  }
};

validateProductionConfig();
