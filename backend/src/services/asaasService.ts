import axios from 'axios';
import { config } from '../config/index.js';
import { getRequestId } from './requestContext.js';
import { logger } from './logger.js';

const ASAAS_API_URL = config.nodeEnv === 'production' 
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const asaasClient = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'access_token': config.asaasApiKey || '',
    'Content-Type': 'application/json',
  },
});

export interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
}

export interface AsaasSubscription {
  id?: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  externalReference?: string;
  maxPayments?: number;
}

export interface AsaasPayment {
  id?: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  postalService?: boolean;
}

export class AsaasService {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || '';
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
  }

  private getHeaders() {
    const rid = getRequestId();
    return {
      'access_token': this.apiKey,
      'Content-Type': 'application/json',
      ...(rid ? { 'x-request-id': rid } : null),
    };
  }

  // Criar cliente no Asaas
  async createCustomer(data: AsaasCustomer): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/customers`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error({
        msg: 'asaas.createCustomer.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      throw new Error(`Failed to create customer: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Buscar cliente por email
  async findCustomerByEmail(email: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}/customers?email=${encodeURIComponent(email)}`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      return null;
    } catch (error: any) {
      logger.warn({
        msg: 'asaas.findCustomer.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      return null;
    }
  }

  // Criar ou recuperar cliente
  async getOrCreateCustomer(data: AsaasCustomer): Promise<any> {
    const existing = await this.findCustomerByEmail(data.email);
    if (existing) {
      return existing;
    }
    return this.createCustomer(data);
  }

  // Criar assinatura
  async createSubscription(data: AsaasSubscription): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/subscriptions`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error({
        msg: 'asaas.createSubscription.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      throw new Error(`Failed to create subscription: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Cancelar assinatura
  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${this.baseURL}/subscriptions/${subscriptionId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error({
        msg: 'asaas.cancelSubscription.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      throw new Error(`Failed to cancel subscription: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Buscar assinatura
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseURL}/subscriptions/${subscriptionId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error({
        msg: 'asaas.getSubscription.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      throw error;
    }
  }

  // Atualizar assinatura (valor/descricao/referencia)
  async updateSubscription(subscriptionId: string, data: Partial<AsaasSubscription>): Promise<any> {
    try {
      const response = await axios.put(
        `${this.baseURL}/subscriptions/${subscriptionId}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error({
        msg: 'asaas.updateSubscription.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      throw new Error(`Failed to update subscription: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Criar cobrança avulsa
  async createPayment(data: AsaasPayment): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/payments`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error({
        msg: 'asaas.createPayment.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      throw new Error(`Failed to create payment: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Obter QR Code PIX
  async getPixQrCode(paymentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseURL}/payments/${paymentId}/pixQrCode`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error({
        msg: 'asaas.getPixQrCode.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      throw error;
    }
  }

  // Obter link de pagamento
  async getPaymentLink(paymentId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseURL}/payments/${paymentId}/identificationField`,
        { headers: this.getHeaders() }
      );
      return response.data.invoiceUrl || '';
    } catch (error: any) {
      logger.warn({
        msg: 'asaas.getPaymentLink.error',
        error: String(error?.message || error),
        details: error.response?.data,
      });
      return '';
    }
  }
}

export const asaasService = new AsaasService();
