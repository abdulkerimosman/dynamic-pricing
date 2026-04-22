# Sporthink Dynamic Pricing System Reference

This document explains how the current system works end to end, which data each screen uses, which database tables are involved, and how the tables connect to each other.

The goal is to make the current implementation understandable before the database is wiped and repopulated through the UI in a real operational flow.

## 1. Big Picture

The system is a pricing and operations platform for Sporthink.

The core loop is:

1. Import or create master data.
2. Enter products, stock, channel prices, competitor prices, and sales.
3. The backend calculates pricing suggestions, stock risk, competitor alerts, and campaign scenarios.
4. The frontend shows those results in dashboard cards, tables, charts, and expandable detail rows.
5. Users approve or reject suggested prices, which writes history and audit records.

The most important idea is that the UI does not keep the business truth by itself. The UI is a view and input layer. The database is the source of truth.

## 2. Runtime Architecture

### Frontend

- React 18 + Vite
- TanStack Query for server state
- Zustand for auth token storage
- Recharts for dashboard charts
- Axios API wrapper for backend requests

### Backend

- Node.js + Fastify
- Sequelize ORM
- JWT authentication
- Multipart upload support for Excel imports

### Main API root

- Frontend routes call `/api/...`
- Backend registers route plugins under `/api/auth`, `/api/dashboard`, `/api/urun-analizi`, `/api/stok`, `/api/kampanya`, `/api/import`, and others

## 3. Important Database Tables

Below are the tables that matter most in daily use.

### Master / reference tables

- `kullanicilar`: app users
- `roller`, `kullanici_rol`: RBAC mapping
- `kategoriler`: product categories and target profitability values
- `marka`: brand names
- `sezonlar`: seasons
- `beden`: sizes
- `cinsiyetler`: gender groupings
- `kanallar`: sales channels, including own website vs marketplace
- `kategori_sezon`: category-to-season mapping
- `urun_cinsiyet`: product-to-gender mapping

### Operational tables

- `urunler`: master product records
- `kanal_urun`: product listing per channel, including prices
- `stok`: stock by product and size
- `satislar`: sales transactions by channel product
- `rakipler`: competitor list
- `rakip_fiyatlar`: competitor price snapshots
- `fiyatlandirma_kurallari`: pricing rules per channel and category
- `fiyat_onerileri`: pending/approved/rejected pricing suggestions
- `fiyat_gecmisi`: approved price history
- `alertler`: open/closed alerts
- `kampanya_planlari`: campaign plans

### Audit and logging

- `islem_log`: user activity and import/approval log
- `hata_log`: backend error log

## 4. Main Table Relationships

### Product structure

- `urunler.kategori_id` -> `kategoriler.kategori_id`
- `urunler.marka_id` -> `marka.marka_id`
- `kanal_urun.urun_id` -> `urunler.urun_id`
- `kanal_urun.kanal_id` -> `kanallar.kanal_id`
- `stok.urun_id` -> `urunler.urun_id`
- `stok.beden_id` -> `beden.beden_id`

### Pricing structure

- `fiyatlandirma_kurallari.kanal_id` -> `kanallar.kanal_id`
- `fiyatlandirma_kurallari.kategori_id` -> `kategoriler.kategori_id`
- `fiyat_onerileri.kanal_urun_id` -> `kanal_urun.kanal_urun_id`
- `fiyat_gecmisi.kanal_urun_id` -> `kanal_urun.kanal_urun_id`

### Competitor structure

- `rakip_fiyatlar.urun_id` -> `urunler.urun_id`
- `rakip_fiyatlar.rakip_id` -> `rakipler.rakip_id`
- `rakip_fiyatlar.kanal_id` -> `kanallar.kanal_id`
- `rakip_fiyatlar.beden_id` -> `beden.beden_id` when present

### Sales and campaigns

