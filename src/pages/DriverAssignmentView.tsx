import { useParams, Navigate } from "react-router-dom";
import { useDriverAssignments } from "@/hooks/useDriverAssignments";
import { DriverAssignmentInterface } from "@/components/driver/DriverAssignmentInterface";
import { useAuth } from "@/contexts/AuthContext";

export default function DriverAssignmentView() {
  const { assignmentId } = useParams();
  const { user } = useAuth();
  const { data: assignments = [], isLoading } = useDriverAssignments();

  if (!assignmentId) {
    return <Navigate to="/driver/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-8">
          <p className="text-muted-foreground">Loading assignment...</p>
        </main>
      </div>
    );
  }

  const assignment = assignments.find(a => a.id === assignmentId);

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-8">
          <p className="text-muted-foreground">Assignment not found or not assigned to you.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <DriverAssignmentInterface assignment={assignment} />
      </main>
    </div>
  );
}