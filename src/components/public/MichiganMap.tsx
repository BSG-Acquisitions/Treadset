import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import michiganMapImage from "@/assets/michigan-map.png";

export const MichiganMap = () => {
  const handleClick = () => {
    window.open('https://www.google.com/maps/search/?api=1&query=2971+Bellevue+St,+Detroit,+MI+48207', '_blank');
  };

  return (
    <div 
      className="relative w-full h-full bg-gradient-to-br from-muted/30 via-muted/50 to-muted/70 rounded-2xl border border-border cursor-pointer group overflow-hidden"
      onClick={handleClick}
    >
      {/* Michigan Map Image */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img 
          src={michiganMapImage} 
          alt="Michigan state map"
          className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Detroit Pin Overlay - positioned at southeast Lower Peninsula */}
      <div 
        className="absolute"
        style={{ left: '68%', top: '85%' }}
      >
        {/* Pulse ring animation */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 rounded-full bg-primary/30 animate-ping" />
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 rounded-full bg-primary/50" />
        </div>
        
        {/* Pin icon */}
        <div className="absolute -translate-x-1/2 -translate-y-full">
          <div className="relative">
            <MapPin className="h-8 w-8 text-primary drop-shadow-lg" fill="hsl(var(--primary))" />
          </div>
        </div>
        
        {/* Detroit label */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-sm font-semibold text-foreground bg-background/80 px-2 py-0.5 rounded">
            Detroit
          </span>
        </div>
      </div>

      {/* Bottom info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">2971 Bellevue St</p>
              <p className="text-sm text-muted-foreground">Detroit, MI 48207</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Google Maps
          </Button>
        </div>
      </div>
    </div>
  );
};
