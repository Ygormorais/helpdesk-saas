import crypto from 'crypto';
import axios from 'axios';
import { Webhook, IWebhook } from '../models/index.js';

interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

export class WebhookService {
  private signatureHeader = 'x-webhook-signature';

  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  async triggerEvent(tenantId: string, event: string, data: Record<string, any>): Promise<void> {
    const webhooks = await Webhook.find({
      tenant: tenantId,
      isActive: true,
      events: event,
    });

    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await Promise.all(
      webhooks.map((webhook) => this.sendWebhook(webhook, payload))
    );
  }

  private async sendWebhook(webhook: IWebhook, payload: WebhookPayload): Promise<void> {
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    try {
      await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          [this.signatureHeader]: signature,
          'X-Webhook-ID': webhook._id.toString(),
          ...Object.fromEntries(webhook.headers),
        },
        timeout: 10000,
      });

      webhook.lastTriggeredAt = new Date();
      webhook.failureCount = 0;
      await webhook.save();
    } catch (error: any) {
      webhook.failureCount += 1;
      webhook.lastFailedAt = new Date();

      if (webhook.failureCount >= 5) {
        webhook.isActive = false;
      }

      await webhook.save();

      console.error(`Webhook ${webhook._id} failed:`, error.message);
    }
  }

  async createWebhook(data: {
    name: string;
    url: string;
    events: string[];
    tenant: string;
    headers?: Record<string, string>;
  }): Promise<IWebhook> {
    const secret = crypto.randomBytes(32).toString('hex');

    return Webhook.create({
      ...data,
      secret,
    });
  }

  async testWebhook(webhook: IWebhook): Promise<{ success: boolean; status?: number; error?: string }> {
    const testPayload: WebhookPayload = {
      id: 'test',
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Este e um envio de webhook de teste',
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    try {
      const response = await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          [this.signatureHeader]: signature,
          'X-Webhook-ID': webhook._id.toString(),
        },
        timeout: 10000,
      });

      webhook.lastTriggeredAt = new Date();
      await webhook.save();

      return { success: true, status: response.status };
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: error.message,
      };
    }
  }
}

export const webhookService = new WebhookService();
