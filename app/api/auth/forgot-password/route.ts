import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import crypto from "crypto";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: Request) {
  try {
    // Rate limit by IP to prevent enumeration attacks
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit(`forgot-password:${ip}`, RATE_LIMITS.AUTH);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    // But only actually send email if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, password: true },
    });

    // Only process if user exists AND has a password (credentials auth)
    // OAuth-only users can't reset password
    if (user?.email && user.password) {
      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      });

      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Create new token
      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token,
          expires,
        },
      });

      // Send email
      await sendPasswordResetEmail(normalizedEmail, token);
    }

    // Always return success (don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

async function sendPasswordResetEmail(email: string, token: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || "noreply@verso.ac";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verso.ac";

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured, skipping email send");
    return;
  }

  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: email,
        subject: "Reset your Verso password",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #111;">Reset your password</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
              You requested a password reset for your Verso account. Click the button below to choose a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 16px;">
              Reset Password
            </a>
            <p style="font-size: 14px; color: #666; margin-top: 32px; line-height: 1.6;">
              This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              Verso - Professional screenwriting software
            </p>
          </div>
        `,
        text: `Reset your Verso password\n\nYou requested a password reset. Visit this link to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API error:", errorData);
    }
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
}
