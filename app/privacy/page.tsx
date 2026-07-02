
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#221c4e]">
      
      <div className="max-w-3xl mx-auto px-4 py-16 prose">
        <h1>Privacy Policy</h1>
        <p>Last updated: January 2024</p>

        <h2>Information We Collect</h2>
        <p>We collect information you provide during signup: name, email, phone number, country, and business details. We also collect business data you upload or enter (orders, ads, leads, inventory).</p>

        <h2>How We Use Your Information</h2>
        <p>We use your information to provide the dashboard, generate weekly reports, send email reports, and improve our service. We do not sell your data to third parties.</p>

        <h2>Data Security</h2>
        <p>Your data is stored securely in Supabase with row-level security policies. Only you and authorized team members can access your workspace data.</p>

        <h2>Email Communications</h2>
        <p>We send weekly growth reports to the email address you configure. You can change your report email or stop reports in your settings.</p>

        <h2>Data Retention</h2>
        <p>Your data is retained for as long as your account is active. You can request data deletion by contacting us.</p>

        <h2>Contact</h2>
        <p>For privacy questions, contact us at the email provided in your account settings.</p>
      </div>
    </div>
  )
}
