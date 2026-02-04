import { useState } from 'react';
import { Package, Plus, ArrowDownToLine, ArrowUpFromLine, RefreshCw, History, Boxes, BarChart3, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInventoryStock, useInventoryStats } from '@/hooks/useInventoryStock';
import { PRODUCT_CATEGORIES } from '@/hooks/useInventoryProducts';
import { TransactionDialog } from '@/components/inventory/TransactionDialog';
import { TransactionsList } from '@/components/inventory/TransactionsList';
import { StockLevelIndicator } from '@/components/inventory/StockLevelIndicator';
import { RawMaterialCard } from '@/components/inventory/RawMaterialCard';
import { ProjectionsTab } from '@/components/inventory/ProjectionsTab';

export default function Inventory() {
  const { data: stockLevels, isLoading } = useInventoryStock();
  const { stats } = useInventoryStats();
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'inbound' | 'outbound' | 'adjustment'>('inbound');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();

  const openTransactionDialog = (type: 'inbound' | 'outbound' | 'adjustment', productId?: string) => {
    setTransactionType(type);
    setSelectedProductId(productId);
    setTransactionDialogOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    return PRODUCT_CATEGORIES.find(c => c.value === category)?.label ?? category;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Inventory"
        description="Track your processed materials, stock levels, and inventory movements."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Stock
            </CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStockProducts}</div>
          </CardContent>
        </Card>
        <RawMaterialCard />
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              className="gap-1"
              onClick={() => openTransactionDialog('inbound')}
            >
              <ArrowDownToLine className="h-3 w-3" />
              Inbound
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="gap-1"
              onClick={() => openTransactionDialog('outbound')}
            >
              <ArrowUpFromLine className="h-3 w-3" />
              Outbound
            </Button>
            <Button 
              asChild
              size="sm" 
              variant="ghost"
              className="gap-1"
            >
              <Link to="/inventory/reports">
                <BarChart3 className="h-3 w-3" />
                Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock Levels
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <History className="h-4 w-4" />
            Transaction History
          </TabsTrigger>
          <TabsTrigger value="projections" className="gap-2">
            <Scale className="h-4 w-4" />
            Raw Material Projections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Current inventory levels for all active products.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/inventory/products" className="gap-2">
                <Plus className="h-4 w-4" />
                Manage Products
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[140px]" />
              ))}
            </div>
          ) : !stockLevels?.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding products to your inventory catalog.
                </p>
                <Button asChild>
                  <Link to="/inventory/products">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Product
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stockLevels.map((stock) => (
                <Card key={stock.product_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{stock.product_name}</CardTitle>
                        <CardDescription>
                          <Badge variant="secondary" className="mt-1">
                            {getCategoryLabel(stock.category)}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Stock</p>
                      <StockLevelIndicator
                        currentQuantity={stock.current_quantity}
                        lowStockThreshold={stock.low_stock_threshold}
                        unitOfMeasure={stock.unit_of_measure}
                        size="lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 gap-1"
                        onClick={() => openTransactionDialog('inbound', stock.product_id)}
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                        In
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 gap-1"
                        onClick={() => openTransactionDialog('outbound', stock.product_id)}
                      >
                        <ArrowUpFromLine className="h-3 w-3" />
                        Out
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="gap-1"
                        onClick={() => openTransactionDialog('adjustment', stock.product_id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Recent inventory movements and adjustments.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="gap-1"
                onClick={() => openTransactionDialog('inbound')}
              >
                <ArrowDownToLine className="h-3 w-3" />
                Record Inbound
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1"
                onClick={() => openTransactionDialog('outbound')}
              >
                <ArrowUpFromLine className="h-3 w-3" />
                Record Outbound
              </Button>
            </div>
          </div>
          <TransactionsList limit={100} />
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          <ProjectionsTab />
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <TransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        type={transactionType}
        preselectedProductId={selectedProductId}
      />
    </div>
  );
}
