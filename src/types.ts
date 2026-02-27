export type Role = 'CANDIDATE' | 'COMPANY' | 'ADMIN';
export type Plan = 'FREE' | 'PREMIUM';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  neighborhood?: string;
  interest?: string;
  resume_url?: string;
  role: Role;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  cnpj: string;
  city: string;
  logo_url?: string;
  plan: Plan;
  subscription_id?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  company_name?: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  company_name?: string;
  title: string;
  description: string;
  salary?: string;
  contract_type: string;
  city: string;
  category: string;
  status: 'OPEN' | 'CLOSED';
  company_plan?: Plan;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'REJECTED';
  message?: string;
  created_at: string;
  user_name?: string;
  job_title?: string;
}

export interface AdminStats {
  pix_key: string;
  subscriptions: Payment[];
}
export interface AuthResponse {
  token: string;
  user?: User;
  company?: Company;
  role: Role;
}
