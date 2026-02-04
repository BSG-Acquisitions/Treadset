

# Add Inventory Sales Reports & Export

## Overview

I'll create a comprehensive Inventory Reports system so you can track sales, view trends, and export data. This will let you answer questions like "How much black rubber mulch did we sell this month?" and export the data to a CSV.

---

## What You'll Get

### 1. New "Inventory Reports" Page

A dedicated reports page at `/inventory/reports` with:

| Section | Description |
|---------|-------------|
| **Summary Cards** | Total sales volume, # of transactions, top products sold |
| **Sales by Product** | Breakdown of outbound quantities per product (e.g., "Black Rubber Mulch: 45 yd³") |
| **Monthly Trend Chart** | Visual chart showing sales volume over time |
| **Sales Table** | Filterable list of all outbound transactions with customer names, dates, quantities |
| **CSV Export** | Button to download all sales data for the selected date range |

### 2. Date Range Filters

- Quick filters: This Week, This Month, This Quarter, Year to Date
- Custom date range picker
- Filter by specific product

### 3. CSV Export

One-click export of filtered inventory transaction data including:
- Date, Product, Quantity, Unit, Customer Name, Notes
- Useful for accounting, end-of-month reports, or sharing with partners

---

## Navigation

- Add a **"View Reports"** button on the main Inventory page
- Add breadcrumb navigation on the reports page (← Back to Inventory)
- Keep consistent styling with existing Reports page

---

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/pages/InventoryReports.tsx` | Main reports page with tabs, charts, and export |
| `src/hooks/useInventoryReports.ts` | Hook to aggregate transaction data for reports |
| `supabase/functions/inventory-csv-export/index.ts` | Edge function to generate CSV exports |

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add route for `/inventory/reports` |
| `src/pages/Inventory.tsx` | Add "View Reports" button linking to reports page |
| `src/hooks/useCSVExport.ts` | Add `inventory-transactions` export type |

### Database Query for Reports

The reports will aggregate from `inventory_transactions` table:
- Filter by `transaction_type = 'outbound'` for sales reports
- Group by product for product breakdown
- Group by month for trend charts

### Report Data Structure

```typescript
interface InventorySalesReport {
  summary: {
    totalOutbound: number;        // Total quantity sold
    transactionCount: number;     // Number of sales
    uniqueProducts: number;       // Different products sold
    uniqueCustomers: number;      // Different customers
  };
  byProduct: {
    productId: string;
    productName: string;
    totalQuantity: number;
    unitOfMeasure: string;
    transactionCount: number;
  }[];
  monthlyTrend: {
    month: string;
    totalQuantity: number;
    transactionCount: number;
  }[];
  transactions: InventoryTransaction[];
}
```

---

## How Sales Recording Works

For reference, here's the current flow for recording a sale:

1. Go to **Inventory** page
2. Find your product (e.g., Black Rubber Mulch) 
3. Click **"Out"** button on the product card
4. Fill in the dialog:
   - Quantity sold (e.g., 5 yards)
   - Date of sale
   - Customer Name (optional but recommended for reports)
   - Reference Type: **Sale**
   - Notes (optional)
5. Click **"Record Outbound"**

The transaction is saved and stock levels update automatically. The new reports page will aggregate all these "outbound" transactions.

---

## User Experience Flow

```text
Inventory Page
    │
    ├─► Record Outbound (sale) ──► Transaction saved
    │
    └─► View Reports button
            │
            ▼
    Inventory Reports Page
        ├─► Summary cards (totals)
        ├─► Sales by product (pie/bar chart)
        ├─► Monthly trend (line chart)  
        ├─► Transaction table (filterable)
        └─► Export CSV button
```

---

## Result

After implementation:
- Navigate to **Inventory → View Reports** to see sales summaries
- Filter by date range (e.g., "February 2026")
- See which products are selling most
- Export filtered data to CSV for accounting or analysis
- Track trends over time with visual charts

