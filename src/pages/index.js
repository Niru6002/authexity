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
import { moderateText } from "../utils/textModeration";

export default function Home() {
  const [inputFocused, setInputFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [showFeatures, setShowFeatures] = useState(true);
  const [inputText, setInputText] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState(null);

  const features = [
    {
      id: "deepfake",
      name: "Deepfake Spotting",
      description: "Detect AI-generated deepfake content.",
      icon: "🎭",
    },
    {
      id: "scam",
      name: "Scam Detection",
      description: "Identify scam and phishing content.",
      icon: "⚠️",
    },
    {
      id: "factcheck",
      name: "Fact Checker",
      description: "Verify facts with web search.",
      icon: "🔍",
    },
    {
      id: "qr-content",
      name: "QR Code Analysis",
      description: "Extract and analyze QR codes in images.",
      icon: "📸",
    },
    {
      id: "genai",
      name: "AI-Generated ",
      description: "Identify AI-generated media.",
      icon: "🤖",
    },
    {
      id: "text-moderation",
      name: "Text Moderation",
      description: "Detect harmful or offensive text.",
      icon: "📜",
    },
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
      analysis: analysisResponse,
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
      if (!results || typeof results !== "object") {
        throw new Error("Invalid response format: results is not an object");
      }

      // Ensure required fields exist
      if (results.factAccuracy === undefined) {
        console.warn("Missing factAccuracy in results, defaulting to 50");
        results.factAccuracy = 50;
      }

      if (!results.verifiedStatement) {
        console.warn(
          "Missing verifiedStatement in results, using original statement"
        );
        results.verifiedStatement = statement;
      }

      if (!Array.isArray(results.citations)) {
        console.warn(
          "Missing or invalid citations array in results, defaulting to empty array"
        );
        results.citations = [];
      }

      if (!results.visualContent) {
        console.warn(
          "Missing visualContent in results, creating default visualization"
        );
        results.visualContent = `<div style="padding: 15px; background-color: #2d3748; border-radius: 8px;">
          <h3 style="color: #e2e8f0; margin-top: 0;">Fact Check Results</h3>
          <p style="color: #e2e8f0;">Statement: ${statement}</p>
          <p style="color: #e2e8f0;">Accuracy: ${results.factAccuracy}%</p>
        </div>`;
      }

      // Set the results
      // setFactCheckResults(results);

      // Add to chat messages
      const newMessage = {
        text: statement,
        type: "factcheck",
        timestamp: new Date().toISOString(),
        factCheck: results,
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
        </div>`,
      };

      setFactCheckResults(errorResults);

      // Add error message to chat
      const errorMessage = {
        text: statement,
        type: "factcheck",
        timestamp: new Date().toISOString(),
        factCheck: errorResults,
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
    setSelectedFeatures((prev) =>
      prev.includes(id)
        ? prev.filter((feature) => feature !== id)
        : [...prev, id]
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
    setAttachments([]);
    setSelectedFeatures([]);
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

    if (selectedFeatures.includes("text-moderation")) {
      const moderationResults = await moderateText(inputText);
      const newMessage = {
        text: inputText,
        type: "text-moderation",
        timestamp: new Date().toISOString(),
        moderation: moderationResults,
      };

      setChatMessages([...chatMessages, newMessage]);
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

      <div className="text-center mb-6">
        <div className="text-4xl font-bold flex items-center justify-center space-x-2">
          <span className="text-[#9987e4]"></span>
          <span>Hi, I&apos;m Authexity.</span>
        </div>
        <p className="text-[#e6f4eb]/70 mt-2">
          Your place for fact-checking and uncovering the truth.{" "}
        </p>
      </div>

      {showFeatures && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl mb-6">
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
              <h2 className="text-lg font-semibold mt-2 text-[#e6f4eb]/90 hover:text-white">
                {feature.name}
              </h2>
              <p className="text-sm text-[#b4a7f8]/70 hover:text-[#b4a7f8]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Display chat messages with formatted results */}
      <div className="w-full max-w-4xl mt-10 mb-32 overflow-y-auto">
        {chatMessages.map((msg, index) => (
          <div
            key={index}
            className="bg-[#040906]/80 border border-[#6e335f]/30 p-6 rounded-lg shadow-md mt-4 flex items-start gap-6"
          >
            {msg.image ? (
              <>
                <img
                  src={msg.image}
                  alt="Analyzed"
                  className="w-24 h-24 rounded-md object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    Analysis Result
                  </h3>
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
            ) : msg.type === "factcheck" ? (
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  Fact Check Result
                </h3>
                <p className="text-lg mb-3">{msg.text}</p>

                <FactChecker
                  onSubmit={processFactCheck}
                  isLoading={false}
                  results={msg.factCheck}
                  initialStatement={msg.text}
                  readOnly={true}
                />

                {msg.factCheck?.factAccuracy !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-300">Accuracy Score</span>
                      <span className="font-bold">
                        {msg.factCheck.factAccuracy}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          msg.factCheck.factAccuracy > 80
                            ? "bg-green-500"
                            : msg.factCheck.factAccuracy > 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${msg.factCheck.factAccuracy}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {msg.factCheck?.verifiedStatement && (
                  <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                    <p className="text-white">
                      {msg.factCheck.verifiedStatement}
                    </p>
                  </div>
                )}

                {msg.factCheck?.visualContent && (
                  <div
                    className="mt-3 -z-10"
                    dangerouslySetInnerHTML={{
                      __html: msg.factCheck.visualContent,
                    }}
                  />
                )}
                {msg.factCheck?.citations?.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                    <h3 className="text-white text-lg font-semibold mb-2">
                      Citations
                    </h3>
                    <ul className="space-y-2">
                      {msg.factCheck.citations.map((citation, index) => (
                        <li key={index} className="p-3 bg-gray-800 rounded-lg">
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline font-semibold"
                          >
                            {citation.title}
                          </a>
                          <p className="text-gray-300 text-sm mt-1">
                            {citation.snippet}
                          </p>
                          {citation.confidence !== undefined && (
                            <p className="text-gray-400 text-xs mt-1">
                              Confidence: {citation.confidence * 100}%
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : msg.type === "text-moderation" ? (
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  Text Moderation Result
                </h3>
                <p className="text-lg mb-3">{msg.text}</p>

                <div className="mt-3 p-4 bg-gray-700 rounded-lg">
                  <div className="mb-3"></div>
                  <span className="font-semibold text-blue-400">
                    Overall Toxicity:
                  </span>{" "}
                  <span
                    className={`px-2 py-1 text-sm rounded-md ${
                      msg.moderation.moderationScore < 0.3
                        ? "bg-green-500"
                        : msg.moderation.moderationScore < 0.7
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  >
                    {(msg.moderation.moderationScore * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(msg.moderation.categories || {}).map(
                    ([category, score]) => (
                      <div key={category} className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300 capitalize">
                            {category}
                          </span>
                          <span className="font-bold">
                            {(score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              score > 0.7
                                ? "bg-red-500"
                                : score > 0.3
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${score * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {msg.moderation.flaggedWords &&
                  msg.moderation.flaggedWords.length > 0 && (
                    <div className="mt-3">
                      <span className="font-semibold text-blue-400">
                        Flagged Words:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.moderation.flaggedWords.map((word, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-red-500/30 rounded text-sm"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {msg.moderation.warnings &&
                  msg.moderation.warnings.length > 0 && (
                    <div className="mt-3">
                      <span className="font-semibold text-blue-400">
                        Warnings:
                      </span>
                      <ul className="list-disc list-inside mt-1">
                        {msg.moderation.warnings.map((warning, i) => (
                          <li key={i} className="text-yellow-300">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex-1">
                <span className="text-lg">{msg.text}</span>

                {msg.analysis && (
                  <div className="mt-3 p-4 bg-gray-700 rounded-lg">
                    <div className="mb-2">
                      <span className="font-semibold text-blue-400">
                        Spam Score:
                      </span>{" "}
                      <span
                        className={`px-2 py-1 text-sm rounded-md ${
                          msg.analysis.spamScore < 30
                            ? "bg-green-500"
                            : msg.analysis.spamScore < 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      >
                        {msg.analysis.spamScore}%
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="font-semibold text-blue-400">
                        Danger Score:
                      </span>{" "}
                      <span
                        className={`px-2 py-1 text-sm rounded-md ${
                          msg.analysis.dangerScore < 30
                            ? "bg-green-500"
                            : msg.analysis.dangerScore < 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      >
                        {msg.analysis.dangerScore}%
                      </span>
                    </div>

                    {msg.analysis.warnings &&
                      msg.analysis.warnings.length > 0 && (
                        <div>
                          <span className="font-semibold text-blue-400">
                            Warnings:
                          </span>
                          <ul className="list-disc list-inside mt-1">
                            {msg.analysis.warnings.map((warning, i) => (
                              <li key={i} className="text-yellow-300">
                                {warning}
                              </li>
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

      {/* Input box fixed at bottom but only shown when factcheck is not selected */}
      {
        <div className="fixed bottom-10 w-full max-w-4xl px-4">
          <div className="relative flex flex-col p-4 rounded-xl shadow-lg border border-[#9987e4]/50 bg-[#040906]/90 transition-all hover:shadow-[0_0_15px_rgba(153,135,228,0.5)] focus-within:shadow-[0_0_20px_rgba(153,135,228,0.6)]">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 w-full">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="relative w-16 h-16 bg-[#040906] flex items-center justify-center rounded-md border border-[#9987e4]/30"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt="attachment"
                      className="w-full h-full object-cover rounded-md opacity-90"
                    />
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
              />
              <input
                type="file"
                multiple
                className="hidden"
                id="fileUpload"
                onChange={handleFileUpload}
              />
              <div className="flex items-center">
                <label
                  htmlFor="fileUpload"
                  className="p-2 text-[#9987e4]/80 hover:text-[#9987e4] hover:glow-[#9987e4] cursor-pointer transition-all"
                >
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
      }
    </div>
  );
}
