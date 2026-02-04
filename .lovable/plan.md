

# Clear Test Inventory Data

## What Will Be Removed

### All Transactions (8 records)
All inventory transactions you created for testing will be deleted:
- 1" Shred: 150 + 50 + 23 - 25 = 198 tons (4 transactions)
- Black Rubber Mulch: 15 cubic yards (1 transaction)
- Red Rubber Mulch: 10 cubic yards (1 transaction)
- Brown Rubber Mulch: 10 cubic yards (2 transactions)

### All Products (4 records)
All test products will be removed from the catalog:
- 1" Shred
- Black Rubber Mulch
- Red Rubber Mulch
- Brown Rubber Mulch

## After Cleanup

Once cleared:
- **Raw Material Projections** will show only the tire intake data (manifests + dropoffs)
- **Stock Levels** tab will be empty until you add real products
- **Transaction History** will be empty until you record real production/sales
- The 930.44 tons raw material figure will update to reflect **only** tire intake minus zero processed products

## Implementation

I'll delete the data in the correct order (transactions first, then products) to respect foreign key constraints.

## Ready for Fresh Start

After this cleanup, you can:
1. Add your real product catalog (your actual shred sizes, mulch colors, TDA grades, etc.)
2. Start recording actual production runs as inbound transactions
3. Record real sales as outbound transactions
4. Get accurate projections based on real data

