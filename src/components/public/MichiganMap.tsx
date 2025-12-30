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
      {/* SVG Michigan Map */}
      <svg
        viewBox="0 0 400 500"
        className="absolute inset-0 w-full h-full p-6"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Upper Peninsula */}
        <path
          d="M 60 120 
             Q 70 100 100 95
             L 140 90
             Q 160 88 180 92
             L 200 100
             Q 210 105 205 115
             L 195 125
             Q 185 135 170 130
             L 140 125
             Q 120 122 100 128
             L 80 135
             Q 65 140 60 120"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />
        
        {/* Lower Peninsula - The Mitten */}
        <path
          d="M 140 160
             Q 150 150 175 145
             L 210 140
             Q 240 138 270 145
             L 300 155
             Q 320 162 330 180
             L 340 210
             Q 345 240 340 270
             L 330 310
             Q 320 345 300 375
             L 270 400
             Q 240 420 200 430
             L 160 425
             Q 130 418 110 395
             L 95 360
             Q 85 330 90 295
             L 100 255
             Q 108 220 120 190
             L 140 160"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />
        
        {/* Thumb of mitten */}
        <path
          d="M 300 180
             Q 320 175 340 185
             L 360 200
             Q 375 215 370 235
             L 355 255
             Q 340 265 320 260
             L 305 250
             Q 295 240 300 220
             L 300 180"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />

        {/* Detroit Pin Location - Southeast Michigan */}
        <g className="cursor-pointer">
          {/* Pulse ring animation */}
          <circle
            cx="320"
            cy="285"
            r="12"
            fill="hsl(var(--primary))"
            opacity="0.3"
            className="animate-ping"
          />
          <circle
            cx="320"
            cy="285"
            r="8"
            fill="hsl(var(--primary))"
            opacity="0.5"
          />
          
          {/* Pin icon */}
          <g transform="translate(320, 285)">
            <circle
              cx="0"
              cy="-12"
              r="10"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary-foreground))"
              strokeWidth="2"
            />
            <path
              d="M 0 -2 L -6 -12 A 10 10 0 1 1 6 -12 Z"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary-foreground))"
              strokeWidth="2"
            />
            <circle
              cx="0"
              cy="-12"
              r="4"
              fill="hsl(var(--primary-foreground))"
            />
          </g>
          
          {/* Detroit label */}
          <text
            x="320"
            y="318"
            textAnchor="middle"
            className="fill-foreground text-xs font-semibold"
            style={{ fontSize: '14px' }}
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
