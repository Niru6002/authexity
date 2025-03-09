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
        <div className="mt-8 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden transition-all duration-500 animate-fadeIn">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">Fact Check Results</h3>
            
            {/* Accuracy Score */}
            {results.factAccuracy && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Accuracy Score</span>
                  <span className="font-bold text-lg">{results.factAccuracy}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full ${
                      results.factAccuracy > 80 ? 'bg-green-500' : 
                      results.factAccuracy > 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${results.factAccuracy}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Verified Statement */}
            {results.verifiedStatement && (
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-sm uppercase text-gray-400 mb-2">Verified Statement</h4>
                <p className="text-white">{results.verifiedStatement}</p>
              </div>
            )}

            {/* Citations */}
            {results.citations && results.citations.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm uppercase text-gray-400 mb-2">Sources & Citations</h4>
                <div className="space-y-3">
                  {results.citations.map((citation, index) => (
                    <div key={index} className="p-3 bg-gray-700 rounded-lg">
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-medium block mb-1"
                      >
                        {citation.title || citation.url}
                      </a>
                      <p className="text-sm text-gray-300 line-clamp-2">{citation.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Representation */}
            {results.visualContent && (
              <div className="mt-6">
                <h4 className="text-sm uppercase text-gray-400 mb-2">Visual Representation</h4>
                <div 
                  className="p-4 bg-gray-700 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: results.visualContent }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add custom animation styles */}
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
      `}</style>
    </div>
  );
};

export default FactChecker;