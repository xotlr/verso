"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { motion } from "framer-motion"
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full transition-colors duration-fast group"
    >
      {children}
      <span className="absolute inset-x-3 -bottom-0.5 h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-normal origin-left" />
    </Link>
  )
}

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
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "sticky top-4 z-50 w-full max-w-5xl mx-auto transition-all duration-normal rounded-full",
          isScrolled
            ? "border border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-200 shadow-sm"
            : "border border-border/20 bg-background/50 backdrop-blur-lg"
        )}
      >
        <div className="px-4 sm:px-6 flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg group"
          >
            <motion.div
              className="transition-transform duration-normal"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Logo size={36} />
            </motion.div>
            <span className="hidden xs:inline">Verso</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="sm" asChild className="rounded-full shadow-sm hover:shadow-md transition-shadow">
                  <Link href="/home">Go to App</Link>
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="hidden sm:inline-flex rounded-full"
                  >
                    <Link href="/login">Sign in</Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button size="sm" asChild className="rounded-full shadow-sm hover:shadow-md transition-shadow">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </motion.div>
              </>
            )}

            {/* Mobile Menu Button */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

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
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base rounded-lg hover:bg-accent active:bg-accent/80 transition-colors duration-fast touch-manipulation"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}

            <motion.div
              className="pt-4 space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {!session && (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button variant="outline" className="w-full touch-manipulation active:scale-[0.98] transition-transform">
                      Sign in
                    </Button>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button className="w-full touch-manipulation active:scale-[0.98] transition-transform">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </nav>
        </DrawerContent>
      </Drawer>
    </>
  )
}
