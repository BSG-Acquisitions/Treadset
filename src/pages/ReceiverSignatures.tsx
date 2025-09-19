import { ManifestReceiversView } from "@/components/ManifestReceiversView";

import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

export default function ReceiverSignatures() {
  useRealtimeUpdates();
  
  return (
    <div className="min-h-screen bg-background">
      
      <ManifestReceiversView />
    </div>
  );
}