- `satislar.kanal_urun_id` -> `kanal_urun.kanal_urun_id`
- `kampanya_planlari.kanal_id` -> `kanallar.kanal_id`
- `kampanya_planlari.sezon_id` -> `sezonlar.sezon_id`

### Logging

- `islem_log.kullanici_id` -> `kullanicilar.kullanici_id`
- `alertler.cozen_kullanici_id` -> `kullanicilar.kullanici_id`
- `fiyat_gecmisi.degistiren_kullanici_id` -> `kullanicilar.kullanici_id`

## 5. UI Routes and Their Data Sources

Frontend routes are defined in [frontend/src/App.jsx](frontend/src/App.jsx).

### `/giris`
- Login screen
- Uses `auth` route and stores JWT in Zustand

### `/`
- Dashboard
- Uses `/api/dashboard`

### `/urunler`
- Ürün Fiyat Analizi
- Uses `/api/urun-analizi`

### `/stok`
- Stok ve talep analysis
- Uses `/api/stok`

### `/kampanya`
- Kampanya Planlama
- Uses `/api/kampanya`

### `/rakipler`
- Competitor tracking page
- Uses `/api/rakipler`

### `/alertler`
- Alert management page
- Uses `/api/alertler`

### `/ayarlar`
- Settings / import-export utilities
- Uses import and configuration endpoints

## 6. Dashboard KPI Flow

Dashboard page: [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)

Backend route: [backend/src/routes/dashboard.js](backend/src/routes/dashboard.js)

### Data used for KPI cards

#### 1. Karlılık Oranı
- Source tables: `satislar`, `kanal_urun`
- Query logic:
  - sum total revenue from `satis_miktari * birim_fiyat`
  - sum total cost from `satis_miktari * maliyet_snapshot`
  - calculate `(ciro - maliyet) / ciro`
- Meaning:
  - overall profitability for the selected year and channels

#### 2. Fiyat Değişim Öneri
- Source table: `fiyat_onerileri`
- Counted rows:
  - `durum = 'beklemede'`
- Meaning:
  - number of pending price suggestions waiting for approval

#### 3. Aylık Ciro Hedefi Gerçekleşmiş
- Source table: `fiyatlandirma_kurallari`
- Query logic:
  - sum `aylik_satis_hedefi` for active rules in selected channels (currently treated as monetary target in TRY)
  - compute yearly revenue from `satislar` and convert to monthly average (`totalCiro / 12`)
  - calculate `(totalCiro / 12) / monthlyTarget`
- Meaning:
  - how much of monthly revenue target has been achieved

Important note:
- In current code, this is a money-vs-money comparison (ciro vs hedef ciro), not units-vs-money.
- The field name `aylik_satis_hedefi` can be misleading; operationally it behaves as `aylik_ciro_hedefi`.

#### 4. Aktif Uyarı
- Source table: `alertler`
- Counted rows:
  - `durum = 'acik'`
- Meaning:
  - total unresolved operational alerts

### Dashboard chart data

The same endpoint also returns `grafik_verisi`.

Data sources:
- `satislar`
- `kanal_urun`
- `kanallar`

What it shows:
- Monthly revenue per selected channel
- Target line based on `fiyatlandirma_kurallari.aylik_satis_hedefi` (used as monetary target in TRY)
- Forecast band generated in backend for the current/future period

Unit consistency note:
- Chart line comparison is revenue-vs-revenue in current implementation.
- If the business later wants true unit targets, a separate unit target field and unit-based chart should be added.

### Dashboard bottom alert tables

The dashboard warning section uses `[backend/src/routes/dashboard.js](backend/src/routes/dashboard.js)` and shows three data groups:

#### Rakip Fiyat Farkı Yüksek Ürünler
- Tables used:
  - `rakip_fiyatlar`
  - `urunler`
  - `marka`
  - `kanal_urun`
  - `kanallar`
- Logic:
  - keep the latest snapshot per competitor/product/channel/size
  - find the cheapest current competitor price per product
  - compare it to our website list price

