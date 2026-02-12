import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailTemplates } from './emailService';

describe('Email Templates', () => {
  describe('ticketCreated', () => {
    it('should generate correct email for ticket creation', () => {
      const data = {
        ticketNumber: 'TKT-00001',
        title: 'Test ticket',
        customerName: 'John Doe',
        url: 'https://example.com/tickets/1',
      };

      const template = emailTemplates.ticketCreated(data);

      expect(template.subject).toContain('TKT-00001');
      expect(template.subject).toContain('Confirmação');
      expect(template.html).toContain('Test ticket');
      expect(template.html).toContain('John Doe');
      expect(template.html).toContain(data.url);
    });
  });

  describe('ticketUpdated', () => {
    it('should generate correct email for ticket update', () => {
      const data = {
        ticketNumber: 'TKT-00001',
        title: 'Test ticket',
        status: 'in_progress',
        assigneeName: 'Agent Smith',
        url: 'https://example.com/tickets/1',
      };

      const template = emailTemplates.ticketUpdated(data);

      expect(template.subject).toContain('TKT-00001');
      expect(template.subject).toContain('in_progress');
      expect(template.html).toContain('Agent Smith');
    });
  });

  describe('ticketResolved', () => {
    it('should generate correct email for ticket resolution', () => {
      const data = {
        ticketNumber: 'TKT-00001',
        title: 'Test ticket',
        resolution: 'Issue has been fixed',
        url: 'https://example.com/tickets/1',
      };

      const template = emailTemplates.ticketResolved(data);

      expect(template.subject).toContain('resolvido');
      expect(template.html).toContain('Issue has been fixed');
    });
  });

  describe('inviteUser', () => {
    it('should generate correct email for user invitation', () => {
      const data = {
        inviterName: 'Admin',
        tenantName: 'Company',
        role: 'Agent',
        url: 'https://example.com/register',
      };

      const template = emailTemplates.inviteUser(data);

      expect(template.subject).toContain('convidado');
      expect(template.html).toContain('Company');
      expect(template.html).toContain('Agent');
    });
  });

  describe('passwordReset', () => {
    it('should generate correct email for password reset', () => {
      const data = {
        name: 'John Doe',
        url: 'https://example.com/reset-password',
      };

      const template = emailTemplates.passwordReset(data);

      expect(template.subject).toContain('Redefinição');
      expect(template.html).toContain('John Doe');
    });
  });
});
