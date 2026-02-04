-- Create inventory_products table for storing product catalog
CREATE TABLE public.inventory_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  unit_of_measure TEXT NOT NULL DEFAULT 'tons',
  sku TEXT,
  low_stock_threshold DECIMAL(12,3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_transactions table for tracking all movements
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('inbound', 'outbound', 'adjustment')),
  quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT CHECK (reference_type IN ('production', 'sale', 'adjustment', 'transfer', 'return', 'waste')),
  reference_id UUID,
  customer_name TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_inventory_products_org ON public.inventory_products(organization_id);
CREATE INDEX idx_inventory_products_category ON public.inventory_products(organization_id, category);
CREATE INDEX idx_inventory_products_active ON public.inventory_products(organization_id, is_active);

CREATE INDEX idx_inventory_transactions_org ON public.inventory_transactions(organization_id);
CREATE INDEX idx_inventory_transactions_product ON public.inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions(organization_id, transaction_date);
CREATE INDEX idx_inventory_transactions_type ON public.inventory_transactions(organization_id, transaction_type);

-- Enable RLS
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_products
CREATE POLICY "Users can view inventory products for their organization"
ON public.inventory_products
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin/ops can insert inventory products"
ON public.inventory_products
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

CREATE POLICY "Admin/ops can update inventory products"
ON public.inventory_products
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

CREATE POLICY "Admin can delete inventory products"
ON public.inventory_products
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops_manager')
  )
);

-- RLS policies for inventory_transactions
CREATE POLICY "Users can view inventory transactions for their organization"
ON public.inventory_transactions
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin/ops can insert inventory transactions"
ON public.inventory_transactions
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

CREATE POLICY "Admin/ops can update inventory transactions"
ON public.inventory_transactions
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

CREATE POLICY "Admin can delete inventory transactions"
ON public.inventory_transactions
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops_manager')
  )
);

-- Trigger to update updated_at on inventory_products
CREATE TRIGGER update_inventory_products_updated_at
BEFORE UPDATE ON public.inventory_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for current stock levels (calculated from transactions)
CREATE OR REPLACE VIEW public.inventory_stock_levels AS
SELECT 
  p.id as product_id,
  p.organization_id,
  p.name as product_name,
  p.category,
  p.unit_of_measure,
  p.low_stock_threshold,
  p.is_active,
  COALESCE(
    SUM(
      CASE 
        WHEN t.transaction_type = 'inbound' THEN t.quantity
        WHEN t.transaction_type = 'outbound' THEN -t.quantity
        WHEN t.transaction_type = 'adjustment' THEN t.quantity
        ELSE 0
      END
    ), 0
  ) as current_quantity,
  MAX(t.transaction_date) as last_transaction_date,
  COUNT(t.id) as total_transactions
FROM public.inventory_products p
LEFT JOIN public.inventory_transactions t ON p.id = t.product_id
GROUP BY p.id, p.organization_id, p.name, p.category, p.unit_of_measure, p.low_stock_threshold, p.is_active;