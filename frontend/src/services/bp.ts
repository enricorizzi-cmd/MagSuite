import api from './api';

export interface BPConsultant {
  company_id: number;
  user_id: number;
  grade: string;
  bp_role: string;
  default_view: string;
  preferences: Record<string, unknown>;
}

export interface BPClient {
  id: string;
  company_id: number;
  consultant_id: number | null;
  customer_id: number;
  customer_code?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  name: string;
  status: string;
  last_appointment_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface BPAppointment {
  id: string;
  company_id: number;
  user_id: number;
  client_id: string | null;
  customer_id?: number | null;
  client_name: string;
  appointment_type: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  vss: number;
  vsd_personal: number;
  vsd_indiretto: number;
  telefonate: number;
  app_fissati: number;
  nncf: boolean;
  nncf_prompt_answered: boolean;
  notes?: string | null;
  extra?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface BPPeriod {
  id: string;
  company_id: number;
  user_id: number;
  period_type: string;
  mode: string;
  start_date: string;
  end_date: string;
  indicators_prev: Record<string, number>;
  indicators_cons: Record<string, number>;
  totals: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

export interface BPSale {
  id: string;
  company_id: number;
  consultant_id: number | null;
  client_id: string | null;
  customer_id?: number | null;
  appointment_id: string | null;
  client_name?: string | null;
  sale_date: string;
  services?: string | null;
  vss_total: number;
  schedule: Array<{ dueDate: string | null; amount: number; note?: string | null }>;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface BPSettings {
  companyId: number;
  indicators: string[];
  weights: Record<string, number>;
  commissions: Record<string, number>;
  config: Record<string, unknown>;
  updatedAt: string | null;
}

export interface BPReportRecipients {
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface BPDashboardResponse {
  kpis: Record<string, number>;
  agenda: BPAppointment[];
  clients: BPClient[];
}

export interface BPLeaderboardEntry {
  userId: number;
  prev: Record<string, number>;
  cons: Record<string, number>;
  totals: Record<string, number>;
  score: number;
}

export interface BPLeaderboardResponse {
  settings: BPSettings;
  entries: BPLeaderboardEntry[];
}

export interface BPCommissionRow {
  id: number;
  name: string;
  provvGi: number;
  provvVsd: number;
  provvTot: number;
}

export async function fetchConsultants() {
  const { data } = await api.get<{ items: BPConsultant[] }>('/bp/consultants');
  return data.items;
}

export async function fetchCurrentConsultant() {
  const { data } = await api.get<BPConsultant>('/bp/me');
  return data;
}

export async function updateConsultant(userId: number, payload: Partial<BPConsultant>) {
  const { data } = await api.put(/bp/consultants/, payload);
  return data as BPConsultant;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  userId?: number;
  consultantId?: number;
  clientId?: string;
  customerId?: number;
  global?: boolean;
  type?: string | string[];
}

export async function fetchClients(params: ListParams = {}) {
  const { data } = await api.get<{ items: BPClient[]; total: number }>('/bp/clients', { params });
  return data;
}

export async function saveClient(payload: Partial<BPClient> & { customer_id: number }) {
  const { data } = await api.post<BPClient>('/bp/clients', payload);
  return data;
}

export async function deleteClient(id: string) {
  await api.delete(/bp/clients/);
}

\n\nexport interface CustomerSummary {\n  id: number;\n  code?: string | null;\n  name: string;\n  email?: string | null;\n  phone?: string | null;\n}\n\nexport async function searchCustomers(term: string, limit = 10) {
  const query = term.trim();
  if (query.length < 2) return [] as CustomerSummary[];
  const { data } = await api.get<{ items: CustomerSummary[] }>('/bp/customers/search', { params: { q: query, limit } });
  return data.items;
}

export async function fetchAppointments(params: ListParams = {}) {
  const { data } = await api.get<{ items: BPAppointment[]; total: number }>('/bp/appointments', { params });
  return data;
}

export async function fetchLastAppointment() {
  const { data } = await api.get<{ appointment: BPAppointment | null }>('/bp/appointments', { params: { last: '1' } });
  return data.appointment;
}

export async function saveAppointment(payload: Partial<BPAppointment>) {
  const { data } = await api.post<BPAppointment>('/bp/appointments', payload);
  return data;
}

export async function deleteAppointment(id: string) {
  await api.delete(/bp/appointments/);
}

export async function fetchPeriods(params: ListParams = {}) {
  const { data } = await api.get<{ items: BPPeriod[]; total: number }>('/bp/periods', { params });
  return data;
}

export async function savePeriod(payload: Partial<BPPeriod>) {
  const { data } = await api.post<BPPeriod>('/bp/periods', payload);
  return data;
}

export async function deletePeriod(id: string) {
  await api.delete(/bp/periods/);
}

export async function fetchSales(params: ListParams = {}) {
  const { data } = await api.get<{ items: BPSale[]; total: number }>('/bp/sales', { params });
  return data;
}

export async function saveSale(payload: Partial<BPSale>) {
  const { data } = await api.post<BPSale>('/bp/sales', payload);
  return data;
}

export async function deleteSale(id: string) {
  await api.delete(/bp/sales/);
}

export async function fetchSettings() {
  const { data } = await api.get<{ settings: BPSettings; recipients: BPReportRecipients; vapidPublicKey: string }>('/bp/settings');
  return data;
}

export async function saveSettings(payload: Partial<BPSettings>) {
  const { data } = await api.put<BPSettings>('/bp/settings', payload);
  return data;
}

export async function saveReportRecipients(payload: BPReportRecipients) {
  const { data } = await api.put<BPReportRecipients>('/bp/report-recipients', payload);
  return data;
}

export async function fetchDashboard() {
  const { data } = await api.get<BPDashboardResponse>('/bp/dashboard');
  return data;
}

export async function fetchLeaderboard(params: { type?: string; mode?: string; from?: string; to?: string; userIds?: string }) {
  const { data } = await api.get<BPLeaderboardResponse>('/bp/leaderboard', { params });
  return data;
}

export async function fetchCommissionSummary(params: { from: string; to: string; mode?: string; type?: string }) {
  const { data } = await api.get<{ rows: BPCommissionRow[] }>('/bp/commissions/summary', { params });
  return data.rows;
}

export async function subscribePush(payload: Record<string, unknown>) {
  const { data } = await api.post('/bp/push/subscribe', payload);
  return data;
}

export async function unsubscribePush(endpoint: string) {
  const { data } = await api.post('/bp/push/unsubscribe', { endpoint });
  return data;
}



