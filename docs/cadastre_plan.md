# UK Property Intelligence Platform – Concept & MVP Plan

## 1. Vision

Build a UK-focused property intelligence web app:

- Interactive **map UI** with 2D building/parcel view.
- Click any property → see **ownership, value, energy, market context**.
- For serious users, provide **decision-maker contact details** to enable off-market / private deals and targeted outreach.

Target users:

- Property investors (family offices, small funds, syndicates).
- CRE professionals: brokers, valuers, asset managers.
- Suppliers: insurers, facility management, lenders, etc.

---

## 2. Data: What We Want vs What’s Realistic in the UK

### 2.1 Core property layer (map + identity)

**What we want**

- Parcels/buildings draw on a map.
- Each property has a stable ID, coordinates, address, and “type”.

**UK sources**

- **Geometry**
  - OS OpenMap Local / Zoomstack – building footprints, basemap.
  - INSPIRE Index Polygons – approximate freehold title boundaries.
- **Identifiers**
  - UPRN (Unique Property Reference Number) where possible.
- **Basic attributes**
  - Land use / property type (from VOA and/or OS “function” data).

---

### 2.2 Ownership & owners

**What we want**

- For each property:
  - Owner name (company or person).
  - For companies: link to company profile with basic info.
  - For companies: ability to list all properties owned by that entity (portfolio view).

**UK sources**

- **Land Registry corporate ownership**
  - UK companies that own property (CCOD-style dataset).
  - Overseas companies that own property (OCOD-style dataset).
- **Land Registry bulk / API**
  - More detailed title info (subject to licence / cost).
- **Companies House API**
  - Company status, officers, PSCs, charges, SIC codes, addresses.

Initial focus: **corporate-owned commercial property**, where data is cleaner and less privacy-sensitive.

---

### 2.3 Pricing, value, and tax proxies

**What we want**

- Last sale date & price.
- Simple “value” proxy for commercial.

**UK sources**

- **Price Paid Data (Land Registry)** – sale price, date, address.
- **VOA non-domestic rating list**
  - Rateable value (proxy for rental/value).
  - Use type and sometimes floor area.

---

### 2.4 Building & energy characteristics

**What we want**

- Floor area, building type, units.
- Energy performance.

**UK sources**

- VOA attributes (where available).
- **EPC open data (domestic + non-domestic)** – rating, floor area, property type, issue date.

---

### 2.5 Market / area stats

**What we want**

- “Market” screens:
  - Number of properties/transactions.
  - Median sale price over time.
  - Volume by property type.
  - Basic demographics (population, income) and deprivation.

**UK sources**

- **ONS** APIs – population, income, etc.
- **Indices of Multiple Deprivation (IMD)** – deprivation scores by area.
- Aggregations over:
  - Price Paid,
  - VOA stock,
  - EPC datasets.

---

### 2.6 Decision-maker contacts (key business feature)

**What we want**

- For each property or owner:
  - One or more **human contacts**: name, role, email, phone.
  - Enough to enable:
    - Off-market sale approaches (e.g. “I’d like to buy your building”).
    - Supplier outreach (insurers, FM, etc.).

**Ways to get it (high-level)**

> All of this must be done in a way that respects GDPR and terms of use.

- **Paid B2B contact datasets**  
  - e.g. prospecting / sales-intelligence providers that license email/phone data.
- **Companies House officers & PSCs**  
  - Names & roles (but not usually contact details).
- **Corporate websites & LinkedIn (scraping / enrichment)**  
  - Carefully and lawfully enrich company-level contact info:
    - “Head of Real Estate”, “Asset Manager”, etc.
- **User-contributed contacts**
  - Later: allow users to add/curate contacts they know, stored private or shared within a team.

**MVP stance**

- MVP can start with **company-level contacts** (e.g. “investor relations” / “property enquiries” email + phone) from official sites or licensed data.
- Personal, named contacts can be phased in once you:
  - Choose a compliant data provider, or
  - Build careful enrichment pipelines with legal advice.

