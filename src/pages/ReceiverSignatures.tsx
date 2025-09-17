import { ManifestReceiversView } from "@/components/ManifestReceiversView";
import { TopNav } from "@/components/TopNav";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

export default function ReceiverSignatures() {
  useRealtimeUpdates();
  
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <ManifestReceiversView />
    </div>
  );
}