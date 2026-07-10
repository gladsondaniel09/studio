// APICAL Customer Knowledge Base
// Source: ATS User Manuals v7.2.0 (5 PDFs, extracted July 2026)
// ATS = Xceler platform. APICAL uses Xceler v7.2.0.

export const APICAL_KB = `
## APICAL CUSTOMER KNOWLEDGE BASE (Xceler v7.2.0 / ATS)

APICAL uses the Xceler CTRM platform branded as "ATS" (APICAL Trading System), running version 7.2.0.
All Xceler core concepts (PhysicalTrade, PlannedObligation, Actualization, Invoice, Settlement, etc.) apply.
The following is APICAL-specific configuration, workflows, and business rules derived from their user manuals.

---

### APICAL BUSINESS ROLES & SCOPE

| Role | Xceler Modules Used | Primary Responsibilities |
|------|---------------------|--------------------------|
| Contract Team | Trade > Physical Trade Beta, Trade > Pricing, Trade > Washout, Trade > Inter ProfitCenter | Create/manage buy and sell contracts, PTBF pricing, washouts, IDTs |
| IFG (Invoice/Finance Group) | Finance > Settlement, Finance > Invoice, Finance > FX Rate, Risk > Report Dashboard | Generate invoices, settlements, FX rates, cashflow |
| Market Risk | Trade > Futures, Operations & Accounts > Future Netting, Pricing, Risk > Risk Dashboard | Futures trades, hedging, price fixation, M2M PnL |
| Shipping Operations | Operations & Accounts > Operations Dashboard, Sea Transport Booking, Vessel/Container Planning, Inventory Management, Trade Actualization | Logistics, planning, actualization, inventory |
| System Admin | System Settings (all sub-modules) | Users, roles, transaction IDs, document templates, approval workflows |

---

### CONTRACT TEAM — KEY WORKFLOWS

**Physical Trade Creation (Buy/Sell)**
- Navigation: Trade → Physical Trade - Beta → Buy (or Sell)
- Trade Types: Fixed Price, PTBF/Differential (Provisional Price), LTC (Long-Term Contract)
- Incoterms used: FOB, CFR, CIF, DEL, Ex-Tank, FRANCO, LOCO
- LC Terms: APICAL uses Letter of Credit terms on physical trades; Proforma Invoice generated for LC-based trades
- Paper Trade: Paper trades can be converted to Physical Trade after counterparty confirmation
- Key fields: Company, Profit Center, Commodity, Grade, Quantity, UOM, Price, Incoterm, Shipment Month, Payment Terms, Counterparty

**APICAL-Specific Trade Features**
- Proforma Invoice: Generated from trade for LC-based contracts; supports partial quantities for multiple LCs
- Doc Bypass Planning: Three modes — Middle of String, Beginning of String, End of String (DBP)
- Group Invoicing: Multiple actualized sales trades on same vessel grouped into one invoice (SC 39 workflow)
- Advance Invoice: Invoice raised before actualization for pre-payment scenarios
- Generic CN/DN: Credit Note / Debit Note generated for price differences in PTBF and washout scenarios
- Bridge Contract: Third-party sales trade creation for counterparties like TGT, AG (SC 10 workflow)

**Trade Voiding Rules**
- Cannot void a trade that is partially/fully planned; must de-allocate and delete plan first
- Void order: De-allocate vessel → Delete plan → Void trade
- For netted futures: Un-net first via Operations & Accounts → Future Netting History, then void

**PTBF Pricing Workflow**
- Navigation: Operations & Accounts → Pricing (or Trade → Pricing)
- Price status: Not Priced → Partially Priced → Fully Priced → Provisionally Priced
- Price fixation required before actualization (unless trade has a Provisional Price)
- Staggered pricing: Allowed after Provisional Invoice is generated under Settlement
- Price rollback order: Delete Invoice → De-actualize → Delete Price
- Manual Allocation vs Auto Allocation: User can switch; Manual requires separate Allocate Price step
- WAP (Weighted Average Price): Applied to obligation lines on FIFO basis; recommended to fully price before using WAP
- Split obligations: Price visible in Pricing screen but splits not shown; user edits quantity to price individual splits
- Delete price: Only if invoice not yet generated; otherwise must reverse: Delete Invoice → De-actualize → Delete Price

---

### SHIPPING OPERATIONS — KEY WORKFLOWS

**Operations Dashboard**
- Navigation: Operations & Accounts → Operations Dashboard
- Shows all active planned obligations with status, vessel, planning details
- Key actions: Split Remaining Quantity (before re-planning to different transport), view/manage all open obligations
- Split must be done in Operations Dashboard BEFORE re-planning to different vessel or transport mode

**Sea Transport Booking**
- Navigation: Operations & Accounts → Operations → Sea Transport Booking
- Book vessel/transport before Vessel Planning
- Road transport: Only FRANCO or LOCO incoterms allowed for road bookings

**Vessel Planning**
- Navigation: Operations & Accounts → Trade Planning → Vessel Planning
- Match purchase and sales obligations to a vessel
- BL Allocation tab: Assign BL numbers, quantities to obligations on the vessel
- Prerequisite: Sales obligation must be SPLIT to required GBL quantities before vessel planning
- Container Planning: Operations & Accounts → Trade Planning → Container Planning (for containerized cargo)

**Inventory Management**
- Build Inventory: Operations > Inventory Management > Build Inventory
  - Transfer purchase cargo into tank inventory
  - GRN Actualization MUST follow Build Inventory (obligation stays Open Position without GRN)
  - Simple Blending starts from Build Inventory, NOT from Transfer Stocks
- Draw Inventory: Operations > Inventory Management > Draw Inventory
  - Match inventory stock to sales obligation
  - Prerequisite: Sales obligation must be split before drawing
- Stock Movement / Inventories: Operations > Inventory Management > Stock Movement > Inventories
- Transfer Stock: Operations > Inventory Management > Transfer Stock
- In-Transit: Operations > Inventory Management > Transit
  - Assign new BL number before reloading onto new vessel (used in SC 21, 22, 23, 24, 25, 26, 27, 28)
- Suspense Inventory: Auto-created when discharge qty ≠ BL qty
  - Excess discharge → Suspense Gain (SC 42)
  - Shortage discharge → Suspense Loss (SC 41)

**Trade Actualization**
- Navigation: Operations & Accounts → Operations → Trade Actualization
- Capture BL number, load quantity, BL date to confirm shipment
- De-actualization required before deleting plan or voiding trade

**Washout**
- Navigation: Trade → Washout
- Back-to-back trade cancellation with CN/DN settlement
- Zero price difference washout: No CN/DN generated (SC 31)
- Quick Washout (SC 43): Cargo split into multiple shipments, one shipment cancelled

---

### IFG (INVOICE / FINANCE GROUP) — KEY WORKFLOWS

**Settlement / Invoice Generation**
- Navigation: Finance → Settlement
- Purchase Invoice: Generated after actualization of buy obligation
- Sales Invoice (Commercial Invoice): Generated after actualization of sell obligation
- Provisional Invoice: Generated for PTBF trades using provisional/dummy price; CN/DN issued after final price fixation
- Group Invoice: Multiple CIF/CFR sales trades on same vessel grouped (SC 39)
- Advance Invoice: Pre-actualization invoice for advance payment
- Proforma Invoice: LC-based pre-shipment invoice with partial quantities
- Generic CN/DN: Issued for price adjustments, washout settlements, quantity claims

**Invoice Approval and Posting**
- Navigation: Finance → Invoice → Approved Tab
- Invoice must be approved and posted before it reflects in financial records

**FX Rate**
- Navigation: Finance → FX Rate (or Risk → FX Rate)
- Used for trades invoiced in currency different from trade currency (e.g., SC 40: MYR sales invoiced in USD)
- FX rates must be set before invoice generation for cross-currency trades

**Cashflow Dashboard**
- Navigation: Finance → Cashflow Dashboard (or Report Dashboard)
- Shows projected cash inflows/outflows from trades
- Filters by company, profit center, counterparty, date range

**Report Dashboard**
- Navigation: Risk → Report Dashboard
- Provides position reports, export to Excel
- Filter by commodity, profit center, company

---

### MARKET RISK — KEY WORKFLOWS

**Futures Trade**
- Navigation: Trade → Futures
- Create futures trades manually (+Add) or via bulk Import (Excel template)
- Required fields for import: Company, Profit Center, Trader Name, Clearing Broker, Buy/Sell, Trade Type, Trade Date, Future Index, Lot, Price, Ticker
- Cannot void a netted futures trade; un-net first via Future Netting History

**Future Netting**
- Navigation: Operations & Accounts → Future Netting
- Netting criteria: Commodity, Broker, Exchange, Ticker, Expiry Date must match (Lots also required for manual netting)
- Manual Netting: Select matching long/short trades, click Future Netting, select Netting Date
- Auto Netting: Filter and select all eligible trades, submit
- History: Operations & Accounts → Future Netting History
- Un-Net: Via Future Netting History context menu; un-netted trade returns to netting screen

**Inter-Profit Center Trade (IDT)**
- Navigation: Trade → Inter ProfitCenter
- Internal trade between Profit Center A and Profit Center B within same organization
- Consumption follows FIFO by Shipment Month, then IDT Trade Date, then creation timestamp
- Prerequisite: Inter Profit Center trading must be enabled in System Settings → Tenant Config → System Config → Inter Profitcenter Allowed
- Cannot void if partially or fully consumed

**Risk Dashboard**
- Navigation: Risk → Risk Dashboard
- Views: Net Position by Profit Center/Commodity, Forward positions, Open sales value, Open Long/Short by counterparty, M2M PnL
- EOD vs Live toggle; Value date filter (only dates with published EOD job data)
- Default filters: First company alphabetically, first 10 parent commodities, first 10 profit centers, all commodities, first 10 counterparties
- M2M PnL: Positive or negative based on EOD data calculations

---

### SYSTEM ADMIN — KEY CONFIGURATIONS

**Transaction ID Reference**
- Navigation: System Settings → Transaction ID Reference
- Format tokens: @tradeTransactionType, @company, @YY, @Sequencenumber, @invoiceDate(MMYY), etc.
- Must configure: defaultId and cashflowId (mandatory for physical/paper trades)
- Optional: actualizationId, futureTradeId, invoiceId, etc.
- Sequence reset: Manual (Reset Sequence button) or automatic (Event Engine via Xceler team setup)
- Cannot delete a Transaction ID format; deactivate by setting status to Inactive

**User Management**
- Navigation: System Settings → User Master
- Business Admin role: Cannot coexist with other roles on the same user
- User preferences: Legal Entity (at least one must be marked Default), Profit Centre, Counterparty, Commodity
- Dormant users: Saved without product subscriptions; cannot log in but appear in dropdowns

**Role Master**
- Navigation: System Settings → Role Master
- 6 predefined roles; additional roles can be created
- Permissions per screen: View, Add, Edit, Delete, plus screen-specific actions
- Role changes take effect only after user logs out and logs back in
- Business Admin role cannot be edited

**Approval Workflow Configuration**
- Navigation: System Settings → Approval Workflow Configuration
- Custom workflows per module/business need
- Positive/Negative Post Action APIs required for notification trigger events on workflow approvals
- SLA (Service Level Agreement) tracking supported

**Notification Settings**
- Navigation: System Settings → Notification Settings
- Channels: Email, Xceler App Notification, or both
- Recipient Types: Individual, Created By, Modified By, Role, Trader
- Trigger Events: Trade Creation, Inventory Build, Approval Workflow events, etc.
- Batch notifications: Sent once daily; use XQL queries for criteria; dynamic subject/message with angle-bracket placeholders

**Tenant Configuration (System Config)**
- Navigation: System Settings → Tenant Configuration → System Config
- Inter Profitcenter Allowed: Must be Yes for IDT trading
- Rounding Format: Defined per commodity/currency
- API Config: External system integration settings
- KYC Renewal Config: Counterparty KYC expiry management
- Authentication Broker: SSO/auth provider configuration
- e-Invoice Configuration: For compliance with e-invoicing regulations

**Base File Upload**
- Navigation: System Settings → Base File Upload
- Upload Future Metadata files (for Futures module ticker/index configuration)
- GL Decision JSLT Configuration (for invoice GL code generation)
- Custom Invoice Payload Templates
- Digital certificates for e-Invoicing
- Event Engine files for automated transaction ID reset

**Audit Log**
- Navigation: System Settings → Audit Log
- View history of system actions, user changes, configuration changes

**Product Versions**
- Navigation: System Settings → Product Versions
- View version numbers of all deployed modules/services (eliminates need to contact DevOps)

---

### APICAL-SPECIFIC BUSINESS RULES

1. **LC Terms on Trades**: APICAL uses LC-based payment terms; Proforma Invoice is mandatory for LC trades before shipment.
2. **Partial Proforma Invoice**: Multiple LCs for one contract — generate separate Proforma Invoices for each partial quantity.
3. **Road Transport Constraint**: Only FRANCO or LOCO incoterms permitted for road transport bookings.
4. **IDT Consumption FIFO**: Inter-Profit Center trades consumed in order of Shipment Month → IDT Trade Date → Creation Timestamp.
5. **Business Admin Exclusivity**: A user with Business Admin role cannot have any other role assigned, and vice versa.
6. **Simple Blending Origin**: Must start from Build Inventory, never from Transfer Stocks.
7. **GRN After Build Inventory**: Mandatory; without GRN, purchase obligation remains in Open Position and cannot be settled.
8. **Split Before Planning**: Sales obligation must be split to GBL quantities in Operations Dashboard BEFORE vessel planning or inventory draw.
9. **De-actualize Before Plan Delete**: Cannot delete a plan without de-actualizing first.
10. **Price Rollback Sequence**: Delete Invoice → De-actualize → Delete Price (skip De-actualize for Provisionally Priced if invoice not generated).
11. **Staggered Pricing**: Only allowed after Provisional Invoice is generated in Finance → Settlement.
12. **Inactivity Timeout**: 15 minutes; 15-second warning before auto-logout; staying active in any tab keeps all tabs alive.
13. **Future Trade Cannot Void If Netted**: Must un-net via Future Netting History first.
14. **IDT Cannot Void If Consumed**: Inter-Profit Center trade cannot be voided if partially or fully consumed.
15. **User Preference Default Entity**: At least one Legal Entity must be marked as Default in User Preferences, or preference will not save.

---

### APICAL NAVIGATION QUICK REFERENCE

| Task | Navigation Path |
|------|----------------|
| Create Purchase Trade | Trade → Physical Trade - Beta → Buy |
| Create Sales Trade | Trade → Physical Trade - Beta → Sell |
| Create Futures Trade | Trade → Futures → +Add |
| Import Futures Trade | Trade → Futures → Import |
| Future Netting | Operations & Accounts → Future Netting |
| Future Netting History / Un-Net | Operations & Accounts → Future Netting History |
| Inter-Profit Center Trade | Trade → Inter ProfitCenter |
| Pricing (PTBF) | Operations & Accounts → Pricing |
| Washout | Trade → Washout |
| Operations Dashboard | Operations & Accounts → Operations Dashboard |
| Sea Transport Booking | Operations & Accounts → Operations → Sea Transport Booking |
| Vessel Planning | Operations & Accounts → Trade Planning → Vessel Planning |
| BL Allocation | Vessel Planning → BL Allocation tab |
| Container Planning | Operations & Accounts → Trade Planning → Container Planning |
| Build Inventory | Operations > Inventory Management → Build Inventory |
| Draw Inventory | Operations > Inventory Management → Draw Inventory |
| Stock Movement | Operations > Inventory Management → Stock Movement → Inventories |
| Transfer Stock | Operations > Inventory Management → Transfer Stock |
| In-Transit BL Update | Operations > Inventory Management → Transit |
| Trade Actualization | Operations & Accounts → Operations → Trade Actualization |
| Settlement / Purchase Invoice | Finance → Settlement |
| Invoice Approval | Finance → Invoice → Approved Tab |
| FX Rate | Finance → FX Rate |
| Cashflow Dashboard | Finance → Cashflow Dashboard |
| Report Dashboard | Risk → Report Dashboard |
| Risk Dashboard | Risk → Risk Dashboard |
| Audit Log | System Settings → Audit Log |
| User Master | System Settings → User Master |
| Role Master | System Settings → Role Master |
| Approval Workflow | System Settings → Approval Workflow Configuration |
| Notification Settings | System Settings → Notification Settings |
| Transaction ID Reference | System Settings → Transaction ID Reference |
| Document Template | System Settings → Document Template |
| Tenant Configuration | System Settings → Tenant Configuration |
| Base File Upload | System Settings → Base File Upload |
| Product Versions | System Settings → Product Versions |
`;
