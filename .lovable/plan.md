

# Add Back Navigation to Product Catalog Page

## Overview

Add a breadcrumb-style back navigation to the Product Catalog page so you can easily return to the main Inventory page without clicking the top nav button again.

## Design Approach

I'll add a clean back navigation row above the page title that includes:
- A clickable arrow/link that says "Inventory" to go back to `/inventory`
- Uses the existing breadcrumb components for consistent styling
- Shows the navigation hierarchy: **Inventory** > **Product Catalog**

This matches modern UX patterns and provides a smooth, intuitive navigation experience.

---

## Technical Changes

### File: `src/pages/InventoryProducts.tsx`

| Lines | Change |
|-------|--------|
| 2 | Add `ArrowLeft` to lucide-react imports |
| 3 | Add `Link` import from `react-router-dom` |
| 3 | Add breadcrumb component imports |
| 70-74 | Add breadcrumb navigation above the PageHeader |

### Updated Code Structure

```text
+----------------------------------------------------------+
|  ← Inventory  /  Product Catalog                          |  <- NEW breadcrumb row
+----------------------------------------------------------+
|  Product Catalog                                          |  <- existing PageHeader
|  Define and manage the products you track in inventory.   |
+----------------------------------------------------------+
|  [Show inactive toggle]               [Add Product btn]   |
+----------------------------------------------------------+
```

### New Imports (line 2-3)

```typescript
import { Plus, Pencil, Trash2, Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
```

### New Breadcrumb Section (before PageHeader, around line 70)

```typescript
<div className="container mx-auto py-6 space-y-6">
  {/* Breadcrumb Navigation */}
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink asChild>
          <Link to="/inventory" className="flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Inventory
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>Product Catalog</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>

  <PageHeader
    title="Product Catalog"
    description="Define and manage the products you track in inventory."
  />
  ...
```

## Result

- Clear visual hierarchy showing you're in **Inventory > Product Catalog**
- Clickable "Inventory" link with a left arrow takes you back to `/inventory`
- Matches the styling of other navigation patterns in the app
- Works on both desktop and mobile

