"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

export function NavbarEnhanced() {
  const { data: session } = useSession()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
  ]

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-normal",
          isScrolled
            ? "border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-200 shadow-sm"
            : "border-b border-border/20 bg-background/50 backdrop-blur-lg"
        )}
      >
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg group"
          >
            <div className="transition-transform duration-normal group-hover:scale-110">
              <Logo size={36} />
            </div>
            <span className="hidden xs:inline">Verso</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-fast relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-normal group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <Button size="sm" asChild className="btn-hover-lift">
                <Link href="/home">Go to App</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex"
                >
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild className="btn-hover-lift">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <Logo size={32} />
                <span>Verso</span>
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <nav className="flex flex-col p-4 space-y-2">
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-base rounded-lg hover:bg-accent transition-colors duration-fast touch-manipulation"
                style={{ "--stagger-delay": index } as React.CSSProperties}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-4 space-y-2">
              {!session && (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button variant="outline" className="w-full touch-manipulation">
                      Sign in
                    </Button>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button className="w-full touch-manipulation">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </DrawerContent>
      </Drawer>
    </>
  )
}
