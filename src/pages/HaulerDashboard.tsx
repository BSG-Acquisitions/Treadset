import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Users, FileText, DollarSign } from "lucide-react";
import { useHaulerProfile } from "@/hooks/useIndependentHaulers";
import { Button } from "@/components/ui/button";

export default function HaulerDashboard() {
  const { data: profile, isLoading } = useHaulerProfile();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading your profile...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hauler Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.company_name}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Facilities
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile?.relationships?.filter((r: any) => r.is_active).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Facilities you work with
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Active customer accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manifests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">Across all facilities</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Your hauler information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Company Name
                </div>
                <div className="text-base">{profile?.company_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Email
                </div>
                <div className="text-base">{profile?.email}</div>
              </div>
              {profile?.phone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Phone
                  </div>
                  <div className="text-base">{profile.phone}</div>
                </div>
              )}
              {profile?.dot_number && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    DOT Number
                  </div>
                  <div className="text-base">{profile.dot_number}</div>
                </div>
              )}
              {profile?.license_number && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    License Number
                  </div>
                  <div className="text-base">{profile.license_number}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Status
                </div>
                <Badge variant={profile?.is_approved ? "default" : "secondary"}>
                  {profile?.is_approved ? "Approved" : "Pending Approval"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facility Relationships</CardTitle>
              <CardDescription>Facilities you're registered with</CardDescription>
            </CardHeader>
            <CardContent>
              {!profile?.relationships || profile.relationships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No facility relationships yet
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.relationships.map((rel: any) => (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {rel.organization?.name || "Unknown Facility"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Member since {new Date(rel.invited_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={rel.is_active ? "default" : "secondary"}>
                        {rel.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for haulers</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button>Create Manifest</Button>
            <Button variant="outline">Manage Customers</Button>
            <Button variant="outline">View Transactions</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
