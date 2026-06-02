import Link from "next/link";
import { Heart, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="ui-enter-up grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4" style={{ animationDelay: "40ms" }}>
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="ui-link-shift mb-4 flex items-center gap-2">
              <div className="ui-icon-lift flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                Vivah Bandhan
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              India&apos;s most trusted matrimony platform, connecting hearts and
              building families since 2015. Over 10 lakh happy couples.
            </p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="ui-card-lift-soft flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 transition-colors hover:bg-rose-600"
                  aria-label="Social media"
                >
                  <Icon className="ui-icon-lift w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-5 font-display">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/", label: "Home" },
                { href: "/about", label: "About Us" },
                { href: "/faq", label: "FAQ" },
                { href: "/contact", label: "Contact" },
                { href: "/register", label: "Register Free" },
                { href: "/login", label: "Login" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="ui-link-shift text-gray-400 transition-colors hover:text-rose-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-5 font-display">Legal</h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms & Conditions" },
                { href: "/refund", label: "Refund Policy" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="ui-link-shift text-gray-400 transition-colors hover:text-rose-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-5 font-display">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="ui-icon-lift mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span className="text-gray-400">
                  123 Matrimony Lane, Mumbai, Maharashtra 400001
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="ui-icon-lift h-4 w-4 shrink-0 text-rose-400" />
                <a href="tel:+911800123456" className="ui-link-shift text-gray-400 transition-colors hover:text-rose-400">
                  +91 1800 123 456
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="ui-icon-lift h-4 w-4 shrink-0 text-rose-400" />
                <a href="mailto:support@vivahbandhan.com" className="ui-link-shift text-gray-400 transition-colors hover:text-rose-400">
                  support@vivahbandhan.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="ui-enter-up mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 text-sm text-gray-500 sm:flex-row" style={{ animationDelay: "120ms" }}>
          <p>© {new Date().getFullYear()} Vivah Bandhan. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="ui-soft-float h-4 w-4 fill-rose-500 text-rose-500" /> in India
          </p>
        </div>
      </div>
    </footer>
  );
}
