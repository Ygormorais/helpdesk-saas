export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'agent' | 'client';
  avatar?: string;
  tenant?: Tenant;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: Category;
  createdBy: User;
  assignedTo?: User;
  tags: string[];
  attachments: Attachment[];
  sla: SLA;
  satisfaction?: Satisfaction;
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Category {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parent?: Category;
}

export interface Comment {
  _id: string;
  ticket: string;
  author: User;
  content: string;
  type: 'note' | 'reply' | 'system';
  isInternal: boolean;
  attachments: Attachment[];
  createdAt: string;
}

export interface Attachment {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface SLA {
  responseDue: string;
  resolutionDue: string;
  firstResponseAt?: string;
  resolvedAt?: string;
}

export interface Satisfaction {
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  tickets: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  message: string;
  errors?: string[];
}