#### Kritik Düşük Stok
- Tables used:
  - `stok`
  - `satislar`
  - `kanal_urun`
  - `urunler`
  - `marka`
- Logic:
  - calculate sales velocity for the selected period
  - estimate depletion days
  - show products that are expected to run out within the critical window

#### Fazla Stok
- Tables used:
  - `stok`
  - `satislar`
  - `kanal_urun`
  - `urunler`
  - `marka`
- Logic:
  - products with no sales in the selected period or very long depletion time

#### Fiyat Alarmı Olan Ürünler
- Tables used:
  - `rakip_fiyatlar`
  - `rakipler`
  - `urunler`
  - `kanal_urun`
  - `kanallar`
- Logic:
  - competitor price history is append-only
  - compare current cheapest competitor price with previous snapshot
  - alert only if the drop exceeds the chosen threshold

## 7. Ürün Fiyat Analizi Flow

Page: [frontend/src/pages/UrunFiyatAnalizi.jsx](frontend/src/pages/UrunFiyatAnalizi.jsx)

Backend route: [backend/src/routes/urunAnalizi.js](backend/src/routes/urunAnalizi.js)

### Data used in the main table

The page combines product, channel, competitor, and stock data.

Tables used:
- `urunler`
- `kategoriler`
- `marka`
- `kanal_urun`
- `stok`
- `rakip_fiyatlar`
- `fiyatlandirma_kurallari`
- `sezonlar`
- `cinsiyetler`
- `urun_cinsiyet`

Main row fields:
- product key: `stokKodu`
- product category and season info
- product stock
- cost
- website list price and discounted price
- marketplace list/discount price
- average competitor price
- cheapest competitor price
- system recommended price
- profitability ratio

### How the system recommended price is built

Backend uses the pricing engine and current data:

Inputs:
- product cost from `urunler.maliyet`
- target margin from `kategoriler.kar_beklentisi`
- current channel price from `kanal_urun`
- competitor prices from `rakip_fiyatlar`
- stock records from `stok`
- rule set from `fiyatlandirma_kurallari`

### Current user-price import flow

There is now an import flow for user-entered prices.

Backend endpoint:
- `POST /api/urun-analizi/kullanici-fiyat-import`

Expected uploaded Excel columns:
- `stok_kodu`
- `kullanici_onerilen_fiyat`

The backend returns a mapping keyed by `stokKodu`.

Frontend uses that mapping to:
- add a `Kullanıcı Önerilen Fiyat` column in the table
- compare system vs user price in the expanded row

### Expanded row comparison

The expanded detail row shows:

- system recommended price
- user recommended price
- system new profitability
- user new profitability
- price difference

Source data for comparison:
- system price: `algoritmaDetayi.onerilenFiyat`
- user price: imported Excel value mapped by `stokKodu`
- cost: `urunler.maliyet`

## 8. Stok Flow

Page: [frontend/src/pages/Stok.jsx](frontend/src/pages/Stok.jsx)

Backend route: [backend/src/routes/stok.js](backend/src/routes/stok.js)

### Data used

Tables:
- `urunler`
- `stok`
- `satislar`
- `kanal_urun`
- `marka`
- `kategoriler`
- `beden`
- `kategori_sezon`
- `sezonlar`
- `urun_cinsiyet`
- `cinsiyetler`

### Stock logic

The page now uses real sales-velocity logic instead of pseudo-random values.

Computed values:
- `satilanAdet`: quantity sold in the selected period
- `satisHiz`: sold per day
- `stokGun`: estimated depletion days
- `sonSatisTarihi`: last sale date

Status rules:
- Critical stock: depletion within 30 days
- Overstock: no sales in period or depletion above 90 days

## 9. Kampanya Planlama Flow

Page: [frontend/src/pages/KampanyaPlanlama.jsx](frontend/src/pages/KampanyaPlanlama.jsx)

Backend route: [backend/src/routes/kampanya.js](backend/src/routes/kampanya.js)

