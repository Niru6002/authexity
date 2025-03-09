import { ArrowUpIcon } from "@heroicons/react/24/solid";
import React, { useEffect } from "react";

const FactChecker = ({ onSubmit, isLoading, initialStatement, readOnly = false, showResults = true, results: externalResults = null }) => {
  const [statement, setStatement] = React.useState(initialStatement || "");
  const [results, setResults] = React.useState(externalResults);
  const [enhancedChunks, setEnhancedChunks] = React.useState([]);

  useEffect(() => {
    if (externalResults) {
      setResults(externalResults);
    }
  }, [externalResults]);

  useEffect(() => {
    if (results?.groundingMetadata?.groundingChunks) {
      const processChunks = async () => {
        const enhanced = await Promise.all(
          results.groundingMetadata.groundingChunks.map(async (chunk) => {
            const enhancedChunk = { ...chunk };
            
            // Extract real URL and domain
            const realUrl = await extractRealUrl(chunk);
            if (realUrl) {
              enhancedChunk.realUrl = realUrl;
              enhancedChunk.domain = extractDomain(realUrl);
              enhancedChunk.faviconUrl = getFaviconUrl(enhancedChunk.domain);
            }
            
            return enhancedChunk;
          })
        );
        
        setEnhancedChunks(enhanced);
      };
      
      processChunks();
    }
  }, [results]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (statement && statement.trim()) {
      const result = await onSubmit(statement);
      if (result) {
        setResults(result);
        setStatement("");
      }
    }
  };

  // Extract domain from URL
  const extractDomain = (url) => {
    try {
      if (!url) return null;
      
      const domain = new URL(url).hostname;
      return domain.startsWith('www.') ? domain.substring(4) : domain;
    } catch (e) {
      console.log("Error extracting domain:", e);
      return null;
    }
  };

  // Get favicon URL
  const getFaviconUrl = (domain) => {
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  // Extract real URL from Vertex AI search URL
  const extractRealUrl = async (chunk) => {
    if (!chunk.web?.uri) return null;
    
    const url = chunk.web.uri;
    
    // If it's a Vertex AI search URL, try to extract the real URL
    if (url.includes('vertexaisearch.cloud.google.com')) {
      try {
        // Try to extract from URL parameters
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const redirectUrl = urlParams.get('url') || urlParams.get('redirect') || urlParams.get('q');
        
        if (redirectUrl && redirectUrl.startsWith('http')) {
          return redirectUrl;
        }
        
        // Try to extract from title
        if (chunk.web?.title) {
          // Extract domain from title if it looks like a URL
          const urlMatch = chunk.web.title.match(/\b(https?:\/\/[^\s]+)\b/);
          if (urlMatch) return urlMatch[1];
          
          // Extract domain from title if it contains a domain
          const domainMatch = chunk.web.title.match(/\b([a-zA-Z0-9-]+\.(com|org|net|gov|edu|co|io|info))\b/i);
          if (domainMatch) return `https://${domainMatch[0]}`;
          
          // Try to infer from common news sources
          if (chunk.web.title.includes("Tribune") || chunk.web.title.toLowerCase().includes("tribune")) {
            return "https://tribune.com.pk";
          } else if (chunk.web.title.includes("CNN") || chunk.web.title.toLowerCase().includes("cnn")) {
            return "https://cnn.com";
          } else if (chunk.web.title.includes("BBC") || chunk.web.title.toLowerCase().includes("bbc")) {
            return "https://bbc.com";
          } else if (chunk.web.title.includes("New York Times") || chunk.web.title.toLowerCase().includes("nytimes")) {
            return "https://nytimes.com";
          } else if (chunk.web.title.includes("Washington Post") || chunk.web.title.toLowerCase().includes("washingtonpost")) {
            return "https://washingtonpost.com";
          } else if (chunk.web.title.includes("Reuters") || chunk.web.title.toLowerCase().includes("reuters")) {
            return "https://reuters.com";
          }
        }
        
        // Try to extract from snippet
        if (chunk.web?.snippet) {
          const urlMatch = chunk.web.snippet.match(/\b(https?:\/\/[^\s]+)\b/);
          if (urlMatch) return urlMatch[1];
          
          const domainMatch = chunk.web.snippet.match(/\b([a-zA-Z0-9-]+\.(com|org|net|gov|edu|co|io|info))\b/i);
          if (domainMatch) return `https://${domainMatch[0]}`;
        }
        
        // If all else fails, try to fetch the redirect URL
        try {
          const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
          const location = response.headers.get('location');
          if (location && location.startsWith('http')) {
            return location;
          }
        } catch (e) {
          console.log("Error fetching redirect:", e);
        }
      } catch (e) {
        console.log("Error extracting real URL:", e);
      }
    }
    
    return url;
  };

  const renderCitation = (chunk) => {
    return (
      <div key={chunk.web?.uri} className="p-4 bg-[#0d1117] rounded-lg border border-[#9987e4]/20 mb-4 hover:border-[#9987e4]/50 transition-all">
        <div className="flex items-start gap-4">
          {chunk.imageUrl && (
            <div className="flex-shrink-0">
              <img 
                src={chunk.imageUrl} 
                alt={chunk.cleanTitle || "Source"} 
                className="w-24 h-24 object-cover rounded-md"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
              {chunk.faviconUrl && (
                <img 
                  src={chunk.faviconUrl} 
                  alt={chunk.domain || "Source"} 
                  className="w-4 h-4 rounded-sm"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {chunk.domain && (
                <span className="px-2 py-1 bg-[#1f2937] rounded-md text-xs text-[#e6f4eb]/70">
                  {chunk.domain}
                </span>
              )}
              {chunk.publishDate && (
                <span className="text-xs text-[#e6f4eb]/50">
                  {new Date(chunk.publishDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <h3 className="text-[#e6f4eb] font-medium mb-2">
              {chunk.realUrl ? (
                <a 
                  href={chunk.realUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#9987e4] transition-colors"
                >
                  {chunk.cleanTitle || chunk.web?.title || "Unknown Source"}
                </a>
              ) : (
                chunk.cleanTitle || chunk.web?.title || "Unknown Source"
              )}
            </h3>
            <p className="text-[#e6f4eb]/70 text-sm">
              {chunk.web?.snippet || "No snippet available"}
            </p>
            {chunk.realUrl && (
              <a 
                href={chunk.realUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[#9987e4] hover:text-[#b4a7f8] text-sm"
              >
                Read more →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {!readOnly && (
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex flex-col p-4 rounded-xl shadow-lg border border-[#9987e4]/50 bg-[#040906]/90 transition-all hover:shadow-[0_0_15px_rgba(153,135,228,0.5)] focus-within:shadow-[0_0_20px_rgba(153,135,228,0.6)]">
            <input
              type="text"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              className="flex-grow bg-transparent outline-none text-[#e6f4eb] placeholder:text-[#e6f4eb]/50 pr-12"
              placeholder="Enter a statement to fact check..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !statement.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <div className="relative">
                <ArrowUpIcon className={`h-6 w-6 text-[#9987e4]/80 hover:text-[#9987e4] transition-all ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#9987e4]"></div>
                  </div>
                )}
              </div>
            </button>
          </div>
        </form>
      )}

      {showResults && results && (
        <div className="space-y-4 max-w-full">
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#9987e4]/30">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[#e6f4eb]/70">Accuracy Score</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-24 bg-[#1f2937] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      results.factAccuracy > 80 ? 'bg-emerald-500' :
                      results.factAccuracy > 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${results.factAccuracy}%` }}
                  />
                </div>
                <span className="font-mono text-sm">{results.factAccuracy}%</span>
              </div>
            </div>

            <div className="p-3 bg-[#161b22] rounded-lg border border-[#9987e4]/20">
              <p className="text-[#e6f4eb]">{results.verifiedStatement}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 mt-6">
            {enhancedChunks.length > 0 && (
              <div className="lg:w-1/2">
                <h3 className="text-lg font-medium text-[#e6f4eb] mb-4">Sources</h3>
                <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                  {enhancedChunks.map(renderCitation)}
                </div>
              </div>
            )}

            {results.visualContent && (
              <div className="lg:w-1/2">
                <h3 className="text-lg font-medium text-[#e6f4eb] mb-4">Visual Representation</h3>
                <div 
                  className="rounded-xl overflow-hidden bg-[#0d1117] border border-[#9987e4]/20 p-4 overflow-y-auto max-h-[600px]"
                  dangerouslySetInnerHTML={{ __html: results.visualContent }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FactChecker;
