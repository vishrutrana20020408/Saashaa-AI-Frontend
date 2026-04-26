"use client";

import NextLink from "next/link";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Building2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function CompanyFooter() {
  const currentYear = new Date().getFullYear();

  const companyLinks = [
    { name: "Dashboard", path: "/company" },
    { name: "Post a Job", path: "/company/jobs/new" },
    { name: "Manage Jobs", path: "/company/jobs" },
    { name: "Browse Candidates", path: "/company/candidates" },
    { name: "Company Profile", path: "/company/profile" },
    { name: "Settings", path: "/company/settings" },
  ];

  const socialLinks = [
    { href: "https://facebook.com", icon: <Facebook size={18} /> },
    { href: "https://x.com", icon: <Twitter size={18} /> },
    { href: "https://linkedin.com", icon: <Linkedin size={18} /> },
    { href: "https://instagram.com", icon: <Instagram size={18} /> },
  ];

  return (
    <footer className="relative mt-auto border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Logo & About */}
          <div className="col-span-1 md:col-span-1">
            <NextLink href="/company" className="flex items-center gap-2 group mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-indigo-200 shadow-lg transition-transform group-hover:scale-105">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                AI <span className="text-indigo-600">Hire</span>
              </span>
            </NextLink>
            <p className="text-sm leading-relaxed text-slate-500">
              The AI-powered recruitment platform for companies looking to hire
              top talent faster and smarter.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">
              Quick Links
            </h4>
            <ul className="space-y-4">
              {companyLinks.map((link) => (
                <li key={link.path}>
                  <NextLink
                    href={link.path}
                    className="text-sm text-slate-500 transition-colors hover:text-indigo-600"
                  >
                    {link.name}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">
              Support
            </h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li>
                <NextLink
                  href="/company/help"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Help Center
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="/company/contact"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Contact Us
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="/privacy"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Privacy Policy
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="/terms"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Terms of Service
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">
              Contact Info
            </h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 text-indigo-600 shrink-0" />
                <span>123 AI Avenue, Innovation District, CA 90210</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-indigo-600 shrink-0" />
                <span>+1 (555) 000-0000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-indigo-600 shrink-0" />
                <span>company@ai-hire.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 text-center text-sm text-slate-500">
          <p>
            &copy; {currentYear} AI Hire. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
