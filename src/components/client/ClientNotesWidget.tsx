import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Pencil, Check, X } from "lucide-react";
import { useUpdateClient } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface ClientNotesWidgetProps {
  client: Client;
}

export function ClientNotesWidget({ client }: ClientNotesWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(client.notes || "");
  const updateClient = useUpdateClient();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        updates: {
          notes: notes || null,
        },
      });
      toast({
        title: "Notes saved",
        description: "Client notes have been updated.",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setNotes(client.notes || "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-5 w-5 text-primary" />
            Notes & Instructions
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this client... (e.g., special drop-off instructions, access codes, building details)"
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateClient.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateClient.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                {updateClient.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {client.notes ? (
              <p className="text-foreground whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-muted-foreground italic">
                No notes yet. Click Edit to add special instructions, access codes, or other details.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
