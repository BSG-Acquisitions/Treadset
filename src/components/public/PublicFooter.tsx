import { Link } from "react-router-dom";
import { Phone, MapPin, Clock, Recycle } from "lucide-react";

const quickLinks = [
  { href: "/services", label: "Services" },
  { href: "/drop-off", label: "Drop Off Info" },
  { href: "/public-book", label: "Schedule Pickup" },
  { href: "/partners", label: "Partner With Us" },
  { href: "/about", label: "About BSG" },
  { href: "/contact", label: "Contact" },
];

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      {/* Main Footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/bsg-logo.png" 
                alt="BSG Tire Recycling" 
                className="h-12 w-auto bg-background rounded-lg p-1"
              />
            </div>
            <p className="text-background/80 text-sm leading-relaxed mb-4">
              Detroit's trusted tire recycling experts serving businesses 
              and individuals throughout Michigan.
            </p>
            <div className="flex items-center gap-2 text-sm text-background/70">
              <Recycle className="h-4 w-4 text-brand-recycling" />
              <span>Committed to environmental sustainability</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-base mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-base mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:3137310817"
                  className="flex items-start gap-3 text-sm text-background/70 hover:text-background transition-colors"
                >
                  <Phone className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>(313) 731-0817</span>
                </a>
              </li>
              <li>
                <a
                  href="https://maps.google.com/?q=2971+Bellevue+St+Detroit+MI+48207"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-background/70 hover:text-background transition-colors"
                >
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    2971 Bellevue St<br />
                    Detroit, MI 48207
                  </span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-background/70">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Mon - Fri: 8:30 AM - 3:30 PM<br />
                    Sat - Sun: Closed
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-base mb-4">Our Services</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li>Commercial Tire Pickup</li>
              <li>Residential Tire Drop-off</li>
              <li>Fleet Services</li>
              <li>Transport Partner Program</li>
              <li>Environmental Compliance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-background/60">
            <p>© {currentYear} BSG Tire Recycling. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-background transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-background transition-colors">
                Terms of Service
              </Link>
              <a
                href="https://treadset.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-background transition-colors"
              >
                Powered by TreadSet
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
