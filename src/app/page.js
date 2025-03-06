"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [securityResult, setSecurityResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Function to check if text is a URL
  const isValidUrl = (text) => {
    try {
      new URL(text);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!url.trim() || !isValidUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }
    
    setError(null);
    setIsChecking(true);
    setSecurityResult(null);
    
    try {
      const response = await fetch('/api/security-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error(`Security check failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSecurityResult(data);
    } catch (error) {
      console.error("Error checking URL security:", error);
      setError(`Failed to check URL safety: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Calculate safety metrics from the result
  const getSafetyMetrics = (result) => {
    if (!result || !result.data || !result.data.attributes || !result.data.attributes.stats) {
      return { safe: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0 };
    }
    
    const stats = result.data.attributes.stats;
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    // A URL is safe if it has no malicious or suspicious flags
    const isSafe = stats.malicious === 0 && stats.suspicious === 0;
    
    return {
      safe: isSafe,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      total: total
    };
  };

  // Generate a safety score between 0-100
  const getSafetyScore = (metrics) => {
    if (metrics.total === 0) return 0;
    const { harmless, total, malicious, suspicious } = metrics;
    
    // Heavily penalize malicious and suspicious flags
    const maliciousWeight = 5;
    const suspiciousWeight = 2;
    
    const weightedNegative = (malicious * maliciousWeight) + (suspicious * suspiciousWeight);
    const safeScore = Math.max(0, Math.min(100, ((harmless / total) * 100) - weightedNegative));
    
    return Math.round(safeScore);
  };

  const metrics = securityResult ? getSafetyMetrics(securityResult) : null;
  const safetyScore = metrics ? getSafetyScore(metrics) : null;

  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-gray-950 text-gray-100">
      <main className="w-full max-w-2xl flex flex-col items-center gap-8 mt-20">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2">URL Safety Checker</h1>
          <p className="text-gray-400">Check if a URL is safe before visiting it</p>
        </div>
        
        {/* URL Input Form */}
        <div className="w-full">
          <form onSubmit={handleCheck} className="w-full flex flex-col gap-4">
            {/* URL Input with Animation */}
            <div 
              className={`relative w-full transition-all duration-300 ${
                isFocused ? "scale-[1.02]" : ""
              }`}
            >
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-gray-100 outline-none 
                  transition-all duration-300 focus:border-blue-500 focus:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                placeholder="Enter a URL to check (e.g. https://example.com)"
              />
              {isFocused && (
                <div className="absolute inset-0 -z-10 bg-blue-500/20 blur-md rounded-lg"></div>
              )}
            </div>
            
            {/* Check Button */}
            <button
              type="submit"
              disabled={isChecking || !isValidUrl(url)}
              className={`px-6 py-3 font-medium rounded-lg transition-all duration-300 
                transform hover:translate-y-[-2px] active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-blue-500 
                focus:ring-offset-2 focus:ring-offset-gray-900
                ${isValidUrl(url) 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
            >
              {isChecking ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Checking...
                </div>
              ) : "Check URL Safety"}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
        
        {/* Results Display */}
        {securityResult && metrics && (
          <div className="w-full mt-4">
            <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
              {/* Header */}
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold mb-2">Safety Report</h2>
                <p className="text-sm text-gray-400 break-all">{url}</p>
              </div>
              
              {/* Safety Score - Improved Layout */}
              <div className="p-6 flex flex-col items-center md:flex-row md:items-center gap-8">
                {/* Score Circle */}
                <div className="relative w-44 h-44 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      className="stroke-current text-gray-700"
                      fill="none"
                      strokeWidth="4"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`stroke-current ${
                        safetyScore > 70 ? 'text-green-500' : 
                        safetyScore > 40 ? 'text-yellow-500' : 
                        'text-red-500'
                      }`}
                      fill="none"
                      strokeWidth="4"
                      strokeDasharray={`${safetyScore}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text 
                      x="18" 
                      y="21" 
                      style={{ fontSize: '1.0rem', fontWeight: 'bold' }}
                      textAnchor="middle"
                      fill="currentColor"
                    >
                      {safetyScore}
                    </text>
                    <text 
                      x="18" 
                      y="27" 
                      style={{ fontSize: '0.15rem' }}
                      textAnchor="middle"
                      fill="currentColor"
                    >
                      SAFETY SCORE
                    </text>
                  </svg>
                </div>

                <div className="flex-1 w-full">
                  {/* Security Assessment Box */}
                  <div className={`p-4 rounded-md mb-5 ${
                    metrics.safe ? 'bg-green-900/30 border border-green-800/50' : 'bg-red-900/30 border border-red-800/50'
                  }`}>
                    <div className="flex items-center">
                      <span className="mr-3 text-2xl">
                        {metrics.safe ? '✅' : '🚫'}
                      </span>
                      <div>
                        <p className={`font-medium text-lg ${metrics.safe ? 'text-green-400' : 'text-red-400'}`}>
                          {metrics.safe ? 'Safe URL' : 'Potentially Unsafe URL'}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          {metrics.safe 
                            ? `This URL was checked by ${metrics.total} security services and found to be safe.` 
                            : `This URL was flagged by ${metrics.malicious} security services as malicious.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Metrics Grid - Improved Layout */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { key: 'malicious', label: 'Malicious', bgClass: 'bg-red-900/50', textClass: 'text-red-300' },
                      { key: 'suspicious', label: 'Suspicious', bgClass: 'bg-yellow-900/50', textClass: 'text-yellow-300' },
                      { key: 'harmless', label: 'Harmless', bgClass: 'bg-green-900/50', textClass: 'text-green-300' },
                      { key: 'undetected', label: 'Undetected', bgClass: 'bg-gray-800/80', textClass: 'text-gray-400' }
                    ].map(item => {
                      const value = metrics[item.key] || 0;
                      const isEmpty = value === 0;
                      
                      return (
                        <div 
                          key={item.key}
                          className={`p-3 rounded-lg border ${isEmpty ? 'border-gray-800 bg-gray-800/30' : `border-${item.bgClass.split('/')[0]}-800/50 ${item.bgClass}`}`}
                        >
                          <div className="text-center">
                            <p className={`text-sm font-medium ${isEmpty ? 'text-gray-500' : item.textClass}`}>
                              {item.label}
                            </p>
                            <p className={`text-2xl font-bold mt-1 ${isEmpty ? 'text-gray-600' : item.textClass}`}>
                              {value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Details Section */}
              <div className="border-t border-gray-800 p-4">
                <button 
                  onClick={() => setShowDetails(prev => !prev)}
                  className="flex items-center justify-center w-full sm:w-auto sm:justify-start text-sm text-blue-400 hover:text-blue-300 px-4 py-2 rounded-md hover:bg-gray-800/50"
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                  <svg 
                    className={`w-4 h-4 ml-1 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 111.414 1.414l-4 4a1 1 01-1.414 0l-4-4a1 1 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {showDetails && securityResult.data?.attributes?.results && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-medium text-sm border-b border-gray-800 pb-2">Security Vendor Results</h4>
                    
                    {/* Security Vendor Results - Better Organization */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                      {Object.entries(securityResult.data.attributes.results)
                        .sort((a, b) => {
                          // Sort by result category: malicious first, then suspicious, then harmless
                          const getOrder = (result) => {
                            if (result.category === 'malicious' || result.result === 'malicious') return 0;
                            if (result.category === 'suspicious' || result.result === 'suspicious') return 1;
                            if (result.category === 'harmless' || result.result === 'clean') return 2;
                            return 3;
                          };
                          return getOrder(a[1]) - getOrder(b[1]);
                        })
                        .map(([engine, result]) => (
                          <div key={engine} className="bg-gray-800/50 p-3 rounded-md text-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium truncate" title={engine}>
                                {engine}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                                result.result === 'clean' || result.category === 'harmless' 
                                  ? 'bg-green-900/50 text-green-300' 
                                  : result.result === 'malicious' || result.category === 'malicious'
                                    ? 'bg-red-900/50 text-red-300'
                                    : result.result === 'suspicious' || result.category === 'suspicious'
                                      ? 'bg-yellow-900/50 text-yellow-300'
                                      : 'bg-gray-700 text-gray-300'
                              }`}>
                                {result.category || result.result}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              Method: {result.method || 'unknown'}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
        <p>Powered by VirusTotal API</p>
        <p className="mt-1">For educational purposes only</p>
      </footer>
    </div>
  );
}
