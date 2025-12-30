import { motion } from "framer-motion";

// Partner logos
import michiganFarmNewsImg from "@/assets/partners/michigan-farm-news.jpeg";
import detroitNewsImg from "@/assets/partners/detroit-news.jpeg";

interface Partner {
  name: string;
  logo?: string;
  isPlaceholder?: boolean;
}

const partners: Partner[] = [
  { name: "Michigan Farm News", logo: michiganFarmNewsImg },
  { name: "The Detroit News", logo: detroitNewsImg },
  { name: "EGLE", isPlaceholder: true },
  { name: "Ford", isPlaceholder: true },
  { name: "Lincoln", isPlaceholder: true },
  { name: "Honda", isPlaceholder: true },
  { name: "CAT", isPlaceholder: true },
];

export function PartnerLogosCarousel() {
  // Duplicate for seamless infinite scroll
  const duplicatedPartners = [...partners, ...partners];

  return (
    <section className="py-16 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 mb-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">
            Trusted By & Featured In
          </span>
        </motion.div>
      </div>

      {/* Scrolling container */}
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

        {/* Scrolling track */}
        <div className="flex animate-scroll hover:[animation-play-state:paused]">
          {duplicatedPartners.map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              className="flex-shrink-0 mx-6 lg:mx-10"
            >
              {partner.logo ? (
                <div className="h-16 lg:h-20 w-32 lg:w-40 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 lg:h-20 w-32 lg:w-40 flex items-center justify-center bg-card border border-border/50 rounded-lg grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {partner.name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CSS for infinite scroll animation */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
