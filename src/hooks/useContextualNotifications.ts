// Contextual notification checks are now handled entirely by edge functions
// (check-missing-pickups, check-manifest-reminders, check-manifest-health)
// This hook previously duplicated those checks client-side, causing notification bloat.

export const useContextualNotifications = () => {
  return {
    // All checks now run via edge functions triggered in useEnhancedNotifications
  };
};
