import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"HelpDesk" <${config.email.user}>`,
      ...options,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export const emailTemplates = {
  ticketCreated: (data: {
    ticketNumber: string;
    title: string;
    customerName: string;
    url: string;
  }) => ({
    subject: `[${data.ticketNumber}] Confirmação de criação de ticket`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Ticket Criado</h1>
        <p>Olá ${data.customerName},</p>
        <p>Seu ticket foi criado com sucesso!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> ${data.ticketNumber}</p>
          <p><strong>Título:</strong> ${data.title}</p>
        </div>
        <p>Você pode acompanhar o andamento do seu ticket acessando:</p>
        <a href="${data.url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">Ver Ticket</a>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Atenciosamente,<br>Equipe HelpDesk</p>
      </div>
    `,
  }),

  ticketUpdated: (data: {
    ticketNumber: string;
    title: string;
    status: string;
    assigneeName?: string;
    url: string;
  }) => ({
    subject: `[${data.ticketNumber}] Atualização do seu ticket - ${data.status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Ticket Atualizado</h1>
        <p>Seu ticket foi atualizado!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> ${data.ticketNumber}</p>
          <p><strong>Título:</strong> ${data.title}</p>
          <p><strong>Novo Status:</strong> <span style="background: #dbeafe; padding: 4px 8px; border-radius: 4px;">${data.status}</span></p>
          ${data.assigneeName ? `<p><strong>Responsável:</strong> ${data.assigneeName}</p>` : ''}
        </div>
        <a href="${data.url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Ver Ticket</a>
      </div>
    `,
  }),

  newComment: (data: {
    ticketNumber: string;
    title: string;
    authorName: string;
    commentPreview: string;
    url: string;
  }) => ({
    subject: `[${data.ticketNumber}] Nova resposta no seu ticket`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Nova Resposta</h1>
        <p>${data.authorName} respondeu ao seu ticket:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
          <p style="margin: 0;">${data.commentPreview}</p>
        </div>
        <a href="${data.url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Ver Resposta Completa</a>
      </div>
    `,
  }),

  ticketResolved: (data: {
    ticketNumber: string;
    title: string;
    resolution: string;
    url: string;
  }) => ({
    subject: `[${data.ticketNumber}] Seu ticket foi resolvido`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">Ticket Resolvido</h1>
        <p>Ótimas notícias! Seu ticket foi marcado como resolvido.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número:</strong> ${data.ticketNumber}</p>
          <p><strong>Título:</strong> ${data.title}</p>
          <p><strong>Resolução:</strong></p>
          <p>${data.resolution}</p>
        </div>
        <p>Se você não ficou satisfeito com a solução, basta responder a este email.</p>
        <a href="${data.url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px;">Avaliar Solução</a>
        <a href="${data.url}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Reabrir Ticket</a>
      </div>
    `,
  }),

  inviteUser: (data: {
    inviterName: string;
    tenantName: string;
    role: string;
    url: string;
  }) => ({
    subject: `Você foi convidado para participar do ${data.tenantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Convite para Equipe</h1>
        <p>${data.inviterName} convidou você para fazer parte da equipe do <strong>${data.tenantName}</strong></p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Função:</strong> ${data.role}</p>
        </div>
        <a href="${data.url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Aceitar Convite</a>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Este convite expira em 48 horas.</p>
      </div>
    `,
  }),

  passwordReset: (data: {
    name: string;
    url: string;
  }) => ({
    subject: `Redefinição de senha - HelpDesk`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Redefinição de Senha</h1>
        <p>Olá ${data.name},</p>
        <p>Você solicitou a redefinição de senha. Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${data.url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;">Redefinir Senha</a>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Se você não solicitou esta redefinição, ignore este email.<br>Este link expira em 1 hora.</p>
      </div>
    `,
  }),
};

export default { sendEmail, emailTemplates, transporter };
