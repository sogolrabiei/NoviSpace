import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Effective Date: March 16, 2026</p>

        <h2>1. Introduction</h2>
        <p>
          NoviSpace ("we," "us," or "our") respects your privacy. This Privacy Policy explains how we handle information when you use our AI-powered spatial design consultation service (the "Service").
        </p>

        <h2>2. Information We Collect</h2>
        
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li><strong>Style Preferences</strong>: Responses to our style quiz (furniture preferences, color preferences, design styles)</li>
          <li><strong>Budget Information</strong>: Budget range or specific amount you provide for design projects</li>
          <li><strong>Voice & Video</strong>: Real-time audio and video captured during live consultation sessions via your device camera and microphone</li>
        </ul>

        <h3>2.2 Automatically Collected Information</h3>
        <ul>
          <li><strong>Session Data</strong>: Conversation transcripts, AI-generated design recommendations, room measurements, and bookmarked ideas</li>
          <li><strong>Device Information</strong>: Browser type, device type, and screen resolution (for optimal display)</li>
          <li><strong>Usage Data</strong>: Session duration, features used, and interaction patterns</li>
        </ul>

        <h3>2.3 Information We Do NOT Collect</h3>
        <ul>
          <li>No user accounts, email addresses, or names</li>
          <li>No payment information (we do not process transactions)</li>
          <li>No IP addresses or precise geolocation</li>
          <li>No cookies or persistent tracking identifiers</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        
        <h3>3.1 Service Delivery</h3>
        <ul>
          <li>Process audio and video in real-time to provide AI-powered design consultation</li>
          <li>Generate personalized design recommendations based on your space and preferences</li>
          <li>Create post-session reports with bookmarks, measurements, and shopping links</li>
        </ul>

        <h3>3.2 Service Improvement</h3>
        <ul>
          <li>Improve AI model accuracy and response quality</li>
          <li>Enhance user experience and interface design</li>
          <li>Develop new features and functionality</li>
        </ul>

        <h2>4. How We Store Your Information</h2>
        
        <h3>4.1 Local Storage (Your Device)</h3>
        <p>
          All session data (transcripts, bookmarks, measurements, budget tracking) is stored exclusively in your browser's localStorage. This data:
        </p>
        <ul>
          <li>Remains on your device and is never uploaded to our servers</li>
          <li>Can be deleted at any time by clearing your browser data</li>
          <li>Is not accessible to us or any third parties</li>
          <li>Is lost if you use a different browser or device</li>
        </ul>

        <h3>4.2 Server-Side Processing (Temporary)</h3>
        <p>
          During active consultation sessions, audio and video data is:
        </p>
        <ul>
          <li>Transmitted in real-time to our backend server and Google's Gemini API</li>
          <li>Processed immediately and discarded</li>
          <li>NOT stored, logged, or retained after the session ends</li>
          <li>Encrypted in transit using industry-standard protocols (TLS/SSL)</li>
        </ul>

        <h2>5. Third-Party Services</h2>
        
        <h3>5.1 Google Gemini API</h3>
        <p>
          We use Google's Gemini AI to power our design consultation service. When you use NoviSpace:
        </p>
        <ul>
          <li>Your audio, video, and conversation are sent to Google's Gemini API for real-time processing</li>
          <li>Google may use this data in accordance with their own privacy policy and terms of service</li>
          <li>Google's privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
          <li>We do not control and are not responsible for Google's data handling practices</li>
        </ul>

        <h3>5.2 Google Cloud Platform</h3>
        <p>
          Our Service is hosted on Google Cloud Run. Google may collect standard web server logs (timestamps, request types, response codes) for infrastructure purposes. We do not have access to or control over this logging.
        </p>

        <h3>5.3 Shopping Link Redirects</h3>
        <p>
          Post-session reports include shopping links to third-party retailers (Amazon, Wayfair, IKEA, CB2, Article). When you click these links:
        </p>
        <ul>
          <li>You leave NoviSpace and are subject to the retailer's privacy policy</li>
          <li>We do not track clicks or receive any information about your purchases</li>
          <li>We are not affiliated with and do not endorse any retailer</li>
        </ul>

        <h2>6. Data Sharing and Disclosure</h2>
        
        <p>We do NOT sell, rent, or share your personal information with third parties, except:</p>
        
        <h3>6.1 Service Providers</h3>
        <ul>
          <li>Google (Gemini API and Cloud Platform) as described above</li>
        </ul>

        <h3>6.2 Legal Requirements</h3>
        <ul>
          <li>If required by law, court order, or government regulation</li>
          <li>To protect our rights, safety, or property</li>
          <li>To investigate fraud or security issues</li>
        </ul>

        <h3>6.3 Business Transfers</h3>
        <ul>
          <li>In connection with a merger, acquisition, or sale of assets (though we collect minimal data)</li>
        </ul>

        <h2>7. Your Rights and Choices</h2>
        
        <h3>7.1 Access and Deletion</h3>
        <ul>
          <li><strong>Local Data</strong>: You can delete all NoviSpace data by clearing your browser's localStorage</li>
          <li><strong>Camera/Microphone</strong>: You can revoke camera and microphone permissions in your browser settings at any time</li>
          <li><strong>Opt-Out</strong>: Simply stop using the Service to stop data processing</li>
        </ul>

        <h3>7.2 Data Portability</h3>
        <ul>
          <li>Session reports are available for download as JSON files from your browser's localStorage</li>
          <li>You can manually export this data at any time using browser developer tools</li>
        </ul>

        <h2>8. Data Security</h2>
        
        <p>We implement reasonable security measures:</p>
        <ul>
          <li><strong>Encryption in Transit</strong>: All data transmitted between your browser and our servers uses HTTPS/WSS (TLS 1.2+)</li>
          <li><strong>No Persistent Storage</strong>: We do not store session data server-side, reducing breach risk</li>
          <li><strong>Access Controls</strong>: Our infrastructure uses IAM roles with least-privilege access</li>
        </ul>

        <p>
          However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.
        </p>

        <h2>9. Children's Privacy</h2>
        
        <p>
          NoviSpace is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.
        </p>

        <h2>10. International Users</h2>
        
        <p>
          Our Service is hosted in the United States (Google Cloud us-central1 region). If you access NoviSpace from outside the US:
        </p>
        <ul>
          <li>Your data may be transferred to and processed in the United States</li>
          <li>The US may have different data protection laws than your country</li>
          <li>By using our Service, you consent to this transfer</li>
        </ul>

        <h2>11. Changes to This Privacy Policy</h2>
        
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Effective Date." Your continued use of the Service after changes constitutes acceptance of the updated policy.
        </p>

        <h2>12. Contact Us</h2>
        
        <p>
          If you have questions about this Privacy Policy or our data practices, please contact us by opening an issue on our GitHub repository:
        </p>
        <p>
          <a href="https://github.com/sogolrabiei/NoviSpace/issues" target="_blank" rel="noopener noreferrer">
            https://github.com/sogolrabiei/NoviSpace/issues
          </a>
        </p>

        <h2>13. Disclaimer of Warranties</h2>
        
        <p>
          NoviSpace is provided "AS IS" and "AS AVAILABLE" without any warranties. We make no guarantees about:
        </p>
        <ul>
          <li>Data accuracy, completeness, or reliability</li>
          <li>Service availability or uninterrupted access</li>
          <li>Security of data transmission</li>
          <li>Third-party service performance (Google Gemini API)</li>
        </ul>

        <div className="mt-12 pt-8 border-t text-xs text-muted-foreground">
          <p>Last updated: March 16, 2026</p>
          <p>
            <Link href="/terms" className="underline hover:text-foreground">Terms and Conditions</Link>
            {" | "}
            <Link href="/" className="underline hover:text-foreground">Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
