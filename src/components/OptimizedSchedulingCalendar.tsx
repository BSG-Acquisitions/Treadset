import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePickups, useSchedulePickup } from "@/hooks/usePickups";
import { useLocations } from "@/hooks/useLocations";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { MapPin, Clock, Truck, Fuel, Star, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { BSGLogo } from "@/components/BSGLogo";
import { SimplifiedVehicleManagement } from "@/components/SimplifiedVehicleManagement";

interface OptimizedSchedulingCalendarProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

interface OptimizationSuggestion {
  date: Date;
  score: number;
  reason: string;
  existingPickups: number;
  estimatedTravelTime: number;
  fuelEfficiency: number;
  laborOptimization: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface PickupFormData {
  locationId: string;
  pteCount: number;
  otrCount: number;
  tractorCount: number;
  preferredWindow: 'AM' | 'PM' | 'Any';
  notes: string;
}

export function OptimizedSchedulingCalendar({ 
  clientId, 
  clientName, 
  onClose 
}: OptimizedSchedulingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formData, setFormData] = useState<PickupFormData>({
    locationId: '',
    pteCount: 0,
    otrCount: 0,
    tractorCount: 0,
    preferredWindow: 'Any',
    notes: ''
  });

  const { toast } = useToast();
  const { data: pickups = [], isLoading: pickupsLoading } = usePickups();
  const { data: locations = [] } = useLocations(clientId);
  const { data: vehicles = [] } = useVehicles();
  const schedulePickup = useSchedulePickup();

  // Generate optimization suggestions for the next 30 days
  const generateOptimizationSuggestions = (): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = addDays(today, i);
      const dayPickups = pickups.filter(pickup => 
        isSameDay(new Date(pickup.pickup_date), date)
      );
      
      // Calculate optimization score based on various factors
      const existingPickups = dayPickups.length;
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Factors for optimization scoring
      let score = 100;
      let reason = '';
      let icon = Clock;
      
      // Prefer Tuesday-Thursday (better for route efficiency)
      if (dayOfWeek >= 2 && dayOfWeek <= 4) {
        score += 20;
        reason = 'Optimal day for route efficiency';
        icon = Truck;
      } else if (dayOfWeek === 1 || dayOfWeek === 5) {
        score += 10;
        reason = 'Good day for scheduling';
        icon = Clock;
      } else {
        score -= 10;
        reason = 'Weekend proximity affects efficiency';
        icon = Clock;
      }
      
      // Prefer days with existing pickups for route consolidation
      if (existingPickups > 0 && existingPickups < 8) {
        score += existingPickups * 5;
        reason = `Route consolidation opportunity (${existingPickups} existing pickups)`;
        icon = MapPin;
      } else if (existingPickups >= 8) {
        score -= 15;
        reason = 'Route at capacity - may cause delays';
        icon = Truck;
      }
      
      // Fuel efficiency bonus for consolidated routes
      const fuelEfficiency = Math.max(0, 100 - (existingPickups > 0 ? existingPickups * 2 : 20));
      
      // Labor optimization (prefer distributing workload)
      const laborOptimization = existingPickups < 6 ? 85 + (6 - existingPickups) * 2 : 70;
      
      // Estimated travel time (lower is better for consolidated routes)
      const estimatedTravelTime = existingPickups > 0 ? 30 + existingPickups * 8 : 45;
      
      // Boost score for Tuesdays and Wednesdays (typically best for fuel efficiency)
      if (dayOfWeek === 2 || dayOfWeek === 3) {
        score += 15;
        reason = 'Peak fuel efficiency day';
        icon = Fuel;
      }
      
      suggestions.push({
        date,
        score: Math.min(100, score),
        reason,
        existingPickups,
        estimatedTravelTime,
        fuelEfficiency,
        laborOptimization,
        icon
      });
    }
    
    return suggestions.sort((a, b) => b.score - a.score);
  };

  const optimizationSuggestions = generateOptimizationSuggestions();
  const topSuggestions = optimizationSuggestions.slice(0, 3);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setShowScheduleForm(true);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!selectedDate || !formData.locationId) {
      toast({
        title: "Missing Information",
        description: "Please select a location and date",
        variant: "destructive"
      });
      return;
    }

    try {
      // First, check if the location has coordinates
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      
      if (selectedLocation && (!selectedLocation.latitude || !selectedLocation.longitude)) {
        toast({
          title: "Geocoding Location",
          description: "Setting up location coordinates for route optimization...",
        });

        // Geocode the location first
        const { error: geocodeError } = await supabase.functions.invoke('geocode-locations', {
          body: {
            locationId: formData.locationId,
            address: selectedLocation.address
          }
        });

        if (geocodeError) {
          toast({
            title: "Location Setup Failed",
            description: "Could not set up location coordinates. Please try again or contact support.",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Location Ready",
          description: "Location coordinates updated successfully!",
        });
      }

      await schedulePickup.mutateAsync({
        clientId,
        locationId: formData.locationId,
        pickupDate: format(selectedDate, 'yyyy-MM-dd'),
        pteCount: formData.pteCount,
        otrCount: formData.otrCount,
        tractorCount: formData.tractorCount,
        preferredWindow: formData.preferredWindow,
        notes: formData.notes
      });
      
      setShowScheduleForm(false);
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 75) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-orange-600 bg-orange-50 border-orange-200";
  };

  const getPickupsForDate = (date: Date) => {
    return pickups.filter(pickup => 
      isSameDay(new Date(pickup.pickup_date), date)
    );
  };

  if (pickupsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <BSGLogo size="md" animated={true} showText={false} />
          <p className="text-muted-foreground">Loading pickup calendar...</p>
        </div>
      </div>
    );
  }

  // Check if vehicles exist
  if (vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <SimplifiedVehicleManagement />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BSGLogo size="sm" animated={true} showText={false} />
        <div>
          <h2 className="text-2xl font-bold">Optimized Pickup Scheduling</h2>
          <p className="text-muted-foreground">Schedule pickup for {clientName}</p>
        </div>
      </div>

      {/* Top Optimization Suggestions */}
      <div className="grid md:grid-cols-3 gap-4">
        {topSuggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <motion.div
              key={format(suggestion.date, 'yyyy-MM-dd')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                  index === 0 ? 'border-brand-primary bg-brand-primary/5' : 'hover:border-brand-primary/50'
                }`}
                onClick={() => handleDateSelect(suggestion.date)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-brand-primary" />
                      {index === 0 && <Star className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <Badge className={`${getScoreColor(suggestion.score)} border`}>
                      {suggestion.score}% optimal
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {format(suggestion.date, 'EEEE, MMM d')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span>{suggestion.existingPickups} pickups</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{suggestion.estimatedTravelTime}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      <span>{suggestion.fuelEfficiency}% efficient</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{suggestion.laborOptimization}% optimal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Calendar and Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Pickup Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              className="rounded-md border"
              modifiers={{
                hasPickups: (date) => getPickupsForDate(date).length > 0,
                optimal: (date) => optimizationSuggestions.find(s => 
                  isSameDay(s.date, date) && s.score >= 85
                ) !== undefined
              }}
              modifiersStyles={{
                hasPickups: { 
                  backgroundColor: 'hsl(var(--brand-primary) / 0.1)',
                  color: 'hsl(var(--brand-primary))',
                  fontWeight: 'bold'
                },
                optimal: {
                  backgroundColor: 'hsl(var(--brand-recycling) / 0.2)',
                  color: 'hsl(var(--brand-recycling))',
                  border: '2px solid hsl(var(--brand-recycling))'
                }
              }}
            />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-brand-primary/20 border-2 border-brand-primary rounded"></div>
                <span>Days with existing pickups</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-brand-recycling/20 border-2 border-brand-recycling rounded"></div>
                <span>Highly optimized days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-4">
                {/* Existing pickups for selected date */}
                {(() => {
                  const dayPickups = getPickupsForDate(selectedDate);
                  const suggestion = optimizationSuggestions.find(s => 
                    isSameDay(s.date, selectedDate)
                  );
                  
                  return (
                    <>
                      <div>
                        <h4 className="font-semibold mb-2">Existing Pickups ({dayPickups.length})</h4>
                        {dayPickups.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No pickups scheduled for this date</p>
                        ) : (
                          <div className="space-y-2">
                            {dayPickups.slice(0, 3).map((pickup) => (
                              <div key={pickup.id} className="p-2 bg-muted rounded text-sm">
                                <p className="font-medium">{pickup.client?.company_name}</p>
                                <p className="text-muted-foreground">{pickup.location?.address}</p>
                              </div>
                            ))
                            }
                            {dayPickups.length > 3 && (
                              <p className="text-sm text-muted-foreground">
                                +{dayPickups.length - 3} more pickups
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {suggestion && (
                        <div>
                          <h4 className="font-semibold mb-2">Optimization Score</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Overall Score</span>
                              <Badge className={getScoreColor(suggestion.score)}>
                                {suggestion.score}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={() => setShowScheduleForm(true)}
                        className="w-full"
                        disabled={!selectedDate}
                      >
                        Schedule Pickup for This Date
                      </Button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-muted-foreground">Select a date to view details and schedule a pickup</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Form Dialog */}
      <Dialog open={showScheduleForm} onOpenChange={setShowScheduleForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Pickup Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={formData.locationId} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, locationId: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name || location.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="pte">PTE Count</Label>
                <Input
                  type="number"
                  value={formData.pteCount}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    pteCount: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="otr">OTR Count</Label>
                <Input
                  type="number"
                  value={formData.otrCount}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    otrCount: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="tractor">Tractor Count</Label>
                <Input
                  type="number"
                  value={formData.tractorCount}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    tractorCount: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="window">Preferred Time Window</Label>
              <Select value={formData.preferredWindow} onValueChange={(value: 'AM' | 'PM' | 'Any') =>
                setFormData(prev => ({ ...prev, preferredWindow: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any Time</SelectItem>
                  <SelectItem value="AM">Morning (8AM - 12PM)</SelectItem>
                  <SelectItem value="PM">Afternoon (12PM - 5PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Special instructions or notes..."
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleScheduleSubmit}
                disabled={schedulePickup.isPending || !formData.locationId}
                className="flex-1"
              >
                {schedulePickup.isPending ? "Scheduling..." : "Schedule Pickup"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowScheduleForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
