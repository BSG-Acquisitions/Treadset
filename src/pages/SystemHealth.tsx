import { useEffect } from 'react';
import { SystemHealthDashboard } from '@/components/performance/SystemHealthDashboard';

export default function SystemHealth() {
  useEffect(() => {
    document.title = 'System Health – TreadSet';
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <SystemHealthDashboard />
    </div>
  );
}
