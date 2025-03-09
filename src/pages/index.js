import { useState } from "react";
import {
  PaperClipIcon,
  XCircleIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/solid";
import axios from "axios";
import { extractLinks, scrapeWebsiteContent } from "../utils/linkscrapper";
import { analyzeScamText, factCheckStatement } from "../utils/gemini";
import FactChecker from "../components/FactChecker";

export default function Home() {
  const [inputFocused, setInputFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [showFeatures, setShowFeatures] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState(null);


  const features = [
    { id: "deepfake", name: "Deepfake Spotting", description: "Detect AI-generated deepfake content.", icon: "🎭" },
    { id: "nudity", name: "Nudity Detection", description: "Detect nudity or inappropriate content.", icon: "🚫" },
    { id: "scam", name: "Scam Detection", description: "Identify scam and phishing content.", icon: "⚠️" },
    { id: "factcheck", name: "Fact Checker", description: "Verify facts with web search.", icon: "🔍" },
    { id: "violence", name: "Violence Detection", description: "Detect violent or graphic content.", icon: "🔪" },
    { id: "qr-content", name: "QR Code Analysis", description: "Extract and analyze QR codes in images.", icon: "📸" },
    { id: "genai", name: "AI-Generated ", description: "Identify AI-generated media.", icon: "🤖" },
    { id: "text-moderation", name: "Text Moderation", description: "Detect harmful or offensive text.", icon: "📜" },
  ];

  const processTextAnalysis = async () => {
    if (!inputText.trim()) return;
  
    // Extract links from the text
    const links = extractLinks(inputText);
    let linkContent = "";
    let scrapedLinks = [];
  
    // Scrape content from each link
    for (let link of links) {
      const scrapedData = await scrapeWebsiteContent(link);
      
      // Add structured data to the array
      scrapedLinks.push(scrapedData);
      
      // Also prepare text content for analysis
      linkContent += `\n[${link}]: ${scrapedData.textContent}`;
      
      // Add metadata for analysis
      if (scrapedData.title) {
        linkContent += `\nTitle: ${scrapedData.title}`;
      }
      if (scrapedData.description) {
        linkContent += `\nDescription: ${scrapedData.description}`;
      }
    }
  
    // Analyze the text and link content with Gemini
    const analysisResponse = await analyzeScamText(inputText, linkContent);
  
    // Add the analysis to the chat
    const newMessage = {
      text: inputText,
      type: "text",
      timestamp: new Date().toISOString(),
      analysis: analysisResponse,
      links: scrapedLinks // Include the rich link data
    };
  
    setChatMessages([...chatMessages, newMessage]);
    setInputText("");
  };

  const processFactCheck = async (statement) => {
    if (!statement.trim()) return;
    
    setIsFactChecking(true);
    
    try {
      console.log("Starting fact check for statement:", statement);
      
      // Perform fact checking
      const results = await factCheckStatement(statement);
      console.log("Fact check results:", results);
      
      // Validate the results structure
      if (!results || typeof results !== 'object') {
        throw new Error("Invalid response format: results is not an object");
      }
      
      // Ensure required fields exist
      if (results.factAccuracy === undefined) {
        console.warn("Missing factAccuracy in results, defaulting to 50");
        results.factAccuracy = 50;
      }
      
      if (!results.verifiedStatement) {
        console.warn("Missing verifiedStatement in results, using original statement");
        results.verifiedStatement = statement;
      }
      
      if (!Array.isArray(results.citations)) {
        console.warn("Missing or invalid citations array in results, defaulting to empty array");
        results.citations = [];
      }
      
      if (!results.visualContent) {
        console.warn("Missing visualContent in results, creating default visualization");
        results.visualContent = `<div style="padding: 15px; background-color: #2d3748; border-radius: 8px;">
          <h3 style="color: #e2e8f0; margin-top: 0;">Fact Check Results</h3>
          <p style="color: #e2e8f0;">Statement: ${statement}</p>
          <p style="color: #e2e8f0;">Accuracy: ${results.factAccuracy}%</p>
        </div>`;
      }
      
      // Set the results
      setFactCheckResults(results);
      
      // Add to chat messages
      const newMessage = {
        text: statement,
        type: "factcheck",
        timestamp: new Date().toISOString(),
        factCheck: results
      };
      
      setChatMessages([...chatMessages, newMessage]);
    } catch (error) {
      console.error("Error during fact checking:", error);
      
      // Create an error message for the user
      const errorResults = {
        factAccuracy: 0,
        verifiedStatement: "Unable to verify statement due to a system error.",
        citations: [],
        visualContent: `<div style="padding: 15px; background-color: #2d3748; border-radius: 8px; border-left: 4px solid #f56565;">
          <h3 style="color: #f56565; margin-top: 0;">System Error</h3>
          <p style="color: #e2e8f0;">The fact checking system encountered an error: ${error.message}</p>
        </div>`
      };
      
      setFactCheckResults(errorResults);
      
      // Add error message to chat
      const errorMessage = {
        text: statement,
        type: "factcheck",
        timestamp: new Date().toISOString(),
        factCheck: errorResults
      };
      
      setChatMessages([...chatMessages, errorMessage]);
    } finally {
      setIsFactChecking(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleFeature = (id) => {
    setSelectedFeatures(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const processImages = async () => {
    if (attachments.length === 0) return;

    // Simulate image processing
    const newMessages = await Promise.all(attachments.map(async (file) => {
      // This is a placeholder for actual image processing
      // In a real app, you would send the image to your API
      const mockResults = {
        nudity: { safe: Math.random() },
        type: { deepfake: Math.random() },
        qr: { link: Math.random() > 0.5 ? [{ match: "https://example.com" }] : [] }
      };

      return {
        image: URL.createObjectURL(file),
        type: "image",
        timestamp: new Date().toISOString(),
        results: mockResults
      };
    }));

    setChatMessages([...chatMessages, ...newMessages]);
    setAttachments([]);
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
  
    // If Scam Detection is selected, analyze the text
    if (selectedFeatures.includes("scam")) {
      await processTextAnalysis();
      return;
    }
    
    // If Fact Checker is selected, perform fact checking
    if (selectedFeatures.includes("factcheck")) {
      await processFactCheck(inputText);
      setInputText("");
      return;
    }
  
    // Otherwise, just add the text to the chat
    const newMessage = {
      text: inputText,
      type: "text",
      timestamp: new Date().toISOString(),
    };
  
    setChatMessages([...chatMessages, newMessage]);
    setInputText("");
  };
  
  return (
    <div className="min-h-screen bg-[#040906] text-[#e6f4eb] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6">
        <div className="text-4xl font-bold flex items-center justify-center space-x-2">
          <span className="text-[#9987e4]"></span>
          <span>Hi, I&apos;m Authexity.</span>
        </div>
        <p className="text-[#e6f4eb]/70 mt-2">Your place for fact-checking and uncovering the truth. </p>
      </div>

      {showFeatures && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl mb-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all transform relative cursor-pointer ${
                selectedFeatures.includes(feature.id) 
                  ? "border-[#9987e4] shadow-lg shadow-[#9987e4]/30 bg-[#9987e4]/10 hover:scale-105" 
                  : "bg-[#040906]/80 shadow-md hover:bg-[#040906]/60 hover:scale-105"
              }`}
              onClick={() => toggleFeature(feature.id)}
            >
              <div className="text-3xl">{feature.icon}</div>
              <h2 className="text-lg font-semibold mt-2">{feature.name}</h2>
              <p className="text-sm text-[#b4a7f8]/70">{feature.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Show Fact Checker UI when factcheck feature is selected */}
      {selectedFeatures.includes("factcheck") && (
        <div className="w-full max-w-4xl mb-10">
          <FactChecker 
            onSubmit={processFactCheck} 
            isLoading={isFactChecking} 
            results={factCheckResults} 
          />
        </div>
      )}

      {/* Only show the input box if factcheck is not selected */}
      {!selectedFeatures.includes("factcheck") && (
        <div className="fixed bottom-10 w-full max-w-2xl p-4">
          <div className="relative flex flex-col p-4 rounded-xl shadow-lg border border-[#9987e4]/50 bg-[#040906]/90 transition-all hover:shadow-[0_0_15px_rgba(153,135,228,0.5)] focus-within:shadow-[0_0_20px_rgba(153,135,228,0.6)]">
          {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 w-full">
                {attachments.map((file, index) => (
                  <div key={index} className="relative w-16 h-16 bg-[#040906] flex items-center justify-center rounded-md border border-[#9987e4]/30">
                    <img src={URL.createObjectURL(file)} alt="attachment" className="w-full h-full object-cover rounded-md opacity-90" />
                    <XCircleIcon 
                    className="absolute -top-2 -right-2 h-5 w-5 text-[#9987e4] bg-[#040906] rounded-full cursor-pointer hover:text-white transition-colors" 
                    onClick={() => removeAttachment(index)} 
                  />
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center w-full">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-grow bg-transparent outline-none text-[#e6f4eb] placeholder:text-[#e6f4eb]/50"
                placeholder="Type your message here..."
                onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
              <input type="file" multiple className="hidden" id="fileUpload" onChange={handleFileUpload} />
              <div className="flex items-center">
                <label htmlFor="fileUpload" className="p-2 text-[#9987e4]/80 hover:text-[#9987e4] hover:glow-[#9987e4] cursor-pointer transition-all">
                  <PaperClipIcon className="h-6 w-6" />
                </label>
                <button 
                  className="p-2 text-[#9987e4]/80 hover:text-[#9987e4] cursor-pointer transition-all" 
                  onClick={inputText.trim() ? handleTextSubmit : processImages}
                >
                  <ArrowUpIcon className="h-6 w-6" />
                </button>
              </div>
          </div>
          </div>
        </div>
      )}

      {/* Display chat messages with formatted results */}
      <div className="w-full max-w-2xl mt-10">
        {chatMessages.map((msg, index) => (
          <div key={index} className="bg-[#040906]/80 border border-[#6e335f]/30 p-6 rounded-lg shadow-md mt-4 flex items-start gap-6">
            {msg.type === "image" ? (
              <>
                <img src={msg.image} alt="Analyzed" className="w-24 h-24 rounded-md object-cover" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Analysis Result</h3>
                  {msg.results.nudity && (
                    <div className="mb-2">
                      <span className="font-semibold text-[#9987e4]">Nudity:</span>{" "}
                      <span className={`px-2 py-1 text-sm rounded-md ${
                        msg.results.nudity.safe > 0.8 ? "bg-[#9987e4]" : "bg-[#b27358]"
                      }`}>
                        Safe: {(msg.results.nudity.safe * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {msg.results.type?.deepfake !== undefined && (
                    <div className="mb-2">
                      <span className="font-semibold text-[#9987e4]">Deepfake:</span>{" "}
                      <span className={`px-2 py-1 text-sm rounded-md ${
                        msg.results.type.deepfake > 0.5 ? "bg-[#b27358]" : "bg-[#9987e4]"
                      }`}>
                        {(msg.results.type.deepfake * 100).toFixed(1)}% Confidence
                      </span>
                    </div>
                  )}
                  {msg.results.qr?.link.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#9987e4]">QR Code URL:</span>{" "}
                      <a href={msg.results.qr.link[0].match} className="text-[#b27358] underline">
                        {msg.results.qr.link[0].match}
                      </a>
                    </div>
                  )}
                </div>
              </>
            ) : msg.type === "factcheck" ? (
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Fact Check Result</h3>
                <p className="text-lg mb-3">{msg.text}</p>
                
                {msg.factCheck?.factAccuracy !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-300">Accuracy Score</span>
                      <span className="font-bold">{msg.factCheck.factAccuracy}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          msg.factCheck.factAccuracy > 80 ? 'bg-green-500' : 
                          msg.factCheck.factAccuracy > 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${msg.factCheck.factAccuracy}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {msg.factCheck?.verifiedStatement && (
                  <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                    <p className="text-white">{msg.factCheck.verifiedStatement}</p>
                  </div>
                )}
                
                {msg.factCheck?.visualContent && (
                  <div 
                    className="mt-3"
                    dangerouslySetInnerHTML={{ __html: msg.factCheck.visualContent }}
                  />
                )}
                
                {/* Citations with confidence scores */}
                {msg.factCheck?.citations && msg.factCheck.citations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm uppercase text-gray-400 mb-2">Sources</h4>
                    <div className="space-y-2">
                      {msg.factCheck.citations.map((citation, idx) => (
                        <div key={idx} className="p-2 bg-gray-700 rounded-lg">
                          <div className="flex justify-between items-center">
                            <a 
                              href={citation.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              {citation.title || citation.url}
                            </a>
                            {citation.confidence !== undefined && (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                citation.confidence > 0.7 ? 'bg-green-600' : 
                                citation.confidence > 0.4 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}>
                                {(citation.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Grounding Metadata with Images */}
                {msg.factCheck?.groundingMetadata?.groundingChunks && 
                 msg.factCheck.groundingMetadata.groundingChunks.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm uppercase text-gray-400 mb-2">Grounding Sources</h4>
                    <div className="space-y-2">
                      {msg.factCheck.groundingMetadata.groundingChunks.map((chunk, idx) => {
                        // Check if chunk has an image
                        const hasImage = chunk.web?.imageUrl || chunk.web?.thumbnailUrl;
                        
                        return (
                          <div key={idx} className="p-2 bg-gray-700 rounded-lg">
                            {hasImage && (
                              <div className="mb-2">
                                <img 
                                  src={chunk.web?.imageUrl || chunk.web?.thumbnailUrl} 
                                  alt={chunk.web?.title || "Source image"} 
                                  className="w-full max-h-32 object-contain rounded-md"
                                />
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <a 
                                href={chunk.web?.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                {chunk.web?.title || chunk.web?.uri || "Source"}
                              </a>
                              {chunk.confidence !== undefined && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  chunk.confidence > 0.7 ? 'bg-green-600' : 
                                  chunk.confidence > 0.4 ? 'bg-yellow-600' : 'bg-red-600'
                                }`}>
                                  {(chunk.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1">
                <span className="text-lg">{msg.text}</span>
                
                {msg.analysis && (
                  <div className="mt-3 p-4 bg-gray-700 rounded-lg">
                    <div className="mb-2">
                      <span className="font-semibold text-blue-400">Spam Score:</span>{" "}
                      <span className={`px-2 py-1 text-sm rounded-md ${
                        msg.analysis.spamScore < 30 ? "bg-green-500" : 
                        msg.analysis.spamScore < 70 ? "bg-yellow-500" : "bg-red-500"
                      }`}>
                        {msg.analysis.spamScore}%
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <span className="font-semibold text-blue-400">Danger Score:</span>{" "}
                      <span className={`px-2 py-1 text-sm rounded-md ${
                        msg.analysis.dangerScore < 30 ? "bg-green-500" : 
                        msg.analysis.dangerScore < 70 ? "bg-yellow-500" : "bg-red-500"
                      }`}>
                        {msg.analysis.dangerScore}%
                      </span>
                    </div>
                    
                    {msg.analysis.warnings && msg.analysis.warnings.length > 0 && (
                      <div>
                        <span className="font-semibold text-blue-400">Warnings:</span>
                        <ul className="list-disc list-inside mt-1">
                          {msg.analysis.warnings.map((warning, i) => (
                            <li key={i} className="text-yellow-300">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Display rich content from links */}
                {msg.links && msg.links.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2 text-[#9987e4]">Linked Content</h3>
                    <div className="space-y-4">
                      {msg.links.map((link, i) => (
                        <div key={i} className="border border-[#6e335f]/30 rounded-lg overflow-hidden bg-[#040906]/90">
                          {/* Link header with favicon and URL */}
                          <div className="flex items-center p-3 bg-[#0a0f0c] border-b border-[#6e335f]/30">
                            {link.metadata?.favicon && (
                              <img 
                                src={link.metadata.favicon} 
                                alt="Site icon" 
                                className="w-4 h-4 mr-2"
                                onError={(e) => e.target.style.display = 'none'} 
                              />
                            )}
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#b27358] text-sm truncate hover:underline"
                            >
                              {link.url}
                            </a>
                          </div>
                          
                          <div className="p-4">
                            {/* Title and description */}
                            {link.title && (
                              <h4 className="text-lg font-semibold mb-1">{link.title}</h4>
                            )}
                            {link.description && (
                              <p className="text-sm text-gray-300 mb-3">{link.description}</p>
                            )}
                            
                            {/* Display main image if available */}
                            {(link.metadata?.ogImage || (link.images && link.images.length > 0)) && (
                              <div className="mb-3">
                                <img 
                                  src={link.metadata?.ogImage || link.images[0].url} 
                                  alt={link.images?.[0]?.alt || "Website preview"} 
                                  className="w-full h-auto max-h-48 object-cover rounded-md"
                                  onError={(e) => e.target.style.display = 'none'} 
                                />
                              </div>
                            )}
                            
                            {/* Additional metadata */}
                            <div className="text-xs text-gray-400 flex flex-wrap gap-3">
                              {link.metadata?.author && (
                                <span>Author: {link.metadata.author}</span>
                              )}
                              {link.metadata?.publishedDate && (
                                <span>Published: {new Date(link.metadata.publishedDate).toLocaleDateString()}</span>
                              )}
                              {link.metadata?.ogType && (
                                <span>Type: {link.metadata.ogType}</span>
                              )}
                            </div>
                            
                            {/* Image gallery (if multiple images) */}
                            {link.images && link.images.length > 1 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-semibold mb-2 text-gray-300">Images</h5>
                                <div className="flex flex-wrap gap-2">
                                  {link.images.slice(0, 4).map((img, imgIndex) => (
                                    <img 
                                      key={imgIndex} 
                                      src={img.url} 
                                      alt={img.alt || `Image ${imgIndex + 1}`} 
                                      className="w-16 h-16 object-cover rounded-md"
                                      onError={(e) => e.target.style.display = 'none'} 
                                    />
                                  ))}
                                  {link.images.length > 4 && (
                                    <div className="w-16 h-16 bg-[#0a0f0c] rounded-md flex items-center justify-center text-gray-400">
                                      +{link.images.length - 4}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
