CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Consultants linked to MagSuite users (one row per company/user)
CREATE TABLE IF NOT EXISTS bp_consultants (
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade TEXT DEFAULT 'junior',
    bp_role TEXT DEFAULT 'consultant',
    default_view TEXT DEFAULT 'dashboard',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS bp_consultants_company_role_idx
    ON bp_consultants (company_id, bp_role);

-- Clients managed inside the BP module
CREATE TABLE IF NOT EXISTS bp_clients (
    id TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    consultant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'lead',
    last_appointment_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bp_clients_company_name_idx
    ON bp_clients (company_id, lower(name));

CREATE INDEX IF NOT EXISTS bp_clients_consultant_idx
    ON bp_clients (company_id, consultant_id);

-- Appointments (agenda commerciale)
CREATE TABLE IF NOT EXISTS bp_appointments (
    id TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES bp_clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    appointment_type TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    vss NUMERIC(12,2) DEFAULT 0,
    vsd_personal NUMERIC(12,2) DEFAULT 0,
    vsd_indiretto NUMERIC(12,2) DEFAULT 0,
    telefonate INTEGER DEFAULT 0,
    app_fissati INTEGER DEFAULT 0,
    nncf BOOLEAN DEFAULT FALSE,
    nncf_prompt_answered BOOLEAN DEFAULT FALSE,
    notes TEXT,
    extra JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bp_appointments_company_user_start_idx
    ON bp_appointments (company_id, user_id, start_at DESC);

CREATE INDEX IF NOT EXISTS bp_appointments_company_client_idx
    ON bp_appointments (company_id, client_id, start_at DESC);

-- Periods (BP settimanale, mensile, ecc.)
CREATE TABLE IF NOT EXISTS bp_periods (
    id TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL,
    mode TEXT DEFAULT 'consuntivo',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    indicators_prev JSONB DEFAULT '{}'::jsonb,
    indicators_cons JSONB DEFAULT '{}'::jsonb,
    totals JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT bp_periods_type_chk CHECK (period_type IN (
        'settimanale','mensile','trimestrale','semestrale','annuale','ytd','ltm'
    ))
);

CREATE INDEX IF NOT EXISTS bp_periods_company_user_type_idx
    ON bp_periods (company_id, user_id, period_type, start_date);

-- Sales / GI entries with payment schedules
CREATE TABLE IF NOT EXISTS bp_sales (
    id TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    consultant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_id TEXT REFERENCES bp_clients(id) ON DELETE SET NULL,
    appointment_id TEXT REFERENCES bp_appointments(id) ON DELETE SET NULL,
    client_name TEXT,
    sale_date DATE NOT NULL,
    services TEXT,
    vss_total NUMERIC(12,2) DEFAULT 0,
    schedule JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bp_sales_company_consultant_idx
    ON bp_sales (company_id, consultant_id, sale_date);

-- Per-company settings (indicatori, pesi, provvigioni)
CREATE TABLE IF NOT EXISTS bp_settings (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    indicators TEXT[] DEFAULT ARRAY[]::TEXT[],
    weights JSONB DEFAULT '{}'::jsonb,
    commissions JSONB DEFAULT '{}'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Report recipients per company
CREATE TABLE IF NOT EXISTS bp_report_recipients (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    recipients_to TEXT[] DEFAULT ARRAY[]::TEXT[],
    recipients_cc TEXT[] DEFAULT ARRAY[]::TEXT[],
    recipients_bcc TEXT[] DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Push subscriptions for BP notifications
CREATE TABLE IF NOT EXISTS bp_push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS bp_push_subscriptions_company_user_idx
    ON bp_push_subscriptions (company_id, user_id);

-- Utility view for quick leaderboard aggregations (empty for now, filled by backend)
CREATE OR REPLACE VIEW bp_user_period_totals AS
SELECT
    p.company_id,
    p.user_id,
    p.period_type,
    p.start_date,
    p.end_date,
    COALESCE(p.totals, '{}'::jsonb) AS totals
FROM bp_periods p;
