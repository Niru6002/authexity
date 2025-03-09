import { useState, useEffect } from 'react';
import { ArrowUpIcon } from "@heroicons/react/24/solid";

const FactChecker = ({ onSubmit, isLoading, results }) => {
  const [inputText, setInputText] = useState('');
  const [isBlurred, setIsBlurred] = useState(false);

  const handleFocus = () => setIsBlurred(true);
  const handleBlur = () => {
    if (!inputText.trim()) {
      setIsBlurred(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmit(inputText);
    }
  };

  // CSS animation for neon effect
  const neonPulse = {
    animation: 'neonPulse 1.5s ease-in-out infinite alternate'
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Input container with blur effect */}
      <div className={`relative transition-all duration-500 ${isBlurred ? 'backdrop-blur-md' : ''}`}>
        <div 
          className={`
            relative p-6 rounded-xl border-2 transition-all duration-300
            ${isBlurred 
              ? 'border-blue-500 shadow-lg shadow-blue-500/30' 
              : 'border-gray-700 shadow-md'
            }
          `}
          style={isBlurred ? neonPulse : {}}
        >
          <h2 className="text-2xl font-bold mb-4 text-center">
            <span className="text-blue-400">Fact</span> Checker
          </h2>
          
          <form onSubmit={handleSubmit}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full p-4 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-all duration-300 min-h-[120px]"
              placeholder="Enter a statement to fact check..."
            />
            
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300
                  ${isLoading 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpIcon className="h-5 w-5" />
                    <span>Verify Facts</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results display */}
      {results && (
        <div className="mt-8 bg-[#040906]/80 border border-[#6e335f]/30 rounded-xl overflow-hidden transition-all duration-500 animate-fadeIn" ref={(el) => {
          // Auto-scroll to results when they appear
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-6 text-center">Fact Check Results</h3>
            
            {/* Accuracy Score */}
            {results.factAccuracy && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Accuracy Score</span>
                  <span className="font-bold text-lg">{results.factAccuracy}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full ${
                      results.factAccuracy > 80 ? 'bg-[#9987e4]' : 
                      results.factAccuracy > 50 ? 'bg-[#b27358]' : 'bg-red-500'
                    }`}
                    style={{ width: `${results.factAccuracy}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Verified Statement */}
            {results.verifiedStatement && (
              <div className="mb-6 p-4 bg-[#0d1311] border border-[#6e335f]/20 rounded-lg">
                <h4 className="text-sm uppercase text-gray-400 mb-2">Verified Statement</h4>
                <p className="text-white">{results.verifiedStatement}</p>
              </div>
            )}

            {/* Two-column layout for Visual Content and Citations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Visual Representation */}
              {results.visualContent && (
                <div>
                  <h4 className="text-sm uppercase text-gray-400 mb-3">Visual Representation</h4>
                  <div 
                    className="p-4 bg-[#0d1311] border border-[#6e335f]/20 rounded-lg h-full"
                    dangerouslySetInnerHTML={{ __html: results.visualContent }}
                  />
                </div>
              )}

              {/* Citations */}
              {results.citations && results.citations.length > 0 && (
                <div>
                  <h4 className="text-sm uppercase text-gray-400 mb-3">News & Sources</h4>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {results.citations.map((citation, index) => {
                      // Get favicon URL from domain
                      const faviconUrl = citation.domain ? `https://www.google.com/s2/favicons?domain=${citation.domain}&sz=64` : "";
                      
                      return (
                        <div key={index} className="bg-[#0d1311] rounded-lg overflow-hidden border border-[#6e335f]/20 hover:border-[#9987e4] transition-all duration-300">
                          <a 
                            href={citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {citation.imageUrl && (
                              <div className="relative w-full h-40 overflow-hidden">
                                <img 
                                  src={citation.imageUrl} 
                                  alt={citation.title || "Source image"} 
                                  className="w-full h-full object-cover"
                                />
                                {citation.confidence !== undefined && (
                                  <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      citation.confidence > 0.7 ? 'bg-[#9987e4]' : 
                                      citation.confidence > 0.4 ? 'bg-[#b27358]' : 'bg-red-600'
                                    }`}>
                                      {(citation.confidence * 100).toFixed(0)}% confidence
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                {faviconUrl && (
                                  <img 
                                    src={faviconUrl} 
                                    alt="Site icon" 
                                    className="w-4 h-4 rounded-sm flex-shrink-0"
                                  />
                                )}
                                <span className="text-xs text-gray-400">{citation.domain || "Unknown source"}</span>
                                {citation.publishDate && (
                                  <span className="text-xs text-gray-500">
                                    • {new Date(citation.publishDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              
                              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 hover:text-[#9987e4]">
                                {citation.title || "Source Article"}
                              </h3>
                              
                              {citation.snippet && (
                                <p className="text-sm text-gray-300 line-clamp-3 mb-3">{citation.snippet}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-xs bg-[#0d1311] border border-[#6e335f]/30 px-2 py-1 rounded-full flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                  </svg>
                                  Read more
                                </span>
                              </div>
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Grounding Metadata */}
            {results.groundingMetadata && (
              <div className="mt-6">
                <h4 className="text-sm uppercase text-gray-400 mb-2">Grounding Information</h4>
                
                {/* Overall Confidence */}
                {results.groundingMetadata.confidence !== undefined && (
                  <div className="mb-4 p-3 bg-[#0d1311] border border-[#6e335f]/20 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Overall Grounding Confidence</span>
                      <span className="font-bold">{(results.groundingMetadata.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          results.groundingMetadata.confidence > 0.7 ? 'bg-[#9987e4]' : 
                          results.groundingMetadata.confidence > 0.4 ? 'bg-[#b27358]' : 'bg-red-500'
                        }`}
                        style={{ width: `${results.groundingMetadata.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Search Queries */}
                {results.groundingMetadata.webSearchQueries && results.groundingMetadata.webSearchQueries.length > 0 && (
                  <div className="mb-4 p-3 bg-[#0d1311] border border-[#6e335f]/20 rounded-lg">
                    <h5 className="text-xs uppercase text-gray-400 mb-2">Search Queries Used</h5>
                    <div className="flex flex-wrap gap-2">
                      {results.groundingMetadata.webSearchQueries.map((query, index) => (
                        <span key={index} className="px-2 py-1 bg-[#0d1311] border border-[#6e335f]/30 rounded-full text-xs">
                          {query}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add custom animation and scrollbar styles */}
      <style jsx>{`
        @keyframes neonPulse {
          from {
            box-shadow: 0 0 5px #0ea5e9, 0 0 10px #0ea5e9, 0 0 15px #0ea5e9;
          }
          to {
            box-shadow: 0 0 10px #0ea5e9, 0 0 20px #0ea5e9, 0 0 30px #0ea5e9;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d1311;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6e335f;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9987e4;
        }
      `}</style>
    </div>
  );
};

export default FactChecker;