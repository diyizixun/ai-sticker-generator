import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - AI Sticker Generator",
  description: "Privacy Policy for AI Sticker Generator. Learn how we collect, use, and protect your information.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <a href="/" className="text-purple-600 hover:underline text-sm">← Back to Home</a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-2">Last updated: May 13, 2026</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 prose prose-gray prose-sm">
        <h2>1. Information We Collect</h2>
        <h3>1.1 Information You Provide</h3>
        <ul>
          <li><strong>Text Prompts:</strong> When you use our sticker generation service, the text descriptions you enter are sent to our AI generation providers to create your sticker. We do not permanently store your prompts on our servers unless you create an account.</li>
          <li><strong>Account Information:</strong> If you create an account, we collect your email address and display name. You may also sign in using Google or GitHub OAuth, in which case we receive the basic profile information those services provide.</li>
          <li><strong>Payment Information:</strong> If you upgrade to a Pro plan, payment processing is handled by our payment provider (Creem). We do not store your credit card details on our servers.</li>
        </ul>

        <h3>1.2 Automatically Collected Information</h3>
        <ul>
          <li><strong>Usage Data:</strong> We collect anonymous usage statistics including number of stickers generated, pages visited, and feature usage patterns.</li>
          <li><strong>Cookies:</strong> We use essential cookies to maintain your session and track your daily free generation quota. We also use analytics cookies (Google Analytics) and advertising cookies (Google AdSense) as described below.</li>
          <li><strong>Device Information:</strong> Browser type, operating system, screen resolution, and IP address for security and analytics purposes.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and improve the AI sticker generation service</li>
          <li>To enforce daily generation limits for free users</li>
          <li>To process payments for Pro subscriptions</li>
          <li>To communicate with you about your account or service changes</li>
          <li>To analyze usage patterns and improve our service</li>
          <li>To display relevant advertisements</li>
          <li>To prevent abuse and ensure service security</li>
        </ul>

        <h2>3. Third-Party Services</h2>
        <h3>3.1 AI Generation Providers</h3>
        <p>Your text prompts are sent to third-party AI image generation services (such as Pollinations.ai, Replicate, or OpenAI) to generate stickers. These services have their own privacy policies governing how they process your data.</p>

        <h3>3.2 Google Analytics</h3>
        <p>We use Google Analytics to understand how visitors use our website. Google Analytics collects information anonymously and reports website trends without identifying individual visitors. For more information, see <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.</p>

        <h3>3.3 Google AdSense</h3>
        <p>We use Google AdSense to display advertisements on our website. Google may use cookies to serve ads based on your prior visits to our website or other websites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</p>

        <h3>3.4 Authentication Providers</h3>
        <p>When you sign in with Google or GitHub, those services handle the authentication process according to their respective privacy policies.</p>

        <h3>3.5 Payment Provider</h3>
        <p>Payment processing for Pro subscriptions is handled by Creem. Your payment details are processed securely by Creem and are not stored on our servers.</p>

        <h2>4. Generated Content</h2>
        <p>Stickers generated using our service are created by AI models. Please note:</p>
        <ul>
          <li>Generated images are not stored permanently on our servers unless you save them to your account</li>
          <li>Free plan stickers are for personal, non-commercial use</li>
          <li>Pro plan stickers include a commercial license as described in our Terms of Service</li>
          <li>You are responsible for ensuring your generated content does not infringe on third-party rights</li>
        </ul>

        <h2>5. Data Retention</h2>
        <ul>
          <li><strong>Anonymous usage data:</strong> Retained for analytics purposes for up to 26 months</li>
          <li><strong>Account data:</strong> Retained while your account is active; deleted within 30 days of account deletion request</li>
          <li><strong>Generation history:</strong> Retained while your account is active; deleted with your account</li>
          <li><strong>Payment records:</strong> Retained as required by law for financial record-keeping</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Opt out of non-essential cookies</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent for data processing where applicable</li>
        </ul>
        <p>To exercise any of these rights, contact us at heroinyan@gmail.com.</p>

        <h2>7. Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your personal data, including:</p>
        <ul>
          <li>HTTPS encryption for all data transmission</li>
          <li>Secure authentication with industry-standard protocols</li>
          <li>Regular security reviews of our infrastructure</li>
          <li>Access controls limiting data access to authorized personnel only</li>
        </ul>

        <h2>8. Children&apos;s Privacy</h2>
        <p>Our service is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected information from a child under 13, please contact us and we will promptly delete it.</p>

        <h2>9. International Users</h2>
        <p>Our service is operated from the United States. If you access our service from outside the US, please be aware that your data may be transferred to, stored, and processed in the United States. By using our service, you consent to this transfer.</p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page with an updated effective date. Your continued use of the service after changes constitutes acceptance of the updated policy.</p>

        <h2>11. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or our data practices, please contact us at:</p>
        <ul>
          <li>Email: heroinyan@gmail.com</li>
          <li>Website: <a href="https://aisticker.pics">aisticker.pics</a></li>
        </ul>
      </main>
    </div>
  );
}
