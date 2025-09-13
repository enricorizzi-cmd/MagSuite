**ISTRUZIONI PERSONALIZZATE PER CODEX — ENRICO RIZZI (NUOVI PROGETTI WEB APP PWA)**

**Missione (non negoziabile)**

* Ogni progetto è una **Web App PWA**: responsive desktop/mobile, **installabile**, con **offline di base** e **notifiche push**.
* **UI/UX**: moderna, creativa, **stile gaming** (palette neon, card arrotondate, micro-animazioni eleganti), accessibile **WCAG AA**.
* Priorità: **performance**, **sicurezza by-default**, **stabilità** e **robustezza dei dati** (migrazioni versionate + backup + test ripristino).
* Stack gratuito/low-cost: **Render** per hosting/deploy, **Supabase** per Auth/DB/Storage.

**Stack di default**

* **Node 20 LTS**. **TypeScript strict**.
* **Frontend**: React + Vite, Tailwind, shadcn/ui, Framer Motion, Lucide, Chart.js *o* Recharts.
* **Backend**: Express/Fastify + Zod (validazione), web-push (notifiche).
* **Database**: Supabase Postgres con **RLS SEMPRE** attivo.
* **Tooling**: ESLint, Prettier, Vitest/Jest (+ Playwright E2E sui flussi core), Husky (pre-commit).
* **CI/CD**: GitHub Actions → Deploy Hook Render. **Sentry** FE/BE (error tracking).

**Come devi consegnare**

1. Se **nuovo progetto**: genera **repo completo** con struttura cartelle, file essenziali, script `dev/build/start`, `README` con setup e variabili d’ambiente.
2. Se **modifica**: produci **patch DIFF complete e atomiche** (niente tronconi). Mantieni convenzioni esistenti.
3. Se un requisito è ambiguo: **assumi** valori sensati, dichiarali in cima alla consegna (max 5 righe).
4. Al termine **sempre**: “**CHECKLIST DONE**” (vedi sezione finale) con esito verde/rosso.

**Struttura repository**

* `app/` (frontend React)

  * `src/components`, `src/features`, `src/pages`, `src/hooks`, `src/lib`, `src/styles`, `src/assets`
  * `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`
* `backend/` (API)

  * `src/routes`, `src/services`, `src/middleware`, `src/schemas` (Zod), `src/jobs`
* `supabase/` → `migrations/*`, `policies.sql`, `seed.sql`
* `.nvmrc` (20), `.editorconfig`, `.eslintrc.*`, `.prettierrc`, `README.md`, `CHANGELOG.md`

**PWA & Notifiche**

* **Manifest**: unico per app, estensione `.webmanifest`, `display:"standalone"`, `start_url:"/?utm_source=pwa"`, `theme_color` coerente con palette, **icone 192/512 maskable**.
* **Service Worker**:

  * Caching **asset statici: cache-first** con versionamento; **API/dati: network-first** con fallback e pagina offline.
  * Gestisci `push` e `notificationclick` (icone + deep-link).
* **Web Push**: iscrizione con VAPID public key (frontend); invio via `web-push` (backend).
* **iOS/iPadOS**: spiega in UI che le push funzionano **solo** per app **aggiunte alla schermata Home** (iOS/iPadOS **16.4+**) dopo consenso utente.

**Autenticazione, multi-tenant, permessi**

* Supabase **Auth**. Ogni riga dati ha `org_id` (e opz. `owner_user_id`).
* Ruoli: `owner`, `admin`, `editor`, `viewer`.
* **RLS obbligatoria** su tutte le tabelle business. Policy: selezione consentita ai membri dell’org; `INSERT/UPDATE` a `editor+`.
* **Feature flags** per org (`features` con `key`, `enabled`, `value jsonb`) per attivare/disattivare moduli (es. `notifications`, `advanced-reports`).

**Sicurezza (default sicuro)**

* **Helmet** con **CSP** stretta; **CORS** a lista di domini (ENV).
* **Validazione**: Zod su ogni body/query/params; sanificazione output.
* **Rate limiting** per IP/utente sulle rotte sensibili; log strutturati JSON con `request-id`.
* **Segreti** solo in **ENV** (mai nel client o repo). TLS sempre; DB con `sslmode=require`.
* **Backup**:

  * Postgres: `pg_dump` giornaliero → Storage/S3; **test ripristino mensile**.
  * Allegati/Storage: lifecycle/policy e checkpoint.

**Performance**

* FE: code-split, lazy routes, immagini WebP/AVIF, memoization, React Query per cache/fetch.
* SW: precache asset, runtime caching selettivo, strategia adeguata per HTML/API/file media.
* BE: query aggregate server-side, indici compositi, compressione gzip/br, evita N+1.
* Target **Lighthouse ≥ 90** (Performance/Best/A11y/SEO).

**Deploy su Render**

* Servizi separati: `web` (hosting FE statico o Node che serve `/dist`) e `backend`.
* **Healthcheck**: `GET /healthz` (liveness) e `GET /readyz` (readiness) → 200 OK.
* **Env backend** (prod):

  * `DATABASE_URL` (Postgres con `?sslmode=require`)
  * `ACCESS_SECRET`, `REFRESH_SECRET`, `SSO_SECRET`
  * `API_KEY`, `FILE_ENCRYPTION_KEY`, `ALERT_EMAIL` (opz.)
  * `SUPABASE_URL`, `SUPABASE_ANON_KEY` (se serve lato server), `SUPABASE_SERVICE_ROLE`
  * `VAPID_PUBLIC`, `VAPID_PRIVATE`
  * `SENTRY_DSN`, `CORS_ORIGIN`
  * `BATCH_STRATEGY` (es. `FIFO`), `DB_CA_PATH`, `NODE_EXTRA_CA_CERTS` (opz.)
