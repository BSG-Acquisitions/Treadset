

# Product Inventory Tracking System

## Overview

This plan outlines a flexible, multi-product inventory tracking system that allows tire recycling companies to manage their processed output materials (shred, rubber mulch, TDA, TDF, molded products, etc.). The system will be organization-specific and completely customizable - no hardcoded product types.

---

## Core Concepts

The inventory system will track:
- **Products**: User-defined items (e.g., "3/8 inch Shred", "Rubber Mulch", "TDF Chips")
- **Inventory Transactions**: All inbound (production) and outbound (sales/shipments) movements
- **Current Stock Levels**: Calculated from transaction history
- **Units of Measure**: Weight (tons, lbs) or volume (cubic yards) per product

```text
┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCT INVENTORY FLOW                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐        ┌─────────────┐       ┌─────────────┐  │
│   │  PRODUCTS   │        │ TRANSACTIONS│       │ STOCK LEVELS│  │
│   │  (config)   │───────▶│  (history)  │──────▶│ (calculated)│  │
│   └─────────────┘        └─────────────┘       └─────────────┘  │
│         │                      │                     │          │
│    User adds             Inbound/Outbound       Real-time       │
│    custom products       movements              inventory       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table 1: `inventory_products`
Stores the product catalog for each organization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `name` | TEXT | Product name (e.g., "3/8 Rubber Shred") |
| `description` | TEXT | Optional description |
| `category` | TEXT | Category (shred, mulch, TDA, TDF, molded, other) |
| `unit_of_measure` | TEXT | Primary unit (tons, lbs, cubic_yards, units) |
| `sku` | TEXT | Optional SKU/product code |
| `is_active` | BOOLEAN | Soft delete flag |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Table 2: `inventory_transactions`
Tracks all inventory movements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `product_id` | UUID | FK to inventory_products |
| `transaction_type` | TEXT | 'inbound' or 'outbound' |
| `quantity` | DECIMAL | Amount (positive for in, positive for out) |
| `unit_of_measure` | TEXT | Unit for this transaction |
| `transaction_date` | DATE | When the transaction occurred |
| `reference_type` | TEXT | Optional: 'production', 'sale', 'adjustment', 'transfer' |
| `reference_id` | UUID | Optional: link to related record |
| `customer_name` | TEXT | For sales - customer name |
| `notes` | TEXT | Optional notes |
| `recorded_by` | UUID | User who recorded this |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Table 3: `inventory_stock_levels` (Materialized View or Calculated)
Current stock per product - can be a view or updated via trigger.

| Column | Type | Description |
|--------|------|-------------|
| `product_id` | UUID | FK to inventory_products |
| `organization_id` | UUID | FK to organizations |
| `current_quantity` | DECIMAL | Total inbound - Total outbound |
| `last_transaction_date` | DATE | Most recent transaction |
| `last_calculated_at` | TIMESTAMPTZ | When this was calculated |

---

## RLS Policies

All tables will follow the existing organization-based security pattern:
- SELECT: User must belong to organization via `user_organization_roles`
- INSERT/UPDATE/DELETE: User must have admin, ops_manager, or dispatcher role

---

## User Interface

### New Navigation Item
Add "Inventory" section to sidebar (under Financial or as new section):

| Path | Label | Icon | Roles |
|------|-------|------|-------|
| `/inventory` | Inventory | `Package` | admin, ops_manager, dispatcher |
| `/inventory/products` | Products | `Boxes` | admin, ops_manager |

### Page 1: Inventory Dashboard (`/inventory`)

**Header Section:**
- Total Products count
- Total Stock Value (if pricing added later)
- Recent Activity summary

**Main Content:**
- Stock level cards/table showing each product with:
  - Product name & category
  - Current quantity with unit
  - Low stock indicator (optional threshold)
  - Quick actions (Add Inbound, Add Outbound)

**Filters:**
- Search by product name
- Filter by category
- Filter by stock status (all, low stock, out of stock)

### Page 2: Products Management (`/inventory/products`)

**Features:**
- List all products with edit/delete
- Add Product dialog:
  - Name (required)
  - Category (dropdown: shred, mulch, TDA, TDF, molded, other)
  - Unit of Measure (dropdown: tons, lbs, cubic_yards, units)
  - Description (optional)
  - SKU (optional)

### Page 3: Transaction History (`/inventory/transactions` or tab)

**Features:**
- Chronological list of all transactions
- Filters: date range, product, transaction type
- Export to CSV capability

### Dialogs:
- **Add Inbound Transaction**: Product, Quantity, Date, Notes
- **Add Outbound Transaction**: Product, Quantity, Date, Customer Name, Notes
- **Adjust Inventory**: For corrections (+ or -)

---

## Files to Create

### Database Migration
```
supabase/migrations/[timestamp]_inventory_products_system.sql
```

### Hooks
```
src/hooks/useInventoryProducts.ts     - CRUD for products
src/hooks/useInventoryTransactions.ts - CRUD for transactions  
src/hooks/useInventoryStock.ts        - Current stock levels
```

### Pages
```
src/pages/Inventory.tsx               - Main dashboard
src/pages/InventoryProducts.tsx       - Product management
```

### Components
```
src/components/inventory/
  ├── ProductCard.tsx                 - Display product with stock
  ├── ProductDialog.tsx               - Add/Edit product
  ├── TransactionDialog.tsx           - Record inbound/outbound
  ├── TransactionsList.tsx            - Transaction history
  ├── StockLevelIndicator.tsx         - Visual stock indicator
  └── InventoryFilters.tsx            - Filter controls
