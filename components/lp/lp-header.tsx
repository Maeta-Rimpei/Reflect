"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { RippleMotif } from "@/components/ripple-motif";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Reflectについて", href: "#features" },
  { label: "Reflectの使いかた", href: "#how-it-works" },
  { label: "料金", href: "#pricing" },
];

export function LpHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <RippleMotif size="sm" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Reflect
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-border bg-card px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent cursor-pointer hover:bg-foreground/10"
          >
            新規登録
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground md:hidden cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-border bg-background px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground cursor-pointer"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-border bg-card px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-foreground/10 cursor-pointer"
              >
                新規登録
              </Link>
            </div>
          </nav>
        </div>  
      )}
    </header>
  );
}
