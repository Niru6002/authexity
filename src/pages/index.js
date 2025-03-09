import { useState, useEffect } from "react";
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
  const [inputText, setInputText] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const features = [
    { id: "deepfake", name: "Deepfake Spotting", description: "Detect AI-generated deepfake content.", icon: "🎭" },
    // { id: "nudity", name: "Nudity Detection", description: "Detect nudity or inappropriate content.", icon: "🚫" },
    { id: "scam", name: "Scam Detection", description: "Identify scam and phishing content.", icon: "⚠️" },
    { id: "factcheck", name: "Fact Checker", description: "Verify facts with web search.", icon: "🔍" },
    // { id: "violence", name: "Violence Detection", description: "Detect violent or graphic content.", icon: "🔪" },
    { id: "qr-content", name: "QR Code Analysis", description: "Extract and analyze QR codes in images.", icon: "📸" },
    { id: "genai", name: "AI-Generated ", description: "Identify AI-generated media.", icon: "🤖" },
    { id: "text-moderation", name: "Text Moderation", description: "Detect harmful or offensive text.", icon: "📜" },
  ];

  // Track mouse position for the cursor gradient
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

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
    if (!statement.trim()) return null;
    
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
      
      // Add to chat messages with grounding metadata
      const newMessage = {
        text: statement,
        type: "factcheck",
        timestamp: new Date().toISOString(),
        factCheck: {
          ...results,
          groundingMetadata: results.groundingMetadata || {
            groundingChunks: [],
            webSearchQueries: [],
            searchEntryPoint: {},
            confidence: 0
          }
        }
      };
      
      setChatMessages([...chatMessages, newMessage]);
      return results;
    } catch (error) {
      console.error("Error during fact checking:", error);
      
      // Create an error message for the user
      const errorResults = {
        factAccuracy: 0,
        verifiedStatement: "Unable to verify statement due to a system error.",
        visualContent: `<div style="padding: 15px; background-color: #2d3748; border-radius: 8px; border-left: 4px solid #f56565;">
          <h3 style="color: #f56565; margin-top: 0;">System Error</h3>
          <p style="color: #e2e8f0;">The fact checking system encountered an error: ${error.message}</p>
        </div>`,
        groundingMetadata: {
          groundingChunks: [],
          webSearchQueries: [],
          searchEntryPoint: {},
          confidence: 0
        }
      };
      
      // Add error message to chat
      const errorMessage = {
        text: statement,
        type: "factcheck",
        timestamp: new Date().toISOString(),
        factCheck: errorResults
      };
      
      setChatMessages([...chatMessages, errorMessage]);
      return errorResults;
    } finally {
      setIsFactChecking(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleFeature = (id) => {
    setSelectedFeatures((prev) =>
      prev.includes(id)
        ? prev.filter((feature) => feature !== id)
        : [...prev, id]
    );
  };

  const processImages = async () => {
    if (attachments.length === 0 && !selectedFeatures.includes("scam")) return;
    setShowFeatures(false);
    setIsUploading(true);

    try {
      // If Scam Detection is selected, run processTextAnalysis
      if (selectedFeatures.includes("scam")) {
        await processTextAnalysis();
        return;
      }

      const newMessages = [];

      for (let file of attachments) {
        const formData = new FormData();
        formData.append("media", file);
        formData.append("models", selectedFeatures.join(","));
        formData.append("api_user", process.env.NEXT_PUBLIC_API_USER);
        formData.append("api_secret", process.env.NEXT_PUBLIC_API_SECRET);

        try {
          const response = await axios.post(
            "https://api.sightengine.com/1.0/check.json",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );

          const result = response.data;
          newMessages.push({
            image: URL.createObjectURL(file),
            results: result,
          });
        } catch (error) {
          console.error("Error processing image", error);
        }
      }
      setChatMessages([...chatMessages, ...newMessages]);
    } finally {
      setIsUploading(false);
      setAttachments([]);
      setSelectedFeatures([]);
    }
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
    <div className="min-h-screen bg-[#040906] text-[#e6f4eb] flex flex-col items-center">
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(153, 135, 228, 0.15), transparent 40%)`,
          zIndex: 0,
        }}
      />

      <div className="w-full  px-6 flex flex-col items-center relative z-10">
        <div className="text-center mb-6 mt-6">
          <div className="text-4xl font-bold flex items-center justify-center space-x-2">
            <span className="text-[#9987e4]"></span>
            <span>Hi, I&apos;m Authexity.</span>
          </div>
          <p className="text-[#e6f4eb]/70 mt-2">
            Your place for fact-checking and uncovering the truth.{" "}
          </p>
        </div>

        {showFeatures && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full mb-6">
            {features.map((feature) => (
              <div
                key={feature.id}
                className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all transform relative cursor-pointer ${
                  selectedFeatures.includes(feature.id)
                    ? "border-[#9987e4] shadow-lg shadow-[#9987e4]/30 bg-[#9987e4]/10 hover:scale-105"
                    : "border-[#e6f4eb]/30 bg-[#040906]/80 shadow-md hover:bg-[#040906]/60 hover:scale-105 hover:border-white"
                }`}
                onClick={() => toggleFeature(feature.id)}
              >
                <div className="text-3xl">{feature.icon}</div>
                <h2 className="text-lg font-semibold mt-2 text-[#e6f4eb]/90 hover:text-white">{feature.name}</h2>
                <p className="text-sm text-[#b4a7f8]/70 hover:text-[#b4a7f8]">{feature.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Show Fact Checker UI when factcheck feature is selected */}
        {selectedFeatures.includes("factcheck") && (
          <div className="w-full">
            <FactChecker 
              onSubmit={processFactCheck} 
              isLoading={isFactChecking} 
              initialStatement={inputText}
              showResults={true}
            />
          </div>
        )}

        {/* Display chat messages with formatted results */}
        <div className="w-full mt-10 mb-32">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className="bg-[#040906]/80 border border-[#6e335f]/30 p-6 rounded-lg shadow-md mt-4 flex items-start gap-6"
            >
              {msg.type === "text" && (
                <>
                  <div className="flex-grow">
                    <div className="text-[#e6f4eb] mb-2">{msg.text}</div>
                    {msg.analysis && (
                      <div className="mt-4 p-4 bg-[#0d1117] rounded-lg">
                        <div className="text-[#9987e4] font-semibold mb-2">Analysis:</div>
                        <div className="text-[#e6f4eb]/80">{msg.analysis.summary}</div>
                        {msg.analysis.scamProbability !== undefined && (
                          <div className="mt-2">
                            <span className="text-[#9987e4]">Scam Probability:</span>{" "}
                            <span
                              className={`px-2 py-1 text-sm rounded-md ${
                                msg.analysis.scamProbability > 0.5
                                  ? "bg-[#b27358]"
                                  : "bg-[#9987e4]"
                              }`}
                            >
                              {(msg.analysis.scamProbability * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}


              {msg.image && (
                <>
                  <div className="flex-shrink-0 w-32 h-32">
                    <img
                      src={msg.image}
                      alt="Uploaded"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold mb-2">
                      Analysis Result
                    </h3>
                    {msg.results.nudity && (
                      <div className="mb-2">
                        <span className="font-semibold text-[#9987e4]">
                          Nudity:
                        </span>{" "}
                        <span
                          className={`px-2 py-1 text-sm rounded-md ${
                            msg.results.nudity.safe > 0.8
                              ? "bg-[#9987e4]"
                              : "bg-[#b27358]"
                          }`}
                        >
                          Safe: {(msg.results.nudity.safe * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {msg.results.type?.deepfake !== undefined && (
                      <div className="mb-2">
                        <span className="font-semibold text-[#9987e4]">
                          Deepfake:
                        </span>{" "}
                        <span
                          className={`px-2 py-1 text-sm rounded-md ${
                            msg.results.type.deepfake > 0.5
                              ? "bg-[#b27358]"
                              : "bg-[#9987e4]"
                          }`}
                        >
                          {(msg.results.type.deepfake * 100).toFixed(1)}%
                          Confidence
                        </span>
                      </div>
                    )}
                    {msg.results.qr?.link.length > 0 && (
                      <div>
                        <span className="font-semibold text-[#9987e4]">
                          QR Code URL:
                        </span>{" "}
                        <a
                          href={msg.results.qr.link[0].match}
                          className="text-[#b27358] underline"
                        >
                          {msg.results.qr.link[0].match}
                        </a>
                      </div>
                    )}
                    {msg.results.type?.ai_generated !== undefined && (
                      <div className="mb-2">
                        <span className="font-semibold text-[#9987e4]">
                          AI Generated:
                        </span>{" "}
                        <span
                          className={`px-2 py-1 text-sm rounded-md ${
                            msg.results.type.deepfake > 0.5
                              ? "bg-[#b27358]"
                              : "bg-[#9987e4]"
                          }`}
                        >
                          {(msg.results.type.ai_generated * 100).toFixed(1)}%
                          Confidence
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Input box fixed at bottom but only shown when factcheck is not selected */}
        {!selectedFeatures.includes("factcheck") && (
          <div className="fixed bottom-10 w-full max-w-4xl px-4">
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
              <div className="flex items-center w-full z-auto">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-grow bg-transparent outline-none text-[#e6f4eb] placeholder:text-[#e6f4eb]/50"
                  placeholder="Type your message here..."
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  disabled={isUploading}
                />
                <input type="file" multiple className="hidden" id="fileUpload" onChange={handleFileUpload} />
                <div className="flex items-center">
                  <label htmlFor="fileUpload" className={`p-2 text-[#9987e4]/80 hover:text-[#9987e4] cursor-pointer transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <PaperClipIcon className="h-6 w-6" />
                  </label>
                  <button 
                    className="p-2 relative"
                    onClick={inputText.trim() ? handleTextSubmit : processImages}
                    disabled={isUploading}
                  >
                    <ArrowUpIcon className={`h-6 w-6 text-[#9987e4]/80 hover:text-[#9987e4] transition-all ${isUploading ? 'opacity-0' : 'opacity-100'}`} />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#9987e4]"></div>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
