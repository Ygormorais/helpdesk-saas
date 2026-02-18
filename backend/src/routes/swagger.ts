import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';

const router = Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HelpDesk SaaS API',
      version: '1.0.0',
      description: 'API do sistema HelpDesk SaaS - Sistema de gestão de tickets e atendimento',
      contact: {
        name: 'Suporte',
        email: 'suporte@helpdesk.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'agent', 'client'] },
            avatar: { type: 'string' },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            ticketNumber: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            category: { type: 'string' },
            createdBy: { type: 'object' },
            assignedTo: { type: 'object' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        Article: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            slug: { type: 'string' },
            content: { type: 'string' },
            excerpt: { type: 'string' },
            category: { type: 'object' },
            author: { type: 'object' },
            views: { type: 'number' },
            isPublished: { type: 'boolean' },
            createdAt: { type: 'string' },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            events: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Endpoints de autenticação' },
      { name: 'Tickets', description: 'Operações com tickets' },
      { name: 'Categories', description: 'Categorias de tickets' },
      { name: 'Articles', description: 'Base de conhecimento' },
      { name: 'Analytics', description: 'Relatórios e métricas' },
      { name: 'Webhooks', description: 'Integrações via webhooks' },
      { name: 'Team', description: 'Gestão de equipe' },
      { name: 'Audit', description: 'Logs de auditoria' },
      { name: 'Ops', description: 'Health e observabilidade' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

router.get('/swagger.json', (_req, res) => {
  res.json(swaggerSpec);
});

export default router;
