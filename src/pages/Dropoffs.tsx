import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Users, 
  Package, 
  TrendingUp, 
  Calendar,
  Home,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDropoffs, useTodaysDropoffs } from "@/hooks/useDropoffs";
import { useDropoffCustomers } from "@/hooks/useDropoffCustomers";
import { ProcessDropoffDialog } from "@/components/dropoffs/ProcessDropoffDialog";
import { DropoffCustomersList } from "@/components/dropoffs/DropoffCustomersList";
import { CreateDropoffCustomerDialog } from "@/components/dropoffs/CreateDropoffCustomerDialog";
import { DropoffsList } from "@/components/dropoffs/DropoffsList";
import { format } from "date-fns";

const Dropoffs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);

  const { data: dropoffs = [], isLoading: dropoffsLoading } = useDropoffs();
  const { data: todaysDropoffs = [] } = useTodaysDropoffs();
  const { data: customers = [], isLoading: customersLoading } = useDropoffCustomers();

  const totalTiresDroppedToday = todaysDropoffs.reduce((sum, dropoff) => 
    sum + (dropoff.pte_count || 0) + (dropoff.otr_count || 0) + (dropoff.tractor_count || 0), 0
  );

  const totalRevenueToday = todaysDropoffs.reduce((sum, dropoff) => 
    sum + Number(dropoff.computed_revenue || 0), 0
  );

  const activeCustomers = customers.filter(c => c.customer_type === 'regular').length;
  const oneTimeCustomers = customers.filter(c => c.customer_type === 'one_time').length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="p-0 h-auto font-normal hover:text-foreground">
          <Link to="/" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground">Drop-offs</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Drop-off Management</h1>
          <p className="text-muted-foreground">
            Process tire drop-offs and manage drop-off customers
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button onClick={() => setShowCreateCustomerDialog(true)} variant="outline" className="w-full sm:w-auto">
            <Users className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
          <Button onClick={() => setShowProcessDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Process Drop-off
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Drop-offs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysDropoffs.length}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tires Dropped Today</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTiresDroppedToday}</div>
            <p className="text-xs text-muted-foreground">
              Total tire units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenueToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From drop-offs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {oneTimeCustomers} one-time customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="dropoffs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dropoffs">Recent Drop-offs</TabsTrigger>
          <TabsTrigger value="customers">Drop-off Customers</TabsTrigger>
          <TabsTrigger value="today">Today's Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="dropoffs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Drop-offs</CardTitle>
              <CardDescription>
                History of all processed tire drop-offs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drop-offs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <DropoffsList 
                dropoffs={dropoffs} 
                loading={dropoffsLoading}
                searchTerm={searchTerm}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drop-off Customers</CardTitle>
              <CardDescription>
                Manage customers who bring tires for drop-off
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              <DropoffCustomersList 
                customers={customers}
                loading={customersLoading}
                searchTerm={searchTerm}
                onSelectCustomer={setSelectedCustomer}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Drop-off Activity</CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, MMMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todaysDropoffs.length > 0 ? (
                <DropoffsList 
                  dropoffs={todaysDropoffs} 
                  loading={false}
                  searchTerm=""
                />
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No drop-offs processed today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ProcessDropoffDialog 
        open={showProcessDialog}
        onOpenChange={setShowProcessDialog}
        selectedCustomerId={selectedCustomer}
      />
      
      <CreateDropoffCustomerDialog 
        open={showCreateCustomerDialog}
        onOpenChange={setShowCreateCustomerDialog}
      />
    </div>
  );
};

export default Dropoffs;