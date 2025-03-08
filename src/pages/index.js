import { useState } from "react";
import { PaperClipIcon, XCircleIcon, ArrowUpIcon } from "@heroicons/react/24/solid";

export default function Home() {
  const [inputFocused, setInputFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  const features = [
    { id: "page1", name: "Adblocking / Privacy", description: "Learn how to block ads, trackers and other nasty things." },
    { id: "page2", name: "Feature 2", description: "Description for feature 2" },
    { id: "page3", name: "Feature 3", description: "Description for feature 3" },
    { id: "page4", name: "Feature 4", description: "Description for feature 4" },
    { id: "page5", name: "Feature 5", description: "Description for feature 5" },
    { id: "page6", name: "Feature 6", description: "Description for feature 6" },
    { id: "page7", name: "Feature 7", description: "Description for feature 7" },
    { id: "page8", name: "Feature 8", description: "Description for feature 8" },
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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      {/* Logo and Welcome Text */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold flex items-center justify-center space-x-2">
          <span className="text-blue-500">🚀</span>
          <span>Hi, I'm Authexity.</span>
        </div>
        <p className="text-gray-400 mt-2">How can I help you today?</p>
      </div>

      {/* Feature Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl mb-32">
        {features.map((feature) => (
          <div 
            key={feature.id} 
            className={`flex flex-col items-start justify-center p-4 border rounded-lg bg-gray-800 shadow-md hover:bg-gray-700 cursor-pointer transition-all w-52 h-32 relative ${selectedFeatures.includes(feature.id) ? 'border-blue-500 shadow-lg shadow-blue-500/30' : ''}`} 
            onClick={() => toggleFeature(feature.id)}
          >
            <div className="w-10 h-10 bg-gray-700 flex items-center justify-center rounded-md mb-2">
              <span className="text-pink-500">&#128274;</span>
            </div>
            <h2 className="text-lg font-semibold">{feature.name}</h2>
            <p className="text-sm text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Chat Input Box */}
      <div className="fixed bottom-10 w-full max-w-2xl p-4">
        {/* Attachments Preview */}
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
        
        {/* Input Field */}
        <div className={`relative flex items-center p-3 rounded-xl shadow-md transition-all ${inputFocused ? "border-2 border-blue-500 scale-105 shadow-lg shadow-blue-500/20" : "border border-gray-700"}`}>
          <input
            type="text"
            placeholder="Message DeepSeek"
            className="w-full bg-transparent outline-none text-white px-2"
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <input type="file" multiple className="hidden" id="fileUpload" onChange={handleFileUpload} />
          <label htmlFor="fileUpload" className="p-2 text-gray-400 hover:text-blue-500 cursor-pointer">
            <PaperClipIcon className="h-6 w-6" />
          </label>
          <button className="p-2 text-gray-400 hover:text-green-500">
            <ArrowUpIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
