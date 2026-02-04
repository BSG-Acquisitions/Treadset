import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandHeader } from '@/components/BrandHeader';
import { OutboundManifestWizard } from '@/components/driver/OutboundManifestWizard';

export default function DriverOutboundCreate() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "New Outbound Manifest – TreadSet";
  }, []);

  const handleComplete = (manifestId: string) => {
    navigate('/driver/outbound');
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-6 space-y-6">
        <BrandHeader 
          title="New Outbound Manifest"
          subtitle="Create a manifest for outbound material delivery"
        />

        <OutboundManifestWizard 
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}
