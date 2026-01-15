import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define all roles and their permissions
const ROLE_DEFINITIONS = [
  {
    role: "admin",
    label: "Administrator",
    description: "Full system access including settings, user management, and all operations",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  {
    role: "ops_manager",
    label: "Operations Manager",
    description: "Full operational access, can manage team members (except admins)",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  {
    role: "dispatcher",
    label: "Dispatcher",
    description: "Manage routes, schedules, clients, drop-offs, and manifests",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    role: "driver",
    label: "Driver",
    description: "Complete pickups, create manifests, view assignments",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    role: "sales",
    label: "Sales",
    description: "Manage clients, bookings, view routes and trailers",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  {
    role: "hauler",
    label: "Hauler",
    description: "Independent hauler portal - manage own customers and manifests",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  {
    role: "client",
    label: "Client",
    description: "Customer portal - view own pickup history and manifests (coming soon)",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  },
  {
    role: "viewer",
    label: "Viewer (Demo)",
    description: "Read-only access for demos and investors - can view all pages but cannot make changes",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  },
];

// Permission matrix - viewer has same view access as ops_manager but read-only
const PERMISSIONS = [
  { page: "Dashboard", admin: true, ops_manager: true, dispatcher: true, driver: true, sales: true, hauler: false, client: false, viewer: true },
  { page: "Clients", admin: true, ops_manager: true, dispatcher: true, driver: false, sales: true, hauler: false, client: false, viewer: true },
  { page: "Routes/Schedules", admin: true, ops_manager: true, dispatcher: true, driver: false, sales: true, hauler: false, client: false, viewer: true },
  { page: "Driver Routes", admin: true, ops_manager: false, dispatcher: false, driver: true, sales: false, hauler: false, client: false, viewer: false },
  { page: "Manifests", admin: true, ops_manager: true, dispatcher: true, driver: true, sales: true, hauler: true, client: false, viewer: true },
  { page: "Drop-offs", admin: true, ops_manager: true, dispatcher: true, driver: false, sales: true, hauler: false, client: false, viewer: true },
  { page: "Receiver Signatures", admin: true, ops_manager: true, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: true },
  { page: "Reports", admin: true, ops_manager: true, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: true },
  { page: "Analytics", admin: true, ops_manager: true, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: true },
  { page: "Intelligence", admin: true, ops_manager: true, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: true },
  { page: "Trailers", admin: true, ops_manager: true, dispatcher: true, driver: false, sales: true, hauler: false, client: false, viewer: true },
  { page: "Employees", admin: true, ops_manager: false, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: true },
  { page: "Settings", admin: true, ops_manager: true, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: true },
  { page: "Integrations", admin: true, ops_manager: false, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: true },
  { page: "Hauler Dashboard", admin: false, ops_manager: false, dispatcher: false, driver: false, sales: false, hauler: true, client: false, viewer: false },
  { page: "Invite Team Members", admin: true, ops_manager: true, dispatcher: false, driver: false, sales: false, hauler: false, client: false, viewer: false },
];

export function RolePermissionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Permissions
        </CardTitle>
        <CardDescription>
          Understanding what each role can access in the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Descriptions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Role Definitions</h4>
          <div className="grid gap-2">
            {ROLE_DEFINITIONS.map((role) => (
              <div key={role.role} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <Badge className={role.color}>{role.label}</Badge>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Access Matrix</h4>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Page</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-center">Ops Mgr</TableHead>
                  <TableHead className="text-center">Dispatch</TableHead>
                  <TableHead className="text-center">Driver</TableHead>
                  <TableHead className="text-center">Sales</TableHead>
                  <TableHead className="text-center">Hauler</TableHead>
                  <TableHead className="text-center">Client</TableHead>
                  <TableHead className="text-center">Viewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSIONS.map((perm) => (
                  <TableRow key={perm.page}>
                    <TableCell className="font-medium">{perm.page}</TableCell>
                    <TableCell className="text-center">
                      {perm.admin ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.ops_manager ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.dispatcher ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.driver ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.sales ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.hauler ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.client ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.viewer ? <Check className="h-4 w-4 text-cyan-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Invite Rules */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Invite Permissions</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Administrators</strong> can invite any role</p>
            <p>• <strong>Operations Managers</strong> can invite Dispatchers, Drivers, and Sales</p>
            <p>• <strong>Clients</strong> and <strong>Haulers</strong> have separate invitation flows (from client/hauler management pages)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
