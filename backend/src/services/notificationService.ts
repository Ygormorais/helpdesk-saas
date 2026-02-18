import { Tenant, User, type ITenant, type IUser, Notification, NotificationType } from '../models/index.js';
import { emailTemplates, sendEmail } from './emailService.js';

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

  private async createAndEmit(args: {
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    data: Record<string, any>;
    ticketId?: string;
    chatId?: string;
    createdById?: string;
  }): Promise<void> {
    try {
      const doc = await Notification.create({
        tenant: args.tenantId,
        type: args.type,
        title: args.title,
        message: args.message,
        data: args.data,
        ticket: args.ticketId,
        chat: args.chatId,
        createdBy: args.createdById,
        readBy: [],
      });

      this.emitToTenant(args.tenantId, 'notification:created', {
        id: doc._id,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        data: doc.data,
        ticketId: doc.ticket,
        chatId: doc.chat,
        createdBy: doc.createdBy,
        createdAt: doc.createdAt,
        read: false,
      });
    } catch {
      // Notification persistence is best-effort; realtime events still work.
    }
  }

  async notifyTicketCreated(ticket: any, createdBy: IUser): Promise<void> {
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
    await this.createAndEmit({
      tenantId: payload.tenantId,
      type: NotificationType.TICKET_CREATED,
      title: 'Novo Ticket',
      message: `Ticket "${ticket.title}" foi criado por ${createdBy.name}`,
      data: payload.data,
      ticketId: ticket._id.toString(),
      createdById: createdBy._id.toString(),
    });

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
    await this.createAndEmit({
      tenantId: payload.tenantId,
      type: NotificationType.TICKET_UPDATED,
      title: 'Ticket Atualizado',
      message: `Ticket "${ticket.title}" foi atualizado`,
      data: payload.data,
      ticketId: ticket._id.toString(),
      createdById: updatedBy._id.toString(),
    });

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

  async notifyTicketAssigned(
    tenantId: string,
    ticketId: string,
    ticketTitle: string,
    ticketNumber: string,
    assignedToId: string,
    assignedToName: string,
    assignedByName: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: 'TICKET_ASSIGNED',
      data: {
        ticketId,
        ticketNumber,
        title: ticketTitle,
        assignedTo: assignedToName,
        assignedBy: assignedByName,
      },
      tenantId,
    };

    this.emitToTenant(tenantId, 'ticket:assigned', payload.data);
    await this.createAndEmit({
      tenantId,
      type: NotificationType.TICKET_ASSIGNED,
      title: 'Ticket Atribuido',
      message: `Ticket "${ticketTitle}" foi atribuido para ${assignedToName} por ${assignedByName}`,
      data: payload.data,
      ticketId,
    });

    const assignee = await User.findOne({
      _id: assignedToId,
      tenant: tenantId,
      isActive: true,
    }).select('email');

    if (assignee?.email) {
      await sendEmail({
        to: assignee.email,
        ...emailTemplates.ticketAssigned({
          ticketNumber,
          title: ticketTitle,
          assignedByName,
          url: `${process.env.FRONTEND_URL}/tickets/${ticketId}`,
        }),
      });
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
    await this.createAndEmit({
      tenantId: payload.tenantId,
      type: NotificationType.COMMENT_CREATED,
      title: 'Novo Comentario',
      message: `${author.name} comentou no ticket "${ticket.title}"`,
      data: payload.data,
      ticketId: ticket._id.toString(),
      createdById: author._id.toString(),
    });

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
    await this.createAndEmit({
      tenantId: payload.tenantId,
      type: NotificationType.TICKET_RESOLVED,
      title: 'Ticket Resolvido',
      message: `Ticket "${ticket.title}" foi resolvido`,
      data: payload.data,
      ticketId: ticket._id.toString(),
      createdById: resolvedBy._id.toString(),
    });

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

  async notifyUserInvited(
    invitedEmail: string,
    inviter: IUser,
    tenant: ITenant,
    role: string,
    inviteToken: string
  ): Promise<void> {
    await sendEmail({
      to: invitedEmail,
      ...emailTemplates.inviteUser({
        inviterName: inviter.name,
        tenantName: tenant.name,
        role,
        url: `${process.env.FRONTEND_URL}/register?invite=true&token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(invitedEmail)}`,
      }),
    });
  }
}

export const notificationService = new NotificationService();
