"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/forms", label: "Forms" },
  { href: "/gallery", label: "Gallery" },
  { href: "/talks", label: "Talks" },
  // { href: "/about", label: "About" },
  { href: "/join", label: "Join Us" },
  { href: "/fundraiser", label: "Our Store" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  // Warm Espresso Theme Colors
  // background: '#1C1917'
  // primary: '#FB923C'
  // text: '#FAFAFA'
  // border: '#FB923C30'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#FB923C]/30 bg-[#1C1917]/80 backdrop-blur supports-[backdrop-filter]:bg-[#1C1917]/70 relative">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-1 md:flex-initial" aria-label="CYP Home">
          <Image
            src="/cyplogo_circle.png"
            alt="CYP logo"
            width={28}
            height={28}
            className="rounded-md flex-shrink-0"
            priority
          />
          <span className="text-base font-semibold uppercase tracking-[-0.02em] text-[#FB923C] sm:text-lg leading-7">
            Christian Youth in Power
          </span>
        </Link>

        <nav className="mx-4 hidden items-center gap-6 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#FAFAFA] transition-colors hover:text-[#FB923C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C] rounded"
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
          className="inline-flex items-center justify-center rounded md:hidden p-2 text-[#FAFAFA] hover:bg-[#FB923C]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
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
            className="md:hidden absolute left-0 right-0 top-full border-t border-[#FB923C]/30 bg-[#1C1917]/95 backdrop-blur shadow-sm"
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
                    className="rounded px-2 py-2 text-sm font-medium text-[#FAFAFA] transition-colors hover:bg-[#FB923C]/10 hover:text-[#FB923C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C]"
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-2 bg-[#FB923C] text-[#1C1917] hover:bg-[#FCD34D] hover:text-black border-none">
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