---

## 3. Product: MVP Feature Set

### 3.1 “Thin slice” MVP

A logged-in user can:

1. See an interactive map of a pilot city (e.g. London).
2. Pan/zoom; see markers/polygons for properties.
3. Click a property to open a panel showing:
   - Address, property type, coordinates.
   - Owner name (company).
   - Basic stats: last sale price/date, rateable value, EPC rating (if any).
   - Link to company profile / Companies House.
   - One or more **contact channels**:
     - Company contact email & phone at minimum.
4. Log in with Google using OAuth (Auth0).
5. Save/favourite properties for later.

### 3.2 Future directions

- Portfolio views per owner (“show all properties owned by X”).
- Market dashboards for an area.
- Advanced filters (EPC band, value range, property type).
- 3D buildings, planning applications, constraints overlays.
- Richer human contact data and campaign tools.

---

## 4. Tech Stack & Architecture (High Level)

### 4.1 Core stack

- **Frontend & backend (same repo):**
  - Next.js + React + TypeScript
  - MapLibre GL JS for 2D map.

- **Database:**
  - PostgreSQL + PostGIS (spatial).
  - Prisma ORM for TypeScript.

- **Auth:**
  - Auth0 (Google login as first provider).

- **Scraping / ETL:**
  - Python scripts for data ingestion & cleaning.
  - These write into Postgres.

---

## 5. Incremental Implementation Plan (Always Working)

### Phase 0 – Local toy app (no DB, fake data)

1. Set up Next.js + TypeScript project.
2. Render a MapLibre map on the main page.
3. Hard-code a few property points and show popups with info.
4. Load points from a local JSON file via a simple API route.

**Outcome:** Clickable map on your machine, no real data yet.

---

### Phase 1 – Real backend & database

1. Install Postgres locally; add Prisma + basic `Property` model (id, name, lat/lng, address).
2. Seed DB from your JSON file.
3. API route fetches properties from Postgres (via Prisma) instead of JSON.
4. Frontend unchanged (still fetches `/api/properties`).

**Outcome:** Same UX, but now you have a real DB and schema that can grow.

---

### Phase 2 – First real data pipeline

1. Python script downloads a small sample of **real property data**:
   - Start with something simple: e.g. a small subset of VOA or Price Paid for one borough, or even a single open GeoJSON file.
2. Clean/normalise into your `Property` model (lat/lng, name/address, type).
3. Import into Postgres via:
   - CSV → `COPY`, or
   - Prisma seed calling a generated JSON.

**Outcome:** Real UK properties on the map.

---

### Phase 3 – Add Google login (Auth0)

1. Configure Auth0 app; add Google as an identity provider.
2. Integrate Auth0’s Next.js SDK:
   - `/api/auth/login` / `/api/auth/callback` endpoints.
   - React hooks to know if user is logged in.
3. Add “Login with Google” button; show basic profile info when logged in.

**Outcome:** Users can sign in securely; still same property view.

---

### Phase 4 – User accounts & favourites

1. Add `User` and `Favourite` models in Prisma (keyed by Auth0 ID).
2. On first login, create a `User` row for that identity.
3. Add endpoints to:
   - Add/remove favourites.
   - List user’s favourites.
4. UI: star icon on property popup, “My Favourites” panel.

**Outcome:** Map + persistent, user-specific state.

---

### Phase 5 – Expand property schema & enrichers

Incrementally add columns + tables and fill them with ETL scripts:

- Ownership: link properties to corporate owners using Land Registry corporate ownership datasets.
- Owner entity: `Owner` table plus live enrichment from Companies House.
- Sales: `Transaction` table from Land Registry Price Paid.
- Valuation: rateable value records from VOA.
- EPC: link to latest EPC where available.

You don’t need to have perfect matching everywhere from day one; start with:

- Small geography (say, one London borough).
- Simple matching heuristics (postcode + address similarity).
- Basic UI fields (owner name, last sale price/date, rateable value, EPC rating).

