import { AppLayout } from "@/components/AppLayout";
import { HaulerManifestWizard } from "@/components/hauler/HaulerManifestWizard";
import { useHaulerProfile } from "@/hooks/useIndependentHaulers";
import { Loader2 } from "lucide-react";

export default function HaulerManifestCreate() {
  const { data: haulerProfile, isLoading } = useHaulerProfile();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!haulerProfile) {
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

  const haulerId = haulerProfile.id;
  const haulerName = haulerProfile.company_name;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create Manifest</h1>
          <p className="text-muted-foreground">
            Document your tire delivery with generator and hauler signatures
          </p>
        </div>
        
        <HaulerManifestWizard
          haulerId={haulerId}
          haulerName={haulerName}
        />
      </div>
    </AppLayout>
  );
}
