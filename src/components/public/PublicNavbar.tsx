import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/drop-off", label: "Drop Off" },
  { href: "/partners", label: "Partners" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/bsg-logo.png" 
              alt="BSG Tire Recycling" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  location.pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:3137310817"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>(313) 731-0817</span>
            </a>
            <a href="https://app.treadset.co/client-login">
              <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                Client Portal
              </Button>
            </a>
            <Link to="/public-book">
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-elevation-primary">
                Schedule Pickup
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link
              to="/auth"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Staff Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-background border-b border-border"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                    location.pathname === link.href
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-4 border-t border-border space-y-3">
                <a
                  href="tel:3137310817"
                  className="flex items-center gap-2 px-4 py-3 text-base font-medium text-foreground"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span>(313) 731-0817</span>
                </a>
                
                <Link to="/public-book" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                    Schedule Pickup
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className="block text-center px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Staff Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
