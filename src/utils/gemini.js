import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

console.log("API Key available:", !!GOOGLE_API_KEY);

const safeJsonParse = (text) => {
    try {
        if (typeof text === 'object') {
            return text;
        }
        return JSON.parse(text);
    } catch (e) {
        console.log("Direct JSON parsing failed, trying to extract JSON...");
        console.log("Raw text:", text);
        
        try {
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                console.log("Found JSON in code block:", jsonMatch[1]);
                return JSON.parse(jsonMatch[1]);
            }
            
            const objectMatch = text.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                console.log("Found JSON object pattern:", objectMatch[0]);
                return JSON.parse(objectMatch[0]);
            }
            
            console.error("Failed to extract JSON from response:", e);
            throw new Error(`Could not parse JSON: ${e.message}. Raw text: ${text.substring(0, 100)}...`);
        } catch (innerError) {
            console.error("All JSON parsing attempts failed:", innerError);
            throw innerError;
        }
    }
};

export const analyzeScamText = async (message, linkContent) => {
    try {
        if (!GOOGLE_API_KEY) {
            throw new Error("Google API Key is not available. Please check your environment variables.");
        }
        
        const scamAnalysisSchema = z.object({
            spamScore: z.number().describe("Score between 0-100 indicating spam likelihood"),
            dangerScore: z.number().describe("Score between 0-100 indicating danger level"),
            warnings: z.array(z.string()).describe("List of warning messages"),
            sources: z.array(z.string()).describe("List of sources used for analysis")
        });
        
        const model = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash", 
            temperature: 0,
            maxOutputTokens: 2048,
        }).withStructuredOutput(scamAnalysisSchema, {
            name: "scamAnalysis"
        });

        console.log("Analyzing scam text... (Loading...)");
        
        const prompt = `
            You are a spam detection system. Analyze this SMS message and the content of links it contains.

            Pay special attention to phishing attempts, suspicious links, and misleading content.

            MESSAGE:
            ${message}

            WEBSITE CONTENT FROM LINKS:
            ${linkContent}
        `;

        console.log("Sending prompt to Gemini API:", prompt.substring(0, 100) + "...");
        
        const response = await model.invoke(prompt);
        console.log("Response from Gemini API:", response);
        
        return response;
    } catch (error) {
        console.error("Error analyzing scam text:", error);
        return {
            spamScore: 0,
            dangerScore: 0,
            warnings: ["Failed to analyze: " + error.message],
            sources: []
        };
    }
};

export const factCheckStatement = async (statement) => {
    try {
        if (!GOOGLE_API_KEY) {
            throw new Error("Google API Key is not available. Please check your environment variables.");
        }
        
        const factCheckSchema = z.object({
            factAccuracy: z.number().describe("Score between 0-100 indicating statement accuracy"),
            verifiedStatement: z.string().describe("The verified or corrected statement"),
            citations: z.array(
                z.object({
                    title: z.string().describe("Source title"),
                    url: z.string().describe("Source URL"),
                    snippet: z.string().describe("Relevant text from source"),
                    confidence: z.number().optional().describe("Confidence score for this source")
                })
            ).describe("List of citations supporting the fact check"),
            visualContent: z.string().describe("Provide a dark-themed, visually appealing UI representation of the fact check, using multiple colors, containers, and creative elements for clarity.")
        });

        const model = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash",
            temperature: 0.2,
        }).withStructuredOutput(factCheckSchema, {
            method: "json_mode"
        });

        console.log("Fact-checking statement... (Loading...)");
        
        const searchResponse = await model.invoke(`Find reliable information to fact check this statement: ${statement}`);
        
        const factCheckResponse = await model.invoke(`Fact-check this statement based on the search results: ${statement}`);
        
        console.log("Fact-checking complete:", factCheckResponse);
        
        return factCheckResponse;
    } catch (error) {
        console.error("Error fact checking statement:", error);
        return {
            factAccuracy: 0,
            verifiedStatement: "Unable to verify statement due to a system error.",
            citations: [],
            visualContent: "<div style='padding: 15px; background-color: #2d3748; border-radius: 8px; border-left: 4px solid #f56565;'><h3 style='color: #f56565; margin-top: 0;'>System Error</h3><p style='color: #e2e8f0;'>The fact checking system encountered an error.</p></div>"
        };
    }
};
