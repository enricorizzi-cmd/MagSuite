import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useBpStore } from "../src/stores/bp";

vi.mock("../src/services/bp", () => ({
  fetchDashboard: vi.fn().mockResolvedValue({ kpis: { VSS: 100 }, agenda: [], clients: [] }),
  fetchConsultants: vi.fn().mockResolvedValue([
    { user_id: 1, company_id: 1, grade: "senior", bp_role: "manager", default_view: "dashboard", preferences: {} }
  ]),
  fetchCurrentConsultant: vi.fn().mockResolvedValue({
    user_id: 1,
    company_id: 1,
    grade: "senior",
    bp_role: "manager",
    default_view: "dashboard",
    preferences: {}
  }),
  fetchClients: vi.fn().mockResolvedValue({ items: [{ id: "c1", customer_id: 10, name: "Client", status: "attivo" }], total: 1 }),
  fetchAppointments: vi.fn().mockResolvedValue({
    items: [
      {
        id: "a1",
        customer_id: 10,
        client_id: "bp1",
        client_name: "Client",
        appointment_type: "manuale",
        start_at: "2025-09-01T09:00:00.000Z",
        end_at: "2025-09-01T10:00:00.000Z",
        duration_minutes: 60,
        vss: 0,
        vsd_personal: 0,
        vsd_indiretto: 0,
        telefonate: 0,
        app_fissati: 0,
        nncf: false,
        nncf_prompt_answered: false
      }
    ],
    total: 1
  }),
  fetchSales: vi.fn().mockResolvedValue({
    items: [
      {
        id: "s1",
        customer_id: 10,
        consultant_id: 1,
        client_id: "bp1",
        sale_date: "2025-09-02",
        vss_total: 1200,
        schedule: []
      }
    ],
    total: 1
  }),
  fetchPeriods: vi.fn().mockResolvedValue({
    items: [
      {
        id: "p1",
        user_id: 1,
        period_type: "mensile",
        mode: "consuntivo",
        start_date: "2025-09-01",
        end_date: "2025-09-30",
        indicators_prev: {},
        indicators_cons: {},
        totals: {}
      }
    ],
    total: 1
  }),
  fetchLeaderboard: vi.fn().mockResolvedValue({ settings: { weights: {} }, entries: [{ userId: 1, prev: {}, cons: {}, totals: {}, score: 10 }] }),
  fetchCommissionSummary: vi.fn().mockResolvedValue([
    { id: 1, name: "User", provvGi: 100, provvVsd: 200, provvTot: 300 }
  ]),
  fetchSettings: vi.fn().mockResolvedValue({
    settings: { companyId: 1, indicators: ["VSS"], weights: {}, commissions: {}, config: {}, updatedAt: null },
    recipients: { to: [], cc: [], bcc: [] },
    vapidPublicKey: ""
  }),
  saveSettings: vi.fn().mockResolvedValue({
    companyId: 1,
    indicators: ["VSS"],
    weights: {},
    commissions: {},
    config: {},
    updatedAt: "2025-09-01T00:00:00.000Z"
  }),
  saveReportRecipients: vi.fn().mockResolvedValue({ to: ["a@example.com"], cc: [], bcc: [] }),
  saveClient: vi.fn().mockResolvedValue({ id: "c1", customer_id: 10, status: "attivo" }),
  deleteClient: vi.fn().mockResolvedValue(undefined),
  saveAppointment: vi.fn().mockResolvedValue({ id: "a1" }),
  deleteAppointment: vi.fn().mockResolvedValue(undefined),
  saveSale: vi.fn().mockResolvedValue({ id: "s1" }),
  deleteSale: vi.fn().mockResolvedValue(undefined),
  savePeriod: vi.fn().mockResolvedValue({ id: "p1" }),
  deletePeriod: vi.fn().mockResolvedValue(undefined),
  searchCustomers: vi.fn().mockResolvedValue([{ id: 10, name: "Client" }])
}));

describe("bp store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("loads dashboard data", async () => {
    const store = useBpStore();
    await store.loadDashboard();
    expect(store.dashboard.data?.kpis.VSS).toBe(100);
  });

  it("fetches clients and updates state", async () => {
    const store = useBpStore();
    await store.loadClients();
    expect(store.clients.items).toHaveLength(1);
    expect(store.clients.total).toBe(1);
  });

  it("creates appointments via API", async () => {
    const store = useBpStore();
    await store.createAppointment({ customer_id: 10, start_at: "2025-09-01T08:00:00.000Z" });
    expect(store.appointments.loading).toBe(false);
  });

  it("saves settings and recipients", async () => {
    const store = useBpStore();
    await store.saveSettings({ indicators: ["VSS"] }, { to: ["a@example.com"], cc: [], bcc: [] });
    expect(store.settings.recipients.to).toContain("a@example.com");
  });
});
