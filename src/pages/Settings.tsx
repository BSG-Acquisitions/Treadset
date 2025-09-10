import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Bell, Shield, Palette, Database, Key, Loader2, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FadeIn } from "@/components/motion/FadeIn";
import { SlideUp } from "@/components/motion/SlideUp";
import { useUserPreferences, useUpdateUserPreferences, useUpdateUserProfile } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch user preferences
  const { data: preferences, isLoading: preferencesLoading, error: preferencesError } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const updateProfile = useUpdateUserProfile();

  // Local state for form data
  const [profileData, setProfileData] = useState({
    email: user?.email || "",
    phone: user?.phone || "",
  });

const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [uploadingTemplate, setUploadingTemplate] = useState(false);
const [templatePath, setTemplatePath] = useState<string | null>(null);

useEffect(() => {
  document.title = "Settings – BSG Tire Recycling";
}, []);

  useEffect(() => {
    // Update local state when user data changes
    setProfileData({
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user]);

  const handlePreferenceChange = async (key: keyof typeof preferences, value: boolean) => {
    if (!preferences) return;
    
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch (error) {
      console.error("Failed to update preference:", error);
    }
  };

  const handleProfileSave = async () => {
    try {
      await updateProfile.mutateAsync(profileData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

const handleTemplateUpload = async (e: any) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    setUploadingTemplate(true);
    const path = 'templates/STATE_Manifest_v1.pdf';
    const { error } = await supabase.storage
      .from('manifests')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (error) throw error;
    setTemplatePath(`manifests/${path}`);
    toast({
      title: 'Template updated',
      description: 'Uploaded to manifests/templates/STATE_Manifest_v1.pdf. Overlay will use it automatically.',
    });
  } catch (err: any) {
    console.error('Template upload failed:', err);
    toast({
      title: 'Upload failed',
      description: err?.message || 'Could not upload template. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setUploadingTemplate(false);
    e.target.value = '';
  }
};

if (preferencesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="container mx-auto px-6 pb-8 pt-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <p className="text-muted-foreground">Loading your settings...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (preferencesError) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="container mx-auto px-6 pb-8 pt-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4 text-center">
              <X className="h-8 w-8 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold">Failed to load settings</h3>
                <p className="text-muted-foreground">Please refresh the page to try again.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <main className="container mx-auto px-6 pb-8 pt-8">
        <FadeIn>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account preferences and application settings
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings Navigation */}
          <SlideUp delay={0.1}>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Settings Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Palette className="h-4 w-4 mr-2" />
                  Appearance
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Data & Privacy
                </Button>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Settings Content */}
          <SlideUp delay={0.2} className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={user?.firstName || ""} 
                      placeholder="Enter first name"
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">Contact support to change your name</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={user?.lastName || ""} 
                      placeholder="Enter last name"
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileData.email} 
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={profileData.phone} 
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Current Role</Badge>
                  <span className="text-sm text-muted-foreground">
                    {user?.roles?.join(", ") || "No roles assigned"}
                  </span>
                </div>
                
                {hasUnsavedChanges && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      onClick={handleProfileSave} 
                      disabled={updateProfile.isPending}
                      size="sm"
                    >
                      {updateProfile.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setProfileData({
                          email: user?.email || "",
                          phone: user?.phone || "",
                        });
                        setHasUnsavedChanges(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Control when and how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.email_notifications || false}
                    onCheckedChange={(checked) => handlePreferenceChange("email_notifications", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Route Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about route changes and assignments
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.route_updates || false}
                    onCheckedChange={(checked) => handlePreferenceChange("route_updates", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Client Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts about client capacity and pickups
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.client_alerts || false}
                    onCheckedChange={(checked) => handlePreferenceChange("client_alerts", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about scheduled maintenance
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.system_maintenance || false}
                    onCheckedChange={(checked) => handlePreferenceChange("system_maintenance", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance & Accessibility
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use dark theme for better visibility in low light
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.dark_mode || false}
                    onCheckedChange={(checked) => handlePreferenceChange("dark_mode", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reduced Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.reduced_motion || false}
                    onCheckedChange={(checked) => handlePreferenceChange("reduced_motion", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Layout</Label>
                    <p className="text-sm text-muted-foreground">
                      Show more information in less space
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.compact_layout || false}
                    onCheckedChange={(checked) => handlePreferenceChange("compact_layout", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Privacy
                </CardTitle>
                <CardDescription>
                  Manage your account security and data privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button 
                    variant={preferences?.two_factor_enabled ? "default" : "outline"} 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Feature coming soon",
                        description: "Two-factor authentication setup will be available in a future update.",
                      });
                    }}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {preferences?.two_factor_enabled ? "Enabled" : "Setup"}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sign out after period of inactivity
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.session_timeout || false}
                    onCheckedChange={(checked) => handlePreferenceChange("session_timeout", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Activity Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep logs of account activity for security
                    </p>
                  </div>
                  <Switch 
                    checked={preferences?.activity_logging || false}
                    onCheckedChange={(checked) => handlePreferenceChange("activity_logging", checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons - Only show if there are unsaved changes */}
            {hasUnsavedChanges && (
              <div className="flex gap-4 pt-4 border-t">
                <Button onClick={handleProfileSave} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setProfileData({
                      email: user?.email || "",
                      phone: user?.phone || "",
                    });
                    setHasUnsavedChanges(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </SlideUp>
        </div>
      </main>
    </div>
  );
}