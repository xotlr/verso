import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | Verso",
  description: "Read the terms and conditions for using Verso screenwriting software.",
}

export default function TermsPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <div className="space-y-4 mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: December 2024
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing or using Verso, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Use of Service</h2>
            <p className="text-muted-foreground mb-4">
              Verso provides screenwriting software and related services. You may use our services for lawful purposes only. You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service to distribute malware or harmful content</li>
              <li>Interfere with or disrupt the service</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Your Content</h2>
            <p className="text-muted-foreground mb-4">
              You retain all rights to the content you create using Verso. We do not claim ownership of your screenplays, projects, or other creative works. You grant us a limited license to store, display, and process your content solely to provide the service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Account Responsibilities</h2>
            <p className="text-muted-foreground mb-4">
              You are responsible for maintaining the security of your account and password. You agree to notify us immediately of any unauthorized access. We cannot be held liable for any loss or damage resulting from your failure to protect your account credentials.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Subscriptions and Payments</h2>
            <p className="text-muted-foreground mb-4">
              Some features require a paid subscription. Subscriptions automatically renew unless cancelled. You can cancel at any time from your account settings. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Service Availability</h2>
            <p className="text-muted-foreground mb-4">
              We strive to maintain high availability but cannot guarantee uninterrupted service. We may modify, suspend, or discontinue features with reasonable notice. We are not liable for any downtime or service interruptions.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              To the maximum extent permitted by law, Verso shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground mb-4">
              We may update these terms from time to time. We will notify you of significant changes via email or through the service. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Contact</h2>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@verso.ink" className="text-primary hover:underline">
                legal@verso.ink
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
