import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveTireCounter } from "./LiveTireCounter";
import { FloatingParticles } from "./FloatingParticles";
import { AnimatedHeadline, GradientText, AnimatedParagraph } from "@/components/ui/animated-text";
import { MagneticButton, RippleButton } from "@/components/ui/magnetic-button";
import { useRef } from "react";
import bsgTruckImg from "@/assets/facility/bsg-truck.jpeg";

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const logoScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const logoOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -50]);
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 150]);

  const trustIndicators = [
    "Licensed & Insured",
    "15+ Years Experience",
    "EPA Compliant",
  ];

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[100vh] flex items-center justify-center overflow-hidden"
    >
      {/* Image Background with Parallax */}
      <motion.div 
        className="absolute inset-0"
        style={{ y: backgroundY }}
      >
        <img 
          src={bsgTruckImg} 
          alt="BSG Tire Recycling truck" 
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for translucent effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
      </motion.div>

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Main Content */}
      <motion.div 
        className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20"
        style={{ y: contentY }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Premium Logo with Glow */}
          <motion.div
            style={{ scale: logoScale, opacity: logoOpacity }}
            className="mb-8 relative"
          >
            {/* Logo glow effect */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-full bg-primary/20 blur-3xl" />
            </motion.div>

            {/* Glass card container for logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ 
                duration: 1,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              className="relative inline-block"
              style={{ perspective: "1000px" }}
            >
              <div className="relative p-6 sm:p-8 rounded-3xl bg-card/30 backdrop-blur-xl border border-border/20 shadow-2xl">
                {/* Animated border gradient */}
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-50"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary) / 0.3), transparent, hsl(var(--primary) / 0.1))",
                  }}
                  animate={{
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                <motion.img 
                  src="/bsg-logo.png" 
                  alt="BSG Tire Recycling - Detroit's Premier Tire Recycling Service" 
                  className="relative h-24 sm:h-32 lg:h-40 w-auto mx-auto drop-shadow-2xl"
                  initial={{ filter: "brightness(0.8)" }}
                  animate={{ filter: "brightness(1)" }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Live Counter Badge with Spring Animation */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.3,
              type: "spring",
              stiffness: 100,
            }}
            className="mb-10"
          >
            <LiveTireCounter />
          </motion.div>

          {/* Animated Main Headline */}
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <AnimatedHeadline delay={0.5} staggerChildren={0.1}>
              Old Tires
            </AnimatedHeadline>
            {" "}
            <motion.span
              className="text-primary inline-block"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 0.8, 
                type: "spring",
                stiffness: 200,
              }}
            >
              =
            </motion.span>
            {" "}
            <br className="sm:hidden" />
            <GradientText>New Possibilities</GradientText>
          </motion.h1>

          {/* Animated Subheadline */}
          <AnimatedParagraph
            delay={1}
            className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed"
          >
            Detroit's trusted tire recycling experts. 
            Serving Southeast Michigan businesses and individuals 
            with reliable, environmentally responsible tire disposal.
          </AnimatedParagraph>

          {/* Detroit Location Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="mb-10 flex items-center justify-center"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Detroit, MI
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-sm text-muted-foreground">
                Serving Southeast Michigan
              </span>
            </div>
          </motion.div>

          {/* Premium CTA Buttons with Magnetic Effect */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
          >
            <MagneticButton>
              <Link to="/public-book">
                <RippleButton>
                  <Button
                    size="lg"
                    className="relative bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-7 text-lg h-auto group overflow-hidden shadow-lg shadow-primary/25"
                  >
                    {/* Button glow */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "easeInOut",
                      }}
                    />
                    <Truck className="mr-3 h-5 w-5" />
                    <span className="relative z-10">Schedule a Pickup</span>
                    <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </RippleButton>
              </Link>
            </MagneticButton>

            <MagneticButton>
              <Link to="/drop-off">
                <RippleButton>
                  <Button
                    size="lg"
                    variant="outline"
                    className="relative border-2 border-primary/40 hover:border-primary/60 bg-background/50 backdrop-blur-sm hover:bg-primary/10 px-10 py-7 text-lg h-auto group overflow-hidden"
                  >
                    <MapPin className="mr-3 h-5 w-5" />
                    <span className="relative z-10">Drop Off Tires</span>
                    <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </RippleButton>
              </Link>
            </MagneticButton>
          </motion.div>

          {/* Premium Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          >
            {trustIndicators.map((indicator, index) => (
              <motion.div
                key={indicator}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 1.6 + index * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border/30 text-sm text-muted-foreground"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 1.8 + index * 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20"
                >
                  <Check className="h-3 w-3 text-green-500" />
                </motion.div>
                <span>{indicator}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <motion.span
          className="text-xs text-muted-foreground/60 uppercase tracking-widest"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Scroll to explore
        </motion.span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <motion.div 
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ 
              opacity: [1, 0.5, 1],
              scale: [1, 0.8, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
