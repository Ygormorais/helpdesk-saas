import { AutomationRule, Ticket, User, AuditAction } from '../models/index.js';
import { planService } from './planService.js';
import { notificationService } from './notificationService.js';
import { auditService } from './auditService.js';

export class AutomationService {
  async applyTicketCreated(params: { tenantId: string; ticketId: string; actorUserId: string }): Promise<void> {
    const { tenantId, ticketId, actorUserId } = params;

    const has = await planService.checkFeatureAccess(tenantId, 'automations');
    if (!has) return;

    const rules = await AutomationRule.find({
      tenant: tenantId,
      trigger: 'ticket.created',
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .limit(50);

    if (rules.length === 0) return;

    const ticket = await Ticket.findOne({ _id: ticketId, tenant: tenantId });
    if (!ticket) return;

    const match = rules.find((r: any) => {
      if (r.conditions?.category && String(r.conditions.category) !== String(ticket.category)) return false;
      if (r.conditions?.priority && String(r.conditions.priority) !== String(ticket.priority)) return false;
      return true;
    });

    if (!match) return;

    const updates: any = {};
    const oldAssignedTo = ticket.assignedTo ? String(ticket.assignedTo) : null;
    const oldStatus = ticket.status;

    if (match.actions?.assignTo) {
      updates.assignedTo = match.actions.assignTo;
      updates.status = match.actions.setStatus || 'in_progress';
    } else if (match.actions?.setStatus) {
      updates.status = match.actions.setStatus;
    }

    const hasChanges = Object.keys(updates).length > 0;
    if (!hasChanges) return;

    Object.assign(ticket, updates);
    await ticket.save();

    // Notifications/audit (best-effort)
    try {
      const actor = await User.findOne({ _id: actorUserId, tenant: tenantId }).select('name role tenant');
      if (actor && updates.assignedTo && String(updates.assignedTo) !== oldAssignedTo) {
        const assigned = await User.findOne({ _id: updates.assignedTo, tenant: tenantId }).select('name');
        await notificationService.notifyTicketAssigned(
          String(ticket.tenant),
          String(ticket._id),
          ticket.title,
          ticket.ticketNumber,
          String(updates.assignedTo),
          assigned?.name || 'Agente',
          actor.name
        );
      }

      if (actor) {
        await auditService.log(
          AuditAction.TICKET_UPDATED,
          'ticket',
          ticket._id.toString(),
          {
            ticketNumber: ticket.ticketNumber,
            automationRuleId: match._id.toString(),
            updates,
            oldStatus,
            newStatus: ticket.status,
            oldAssignedTo,
            newAssignedTo: ticket.assignedTo ? String(ticket.assignedTo) : null,
          },
          { user: actor as any }
        );
      }
    } catch {
      // ignore
    }
  }
}

export const automationService = new AutomationService();
