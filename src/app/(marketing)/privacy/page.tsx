export default function PrivacyPage() {
  return (
    <div className="py-16 max-w-3xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-text-secondary mb-8">Last updated: January 2025</p>

      <div className="prose max-w-none space-y-6 text-text-secondary">
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-3">1. Information We Collect</h2>
          <p>We collect information you provide directly (name, email, firm), information from your use of the service (search queries, documents, chats), and technical data (browser type, IP address, cookies).</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-3">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve the service, personalize your experience, communicate with you, and ensure security. We do not sell your personal information to third parties.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-3">3. Data Security</h2>
          <p>We implement industry-standard security measures including encryption at rest and in transit, secure authentication, and regular security audits to protect your data.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-3">4. AI Processing</h2>
          <p>Your queries may be processed by our AI systems including third-party AI providers (OpenAI). We do not use your queries to train AI models. Queries are processed to generate responses and may be cached briefly for performance.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-3">5. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. You can manage your data from your account settings or by contacting us at privacy@jusconsultus.ai.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-3">6. Cookies</h2>
          <p>We use essential cookies for authentication and preference cookies to remember your settings. You can disable cookies in your browser, though this may affect functionality.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-3">7. Contact</h2>
          <p>For privacy questions or requests, contact: privacy@jusconsultus.ai</p>
        </section>
      </div>
    </div>
  );
}
