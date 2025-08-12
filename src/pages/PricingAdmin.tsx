import React, { useState } from 'react';
import { PricingMatrixTable } from '@/components/pricing/PricingMatrixTable';
import { PricingSimulator } from '@/components/pricing/PricingSimulator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Settings, Calculator, AlertTriangle, Users, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PricingAdmin: React.FC = () => {
  const { user } = useAuth();
  
  // Use the real BSG organization ID
  const organizationId = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73';

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Pricing Engine</h1>
        <p className="text-muted-foreground">
          Manage tire pricing across service modes, categories, and configurations with intelligent suggestions and audit trails.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Price Rules</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surcharge Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Rim, distance, volume
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Overrides</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Custom pricing active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Confirmation</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Commercial 17.5-19.5" rates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="matrix">Price Matrix</TabsTrigger>
          <TabsTrigger value="surcharges">Surcharges</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-6">
          <PricingMatrixTable organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="surcharges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Surcharge Rules</CardTitle>
              <CardDescription>
                Manage additional charges for rim status, distance, fuel, and other factors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Rim surcharges */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Passenger Rim Surcharge - Pickup</h4>
                    <p className="text-sm text-muted-foreground">
                      +$5.00 flat when rim is on for passenger pickup
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>Active</Badge>
                    <Badge variant="outline">Rim</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Commercial Rim Surcharge - Pickup</h4>
                    <p className="text-sm text-muted-foreground">
                      +$8.00 flat when rim is on for commercial pickup
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>Active</Badge>
                    <Badge variant="outline">Rim</Badge>
                  </div>
                </div>
                
                <div className="text-center py-8 text-muted-foreground">
                  Additional surcharge management features coming soon...
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Overrides
                </CardTitle>
                <CardDescription>
                  Custom pricing for specific clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Client override management interface coming soon...
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Overrides
                </CardTitle>
                <CardDescription>
                  Custom pricing for specific pickup locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Location override management interface coming soon...
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-6">
          <PricingSimulator organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Smart Pricing Suggestions</CardTitle>
              <CardDescription>
                Review and approve intelligent pricing recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                  <div>
                    <h4 className="font-medium">Commercial 17.5-19.5" Pickup Pricing</h4>
                    <p className="text-sm text-muted-foreground">
                      Suggested price: $12.00 (needs confirmation)
                    </p>
                    <Badge variant="outline" className="mt-1">Low Confidence</Badge>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">
                      Approve
                    </button>
                    <button className="px-3 py-1 bg-gray-500 text-white rounded text-sm">
                      Reject
                    </button>
                  </div>
                </div>
                
                <div className="text-center py-8 text-muted-foreground">
                  No other suggestions at this time
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PricingAdmin;