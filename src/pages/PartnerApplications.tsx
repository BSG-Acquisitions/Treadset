import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye, Truck, Clock, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HaulerApplication {
  id: string;
  hauler_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  hauler_phone: string | null;
  hauler_mailing_address: string | null;
  hauler_city: string | null;
  hauler_state: string | null;
  hauler_zip: string | null;
  hauler_mi_reg: string | null;
  dot_number: string | null;
  application_status: string | null;
  is_approved: boolean | null;
  created_at: string;
}

export default function PartnerApplications() {
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<HaulerApplication | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: applications, isLoading } = useQuery({
    queryKey: ['partner-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haulers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as HaulerApplication[];
    }
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status, isApproved }: { id: string; status: string; isApproved: boolean }) => {
      const { error } = await supabase
        .from('haulers')
        .update({ 
          application_status: status, 
          is_approved: isApproved,
          is_active: isApproved 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-applications'] });
      queryClient.invalidateQueries({ queryKey: ['haulers'] });
    }
  });

  const handleApprove = async () => {
    if (!selectedApplication) return;
    try {
      await updateApplicationMutation.mutateAsync({
        id: selectedApplication.id,
        status: 'approved',
        isApproved: true
      });
      toast.success(`${selectedApplication.hauler_name} has been approved as a partner`);
      setApproveOpen(false);
      setSelectedApplication(null);
    } catch (error) {
      toast.error('Failed to approve application');
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;
    try {
      await updateApplicationMutation.mutateAsync({
        id: selectedApplication.id,
        status: 'rejected',
        isApproved: false
      });
      toast.success(`Application from ${selectedApplication.hauler_name} has been rejected`);
      setRejectOpen(false);
      setSelectedApplication(null);
    } catch (error) {
      toast.error('Failed to reject application');
    }
  };

  const getStatusBadge = (app: HaulerApplication) => {
    const status = app.application_status || (app.is_approved ? 'approved' : 'pending');
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const filteredApplications = applications?.filter(app => {
    const status = app.application_status || (app.is_approved ? 'approved' : 'pending');
    if (activeTab === 'all') return true;
    return status === activeTab;
  }) || [];

  const pendingCount = applications?.filter(app => 
    !app.application_status || app.application_status === 'pending'
  ).length || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Truck className="h-8 w-8 text-primary" />
              Partner Applications
            </h1>
            <p className="text-muted-foreground">
              Review and manage hauler partnership applications
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {pendingCount} Pending Review
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  {activeTab === 'pending' && 'Applications awaiting your review'}
                  {activeTab === 'approved' && 'Approved partner applications'}
                  {activeTab === 'rejected' && 'Rejected applications'}
                  {activeTab === 'all' && 'All partner applications'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading applications...
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {activeTab !== 'all' ? activeTab : ''} applications found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company / Contact</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>MI Registration</TableHead>
                        <TableHead>DOT Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{app.hauler_name}</div>
                              {app.company_name && app.company_name !== app.hauler_name && (
                                <div className="text-sm text-muted-foreground">{app.company_name}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {app.email && <div className="text-sm">{app.email}</div>}
                              {app.phone && <div className="text-sm text-muted-foreground">{app.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>{app.hauler_mi_reg || 'N/A'}</TableCell>
                          <TableCell>{app.dot_number || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(app)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(app.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setViewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(!app.application_status || app.application_status === 'pending') && (
                                <>
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setApproveOpen(true);
                                    }}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setRejectOpen(true);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Application Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Full details of the partner application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                <p className="font-medium">{selectedApplication.hauler_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <p className="font-medium">{selectedApplication.company_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{selectedApplication.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="font-medium">{selectedApplication.phone || selectedApplication.hauler_phone || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="font-medium">
                  {selectedApplication.hauler_mailing_address || 'N/A'}
                  {selectedApplication.hauler_city && `, ${selectedApplication.hauler_city}`}
                  {selectedApplication.hauler_state && `, ${selectedApplication.hauler_state}`}
                  {selectedApplication.hauler_zip && ` ${selectedApplication.hauler_zip}`}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MI Registration</label>
                <p className="font-medium">{selectedApplication.hauler_mi_reg || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">DOT Number</label>
                <p className="font-medium">{selectedApplication.dot_number || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">{getStatusBadge(selectedApplication)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Applied</label>
                <p className="font-medium">{format(new Date(selectedApplication.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve {selectedApplication?.hauler_name} as a transport partner? 
              They will be added to your active haulers list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve Partner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the application from {selectedApplication?.hauler_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive hover:bg-destructive/90">
              Reject Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
