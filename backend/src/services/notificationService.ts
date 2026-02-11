import { Ticket, User, Comment, Tenant, IUser } from '../models/index.js';
import { emailTemplates, sendEmail } from './emailService.js';
import { App } from '../index.js';

interface NotificationPayload {
  type: string;
  data: Record<string, any>;
  tenantId: string;
}

export class NotificationService {
  private io: any;

  constructor() {
    this.io = null;
  }

  setIO(io: any) {
    this.io = io;
  }

  private emitToTenant(tenantId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`tenant:${tenantId}`).emit(event, data);
    }
  }

  async notifyTicketCreated(ticket: any, createdBy: IUser): Promise<void> {
    const tenant = await Tenant.findById(ticket.tenant);

    const payload: NotificationPayload = {
      type: 'TICKET_CREATED',
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        priority: ticket.priority,
        createdBy: {
          id: createdBy._id,
          name: createdBy.name,
        },
      },
      tenantId: ticket.tenant.toString(),
    };

    this.emitToTenant(payload.tenantId, 'ticket:created', payload.data);

    const agents = await User.find({
      tenant: ticket.tenant,
      role: { $in: ['agent', 'manager', 'admin'] },
      isActive: true,
    });

    const agentEmails = agents
      .filter((a) => a._id.toString() !== createdBy._id.toString())
      .map((a) => a.email);

    if (agentEmails.length > 0) {
      await Promise.all(
        agentEmails.map((email) =>
          sendEmail({
            to: email,
            ...emailTemplates.ticketCreated({
              ticketNumber: ticket.ticketNumber,
              title: ticket.title,
              customerName: createdBy.name,
              url: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
            }),
          })
        )
      );
    }

    if (createdBy.role !== 'client') {
      await sendEmail({
        to: createdBy.email,
        ...emailTemplates.ticketCreated({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          customerName: createdBy.name,
          url: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
        }),
      });
    }
  }

  async notifyTicketUpdated(
    ticket: any,
    updatedBy: IUser,
    oldStatus?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: 'TICKET_UPDATED',
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        updatedBy: {
          id: updatedBy._id,
          name: updatedBy.name,
        },
      },
      tenantId: ticket.tenant.toString(),
    };

    this.emitToTenant(payload.tenantId, 'ticket:updated', payload.data);

    if (ticket.assignedTo && updatedBy._id.toString() !== ticket.assignedTo.toString()) {
      const assignee = await User.findById(ticket.assignedTo);
      if (assignee) {
        await sendEmail({
          to: assignee.email,
          ...emailTemplates.ticketUpdated({
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            status: ticket.status,
            url: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
          }),
        });
      }
    }
  }

  async notifyNewComment(ticket: any, comment: any, author: IUser): Promise<void> {
    const payload: NotificationPayload = {
      type: 'COMMENT_CREATED',
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        commentId: comment._id,
        author: {
          id: author._id,
          name: author.name,
        },
        isInternal: comment.isInternal,
      },
      tenantId: ticket.tenant.toString(),
    };

    this.emitToTenant(payload.tenantId, 'comment:created', payload.data);

    const customer = await User.findById(ticket.createdBy);
    const assignee = ticket.assignedTo ? await User.findById(ticket.assignedTo) : null;

    const notifyEmails: string[] = [];
    const preview = comment.content.substring(0, 200);

    if (customer && customer._id.toString() !== author._id.toString() && !comment.isInternal) {
      await sendEmail({
        to: customer.email,
        ...emailTemplates.newComment({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          authorName: author.name,
          commentPreview: preview,
          url: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
        }),
      });
    }

    if (assignee && assignee._id.toString() !== author._id.toString()) {
      await sendEmail({
        to: assignee.email,
        ...emailTemplates.newComment({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          authorName: author.name,
          commentPreview: preview,
          url: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
        }),
      });
    }
  }

  async notifyTicketResolved(ticket: any, resolvedBy: IUser): Promise<void> {
    const payload: NotificationPayload = {
      type: 'TICKET_RESOLVED',
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        resolvedBy: {
          id: resolvedBy._id,
          name: resolvedBy.name,
        },
      },
      tenantId: ticket.tenant.toString(),
    };

    this.emitToTenant(payload.tenantId, 'ticket:resolved', payload.data);

    const customer = await User.findById(ticket.createdBy);
    if (customer) {
      await sendEmail({
        to: customer.email,
        ...emailTemplates.ticketResolved({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          resolution: ticket.resolution || 'O problema foi tratado e resolvido.',
          url: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
        }),
      });
    }
  }

  async notifyUserInvited(invitedEmail: string, inviter: IUser, tenant: Tenant, role: string): Promise<void> {
    await sendEmail({
      to: invitedEmail,
      ...emailTemplates.inviteUser({
        inviterName: inviter.name,
        tenantName: tenant.name,
        role,
        url: `${process.env.FRONTEND_URL}/register?invite=true&email=${encodeURIComponent(invitedEmail)}`,
      }),
    });
  }
}

export const notificationService = new NotificationService();
