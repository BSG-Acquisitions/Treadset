import { AppLayout } from "@/components/AppLayout";
import { HaulerManifestWizard } from "@/components/hauler/HaulerManifestWizard";
import { useHaulerProfile } from "@/hooks/useIndependentHaulers";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function HaulerManifestCreate() {
  const { user } = useAuth();
  const { data: haulerProfile, isLoading } = useHaulerProfile();
  const isSuperAdmin = user?.email === 'zachdevon@bsgtires.com';

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Super admin can access without hauler profile for testing
  if (!haulerProfile && !isSuperAdmin) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You need to be registered as a hauler to create manifests.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Use hauler profile data or super admin test data
  const haulerId = haulerProfile?.id || 'super-admin-test';
  const haulerName = haulerProfile?.company_name || 'TreadSet Admin (Testing)';

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create Manifest</h1>
          <p className="text-muted-foreground">
            Document your tire delivery with generator and hauler signatures
          </p>
          {isSuperAdmin && !haulerProfile && (
            <p className="text-sm text-warning mt-2">
              ⚠️ Testing mode - You're accessing as super admin without a hauler profile
            </p>
          )}
        </div>
        
        <HaulerManifestWizard
          haulerId={haulerId}
          haulerName={haulerName}
        />
      </div>
    </AppLayout>
  );
}
