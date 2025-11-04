import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * @deprecated This page has been merged into EnhancedRoutesToday
 * Redirecting to /routes/enhanced for improved functionality
 */
export default function RoutesToday() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the enhanced version
    navigate('/routes/enhanced', { replace: true });
  }, [navigate]);

  return null;
}