```

### Navigation Updates
```
src/components/AppSidebar.tsx         - Add inventory section
src/components/TopNav.tsx             - Add inventory nav
src/App.tsx                           - Add routes
```

### Feature Flag (Optional)
```
src/lib/featureFlags.ts               - Add INVENTORY flag
```

---

## Implementation Phases

### Phase 1: Foundation
1. Create database tables with RLS policies
2. Create basic hooks for products CRUD
3. Create Products management page
4. Add navigation

### Phase 2: Transactions
1. Create transaction hooks
2. Create transaction dialogs (inbound/outbound)
3. Create transaction history view
4. Calculate stock levels

### Phase 3: Dashboard
1. Build inventory dashboard with stock overview
2. Add filters and search
3. Add quick action buttons
4. Low stock indicators

### Phase 4: Enhancements (Future)
- Integration with existing dropoff system
- Pricing per product
- Inventory valuation reports
- Reorder alerts
- Batch/lot tracking
- Customer sales history

---

## Technical Details

### Hook Pattern (following existing conventions)
```typescript
// Example: useInventoryProducts.ts
export const useInventoryProducts = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['inventory-products', orgId],
    queryFn: async () => {
      // Fetch products for org
    },
    enabled: !!orgId,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Insert product
  });
};
```

### Stock Calculation
Stock levels will be calculated by summing transactions:
```sql
SELECT 
  product_id,
  SUM(CASE WHEN transaction_type = 'inbound' THEN quantity ELSE -quantity END) as current_quantity
FROM inventory_transactions
WHERE organization_id = $1
GROUP BY product_id
```

---

## Example Use Cases

| Company Type | Products They'd Track |
|--------------|----------------------|
| **BSG Tires** | 3/8" Shred, 1" Chip, Rubber Mulch |
| **TDF Producer** | TDF Chips, TDF Powder |
| **Recycler** | Wire, Rubber Crumb, Textile |
| **Molding Company** | Rubber Mats, Pavers, Tiles |

---

## Summary

This system provides:
- Flexible product definitions (no hardcoding)
- Complete transaction history
- Real-time stock visibility
- Multi-unit support (weight, volume, count)
- Organization isolation
- Familiar UI patterns (matches existing trailer/dropoff systems)

