# 🤖 AGENT CONTEXT — Sporthink Dynamic Pricing System

> **MANDATORY**: Every agent session MUST start by reading this file entirely.
> Every agent session MUST end by updating the sections below.

---

## Project Summary

A full-stack dynamic pricing platform for **Sporthink** (sports e-commerce).
The system computes price suggestions per product/channel using pricing rules, competitor prices, stock levels, seasonality, and profitability targets. Pricing managers review and approve suggestions via a dashboard before prices go live.

---

## Tech Stack (Confirmed)

| Layer | Choice |
|---|---|
| Database | MySQL 8 — `localhost:3306`, user: `root`, password: in `.env` |
| Backend | Node.js 20 + **Fastify** + Sequelize ORM + JWT auth |
| Frontend | React 18 + Vite + shadcn/ui + Tailwind CSS |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Tables | TanStack Table |
| Language | Code internals: English. UI labels: Turkish |

---

## Directory Map

```
dynamic-pricing/
├── AGENT_CONTEXT.md          ← THIS FILE
├── database/
│   ├── schema.sql            ← CREATE TABLE statements
│   └── seed.sql              ← Dummy data inserts
├── scripts/
│   └── seed.js               ← Node.js seeder (runs seed.sql)
├── backend/
│   ├── src/
│   │   ├── config/           ← DB, env, swagger config
│   │   ├── models/           ← Sequelize models
│   │   ├── routes/           ← Fastify route plugins
│   │   ├── controllers/      ← Business logic
│   │   ├── middleware/        ← Auth, error handler, logger
│   │   ├── services/         ← Pricing engine, alert engine
│   │   └── app.js            ← Fastify app entry
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            ← One folder per page
│   │   ├── components/       ← Reusable UI components
│   │   ├── hooks/            ← Custom hooks
│   │   ├── stores/           ← Zustand stores
│   │   ├── api/              ← Axios instance + per-module API calls
│   │   ├── lib/              ← Helpers, formatters
│   │   └── main.jsx
│   └── vite.config.js
└── resources/                ← Design files, docs (do not modify)
```

---

## Phase Status

| Phase | Description | Status |
|---|---|---|
| 0 | Agent continuity + project foundation | ✅ Done |
| 1 | Database schema + dummy data | ✅ Done |
| 2 | Backend API (Fastify + Sequelize + JWT) | ✅ Done |
| 3 | Product Analysis & Strategy | ✅ Done |
| 4 | Frontend (React + shadcn/ui) | ✅ Done |
| 5 | Data Integrity + Bug Fixes | ✅ Done |
| 6 | Integration + Docker | ⬜ Not Started |

---

## Current Focus

**Phase 5: Data Integrity, Bug Fixes & Polish (COMPLETE)**
- [x] Ayarlar page rebuilt to match Figma design (boxed tab layout, Parametreler inputs)
- [x] Price Approval flow fully fixed:
  - [x] Detects channel type (kanal_sahibi) to update correct price column
  - [x] Writes to `fiyat_gecmisi` (price history) on approval
  - [x] Writes to `islem_log` (audit trail) with old→new price + user
- [x] Kampanya Ayarları "Evet" button now POSTs to `/api/kampanya/onay` → inserts `kampanya_planlari` row
- [x] Removed Alertler and Rakip Fiyat Takibi from sidebar (pages still exist but hidden)
- [x] Deleted orphaned `Kampanyalar.jsx` route from nav
- [x] Dashboard fixes:
  - [x] Fixed `\${channelWhere}` SQL interpolation bug — 3 grid queries were silently failing
  - [x] Rakip Fiyat grid: now correctly pins to web channel for price comparison
  - [x] Stok Riski grid: now uses total stock per product (SUM across sizes)
  - [x] Fiyat Alarmı grid: shows all open alerts ordered by düşüş desc
  - [x] Ciro Hedef % capped at 999%
  - [x] Chart now renders one line per selected channel (3 separate colored lines)
  - [x] Added red "Uyarı" section label above the 3 bottom grids
  - [x] "Aktif Uyarı" KPI label stays black; the section title is red
- [x] Full database re-seed with 16 months of realistic data (Jan 2025–Apr 2026)
  - [x] 50 products, 339 stock records, 2400 sales, 450 competitor prices, 294 price history entries
  - [x] Seasonal sales variation (summer & Q4 peaks)
  - [x] Monthly targets updated to realistic levels (900K–1.2M/month per category per channel)
  - [x] Login: ahmet@sporthink.com.tr / password
- [ ] Excel export (Bulk actions — deferred)

---

## Key Decisions Log

| # | Decision | Reason |
|---|---|---|
| 1 | Fastify over Express | 2x faster, built-in validation & OpenAPI |
| 2 | Sequelize ORM | Matches ER diagram 1:1, good MySQL support |
| 3 | shadcn/ui + Tailwind | Best match for Figma design (light, data-dense B2B SaaS) |
| 4 | Real JWT from day 1 | Security requirement in documentation |
| 5 | UI in Turkish, code in English | User requirement |
| 6 | Manual approval flow | Prices never publish without human approval (US-01) |
| 7 | Pricing formula | `max(cost × (1 + targetMargin), avgCompetitorPrice × competitionCoeff)` then apply demand × stock coefficients |

---

## Pricing Algorithm (Core Business Logic)

