import { api } from '@/config/api';

export type CreateChatInput = {
  participantId: string;
  ticketId?: string;
};

export type CreateChatResponse = {
  chat: any;
};

export const chatApi = {
  create: (data: CreateChatInput) => api.post<CreateChatResponse>('/chat', data),
};
