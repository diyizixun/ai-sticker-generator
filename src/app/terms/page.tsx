import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - AI Sticker Generator",
  description: "Terms of Service for AI Sticker Generator. Rules and guidelines for using our AI sticker generation service.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <a href="/" className="text-purple-600 hover:underline text-sm">← Back to Home</a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Terms of Service</h1>
          <p className="text-sm text-gray-500 mt-2">Last updated: May 13, 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 prose prose-gray prose-sm">
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using AI Sticker Generator (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>AI Sticker Generator is a web-based tool that uses artificial intelligence to generate custom sticker images from text descriptions or uploaded images. The Service is provided free of charge with daily generation limits, with an optional Pro subscription for additional features.</p>

        <h2>3. Account Registration</h2>
        <ul>
          <li>You may use the Service anonymously within daily free limits</li>
          <li>Creating an account enables additional features including generation history and Pro subscription</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials</li>
          <li>You must provide accurate and complete information when creating an account</li>
          <li>You must be at least 13 years old to create an account</li>
        </ul>

        <h2>4. Free and Pro Plans</h2>
        <h3>4.1 Free Plan</h3>
        <ul>
          <li>Limited to 3 sticker generations per day</li>
          <li>Standard quality output</li>
          <li>Generated stickers are for personal, non-commercial use only</li>
          <li>We reserve the right to modify free plan limits at any time</li>
        </ul>

        <h3>4.2 Pro Plan</h3>
        <ul>
          <li>Unlimited sticker generations</li>
          <li>Higher quality output with print-ready formats</li>
          <li>Commercial license for generated stickers</li>
          <li>Priority generation queue</li>
          <li>Billed monthly ($9.90/month) or annually ($79/year)</li>
        </ul>

        <h2>5. Payment and Billing</h2>
        <ul>
          <li>Pro subscription payments are processed by Creem</li>
          <li>All prices are listed in US Dollars</li>
          <li>Monthly subscriptions auto-renew each month unless cancelled</li>
          <li>Annual subscriptions auto-renew each year unless cancelled</li>
          <li>You may cancel your subscription at any time through your account settings</li>
          <li>Upon cancellation, you will retain Pro access until the end of your current billing period</li>
          <li>No partial refunds are provided for unused portions of a billing period</li>
        </ul>

        <h2>6. Content and Usage Guidelines</h2>
        <h3>6.1 Permitted Use</h3>
        <p>You may use the Service to generate stickers for lawful purposes. Pro plan users may use generated stickers commercially, including on print-on-demand platforms, merchandise, and digital products.</p>

        <h3>6.2 Prohibited Content</h3>
        <p>You must NOT use the Service to generate:</p>
        <ul>
          <li>Content that is illegal, harmful, threatening, abusive, or harassing</li>
          <li>Content that infringes on the intellectual property rights of others</li>
          <li>Sexually explicit or pornographic content</li>
          <li>Content that promotes violence, hate speech, or discrimination</li>
          <li>Content that impersonates or misrepresents affiliation with any person or entity</li>
          <li>Content designed to deceive, defraud, or mislead</li>
        </ul>

        <h3>6.3 Intellectual Property</h3>
        <ul>
          <li><strong>Free Plan:</strong> Generated stickers are licensed to you for personal, non-commercial use only. You may not sell, distribute, or use them commercially.</li>
          <li><strong>Pro Plan:</strong> Generated stickers are licensed to you for both personal and commercial use. You may sell, distribute, and use them on merchandise and print-on-demand platforms.</li>
          <li>AI-generated content may not be eligible for copyright protection in all jurisdictions. You are responsible for understanding the IP laws applicable to your use.</li>
          <li>You retain the right to your text prompts. We do not claim ownership of your input descriptions.</li>
        </ul>

        <h2>7. Service Availability</h2>
        <ul>
          <li>The Service is provided &quot;as is&quot; and &quot;as available&quot;</li>
          <li>We do not guarantee uninterrupted or error-free service</li>
          <li>Generation quality and speed may vary based on demand and AI model availability</li>
          <li>We may modify, suspend, or discontinue the Service at any time with reasonable notice</li>
          <li>Scheduled maintenance will be announced in advance when possible</li>
        </ul>

        <h2>8. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
        <ul>
          <li>The Service is provided without warranties of any kind, express or implied</li>
          <li>We are not liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the Service</li>
          <li>We are not responsible for the quality, accuracy, or appropriateness of AI-generated content</li>
          <li>Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim</li>
          <li>We are not liable for any third-party service outages or failures</li>
        </ul>

        <h2>9. Indemnification</h2>
        <p>You agree to indemnify and hold harmless AI Sticker Generator and its operators from any claims, damages, losses, or expenses (including reasonable attorney fees) arising from your use of the Service or violation of these Terms.</p>

        <h2>10. Termination</h2>
        <ul>
          <li>We may suspend or terminate your account for violation of these Terms</li>
          <li>You may delete your account at any time by contacting us</li>
          <li>Upon termination, your right to use the Service ceases immediately</li>
          <li>Provisions that by their nature should survive termination shall remain in effect</li>
        </ul>

        <h2>11. Privacy</h2>
        <p>Your use of the Service is also governed by our <a href="/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference.</p>

        <h2>12. Dispute Resolution</h2>
        <p>Any disputes arising from these Terms or the Service shall be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with applicable rules, or in the courts of the jurisdiction where the Service is operated.</p>

        <h2>13. Changes to Terms</h2>
        <p>We may update these Terms from time to time. Material changes will be communicated via email (for account holders) or by posting a notice on the website. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>

        <h2>14. General Provisions</h2>
        <ul>
          <li>If any provision of these Terms is found unenforceable, the remaining provisions remain in effect</li>
          <li>Our failure to enforce any right does not constitute a waiver of that right</li>
          <li>These Terms constitute the entire agreement between you and AI Sticker Generator regarding the Service</li>
          <li>You may not assign your rights or obligations under these Terms without our consent</li>
        </ul>

        <h2>15. Contact</h2>
        <p>For questions about these Terms, please contact us at:</p>
        <ul>
          <li>Email: heroinyan@gmail.com</li>
          <li>Website: <a href="https://aisticker.pics">aisticker.pics</a></li>
        </ul>
      </main>
    </div>
  );
}
