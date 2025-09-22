import { defineStore } from 'pinia';
import {
  fetchConsultants,
  fetchCurrentConsultant,
  fetchDashboard,
  fetchClients,
  fetchAppointments,
  fetchPeriods,
  fetchSales,
  fetchSettings,
  saveSettings as apiSaveSettings,
  saveReportRecipients,
  fetchLeaderboard,
  fetchCommissionSummary,
  searchCustomers,
  saveAppointment as apiSaveAppointment,
  deleteAppointment as apiDeleteAppointment,
  savePeriod as apiSavePeriod,
  deletePeriod as apiDeletePeriod,
  saveSale as apiSaveSale,
  deleteSale as apiDeleteSale,
  saveClient as apiSaveClient,
  deleteClient as apiDeleteClient,
  type BPConsultant,
  type BPDashboardResponse,
  type BPClient,
  type BPAppointment,
  type BPPeriod,
  type BPSale,
  type BPSettings,
  type BPReportRecipients,
  type BPLeaderboardResponse,
  type BPCommissionRow,
  type CustomerSummary,
  type ListParams
} from '../services/bp';

interface Status {
  loading: boolean;
  error: string | null;
}

interface PagedState<T> {
  items: T[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
}

function createPagedState<T>(filters: Record<string, any>): PagedState<T> {
  return {
    items: [],
    total: 0,
    loading: false,
    error: null,
    filters
  };
}

export const useBpStore = defineStore('bp', {
  state: () => ({
    consultants: [] as BPConsultant[],
    consultantStatus: { loading: false, error: null as string | null },
    me: null as BPConsultant | null,
    dashboard: { loading: false, error: null as string | null, data: null as BPDashboardResponse | null },
    clients: createPagedState<BPClient>({ search: '', consultantId: undefined as number | undefined, limit: 50, offset: 0 }),
    appointments: createPagedState<BPAppointment>({ global: false, userId: undefined as number | undefined, customerId: undefined as number | undefined, limit: 100, offset: 0 }),
    periods: createPagedState<BPPeriod>({ type: undefined as string | undefined, userId: undefined as number | undefined, limit: 50, offset: 0 }),
    sales: createPagedState<BPSale>({ consultantId: undefined as number | undefined, customerId: undefined as number | undefined, limit: 100, offset: 0 }),
    leaderboard: { loading: false, error: null as string | null, data: null as BPLeaderboardResponse | null },
    commissions: { loading: false, error: null as string | null, rows: [] as BPCommissionRow[] },
    settings: {
      loading: false,
      saving: false,
      error: null as string | null,
      data: null as BPSettings | null,
      recipients: { to: [] as string[], cc: [] as string[], bcc: [] as string[] },
      vapidPublicKey: ''
    },
    customerSearch: { loading: false, error: null as string | null, results: [] as CustomerSummary[] }
  }),

  actions: {
    reset() {
      this.dashboard = { loading: false, error: null, data: null };
      this.clients = createPagedState<BPClient>({ search: '', consultantId: undefined, limit: 50, offset: 0 });
      this.appointments = createPagedState<BPAppointment>({ global: false, userId: undefined, customerId: undefined, limit: 100, offset: 0 });
      this.periods = createPagedState<BPPeriod>({ type: undefined, userId: undefined, limit: 50, offset: 0 });
      this.sales = createPagedState<BPSale>({ consultantId: undefined, customerId: undefined, limit: 100, offset: 0 });
      this.leaderboard = { loading: false, error: null, data: null };
      this.commissions = { loading: false, error: null, rows: [] };
      this.settings = { loading: false, saving: false, error: null, data: null, recipients: { to: [], cc: [], bcc: [] }, vapidPublicKey: '' };
    },

    async loadConsultants(force = false) {
      if (this.consultants.length && !force) return this.consultants;
      this.consultantStatus.loading = true;
      this.consultantStatus.error = null;
      try {
        const [items, me] = await Promise.all([fetchConsultants(), fetchCurrentConsultant().catch(() => null)]);
        this.consultants = items;
        this.me = me;
        return items;
      } catch (error: any) {
        const message = error?.response?.data?.error || error?.message || 'Errore caricamento consulenti';
        this.consultantStatus.error = message;
        throw error;
      } finally {
        this.consultantStatus.loading = false;
      }
    },

    async loadDashboard(force = false) {
      if (this.dashboard.data && !force) return this.dashboard.data;
      this.dashboard.loading = true;
      this.dashboard.error = null;
      try {
        const data = await fetchDashboard();
        this.dashboard.data = data;
        return data;
      } catch (error: any) {
        this.dashboard.error = error?.response?.data?.error || error?.message || 'Impossibile caricare la dashboard';
        throw error;
      } finally {
        this.dashboard.loading = false;
      }
    },

    async loadClients(overrides: Partial<{ search: string; consultantId?: number; limit: number; offset: number }> = {}) {
      this.clients.loading = true;
      this.clients.error = null;
      this.clients.filters = { ...this.clients.filters, ...overrides };
      const params: ListParams & { search?: string } = {
        limit: this.clients.filters.limit,
        offset: this.clients.filters.offset,
        consultantId: this.clients.filters.consultantId,
        search: this.clients.filters.search
      };
      try {
        const { items, total } = await fetchClients(params);
        this.clients.items = items;
        this.clients.total = total;
        return items;
      } catch (error: any) {
        this.clients.error = error?.response?.data?.error || error?.message || 'Errore caricamento clienti';
        throw error;
      } finally {
        this.clients.loading = false;
      }
    },

    async loadAppointments(overrides: Partial<{ global: boolean; userId?: number; customerId?: number; limit: number; offset: number; from?: string; to?: string }> = {}) {
      this.appointments.loading = true;
      this.appointments.error = null;
      this.appointments.filters = { ...this.appointments.filters, ...overrides };
      const params: ListParams = {
        limit: this.appointments.filters.limit,
        offset: this.appointments.filters.offset,
        userId: this.appointments.filters.userId,
        customerId: this.appointments.filters.customerId,
        global: this.appointments.filters.global,
        from: overrides.from ?? this.appointments.filters.from,
        to: overrides.to ?? this.appointments.filters.to
      };
      if (params.customerId == null) delete (params as any).customerId;
      if (!params.from) delete (params as any).from;
      if (!params.to) delete (params as any).to;
      try {
        const { items, total } = await fetchAppointments(params);
        this.appointments.items = items;
        this.appointments.total = total;
        return items;
      } catch (error: any) {
        this.appointments.error = error?.response?.data?.error || error?.message || 'Errore caricamento appuntamenti';
        throw error;
      } finally {
        this.appointments.loading = false;
      }
    },

    async loadPeriods(overrides: Partial<{ type?: string; userId?: number; limit: number; offset: number; from?: string; to?: string }> = {}) {
      this.periods.loading = true;
      this.periods.error = null;
      this.periods.filters = { ...this.periods.filters, ...overrides };
      const params: ListParams = {
        limit: this.periods.filters.limit,
        offset: this.periods.filters.offset,
        type: this.periods.filters.type,
        userId: this.periods.filters.userId,
        from: overrides.from ?? this.periods.filters.from,
        to: overrides.to ?? this.periods.filters.to
      };
      if (!params.type) delete (params as any).type;
      if (!params.userId) delete (params as any).userId;
      if (!params.from) delete (params as any).from;
      if (!params.to) delete (params as any).to;
      try {
        const { items, total } = await fetchPeriods(params);
        this.periods.items = items;
        this.periods.total = total;
        return items;
      } catch (error: any) {
        this.periods.error = error?.response?.data?.error || error?.message || 'Errore caricamento periodi';
        throw error;
      } finally {
        this.periods.loading = false;
      }
    },

    async loadSales(overrides: Partial<{ consultantId?: number; customerId?: number; from?: string; to?: string; limit: number; offset: number }> = {}) {
      this.sales.loading = true;
      this.sales.error = null;
      this.sales.filters = { ...this.sales.filters, ...overrides };
      const params: ListParams = {
        limit: this.sales.filters.limit,
        offset: this.sales.filters.offset,
        consultantId: this.sales.filters.consultantId,
        customerId: this.sales.filters.customerId,
        from: overrides.from ?? this.sales.filters.from,
        to: overrides.to ?? this.sales.filters.to
      };
      if (!params.consultantId) delete (params as any).consultantId;
      if (!params.customerId) delete (params as any).customerId;
      if (!params.from) delete (params as any).from;
      if (!params.to) delete (params as any).to;
      try {
        const { items, total } = await fetchSales(params);
        this.sales.items = items;
        this.sales.total = total;
        return items;
      } catch (error: any) {
        this.sales.error = error?.response?.data?.error || error?.message || 'Errore caricamento vendite';
        throw error;
      } finally {
        this.sales.loading = false;
      }
    },

    async loadLeaderboard(params: { type?: string; mode?: string; from?: string; to?: string; userIds?: string } = {}) {
      this.leaderboard.loading = true;
      this.leaderboard.error = null;
      try {
        const data = await fetchLeaderboard(params);
        this.leaderboard.data = data;
        return data;
      } catch (error: any) {
        this.leaderboard.error = error?.response?.data?.error || error?.message || 'Errore caricamento classifica';
        throw error;
      } finally {
        this.leaderboard.loading = false;
      }
    },

    async loadCommissionSummary(params: { from: string; to: string; mode?: string; type?: string }) {
      this.commissions.loading = true;
      this.commissions.error = null;
      try {
        const rows = await fetchCommissionSummary(params);
        this.commissions.rows = rows;
        return rows;
      } catch (error: any) {
        this.commissions.error = error?.response?.data?.error || error?.message || 'Errore caricamento provvigioni';
        throw error;
      } finally {
        this.commissions.loading = false;
      }
    },

    async loadSettings(force = false) {
      if (this.settings.data && !force) return this.settings;
      this.settings.loading = true;
      this.settings.error = null;
      try {
        const { settings, recipients, vapidPublicKey } = await fetchSettings();
        this.settings.data = settings;
        this.settings.recipients = recipients;
        this.settings.vapidPublicKey = vapidPublicKey;
        return this.settings;
      } catch (error: any) {
        this.settings.error = error?.response?.data?.error || error?.message || 'Errore caricamento impostazioni';
        throw error;
      } finally {
        this.settings.loading = false;
      }
    },

    async saveSettings(payload: Partial<BPSettings>, recipients?: BPReportRecipients) {
      this.settings.saving = true;
      this.settings.error = null;
      try {
        const saved = await apiSaveSettings(payload);
        this.settings.data = saved;
        if (recipients) {
          this.settings.recipients = await saveReportRecipients(recipients);
        }
        return saved;
      } catch (error: any) {
        this.settings.error = error?.response?.data?.error || error?.message || 'Errore salvataggio impostazioni';
        throw error;
      } finally {
        this.settings.saving = false;
      }
    },


    async createClient(payload: Partial<BPClient> & { customer_id: number }) {
      const client = await apiSaveClient(payload);
      await this.loadClients();
      this.dashboard.data = null;
      return client;
    },

    async removeClient(id: string) {
      await apiDeleteClient(id);
      await this.loadClients();
      this.dashboard.data = null;
    },

    async createAppointment(payload: Partial<BPAppointment>) {
      const appointment = await apiSaveAppointment(payload);
      await Promise.allSettled([
        this.loadAppointments(),
        this.loadDashboard(true)
      ]);
      return appointment;
    },

    async removeAppointment(id: string) {
      await apiDeleteAppointment(id);
      await Promise.allSettled([
        this.loadAppointments(),
        this.loadDashboard(true)
      ]);
    },

    async createPeriod(payload: Partial<BPPeriod>) {
      const period = await apiSavePeriod(payload);
      await this.loadPeriods();
      this.leaderboard.data = null;
      return period;
    },

    async removePeriod(id: string) {
      await apiDeletePeriod(id);
      await this.loadPeriods();
      this.leaderboard.data = null;
    },

    async createSale(payload: Partial<BPSale>) {
      const sale = await apiSaveSale(payload);
      await Promise.allSettled([
        this.loadSales(),
        this.loadDashboard(true)
      ]);
      return sale;
    },

    async removeSale(id: string) {
      await apiDeleteSale(id);
      await Promise.allSettled([
        this.loadSales(),
        this.loadDashboard(true)
      ]);
    },

    async searchCustomers(term: string, limit = 10) {
      this.customerSearch.loading = true;
      this.customerSearch.error = null;
      try {
        const results = await searchCustomers(term, limit);
        this.customerSearch.results = results;
        return results;
      } catch (error: any) {
        this.customerSearch.error = error?.response?.data?.error || error?.message || 'Errore ricerca clienti';
        throw error;
      } finally {
        this.customerSearch.loading = false;
      }
    }
  }
});



