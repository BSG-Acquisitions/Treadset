import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export function HeroVideoBackground() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75; // Slow motion effect
    }
  }, [videoLoaded]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Video Layer */}
      {!videoError && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-40" : "opacity-0"
          }`}
          poster="/placeholder.svg"
        >
          <source
            src="https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4"
            type="video/mp4"
          />
        </video>
      )}

      {/* Animated Gradient Fallback / Overlay */}
      <div className="absolute inset-0">
        {/* Base dark overlay */}
        <div className="absolute inset-0 bg-background/80" />
        
        {/* Morphing gradient mesh */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 80% 80%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.2) 0%, transparent 50%)",
              "radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Light rays */}
        <motion.div
          className="absolute -top-1/2 -left-1/4 w-full h-full"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, transparent 60%)",
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Secondary light ray */}
        <motion.div
          className="absolute -bottom-1/2 -right-1/4 w-full h-full"
          style={{
            background: "linear-gradient(-45deg, hsl(var(--primary) / 0.03) 0%, transparent 50%)",
          }}
          animate={{
            opacity: [0.2, 0.5, 0.2],
            rotate: [0, -3, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Noise texture overlay for premium depth */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 100%)",
        }}
      />
    </div>
  );
}
