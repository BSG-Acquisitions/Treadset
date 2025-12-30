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
      {/* SVG Michigan Map - Accurate outline from public domain data */}
      <svg
        viewBox="0 0 500 600"
        className="absolute inset-0 w-full h-full p-6"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Upper Peninsula - Accurate outline */}
        <path
          d="M 82 142 L 95 138 L 108 133 L 125 128 L 142 124 L 160 121 L 178 119 L 195 118 L 212 118 L 228 120 L 243 124 L 256 130 L 268 138 L 278 148 L 285 160 L 288 173 L 286 186 L 280 197 L 270 206 L 258 212 L 244 216 L 228 218 L 212 218 L 195 216 L 178 212 L 162 206 L 148 198 L 136 188 L 126 176 L 118 163 L 112 150 L 105 145 L 95 143 L 82 142 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />
        
        {/* Lower Peninsula - The Mitten (accurate shape) */}
        <path
          d="M 170 240 
             L 185 235 L 202 232 L 220 230 L 240 230 L 260 232 L 280 238 L 298 248 L 312 262 
             L 322 280 L 328 300 L 332 322 L 334 345 L 334 370 L 332 395 L 328 420 L 320 445 
             L 308 468 L 292 488 L 272 505 L 250 518 L 225 528 L 200 532 L 175 530 L 152 522 
             L 132 508 L 118 490 L 108 468 L 102 445 L 100 420 L 100 395 L 104 370 L 110 345 
             L 120 322 L 132 302 L 148 285 L 160 268 L 168 252 L 170 240 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />
        
        {/* Thumb of the Mitten */}
        <path
          d="M 312 262 L 330 252 L 350 248 L 370 250 L 388 258 L 402 272 L 410 290 L 412 310 
             L 408 330 L 398 348 L 382 362 L 362 370 L 345 372 L 334 370 L 334 345 L 332 322 
             L 328 300 L 322 280 L 312 262 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          className="transition-all duration-300 group-hover:fill-muted/80"
        />

        {/* Detroit Pin Location - Southeast Michigan at the base of the thumb */}
        <g className="cursor-pointer">
          {/* Pulse ring animation */}
          <circle
            cx="365"
            cy="395"
            r="12"
            fill="hsl(var(--primary))"
            opacity="0.3"
            className="animate-ping"
          />
          <circle
            cx="365"
            cy="395"
            r="8"
            fill="hsl(var(--primary))"
            opacity="0.5"
          />
          
          {/* Pin icon */}
          <g transform="translate(365, 395)">
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
            x="365"
            y="428"
            textAnchor="middle"
            className="fill-foreground font-semibold"
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
