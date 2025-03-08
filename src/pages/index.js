import { useState } from "react";
import {
  PaperClipIcon,
  XCircleIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/solid";
import axios from "axios";

export default function Home() {
  const [attachments, setAttachments] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [showFeatures, setShowFeatures] = useState(true);

  const features = [
    { id: "deepfake", name: "Deepfake Detection", description: "Detect AI-generated deepfake content.", icon: "🎭" },
    { id: "nudity", name: "Nudity Detection", description: "Detect nudity or inappropriate content.", icon: "🚫" },
    { id: "scam", name: "Scam Detection", description: "Identify scam and phishing content.", icon: "⚠️" },
    { id: "violence", name: "Violence Detection", description: "Detect violent or graphic content.", icon: "🔪" },
    { id: "qr-content", name: "QR Code Analysis", description: "Extract and analyze QR codes in images.", icon: "📸" },
    { id: "genai", name: "AI-Generated Content", description: "Identify AI-generated media.", icon: "🤖" },
    { id: "text-moderation", name: "Text Moderation", description: "Detect harmful or offensive text.", icon: "📜" },
    { id: "face-analysis", name: "Face Analysis", description: "Analyze faces for various attributes.", icon: "👤" },
  ];

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
    if (attachments.length === 0 || selectedFeatures.length === 0) return;
    setShowFeatures(false);

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

  const [inputText, setInputText] = useState('');

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    // Process the text input here
    const newMessage = {
      text: inputText,
      type: 'text',
      timestamp: new Date().toISOString()
    };
    
    setChatMessages([...chatMessages, newMessage]);
    setInputText('');
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

      {/* Display chat messages with formatted results */}
      <div className="w-full max-w-2xl mt-10">
        {chatMessages.map((msg, index) => (
          <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-md mt-4 flex items-start gap-6">
            {msg.image ? (
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
