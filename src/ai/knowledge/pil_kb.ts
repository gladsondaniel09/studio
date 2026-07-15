// PIL (Pacific InterLink) Knowledge Base — injected when kbSelection === 'pil'

export const PIL_KB = `
## PIL (PACIFIC INTERLINK) KNOWLEDGE BASE

### PIL BUSINESS SCENARIOS (43 Scenarios)
SC 1: FOB Indonesian Fixed Price Purchase Trade Booking (USD)
SC 2: DEL Malaysian Fixed Price Purchase Trade Booking (USD/MYR)
SC 3: CFR/CIF Fixed Price Sales Deal Booking
SC 4: CFR PTBF with Provisional Price Sales Deal Booking
SC 5: Ex-Tank Turkey Sales Deal Booking
SC 6: CIF PTBF with Provisional Price Sales Deal Booking
SC 7: EX-tank transshipment sales deal booking
SC 8: Addition of Secondary Cost from Trade manually for sales trades
SC 9: Sales Trade Long Form Document Generation
SC 10: Bridge Contract Creation for 3rd Party Sales trades (TGT, AG)
SC 11: Indonesia/Malaysian Cargo loaded into vessel and actualised (with Single BL or BL Split)
SC 12: Direct Sales Allocation: Indonesian/Malaysian BL loaded into vessel, actualized, invoiced and direct allocation to sales
SC 13: Offloading Indonesia LBL: Discharge Indonesian LBL into Malaysia and load the LBL onto the vessel with new BL details for sales allocation
SC 14: Local Malaysia Purchase delivered to tank, loaded onto a vessel with new BL number, and allocated to sales
SC 15: Tank Blending: Different Commodity Indonesian/Malaysian LBL, blended in the PG tank and new BL number captured for blended commodity
SC 16: Stock Blending: Multiple Indonesian/Malaysian LBLs offloaded and discharged into the PG tank, blended into inventory, and loaded onto the vessel with new BL
SC 17: Offload Cargo: Discharge long cargo from vessel v1 to vessel v2, with new BL number for sales allocation
SC 18: Purchase BL used for Blending and Offloading Scenarios (partial BL for stock blending, remainder to vessel or inventory)
SC 19: Ex-Tank Sales — Indonesian Cargo (LBL) Discharged to Turkey Tank
SC 20: Ex-Tank Sales — Indonesian Cargo discharged to Turkey Tank with excess/shortage inventory
SC 21: Ex-Tank Sales with New LBL (Malaysian BL): Indonesian cargo discharged in PG Tank, moved to Intransit, transferred to Turkey Tank
SC 22: Ex-Tank Sales with New LBL: Indonesian cargo discharged in PG Tank, moved to Intransit, transferred to Turkey Tank with excess/shortage
SC 23: Ukraine Scenario: Indonesian Cargo (LBL) discharged to Ukraine Tank with same/excess/shortage quantity, and sales allocation
SC 24: Ukraine Scenario (New Vessel): Indonesian cargo offloaded in PG inventory, loaded into vessel v1 with intransit new BL, discharged to Ukraine Tank
SC 25: Ukraine Scenario: Indonesia Cargo in one vessel offloaded into inventory, partial qty loaded into new vessel with new BL, transferred to PG inventory and discharged to Ukraine Tank
SC 26: Russia Transshipment to New Vessel: Indonesian Cargo in vessel 1 discharged to Ukraine Tank, sales allocation to Vessel 2
SC 27: Russia Transshipment (New LBL): Indonesian cargo in Vessel v1 discharged in Malaysia, change BL to transit BL, loaded into vessel v2, discharged to Russia tank
SC 28: Russia Transshipment: Indonesian cargo in Vessel v1 discharged in Malaysia, change BL to transit BL, discharged to Russia tank, allocate sales to vessel 3
SC 29: Vessel Allocation & Offloading to Turkey & Ukraine Inventory: Multiple purchases, multiple BL splits — partial BLs to direct sales, partial to EVYAP terminal, partial to Russia
SC 30: Simple Washout: Fixed Price trade, Washout Price Difference, CN/DN Invoice Verification
SC 31: Simple Washout (Zero Price Difference): Fixed Price trade, Washout Full Quantity — no CN/DN generated
SC 32: Circle Planning: Fixed Price trade, Circle, Trade Planning, CN/DN Invoice Verification
SC 33: DBP (End of the String): Fixed Price trade, End Buyer, Trade Planning, Actualization, Commercial Invoice
SC 34: DBP (End of the String) Delivered to Tank: Local purchase discharged into PG tank, DBP planning, actualization, commercial invoice
SC 35: PTBF with Provisional Price: Direct CFR sales, actualized, staggered pricing, CN/DN with average price
SC 36: PTBF with Provisional Price (Zero Price Difference): No CN/DN generation
SC 37: PTBF with Provisional Price + Quantity Claims: CIF sales, staggered pricing, CN/DN, outturn quantity claim
SC 38: Commercial Invoice + Quantity Claims: Direct CIF sales with secondary cost, outturn quantity claim
SC 39: Fixed Price, Group Invoicing: Multiple CIF sales trades, group invoice
SC 40: Direct CFR Sales with MYR sales and invoice in USD
SC 41: Suspense Inventory (Loss): Discharge quantity less than LBL quantity, remainder to suspense
SC 42: Suspense Inventory (Gain): Discharge quantity more than LBL quantity, excess from suspense to Physical Inventory
SC 43: Quick Washout: Cargo split into multiple shipments, one shipment cancelled

### PIL KEY BUSINESS RULES
1. Simple Blending starts from Build Inventory — NOT from Transfer Stocks.
2. Partial Build/Draw: Purchase/sales obligation MUST be split before planning when allocated to both inventory and a direct trade.
3. GRN Actualization: Must be performed after Build Inventory. Until GRN, buy obligation remains Open Position.
4. Split Remaining Quantity: Use Operations Dashboard before re-planning to a different transport or plan.
5. Sales Obligation Split: Always split sales obligations into required GBL quantities before vessel planning or inventory draw.
6. PTBF Invoicing: Provisional price used initially. CN/DN generated after final price fixation via Pricing screen.
7. Suspense Inventory: Auto-created when discharge qty ≠ BL qty. Excess → Suspense Gain (SC 42). Shortage → Suspense Loss (SC 41).
8. Washout: Applicable for back-to-back trades with same counterparty. Zero-price-difference washout generates no CN/DN.
9. Trade Voiding Order: De-allocate vessel → Delete plan → Then void the trade.
10. In-Transit BL Update: Use Operations > Inventory Management > Transit to assign new BL before reloading onto new vessel.
11. Group Invoicing: Multiple actualized sales trades on same vessel can be grouped into one invoice.
12. Realized PnL Formula: Sell Invoice Amount – (GI qty × Inventory Avg Price). In Trade Settlement Currency.
`;
