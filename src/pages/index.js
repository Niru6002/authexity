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
  const [attachments, setAttachments] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [showFeatures, setShowFeatures] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState(null);


  const features = [
    { id: "deepfake", name: "Deepfake Detection", description: "Detect AI-generated deepfake content.", icon: "🎭" },
    { id: "nudity", name: "Nudity Detection", description: "Detect nudity or inappropriate content.", icon: "🚫" },
    { id: "scam", name: "Scam Detection", description: "Identify scam and phishing content.", icon: "⚠️" },
    { id: "factcheck", name: "Fact Checker", description: "Verify facts with web search.", icon: "🔍" },
    { id: "violence", name: "Violence Detection", description: "Detect violent or graphic content.", icon: "🔪" },
    { id: "qr-content", name: "QR Code Analysis", description: "Extract and analyze QR codes in images.", icon: "📸" },
    { id: "genai", name: "AI-Generated Content", description: "Identify AI-generated media.", icon: "🤖" },
    { id: "text-moderation", name: "Text Moderation", description: "Detect harmful or offensive text.", icon: "📜" },
  ];

  const processTextAnalysis = async () => {
    if (!inputText.trim()) return;
  
    // Extract links from the text
    const links = extractLinks(inputText);
    let linkContent = "";
  
    // Scrape content from each link
    for (let link of links) {
      const content = await scrapeWebsiteContent(link);
      linkContent += `\n[${link}]: ${content}`;
    }
  
    // Analyze the text and link content with Gemini
    const analysisResponse = await analyzeScamText(inputText, linkContent);
  
    // Add the analysis to the chat
    const newMessage = {
      text: inputText,
      type: "text",
      timestamp: new Date().toISOString(),
      analysis: analysisResponse
    };
  
    setChatMessages([...chatMessages, newMessage]);
    setInputText("");
  };

  const processFactCheck = async (statement) => {
    if (!statement.trim()) return;
    
    setIsFactChecking(true);
    
    try {
      // Perform fact checking
      const results = await factCheckStatement(statement);
      
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6">
        <div className="text-4xl font-bold flex items-center justify-center space-x-2">
          <span className="text-blue-500">🚀</span>
          <span>Hi, I'm Authexity.</span>
        </div>
        <p className="text-gray-400 mt-2">How can I help you today?</p>
      </div>

      {showFeatures && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl mb-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`flex flex-col items-center justify-center p-6 border rounded-xl bg-gray-800 shadow-md hover:bg-gray-700 transition-all transform hover:scale-105 relative cursor-pointer ${
                selectedFeatures.includes(feature.id) ? "border-blue-500 shadow-lg shadow-blue-500/30" : ""
              }`}
              onClick={() => toggleFeature(feature.id)}
            >
              <div className="text-3xl">{feature.icon}</div>
              <h2 className="text-lg font-semibold mt-2">{feature.name}</h2>
              <p className="text-sm text-gray-400">{feature.description}</p>
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
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2">
              {attachments.map((file, index) => (
                <div key={index} className="relative w-16 h-16 bg-gray-700 flex items-center justify-center rounded-md">
                  <img src={URL.createObjectURL(file)} alt="attachment" className="w-full h-full object-cover rounded-md" />
                  <XCircleIcon className="absolute -top-2 -right-2 h-5 w-5 text-red-500 cursor-pointer" onClick={() => removeAttachment(index)} />
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-center p-4 rounded-xl shadow-lg border border-gray-700 bg-gray-800">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-grow bg-transparent outline-none text-white placeholder:text-gray-400"
              placeholder="Type your message here..."
            />
            <input type="file" multiple className="hidden" id="fileUpload" onChange={handleFileUpload} />
            <div className="flex items-center">
              <label htmlFor="fileUpload" className="p-2 text-gray-400 hover:text-blue-500 cursor-pointer">
                <PaperClipIcon className="h-6 w-6" />
              </label>
              <button 
                className="p-2 text-gray-400 hover:text-green-500" 
                onClick={inputText.trim() ? handleTextSubmit : processImages}
              >
                <ArrowUpIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display chat messages with formatted results */}
      <div className="w-full max-w-2xl mt-10">
        {chatMessages.map((msg, index) => (
          <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-md mt-4 flex items-start gap-6">
            {msg.type === "image" ? (
              <>
                <img src={msg.image} alt="Analyzed" className="w-24 h-24 rounded-md object-cover" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Analysis Result</h3>
                  {msg.results.nudity && (
                    <div className="mb-2">
                      <span className="font-semibold text-blue-400">Nudity:</span>{" "}
                      <span className={`px-2 py-1 text-sm rounded-md ${
                        msg.results.nudity.safe > 0.8 ? "bg-green-500" : "bg-red-500"
                      }`}>
                        Safe: {(msg.results.nudity.safe * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {msg.results.type?.deepfake !== undefined && (
                    <div className="mb-2">
                      <span className="font-semibold text-blue-400">Deepfake:</span>{" "}
                      <span className={`px-2 py-1 text-sm rounded-md ${
                        msg.results.type.deepfake > 0.5 ? "bg-red-500" : "bg-green-500"
                      }`}>
                        {(msg.results.type.deepfake * 100).toFixed(1)}% Confidence
                      </span>
                    </div>
                  )}
                  {msg.results.qr?.link.length > 0 && (
                    <div>
                      <span className="font-semibold text-blue-400">QR Code URL:</span>{" "}
                      <a href={msg.results.qr.link[0].match} className="text-blue-500 underline">
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
