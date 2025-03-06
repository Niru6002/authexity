'use client';
import { useState } from 'react';

export default function SecurityScanner() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/security-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan URL');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">URL Security Scanner</h2>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to scan"
            required
            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-bold mb-2">
            Scan Results for <span className="text-blue-600 break-all">{result.url}</span>
          </h3>
          
          {result.status === 'completed' ? (
            <>
              <div className={`p-3 rounded-md mb-3 ${result.isSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <p className="font-bold">
                  {result.isSafe 
                    ? 'This website appears to be safe.' 
                    : 'Warning: This website may be unsafe!'}
                </p>
              </div>
              
              <div className="text-sm">
                <h4 className="font-bold mb-1">Analysis Summary:</h4>
                <ul className="grid grid-cols-2 gap-2">
                  <li className="flex justify-between">
                    <span>Harmless:</span>
                    <span className="font-bold text-green-600">{result.stats.harmless}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Malicious:</span>
                    <span className="font-bold text-red-600">{result.stats.malicious}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Suspicious:</span>
                    <span className="font-bold text-yellow-600">{result.stats.suspicious}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Undetected:</span>
                    <span className="font-bold">{result.stats.undetected}</span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <p>Analysis status: {result.status}</p>
          )}
        </div>
      )}
    </div>
  );
}
