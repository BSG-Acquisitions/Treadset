import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Position {
  lat: number;
  lng: number;
}

interface UseGPSTrackingReturn {
  isTracking: boolean;
  startTracking: (assignmentId: string) => void;
  stopTracking: () => void;
  logStopCompleted: () => void;
  currentPosition: Position | null;
  error: string | null;
}

const PING_INTERVAL_MS = 15000; // 15 seconds

export function useGPSTracking(): UseGPSTrackingReturn {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const assignmentIdRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastPingRef = useRef<number>(0);

  const organizationId = user?.currentOrganization?.id;
  const userId = user?.id;

  const insertPing = useCallback(async (
    lat: number,
    lng: number,
    accuracy: number | null,
    eventType: string
  ) => {
    if (!assignmentIdRef.current || !userId || !organizationId) return;

    try {
      await supabase.from('route_location_pings' as any).insert({
        assignment_id: assignmentIdRef.current,
        user_id: userId,
        organization_id: organizationId,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        event_type: eventType,
        recorded_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to insert GPS ping:', err);
    }
  }, [userId, organizationId]);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Wake Lock not supported or denied — ignore
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  const startTracking = useCallback((assignmentId: string) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setError(null);
    assignmentIdRef.current = assignmentId;
    lastPingRef.current = 0;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentPosition({ lat: latitude, lng: longitude });

        const now = Date.now();
        if (now - lastPingRef.current >= PING_INTERVAL_MS) {
          lastPingRef.current = now;
          insertPing(latitude, longitude, accuracy, 'ping');
        }
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 30000,
      }
    );

    watchIdRef.current = watchId;
    setIsTracking(true);
    requestWakeLock();

    // Log start event with current position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        insertPing(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'start');
      },
      () => {} // ignore error for start event
    );
  }, [insertPing, requestWakeLock]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Log end event
    if (currentPosition) {
      insertPing(currentPosition.lat, currentPosition.lng, null, 'end');
    }

    assignmentIdRef.current = null;
    setIsTracking(false);
    releaseWakeLock();
  }, [currentPosition, insertPing, releaseWakeLock]);

  const logStopCompleted = useCallback(() => {
    if (currentPosition) {
      insertPing(currentPosition.lat, currentPosition.lng, null, 'stop_completed');
    }
  }, [currentPosition, insertPing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isTracking,
    startTracking,
    stopTracking,
    logStopCompleted,
    currentPosition,
    error,
  };
}
