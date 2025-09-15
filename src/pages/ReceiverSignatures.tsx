import { ManifestReceiversView } from "@/components/ManifestReceiversView";
import { TopNav } from "@/components/TopNav";

export default function ReceiverSignatures() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <ManifestReceiversView />
    </div>
  );
}