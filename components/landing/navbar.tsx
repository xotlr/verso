"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getSimpleGradientStyle } from "@/lib/ui/avatar-gradient"

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
]

export function Navbar() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full p-2">
      <div
        className={cn(
          "relative max-w-5xl mx-auto px-4 flex h-16 items-center justify-between",
          "rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm"
        )}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center z-10 transition-transform duration-300 hover:scale-105"
        >
          <Logo size={32} />
        </Link>

        {/* Desktop Navigation - absolutely centered */}
        <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-2 z-10">
          {session ? (
            <Button size="sm" asChild className="group h-8 pl-2 pr-3 rounded-xl">
              <Link href="/home" className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={session.user?.image || undefined} />
                  <AvatarFallback
                    className="text-[10px] text-white font-medium"
                    style={getSimpleGradientStyle(session.user?.id || session.user?.email || 'user')}
                  >
                    {session.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span>Go to App</span>
                <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 px-3 rounded-xl hover:bg-accent/80 transition-colors duration-200"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="h-8 px-4 rounded-xl group transition-all duration-200 hover:shadow-md"
              >
                <Link href="/signup" className="flex items-center gap-1.5">
                  Get Started
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2">
                <Logo size={28} />
                <span>Verso</span>
              </SheetTitle>
            </SheetHeader>

            <nav className="mt-8 flex flex-col gap-1">
              {navLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-3 rounded-lg text-base font-medium",
                    "text-muted-foreground hover:text-foreground hover:bg-accent",
                    "transition-all duration-200 active:scale-[0.98]"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-border space-y-3">
              {session ? (
                <Button asChild className="w-full h-11 group">
                  <Link
                    href="/home"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.user?.image || undefined} />
                      <AvatarFallback
                        className="text-xs text-white font-medium"
                        style={getSimpleGradientStyle(session.user?.id || session.user?.email || 'user')}
                      >
                        {session.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>Go to App</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild className="w-full h-11 group">
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2"
                    >
                      Get Started Free
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full h-11">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