### Data used

Tables:
- `kanallar`
- `urunler`
- `kanal_urun`
- `kategoriler`
- `fiyatlandirma_kurallari`
- `rakip_fiyatlar`
- `stok`
- `kampanya_planlari`

### What the page currently does

- Lets the user select a marketplace channel
- Builds a product list for that channel
- Shows pricing, stock, and competitor context
- Supports file upload and export for campaign processing

### Business flow behind campaign data

- Channel and category rules are read from `fiyatlandirma_kurallari`
- Product-level pricing scenario data comes from `urunler` + `kanal_urun`
- Approved campaign decisions are written to `kampanya_planlari`

## 10. Import / Approval / History Flows

### Price suggestion approval

When a suggestion is approved:

- `fiyat_onerileri` is updated from `beklemede` to `onaylandi`
- `fiyat_gecmisi` records the old and new price
- `islem_log` records the user action

### Competitor price import

Competitor imports append rows into `rakip_fiyatlar`.

Important point:
- the system now keeps price history instead of overwriting the last value
- this is necessary for drop detection and trend analysis

### Campaign plan approval

The campaign approval path writes a row into `kampanya_planlari`.

## 11. Practical Real-World Population Order

If the database is cleared and repopulated through the UI, the practical order should be:

1. Users and roles
2. Channels
3. Categories, brands, seasons, sizes, genders
4. Products
5. Channel listings and base prices in `kanal_urun`
6. Stock records in `stok`
7. Pricing rules in `fiyatlandirma_kurallari`
8. Competitor records in `rakipler`
9. Competitor price snapshots in `rakip_fiyatlar`
10. Sales transactions in `satislar`
11. Suggested prices in `fiyat_onerileri`
12. Approvals into `fiyat_gecmisi` and `islem_log`
13. Alerts and campaign plans

This order matters because many screens depend on upstream data:

- Dashboard KPIs need sales, alerts, suggestions, and rules
- Product analysis needs products, channel prices, competitor prices, stock, and rules
- Stock analysis needs products, stock, and sales
- Campaign planning needs channels, products, categories, rules, and competitor context

## 12. What Depends on What

### If `urunler` is missing

- most pages become empty
- no product price analysis
- no stock analysis
- no competitor price joins

### If `kanal_urun` is missing

- dashboard sales and pricing views lose channel-specific prices
- approval flow cannot attach to a specific channel listing

### If `stok` is missing

- stock risk pages cannot calculate depletion
- pricing engine loses stock coefficient inputs

### If `rakip_fiyatlar` is missing

- competitor comparison disappears
- price drop alerts cannot work

### If `satislar` is missing

- dashboard revenue becomes zero
- stock velocity calculations become zero

### If `fiyatlandirma_kurallari` is missing

- dashboard target calculation fails
- pricing engine loses min margin / commission / competition logic

## 13. Summary of the Core Data Model

At a high level:

- `urunler` is the product master
- `kanal_urun` is the product’s current channel listing and price
- `stok` is current inventory by size
- `satislar` is historical sales performance
- `rakip_fiyatlar` is competitor history
- `fiyatlandirma_kurallari` is pricing policy by channel and category
- `fiyat_onerileri` is the pending recommendation queue
- `fiyat_gecmisi` is approved pricing history
- `alertler` is the exception queue
- `kampanya_planlari` stores campaign decisions
- `islem_log` and `hata_log` provide traceability

That is the backbone of the system.

## 14. Why This Matters Before Re-seeding

If you delete all current data and rebuild it through the UI, the important thing is not just to insert rows. The important thing is to insert them in the correct dependency order so each screen can compute correctly.

The UI should be treated as the operational entry point for:

- master data setup
- product setup
- channel pricing setup
- stock loading
- sales loading
- competitor uploads
- suggestions and approvals
- campaigns and alert review

If any upstream table is empty, downstream UI elements will look broken even if the code is correct.
