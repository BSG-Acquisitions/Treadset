import { motion } from "framer-motion";

export function DetroitMotifOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Detroit Skyline Silhouette - anchored to bottom */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-48 md:h-64 lg:h-80"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, delay: 0.5 }}
      >
        <svg
          viewBox="0 0 1200 200"
          preserveAspectRatio="xMidYMax slice"
          className="w-full h-full"
          style={{ opacity: 0.04 }}
        >
          <defs>
            <linearGradient id="skylineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Detroit skyline silhouette - Renaissance Center, Guardian Building, etc. */}
          <path
            fill="url(#skylineGradient)"
            d="M0,200 L0,180 L30,180 L30,160 L50,160 L50,140 L70,140 L70,120 L90,120 L90,140 L110,140 L110,100 L130,100 L130,80 L150,80 L150,100 L170,100 L170,120 L190,120 L190,90 L210,90 L210,70 L230,70 L230,90 L250,90 L250,110 L270,110 L270,130 L290,130 L290,100 L310,100 L310,60 L330,60 L330,40 L350,40 L350,30 L370,30 L370,40 L390,40 L390,60 L410,60 L410,80 L430,80 L430,50 L450,50 L450,20 L470,20 L470,10 L490,10 L490,20 L510,20 L510,50 L530,50 L530,70 L550,70 L550,90 L570,90 L570,60 L590,60 L590,30 L610,30 L610,15 L630,15 L630,30 L650,30 L650,60 L670,60 L670,80 L690,80 L690,100 L710,100 L710,70 L730,70 L730,40 L750,40 L750,25 L770,25 L770,40 L790,40 L790,70 L810,70 L810,90 L830,90 L830,110 L850,110 L850,80 L870,80 L870,60 L890,60 L890,80 L910,80 L910,100 L930,100 L930,120 L950,120 L950,90 L970,90 L970,110 L990,110 L990,130 L1010,130 L1010,110 L1030,110 L1030,130 L1050,130 L1050,150 L1070,150 L1070,130 L1090,130 L1090,150 L1110,150 L1110,160 L1130,160 L1130,170 L1150,170 L1150,180 L1170,180 L1170,190 L1200,190 L1200,200 Z"
          />
        </svg>
      </motion.div>

      {/* Detroit-style angled street grid */}
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 120,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          opacity: 0.025,
          backgroundImage: `
            linear-gradient(48deg, hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(-48deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Woodward Avenue radial accent - hub and spoke pattern */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px]"
        style={{ opacity: 0.02 }}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full">
          {/* Radial lines emanating from center (like Detroit's major avenues) */}
          {[0, 30, 60, 90, 120, 150].map((angle) => (
            <line
              key={angle}
              x1="200"
              y1="200"
              x2={200 + 200 * Math.cos((angle * Math.PI) / 180)}
              y2={200 + 200 * Math.sin((angle * Math.PI) / 180)}
              stroke="hsl(var(--primary))"
              strokeWidth="1"
            />
          ))}
          {/* Concentric circles (like Detroit's mile roads) */}
          {[50, 100, 150, 200].map((r) => (
            <circle
              key={r}
              cx="200"
              cy="200"
              r={r}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Tire tread diagonal accent - corner positioned */}
      <div
        className="absolute -bottom-20 -right-20 w-96 h-96 rotate-12"
        style={{ opacity: 0.02 }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <pattern id="treadPattern" patternUnits="userSpaceOnUse" width="10" height="10">
              <rect x="0" y="0" width="3" height="10" fill="hsl(var(--primary))" />
              <rect x="5" y="2" width="3" height="6" fill="hsl(var(--primary))" />
            </pattern>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#treadPattern)" />
        </svg>
      </div>
    </div>
  );
}
