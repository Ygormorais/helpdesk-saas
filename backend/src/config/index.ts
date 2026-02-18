import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk',

  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

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