```
Step 1 — Base Price:
  basedPrice = max(
    cost × (1 + targetMargin),
    avgCompetitorPrice × competitionCoeff
  )

Step 2 — Adjust for demand & stock:
  suggestedPrice = basePrice × demandCoeff × stockCoeff

Stock coefficients:
  Very high stock → 0.95
  Normal stock    → 1.00
  Low stock       → 1.05

Demand coefficients:
  High demand  → 1.03
  Normal       → 1.00
  Low demand   → 0.97

Step 3 — Guardrails:
  if suggestedPrice < cost × (1 + minMargin) → BLOCK or "Yüksek Risk" alert
  if discount > maxDiscount → BLOCK
```

---

## UI Design Notes (from Figma)

- **Theme**: Light mode, white background, professional B2B SaaS
- **Accent**: Red/pink for alerts and price suggestions, green for positive
- **Layout**: Left sidebar nav + top header + main content area
- **Data**: Very table-heavy and data-dense
- **Screens identified**:
  - Dashboard (KPI cards + line chart + alert tables)
  - Ürün Fiyat Analizi (product pricing panel, suggested price in red/pink)
  - Stok ve Talep Analizi (stock with product images + trend chart)
  - Kampanya Planlama (campaign tables)
  - Ayarlar - Import/Export (tabs: Ürünler/Tablolar, Import/Export, Kullanıcı Ayarları)
  - Confirmation modal ("Onaylamak istediğinden emin misin?")

---

## Pages to Build (from docs + Figma)

| Turkish Name | English Route | Description |
|---|---|---|
| Dashboard | `/` | KPI overview, alerts, channel performance |
| Ürün Fiyat Analizi | `/urunler` | Product pricing panel + approval flow |
| Rakip Fiyat Takibi | `/rakipler` | Competitor price monitoring |
| Kampanya Planlama | `/kampanyalar` | Marketplace campaign manager |
| Stok & Talep Analizi | `/stok` | Stock levels + demand trends |
| Ayarlar & Import/Export | `/ayarlar` | Settings, CSV import/export |
| Giriş | `/giris` | Login page |

---

## User Roles (RBAC)

| Role | Access |
|---|---|
| Admin | Full access |
| Operasyon | Approve/reject price suggestions, view all |
| Analiz | Read-only, view reports |

---

## Database Tables (22 total)

`urunler`, `kategoriler`, `marka`, `beden`, `sezonlar`, `kategori_sezon`,
`kanallar`, `kanal_urun`, `fiyatlandirma_kurallari`, `fiyat_onerileri`,
`fiyat_gecmisi`, `stok`, `rakipler`, `rakip_fiyatlar`, `alertler`,
`kampanya_planlari`, `kanal_komisyon_kademeleri`, `satislar`, `kullanicilar`, `roller`, `kullanici_rol`,
`islem_log`, `hata_log`

---

## Blocked / Open Issues

- Excel export buttons exist in UI (Kampanya, Stok, Urun Analizi) but are not yet wired to a backend endpoint.
- Stok zaman serisi forecasting uses pseudo-random generation — no `stok_gecmis` history table exists yet.
- Ayarlar Parametreler inputs (Rakip Fiyat Farkı %, Rekabet Katsayısı) render correctly but are not yet wired to read/write DB.
- Rakip Fiyat Takibi and Alertler pages still exist as files but are hidden from sidebar.

---

## How to Resume (Next Agent Instructions)

1. Read this entire file
2. Check **Phase Status** table — find the first `⬜ Not Started` phase
3. Check **Current Focus** section for specific next steps
4. Use **Directory Map** to know where to create files
5. When done with a task: update Phase Status, update Current Focus, add any new decisions to Decisions Log
6. **Never skip updating this file at session end**

---

## Session Log

| Date | Agent | What was done |
|---|---|---|
| 2026-04-07 | Session 1 | Project planning, stack decisions, Figma analysis, created AGENT_CONTEXT.md |
| 2026-04-07 | Session 1 | Phase 1 complete: database/schema.sql (22 tables), database/seed.sql (50 products, 3 channels, full dummy data), scripts/seed.js, backend/.env.example, root package.json, .gitignore |
| 2026-04-07 | Session 1 | Phase 2 complete: backend/package.json, app.js, models/index.js (all 22 models + associations), services/pricingEngine.js, routes: auth, dashboard, urunler, fiyatOnerileri, fiyatGecmisi, alertler, rakipler, stok, kampanyalar, kanallar, satislar, kullanicilar |
| 2026-04-07 | Session 1 | Phase 4 complete: full React frontend scaffolded — all pages (Dashboard, Urunler, Rakipler, Kampanyalar, Stok, Ayarlar, Giris), Zustand authStore, TanStack Query setup, Axios api layer, shadcn/ui components, Tailwind config, sidebar nav, routing |
| 2026-04-10 | Session 2 | Phase 3 completion: Finished Product Analysis detailed view, Campaign Module (What-If + komisyon kademeleri), Stok Supply Module (time-series charts with confidence intervals). |
| 2026-04-10 | Session 3 | Phase 5 — Bug Fixes & Polish: Fixed price approval (audit log + correct price field), fixed kampanya Evet→DB write, fixed \${channelWhere} SQL interpolation in all 3 dashboard grids, rebuilt dashboard chart to render per-channel lines, fixed % cap on ciro hedef, rebuilt Ayarlar page to match Figma, full reseed with 16-month realistic data (2025–Apr 2026), sidebar cleanup (removed Alertler + Rakipler), added red Uyarı section label on dashboard. |