* **Env frontend** (prod): `VITE_API_URL`, opzionali `VITE_API_KEY`, `VITE_COMPANY_ID`
* No secrets in client; no script postinstall lenti. Auto-deploy da `main` via Deploy Hook.

**CI/CD (GitHub Actions)**

* Pipeline: install → lint → test → build → (e2e se tocco flussi core) → deploy Render (hook).
* Carica sourcemap Sentry in release.
* Blocca merge se test/lint falliscono o mancano migrazioni quando modifichi il DB.

**UI/UX stile gaming**

* Palette suggerita: bg `#0b0f19`, primary neon `#00e5ff`, accent `#7c3aed`, success `#22c55e`, warning `#f59e0b`, danger `#ef4444`.
* Tailwind: `rounded-2xl`, `shadow-xl`, focus ring visibile; layout Navbar + Drawer mobile.
* Font: Inter (testo), Orbitron (headline/KPI).
* Animazioni: Framer Motion 120–200 ms, non invasive.
* Grafici: tooltip leggibili, etichette tempo reali, dark mode default.

**Documentazione & versioning**

* **SemVer**, `CHANGELOG.md` umano.
* `README` con prerequisiti, setup, ENV, comandi, URL utili, flusso push (inclusa nota iOS).
* ADR brevi per scelte architetturali chiave.

**Default se non specifico**

* Router: React Router. Stato: React Query (+ Zustand se necessario).
* Endpoint minimi:

  * `POST /api/push/subscribe`, `POST /api/push/test`
  * `GET /healthz`, `GET /readyz`
  * `GET /api/features` (feature flags per org)

**Cose vietate**

* Disattivare TLS/RLS/CSP; usare `NODE_TLS_REJECT_UNAUTHORIZED=0`.
* Inserire segreti/chiavi nel client o nel repo.
* Aggiungere dipendenze non mantenute o script distruttivi senza conferma + backup.
* Cambiare stack/struttura senza richiesta esplicita.

**Regole PR & naming**

* Branch: `codex/{feature}`. Commit: **Conventional Commits** (`feat:`, `fix:`, …).
* PR: descrizione, **ENV da impostare**, migrazioni/policies incluse, impatto sicurezza/perf, piano di rollback.
* Quando suggerisci tool esterni, **includi SEMPRE link ufficiale di download/store**.

**CHECKLIST DONE (spuntare sempre)**

* [ ] Assunzioni dichiarate
* [ ] Install PWA + offline OK
* [ ] Push subscribe/test OK (nota iOS in UI)
* [ ] RLS su nuove tabelle + policies verificate
* [ ] CSP/CORS/Rate limit attivi
* [ ] Lint/Test/Build verdi (sourcemap + Sentry)
* [ ] Migrazioni + **backup** schedulati, **restore** provato
* [ ] Lighthouse ≥ 90
* [ ] Istruzioni ENV + Deploy Render aggiornate
* [ ] Nessun secret nel client/diff

---

**Note (fonti chiave usate per definire gli standard sopra):**

* Manifest PWA e criteri di **installabilità**; requisiti e struttura consigliata. ([web.dev][1])
* **Service worker** e strategie di **caching** (cache-first vs network-first; Workbox). ([Chrome for Developers][2], [web.dev][3])
* **Web Push** (protocollo, flusso client/server, VAPID). ([web.dev][4], [datatracker.ietf.org][5], [npm][6])
* **iOS/iPadOS 16.4+**: Web Push disponibile per **web app aggiunte alla Home**. ([WebKit][7], [Apple Developer][8])
* **RLS** in Postgres/Supabase (autorizzazioni granulari a livello riga). ([Supabase][9])
* Render: **health checks** e uso di **environment variables** per segreti/config. ([Render][10])
* **Helmet/CSP** per hardening degli header HTTP. ([helmetjs.github.io][11], [CybeReady][12])
* **Lighthouse** per misurare qualità/performance PWA. ([Chrome for Developers][13], [web.dev][14])

[1]: https://web.dev/learn/pwa/web-app-manifest?utm_source=chatgpt.com "Web app manifest - PWA"
[2]: https://developer.chrome.com/docs/workbox/caching-strategies-overview?utm_source=chatgpt.com "Strategies for service worker caching | Workbox"
[3]: https://web.dev/learn/pwa/workbox?utm_source=chatgpt.com "Workbox"
[4]: https://web.dev/articles/push-notifications-web-push-protocol?utm_source=chatgpt.com "The Web Push Protocol | Articles"
[5]: https://datatracker.ietf.org/doc/html/rfc8292?utm_source=chatgpt.com "RFC 8292 - Voluntary Application Server Identification ..."
[6]: https://www.npmjs.com/package/web-push?utm_source=chatgpt.com "web-push"
[7]: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/?utm_source=chatgpt.com "Web Push for Web Apps on iOS and iPadOS - WebKit"
[8]: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers?utm_source=chatgpt.com "Sending web push notifications in web apps and browsers"
[9]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[10]: https://render.com/docs/health-checks?utm_source=chatgpt.com "Health Checks – Render Docs"
[11]: https://helmetjs.github.io/?utm_source=chatgpt.com "Helmet.js"
[12]: https://cybeready.com/helmet-content-security-policy/?utm_source=chatgpt.com "What is a Helmet Content Security Policy, and Do You ..."
[13]: https://developer.chrome.com/docs/lighthouse/overview?utm_source=chatgpt.com "Introduction to Lighthouse - Chrome for Developers"
[14]: https://web.dev/articles/pwa-checklist?utm_source=chatgpt.com "What makes a good Progressive Web App? | Articles"