---

### Phase 6 – Company contacts (MVP level)

1. For each `Owner` (company):
   - Pull official contact channels:
     - Website, general contact email, phone number.
   - Optionally, job-role-level contacts from a licensed B2B data provider or carefully-sourced public info.
2. Expose on:
   - Property panel (e.g. “Contact owner: info@propertyco.com”).
   - Owner profile screen.

**Outcome:** A logged-in user can:  
Find a property → see who owns it → see how to contact that owner (at least company-level) → save it / track it.

---

## 6. Property Data Schema (Draft)

### Identity & Location
- `id` – internal ID (primary key)
- `uprn` – Unique Property Reference Number (when available)
- `titleNumber` – Land Registry title number (when available)
- `name` – short label for UI (e.g. “10 Downing St Offices”)
- `fullAddress` – single formatted address string
- `addressLine1`
- `addressLine2`
- `townCity`
- `postcode`
- `country`
- `lat`
- `lng`
- `geometryType` – `"point" | "polygon"`
- `geojson` – optional GeoJSON geometry
- `coordinateSource` – e.g. `"VOA" | "EPC" | "geocoded"`

### Classification / Building Info
- `propertyType` – app-level category: `"office" | "retail" | "industrial" | "residential_block" | "land" | ...`
- `useClass` – UK planning use class (e.g. `"E"`, `"B2"`, `"C1"`)
- `isCommercial`
- `isMixedUse`
- `units` – number of units (if known)
- `floorAreaSqm`
- `siteAreaSqm`
- `storeys`
- `yearBuilt`
- `buildingStatus` – `"existing" | "under_construction" | "vacant" | ...`
- `sourceClassification` – where the classification came from

### Ownership
- `ownerId` – link to Owner table
- `ownerName` – denormalised owner name
- `ownerType` – `"company" | "individual" | "public_body" | "overseas_company"`
- `companyNumber` – Companies House number (if applicable)
- `overseasCompanyId`
- `tenure` – `"freehold" | "leasehold" | "unknown"`
- `ownershipStartDate`
- `ownershipSource` – source of ownership data

### Transactions / Pricing
- `lastSalePrice`
- `lastSaleCurrency`
- `lastSaleDate`
- `lastSaleType` – e.g. `"freehold" | "leasehold" | "transfer"`
- `lastSaleSource` – e.g. price paid data
- `transactionCount5y`
- `avgPricePerSqm`
- `hasPriceHistory`

### Valuation / Tax
- `rateableValue`
- `rateableValueDate`
- `rateableValueSource`
- `billingAuthorityRef`
- `estimatedValue` – app-derived valuation
- `estimatedValueDate`

### Energy Performance (EPC)
- `epcRating`
- `epcScore`
- `epcCertificateNumber`
- `epcLastUpdated`
- `epcFloorAreaSqm`
- `epcPropertyType`
- `epcSource` – domestic/non-domestic

### Occupancy / Tenancy (stub for future)
- `occupancyStatus` – `"occupied" | "vacant" | "part_occupied" | "unknown"`
- `primaryTenantName`
- `tenantCountEstimate`
- `leaseExpiryEarliest`
- `leaseExpiryLatest`

### Contacts (stub for future)
- `primaryContactId` – link to Contact
- `contactSummary` – short human-readable contact summary
- `hasDirectContact`
- `isContactVerified`

### Market / Area Stats (derived)
- `marketAreaId` – link to a geography/market entity
- `marketAreaName`
- `localMedianSalePrice`
- `localMedianYield`
- `deprivationIndex`
- `populationDensityPerSqKm`
- `householdIncomeMedian`
- `transactionVolume1y`

### Metadata / Provenance
- `createdAt`
- `updatedAt`
- `dataQualityScore`
- `sources` – array of source tags
- `notes`
- `flags` – array of flags/tags (e.g. `"address_mismatch"`)

