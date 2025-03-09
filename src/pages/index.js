import { useState } from "react";
import {
  PaperClipIcon,
  XCircleIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/solid";
import axios from "axios";
import { extractLinks, scrapeWebsiteContent } from "../utils/linkscrapper";
import { analyzeScamText } from "../utils/gemini";

export default function Home() {
  const [inputFocused, setInputFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [showFeatures, setShowFeatures] = useState(true);
  const [inputText, setInputText] = useState('');

  const features = [
    { id: "deepfake", name: "Deepfake Spotting", description: "Detect AI-generated deepfake content.", icon: "🎭" },
    { id: "nudity", name: "Nudity Detection", description: "Detect nudity or inappropriate content.", icon: "🚫" },
    { id: "scam", name: "Scam Detection", description: "Identify scam and phishing content.", icon: "⚠️" },
    { id: "violence", name: "Violence Detection", description: "Detect violent or graphic content.", icon: "🔪" },
    { id: "qr-content", name: "QR Code Analysis", description: "Extract and analyze QR codes in images.", icon: "📸" },
    { id: "genai", name: "AI-Generated ", description: "Identify AI-generated media.", icon: "🤖" },
    { id: "text-moderation", name: "Text Moderation", description: "Detect harmful or offensive text.", icon: "📜" },
    { id: "face-analysis", name: "Face Analysis", description: "Analyze faces for various attributes.", icon: "👤" },
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
  
    try {
      // Extract text content safely
      let rawText = analysisResponse.candidates[0]?.content?.parts[0]?.text || "{}";
  
      // Remove possible Markdown backticks and language specifier
      rawText = rawText.trim().replace(/```json/g, "").replace(/```/g, "").trim();
  
      // Parse cleaned JSON
      const analysis = JSON.parse(rawText);
  
      // Add response to chat
      setChatMessages((prev) => [
        ...prev,
        { type: "scam-analysis", content: inputText, analysis },
      ]);
    } catch (error) {
      console.error("Error parsing Gemini response:", error, "Raw response:", analysisResponse);
    }
  
    setInputText(""); // Clear input
  };
  
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleFeature = (id) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((feature) => feature !== id) : [...prev, id]
    );
  };

  const processImages = async () => {
    if (attachments.length === 0 && !selectedFeatures.includes("scam")) return;
    setShowFeatures(false);

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
        const response = await axios.post("https://api.sightengine.com/1.0/check.json", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

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
    setAttachments([]);
    setSelectedFeatures([]);
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
  
    // If Scam Detection is selected, analyze the text instead of just displaying it
    if (selectedFeatures.includes("scam")) {
      await processTextAnalysis();
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

      {/* Display chat messages with formatted results */}
      <div className="w-full max-w-2xl mt-10">
        {chatMessages.map((msg, index) => (
          <div key={index} className="bg-[#040906]/80 border border-[#6e335f]/30 p-6 rounded-lg shadow-md mt-4 flex items-start gap-6">
            {msg.image ? (
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
            ) : (
              <div className="flex-1">
                <span className="text-lg">{msg.text}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
