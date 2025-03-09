import { ArrowUpIcon } from "@heroicons/react/24/solid";
import React from "react";

  const FactChecker = ({ onSubmit, isLoading, initialStatement, readOnly = false, showResults = true }) => {
  const [statement, setStatement] = React.useState(initialStatement || "");
  const [results, setResults] = React.useState(null);

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
      
      // If it's a Vertex AI search URL, try to extract the real URL
      if (url.includes('vertexaisearch.cloud.google.com')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const redirectUrl = urlParams.get('url') || urlParams.get('redirect') || urlParams.get('q');
        if (redirectUrl) {
          try {
            const extractedUrl = new URL(redirectUrl);
            return extractedUrl.hostname.startsWith('www.') 
              ? extractedUrl.hostname.substring(4) 
              : extractedUrl.hostname;
          } catch (e) {
            console.log("Invalid redirect URL:", redirectUrl);
          }
        }
      }
      
      // For regular URLs
      const domain = new URL(url).hostname;
      return domain.startsWith('www.') ? domain.substring(4) : domain;
    } catch (e) {
      return null;
    }
  };

  // Get real URL from Vertex AI search URL
  const getRealUrl = (chunk) => {
    if (!chunk.web?.uri) return null;
    
    const url = chunk.web.uri;
    if (url.includes('vertexaisearch.cloud.google.com')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const redirectUrl = urlParams.get('url') || urlParams.get('redirect') || urlParams.get('q');
      if (redirectUrl) {
        try {
          new URL(redirectUrl); // Validate URL
          return redirectUrl;
        } catch (e) {
          console.log("Invalid redirect URL:", redirectUrl);
        }
      }
      
      // If no valid redirect URL found, try to infer from title
      if (chunk.web?.title) {
        if (chunk.web.title.includes("Tribune") || chunk.web.title.toLowerCase().includes("tribune.com")) {
          return "https://tribune.com.pk";
        } else if (chunk.web.title.includes("CNN") || chunk.web.title.toLowerCase().includes("cnn.com")) {
          return "https://cnn.com";
        } else if (chunk.web.title.includes("BBC") || chunk.web.title.toLowerCase().includes("bbc.com")) {
          return "https://bbc.com";
        } else if (chunk.web.title.includes("New York Times") || chunk.web.title.toLowerCase().includes("nytimes.com")) {
          return "https://nytimes.com";
        } else if (chunk.web.title.includes("Washington Post") || chunk.web.title.toLowerCase().includes("washingtonpost.com")) {
          return "https://washingtonpost.com";
        } else if (chunk.web.title.includes("Reuters") || chunk.web.title.toLowerCase().includes("reuters.com")) {
          return "https://reuters.com";
        }
      }
    }
    
    return url;
  };

  // Get favicon URL
  const getFaviconUrl = (domain) => {
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  const renderCitation = (chunk) => {
    const realUrl = getRealUrl(chunk);
    const domain = realUrl ? extractDomain(realUrl) : null;
    const faviconUrl = domain ? getFaviconUrl(domain) : null;

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
              {faviconUrl && (
                <img 
                  src={faviconUrl} 
                  alt={domain || "Source"} 
                  className="w-4 h-4 rounded-sm"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {domain && (
                <span className="px-2 py-1 bg-[#1f2937] rounded-md text-xs text-[#e6f4eb]/70">
                  {domain}
                </span>
              )}
              {chunk.publishDate && (
                <span className="text-xs text-[#e6f4eb]/50">
                  {new Date(chunk.publishDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <h3 className="text-[#e6f4eb] font-medium mb-2">
              {realUrl ? (
                <a 
                  href={realUrl}
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
            {realUrl && (
              <a 
                href={realUrl}
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
            {results.groundingMetadata?.groundingChunks?.length > 0 && (
              <div className="lg:w-1/2">
                <h3 className="text-lg font-medium text-[#e6f4eb] mb-4">Sources</h3>
                <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                  {results.groundingMetadata.groundingChunks.map(renderCitation)}
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
