import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MichiganMap = () => {
  const handleClick = () => {
    window.open('https://www.google.com/maps/search/?api=1&query=2971+Bellevue+St,+Detroit,+MI+48207', '_blank');
  };

  return (
    <div 
      className="relative w-full h-full bg-gradient-to-br from-muted/30 via-muted/50 to-muted/70 rounded-2xl border border-border cursor-pointer group overflow-hidden"
      onClick={handleClick}
    >
      {/* SVG Michigan Map - Accurate outline */}
      <svg
        viewBox="0 0 300 400"
        className="absolute inset-0 w-full h-full p-8"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Upper Peninsula */}
        <path
          d="M 45 95 L 55 90 L 70 88 L 85 85 L 100 82 L 115 80 L 130 78 L 145 80 
             L 160 85 L 170 90 L 175 95 L 172 102 L 165 108 L 155 112 L 145 115 
             L 130 118 L 115 120 L 100 118 L 85 115 L 70 110 L 55 105 L 45 100 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />
        
        {/* Lower Peninsula - The Mitten */}
        <path
          d="M 100 140 
             L 115 135 L 135 132 L 155 130 L 175 132 L 190 138 L 200 145 
             L 208 155 L 212 170 L 215 190 L 218 210 L 220 230 L 218 250 
             L 212 270 L 205 290 L 195 305 L 180 318 L 165 328 L 150 335 
             L 135 338 L 120 336 L 108 330 L 98 320 L 90 305 L 85 285 
             L 82 265 L 80 245 L 80 225 L 82 205 L 86 185 L 92 165 
             L 96 150 L 100 140 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />
        
        {/* Thumb */}
        <path
          d="M 200 145 L 215 140 L 230 142 L 242 150 L 250 162 L 252 175 
             L 248 188 L 240 198 L 228 205 L 218 208 L 218 210 L 215 190 
             L 212 170 L 208 155 L 200 145 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />

        {/* Detroit Pin Location - Southeast Michigan near the thumb */}
        <g className="cursor-pointer">
          {/* Pulse ring animation */}
          <circle
            cx="225"
            cy="220"
            r="10"
            fill="hsl(var(--primary))"
            opacity="0.3"
            className="animate-ping"
          />
          <circle
            cx="225"
            cy="220"
            r="6"
            fill="hsl(var(--primary))"
            opacity="0.5"
          />
          
          {/* Pin icon */}
          <g transform="translate(225, 220)">
            <circle
              cx="0"
              cy="-10"
              r="8"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary-foreground))"
              strokeWidth="2"
            />
            <path
              d="M 0 -2 L -5 -10 A 8 8 0 1 1 5 -10 Z"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary-foreground))"
              strokeWidth="2"
            />
            <circle
              cx="0"
              cy="-10"
              r="3"
              fill="hsl(var(--primary-foreground))"
            />
          </g>
          
          {/* Detroit label */}
          <text
            x="225"
            y="248"
            textAnchor="middle"
            className="fill-foreground font-semibold"
            style={{ fontSize: '12px' }}
          >
            Detroit
          </text>
        </g>
      </svg>

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
