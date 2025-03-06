import SecurityScanner from '@/components/SecurityScanner';

export const metadata = {
  title: 'URL Security Scanner',
  description: 'Scan URLs to check if they are safe to visit',
};

export default function SecurityScannerPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">URL Security Scanner</h1>
      <p className="text-center mb-6 text-gray-600">
        Enter a URL to check if it's safe to visit. This tool uses VirusTotal to analyze URLs for potential threats.
      </p>
      <SecurityScanner />
    </div>
  );
}
