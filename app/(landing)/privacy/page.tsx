import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | Verso",
  description: "Learn how Verso collects, uses, and protects your personal information.",
}

export default function PrivacyPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <div className="space-y-4 mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: December 2024
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Verso (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our screenwriting software and services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2 mt-6">Account Information</h3>
            <p className="text-muted-foreground mb-4">
              When you create an account, we collect your name, email address, and password. If you sign up using a third-party service (Google, GitHub), we receive basic profile information from that service.
            </p>
            <h3 className="text-lg font-medium mb-2 mt-6">Content</h3>
            <p className="text-muted-foreground mb-4">
              We store the screenplays, projects, and other content you create using Verso. This content is encrypted and only accessible to you and those you choose to share it with.
            </p>
            <h3 className="text-lg font-medium mb-2 mt-6">Usage Data</h3>
            <p className="text-muted-foreground mb-4">
              We collect anonymized usage data to improve our services, including features used, session duration, and general interaction patterns. We do not read or analyze the content of your screenplays.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>To provide and maintain our services</li>
              <li>To process your transactions and subscriptions</li>
              <li>To send you service-related communications</li>
              <li>To improve and personalize your experience</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement industry-standard security measures to protect your data, including encryption in transit (TLS) and at rest. Your screenplays are stored securely and are never shared with third parties without your explicit consent.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              You have the right to access, correct, or delete your personal data at any time. You can export all your content from your account settings. To delete your account and all associated data, contact us at privacy@verso.ink.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Cookies</h2>
            <p className="text-muted-foreground mb-4">
              We use essential cookies to maintain your session and preferences. We do not use tracking cookies or share data with advertising networks.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@verso.ink" className="text-primary hover:underline">
                privacy@verso.ink
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
