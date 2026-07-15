// APICAL Customer Knowledge Base — compact version for token-constrained models
// ATS = Xceler v7.2.0 platform branded for APICAL.

export const APICAL_KB = `
## APICAL / ATS CONTEXT (Xceler v7.2.0)

APICAL uses Xceler CTRM branded as ATS. All standard Xceler entities apply.

### ROLES
- Contract Team: Trade creation, PTBF pricing, washouts, IDTs
- IFG: Settlement, invoices, FX rates, cashflow
- Market Risk: Futures, netting, risk dashboard, M2M PnL
- Shipping Ops: Vessel/container planning, actualization, inventory
- System Admin: Users, roles, transaction IDs, approval workflows

### KEY BUSINESS RULES
1. Split sales obligation to GBL quantities in Operations Dashboard BEFORE vessel planning or inventory draw.
2. GRN Actualization mandatory after Build Inventory — without it, obligation stays Open Position.
3. Simple Blending starts from Build Inventory, NOT Transfer Stocks.
4. In-Transit BL update: Operations > Inventory Management > Transit — assign new BL before reloading.
5. Void order: De-actualize → De-allocate vessel → Delete plan → Void trade.
6. Price rollback: Delete Invoice → De-actualize → Delete Price.
7. PTBF staggered pricing only allowed after Provisional Invoice is generated in Finance > Settlement.
8. Road transport: Only FRANCO or LOCO incoterms allowed.
9. Futures: Cannot void if netted — un-net via Future Netting History first.
10. IDT: Cannot void if partially/fully consumed.
11. LC trades: Proforma Invoice mandatory before shipment. Multiple LCs = separate Proforma per partial qty.
12. Business Admin role cannot coexist with any other role on the same user.
13. Suspense Inventory: Excess discharge = Suspense Gain (SC 42); Shortage = Suspense Loss (SC 41).

### NAVIGATION QUICK REFERENCE
| Task | Path |
|------|------|
| Buy/Sell Trade | Trade > Physical Trade - Beta > Buy/Sell |
| PTBF Pricing | Operations & Accounts > Pricing |
| Washout | Trade > Washout |
| IDT | Trade > Inter ProfitCenter |
| Futures | Trade > Futures |
| Future Netting | Operations & Accounts > Future Netting |
| Operations Dashboard | Operations & Accounts > Operations Dashboard |
| Sea Transport Booking | Operations & Accounts > Operations > Sea Transport Booking |
| Vessel Planning | Operations & Accounts > Trade Planning > Vessel Planning |
| BL Allocation | Vessel Planning > BL Allocation tab |
| Build Inventory | Operations > Inventory Management > Build Inventory |
| Draw Inventory | Operations > Inventory Management > Draw Inventory |
| In-Transit | Operations > Inventory Management > Transit |
| Trade Actualization | Operations & Accounts > Operations > Trade Actualization |
| Settlement/Invoice | Finance > Settlement |
| Invoice Approval | Finance > Invoice > Approved Tab |
| FX Rate | Finance > FX Rate |
| Risk Dashboard | Risk > Risk Dashboard |
| User Master | System Settings > User Master |
| Transaction ID | System Settings > Transaction ID Reference |
| Approval Workflow | System Settings > Approval Workflow Configuration |
`;
