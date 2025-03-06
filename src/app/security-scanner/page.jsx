import SecurityScanner from "@/components/SecurityScanner";

export const metadata = {
  title: 'URL Security Scanner',
  description: 'Check if a URL is safe before visiting it',
}

export default function SecurityScannerPage() {
  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-gray-950 text-gray-100">
      <main className="w-full max-w-4xl flex flex-col items-center gap-8 mt-20">
        <SecurityScanner />
      </main>
      
      <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
        <p>Powered by VirusTotal API</p>
        <p className="mt-1">For educational purposes only</p>
      </footer>
    </div>
  );
}
