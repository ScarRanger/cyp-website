"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/forms", label: "Events and Forms" },
  { href: "/about", label: "About" },
  { href: "/join", label: "Join Us" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 relative">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-3" aria-label="CYP Home">
          <Image
            src="/CYP_logo.png"
            alt="CYP logo"
            width={28}
            height={28}
            className="rounded-md"
            priority
          />
          <span className="max-w-[50vw] truncate text-sm font-semibold uppercase tracking-[-0.02em] text-sky-700 sm:max-w-none sm:text-base">
            Christian Youth in Power
          </span>
        </Link>

        <nav className="mx-4 hidden items-center gap-6 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Hide default header CTA; Join remains in mobile menu and hero */}
          <div className="hidden" aria-hidden />
        </motion.div>
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded md:hidden p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="md:hidden absolute left-0 right-0 top-full border-t border-gray-100/60 bg-white/95 backdrop-blur shadow-sm"
            role="dialog"
            aria-label="Mobile navigation"
          >
            <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8" aria-label="Mobile">
              <div className="grid gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-slate-50 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-2 bg-sky-600 text-white hover:bg-sky-700">
                  <Link href="/join" onClick={() => setOpen(false)} aria-label="Join Christian Youth in Power">
                    Join CYP
                  </Link>
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}