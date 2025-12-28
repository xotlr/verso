"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      setIsSubmitted(true)
    } catch {
      setError("Failed to send reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="border-0 shadow-xl bg-muted rounded-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="p-4 rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="mt-2">
              If an account exists for {email}, you&apos;ll receive a password reset link shortly.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            The link will expire in 1 hour. Check your spam folder if you don&apos;t see the email.
          </p>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-xl bg-muted rounded-2xl">
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="flex justify-center">
          <div className="p-4 rounded-xl bg-primary">
            <Logo size={64} className="text-primary-foreground" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription className="mt-2">
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Link href="/login">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
