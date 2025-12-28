"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false)
      setIsValid(false)
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await response.json()
        setIsValid(data.valid)
      } catch {
        setIsValid(false)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to reset password")
        return
      }

      setIsSuccess(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while verifying token
  if (isVerifying) {
    return (
      <Card className="border-0 shadow-xl bg-muted rounded-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="p-4 rounded-xl bg-primary">
              <Loader2 className="h-16 w-16 text-primary-foreground animate-spin" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Verifying link...</CardTitle>
            <CardDescription className="mt-2">
              Please wait while we verify your reset link
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    )
  }

  // Invalid or expired token
  if (!isValid) {
    return (
      <Card className="border-0 shadow-xl bg-muted rounded-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="p-4 rounded-xl bg-destructive/10">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Invalid or expired link</CardTitle>
            <CardDescription className="mt-2">
              This password reset link is no longer valid. Please request a new one.
            </CardDescription>
          </div>
        </CardHeader>

        <CardFooter className="flex justify-center">
          <Link href="/forgot-password">
            <Button className="gap-2">
              Request new link
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="border-0 shadow-xl bg-muted rounded-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="p-4 rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Password reset!</CardTitle>
            <CardDescription className="mt-2">
              Your password has been successfully reset. You can now sign in with your new password.
            </CardDescription>
          </div>
        </CardHeader>

        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push("/login")} className="gap-2">
            Sign in
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Reset form
  return (
    <Card className="border-0 shadow-xl bg-muted rounded-2xl">
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="flex justify-center">
          <div className="p-4 rounded-xl bg-primary">
            <Logo size={64} className="text-primary-foreground" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription className="mt-2">
            Enter your new password below
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
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-11"
                required
                disabled={isLoading}
                minLength={8}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              At least 8 characters with uppercase, lowercase, and a number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-11"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting password...
              </>
            ) : (
              "Reset password"
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

function ResetPasswordFallback() {
  return (
    <Card className="border-0 shadow-xl bg-muted rounded-2xl">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-muted-foreground/10 rounded-xl animate-pulse" />
        </div>
        <div>
          <div className="h-8 w-48 bg-muted-foreground/10 rounded animate-pulse mx-auto" />
          <div className="h-4 w-64 bg-muted-foreground/10 rounded animate-pulse mx-auto mt-2" />
        </div>
      </CardHeader>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
