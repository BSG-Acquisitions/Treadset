import { createNotification } from '@/hooks/useNotifications';

export const seedSampleNotifications = async (userId: string, organizationId: string) => {
  const sampleNotifications = [
    {
      title: "New route assigned",
      message: "Route #1234 has been assigned to driver John at 123 Main St, Anytown",
      type: "info" as const,
      relatedType: "route",
    },
    {
      title: "Pickup completed",
      message: "Client pickup at ABC Tire Shop - 456 Oak Ave completed successfully",
      type: "success" as const,
      relatedType: "pickup",
    },
    {
      title: "Payment received",
      message: "Payment of $125.50 received from XYZ Corporation for tire pickup service",
      type: "success" as const,
      relatedType: "payment",
    },
    {
      title: "Route optimization complete",
      message: "Today's routes have been optimized - 3 routes covering Downtown, Eastside, and Industrial areas",
      type: "info" as const,
      relatedType: "route",
    },
    {
      title: "New client registration",
      message: "FleetCorp LLC has registered as a new client at 789 Industrial Blvd",
      type: "info" as const,
      relatedType: "client",
    }
  ];

  try {
    for (const notification of sampleNotifications) {
      await createNotification({
        userId,
        organizationId,
        ...notification,
      });
    }
    console.log('Sample notifications created successfully');
  } catch (error) {
    console.error('Error creating sample notifications:', error);
  }
};