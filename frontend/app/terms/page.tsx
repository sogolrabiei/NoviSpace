import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 prose prose-sm dark:prose-invert">
        <h1>Terms and Conditions</h1>
        <p className="text-muted-foreground">Effective Date: March 16, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using NoviSpace (the "Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you must not use the Service.
        </p>
        <p>
          Your use of the Service also constitutes acceptance of our <Link href="/privacy">Privacy Policy</Link>, which is incorporated into these Terms by reference.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          NoviSpace is an AI-powered spatial design consultation service that provides:
        </p>
        <ul>
          <li>Real-time voice and video consultation using Google's Gemini AI</li>
          <li>Design recommendations for interior spaces</li>
          <li>Automated measurements and room analysis</li>
          <li>Shopping suggestions and links to third-party retailers</li>
          <li>Post-session design reports</li>
        </ul>

        <h2>3. Use License and Restrictions</h2>
        
        <h3>3.1 License Grant</h3>
        <p>
          We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service for personal, non-commercial purposes.
        </p>

        <h3>3.2 Restrictions</h3>
        <p>You agree NOT to:</p>
        <ul>
          <li>Use the Service for commercial purposes without our written consent</li>
          <li>Reverse engineer, decompile, or attempt to extract source code</li>
          <li>Use the Service to upload offensive, illegal, or harmful content</li>
          <li>Circumvent any security features or access controls</li>
          <li>Use automated tools (bots, scrapers) to access the Service</li>
          <li>Resell, redistribute, or sublicense access to the Service</li>
          <li>Interfere with or disrupt the Service's operation</li>
          <li>Violate any applicable laws or regulations</li>
        </ul>

        <h2>4. User Responsibilities</h2>
        
        <h3>4.1 Camera and Microphone Access</h3>
        <p>
          The Service requires camera and microphone access. You are responsible for:
        </p>
        <ul>
          <li>Ensuring you have the right to record and transmit video/audio from your location</li>
          <li>Respecting privacy laws and third-party rights when recording your space</li>
          <li>Not recording or transmitting content that violates others' privacy</li>
        </ul>

        <h3>4.2 Accuracy of Information</h3>
        <p>
          You are responsible for providing accurate information (budget, preferences, measurements). We are not liable for recommendations based on inaccurate input.
        </p>

        <h2>5. Disclaimer of Warranties</h2>
        
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul>
          <li><strong>Accuracy</strong>: We do not guarantee that AI-generated recommendations, measurements, or advice are accurate, complete, or suitable for your needs</li>
          <li><strong>Professional Advice</strong>: NoviSpace is NOT a substitute for professional architectural, structural engineering, or interior design services</li>
          <li><strong>Availability</strong>: We do not guarantee uninterrupted, timely, secure, or error-free service</li>
          <li><strong>Compatibility</strong>: We do not guarantee compatibility with all browsers, devices, or operating systems</li>
          <li><strong>Third-Party Services</strong>: We do not control and are not responsible for Google Gemini API availability or performance</li>
        </ul>

        <h2>6. Limitation of Liability</h2>
        
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, NOVISPACE AND ITS DEVELOPERS, CONTRIBUTORS, AND AFFILIATES SHALL NOT BE LIABLE FOR:
        </p>

        <h3>6.1 Indirect Damages</h3>
        <ul>
          <li>Any indirect, incidental, special, consequential, or punitive damages</li>
          <li>Loss of profits, revenue, data, or business opportunities</li>
          <li>Property damage resulting from use of the Service</li>
        </ul>

        <h3>6.2 Design Implementation</h3>
        <ul>
          <li>Any damages arising from implementing AI-generated design recommendations</li>
          <li>Structural issues, building code violations, or safety hazards resulting from following our advice</li>
          <li>Financial losses from purchasing recommended products or hiring contractors</li>
          <li>Dissatisfaction with design outcomes</li>
        </ul>

        <h3>6.3 Third-Party Products and Services</h3>
        <ul>
          <li>Quality, availability, or pricing of products from third-party retailers</li>
          <li>Actions or omissions of contractors, designers, or retailers you engage</li>
          <li>Errors or failures by Google Gemini API or Google Cloud Platform</li>
        </ul>

        <h3>6.4 Data Loss</h3>
        <ul>
          <li>Loss of session data stored in browser localStorage (due to browser clearing, device change, etc.)</li>
          <li>Inability to access or retrieve past consultation sessions</li>
        </ul>

        <h3>6.5 Zero Liability</h3>
        <p className="font-bold">
          NOVISPACE AND ITS DEVELOPERS ACCEPT ABSOLUTELY NO LIABILITY WHATSOEVER FOR ANY DAMAGES, LOSSES, OR HARM ARISING FROM YOUR USE OF THE SERVICE. YOU USE THIS SERVICE ENTIRELY AT YOUR OWN RISK.
        </p>
        <p>
          This is a free, open-source hackathon project provided without any guarantees or warranties of any kind.
        </p>

        <h2>7. Indemnification</h2>
        
        <p>
          You agree to indemnify, defend, and hold harmless NoviSpace and its developers from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
        </p>
        <ul>
          <li>Your use or misuse of the Service</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights (privacy, intellectual property, etc.)</li>
          <li>Implementation of design recommendations without proper professional consultation</li>
          <li>Recording or transmitting content that violates applicable laws</li>
        </ul>

        <h2>8. Professional Consultation Disclaimer</h2>
        
        <p className="font-bold">
          NOVISPACE IS AN AI-POWERED TOOL, NOT A LICENSED PROFESSIONAL SERVICE.
        </p>
        <ul>
          <li>We are NOT licensed architects, structural engineers, or interior designers</li>
          <li>Our recommendations are generated by AI and may be inaccurate or unsuitable</li>
          <li>You should consult licensed professionals before making structural changes, electrical work, or plumbing modifications</li>
          <li>We are not responsible for building code compliance, permit requirements, or safety regulations</li>
          <li>All measurements are estimates and should be verified with proper tools</li>
        </ul>

        <h2>9. Third-Party Links and Services</h2>
        
        <h3>9.1 Shopping Links</h3>
        <p>
          The Service provides shopping links to third-party retailers (Amazon, Wayfair, IKEA, CB2, Article). We:
        </p>
        <ul>
          <li>Do NOT endorse, guarantee, or warrant any products or retailers</li>
          <li>Are NOT responsible for product quality, availability, pricing, or shipping</li>
          <li>Do NOT receive commissions or affiliate revenue from these links</li>
          <li>Are NOT a party to any transactions between you and retailers</li>
        </ul>

        <h3>9.2 Google Gemini API - Third-Party Data Processing</h3>
        <p className="font-bold">
          CRITICAL: Your audio, video, and conversation data is processed by Google's Gemini AI, a third-party service.
        </p>
        <p>
          We do NOT control, store, or have access to how Google handles your data. Google's own terms and privacy policies govern their data practices:
        </p>
        <ul>
          <li>Google Terms of Service: <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">https://policies.google.com/terms</a></li>
          <li>Google Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
          <li>Gemini API Additional Terms: <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">https://ai.google.dev/gemini-api/terms</a></li>
        </ul>
        <p>
          <strong>We cannot control or guarantee:</strong>
        </p>
        <ul>
          <li>How Google processes, stores, or uses your audio/video data</li>
          <li>How long Google retains your data</li>
          <li>Whether Google uses your data for AI training or improvement</li>
          <li>Google's data security practices or breach notifications</li>
          <li>Google's compliance with privacy laws in your jurisdiction</li>
        </ul>
        <p>
          <strong>For questions about Google's data handling, contact Google directly.</strong> We are not responsible for and have no control over Google's data practices.
        </p>

        <h2>10. Intellectual Property</h2>
        
        <h3>10.1 NoviSpace Ownership</h3>
        <p>
          The Service, including its code, design, branding, and documentation, is licensed under the MIT License and available on GitHub. You may use, modify, and distribute the code subject to the MIT License terms.
        </p>

        <h3>10.2 User Content</h3>
        <p>
          You retain ownership of any content you provide (video, audio, inputs). By using the Service, you grant us a temporary license to process this content solely to provide the Service.
        </p>

        <h3>10.3 AI-Generated Content</h3>
        <p>
          Design recommendations generated by the Service are provided without warranty. You may use them for personal purposes, but we make no claims about their originality or fitness for use.
        </p>

        <h2>11. Data and Privacy</h2>
        
        <p>
          Please review our <Link href="/privacy">Privacy Policy</Link> for details on data collection and use. Key points:
        </p>
        <ul>
          <li>Session data is stored in your browser's localStorage (client-side only)</li>
          <li>Audio and video are processed in real-time and NOT stored server-side</li>
          <li>Your data is sent to Google's Gemini API for processing</li>
          <li>We do not collect user accounts, emails, or personal information</li>
        </ul>

        <h2>12. Service Modifications and Termination</h2>
        
        <h3>12.1 Right to Modify</h3>
        <p>
          We reserve the right to:
        </p>
        <ul>
          <li>Modify, suspend, or discontinue the Service at any time without notice</li>
          <li>Change pricing (if we introduce paid features in the future)</li>
          <li>Update these Terms with or without notice</li>
        </ul>

        <h3>12.2 Termination</h3>
        <p>
          We may terminate or restrict your access to the Service at any time for:
        </p>
        <ul>
          <li>Violation of these Terms</li>
          <li>Abusive or illegal use</li>
          <li>Any reason or no reason, at our sole discretion</li>
        </ul>

        <h2>13. Open Source and Hackathon Project</h2>
        
        <p>
          NoviSpace was created for the Gemini Live Agent Challenge hackathon. The source code is available on GitHub under the MIT License:
        </p>
        <p>
          <a href="https://github.com/sogolrabiei/NoviSpace" target="_blank" rel="noopener noreferrer">
            https://github.com/sogolrabiei/NoviSpace
          </a>
        </p>
        <p>
          As an open-source hackathon project:
        </p>
        <ul>
          <li>The Service may contain bugs, errors, or incomplete features</li>
          <li>Support is provided on a best-effort basis via GitHub Issues</li>
          <li>We make no guarantees about ongoing maintenance or updates</li>
        </ul>

        <h2>14. Dispute Resolution</h2>
        
        <h3>14.1 Informal Resolution</h3>
        <p>
          Before filing any legal claim, you agree to attempt informal resolution by opening an issue on our GitHub repository.
        </p>

        <h3>14.2 Arbitration</h3>
        <p>
          Any disputes that cannot be resolved informally shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive your right to a jury trial.
        </p>

        <h3>14.3 Class Action Waiver</h3>
        <p>
          You agree to resolve disputes on an individual basis only. You waive your right to participate in class actions or class-wide arbitration.
        </p>

        <h2>15. Governing Law</h2>
        
        <p>
          These Terms are governed by and construed in accordance with the laws of the Province of Ontario, Canada, without regard to conflict of law principles.
        </p>

        <h2>16. Severability</h2>
        
        <p>
          If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
        </p>

        <h2>17. Entire Agreement</h2>
        
        <p>
          These Terms, together with our Privacy Policy, constitute the entire agreement between you and NoviSpace regarding the Service.
        </p>

        <h2>18. Contact Information</h2>
        
        <p>
          For questions about these Terms, please contact us via GitHub Issues:
        </p>
        <p>
          <a href="https://github.com/sogolrabiei/NoviSpace/issues" target="_blank" rel="noopener noreferrer">
            https://github.com/sogolrabiei/NoviSpace/issues
          </a>
        </p>

        <h2>19. Acknowledgment</h2>
        
        <p className="font-bold">
          BY USING NOVISPACE, YOU ACKNOWLEDGE THAT:
        </p>
        <ul>
          <li>You have read and understood these Terms and our Privacy Policy</li>
          <li>You agree to be bound by these Terms</li>
          <li>You understand that NoviSpace is an AI tool, not a professional service</li>
          <li>You will consult licensed professionals before implementing structural or significant design changes</li>
          <li>You accept all risks associated with using AI-generated design recommendations</li>
        </ul>

        <div className="mt-12 pt-8 border-t text-xs text-muted-foreground">
          <p>Last updated: March 16, 2026</p>
          <p>
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            {" | "}
            <Link href="/" className="underline hover:text-foreground">Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
