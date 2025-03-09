import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { z } from "zod";


const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

/**
 * Safely parses JSON from a string, handling various formats
 * @param {string} text - The text to parse as JSON
 * @returns {Object} The parsed JSON object or a default error object
 */
const safeJsonParse = (text) => {
    try {
        // If text is already an object, return it directly
        if (typeof text === 'object') {
            return text;
        }
        
        // Try direct JSON parsing first
        return JSON.parse(text);
    } catch (e) {
        console.log("Direct JSON parsing failed, trying to extract JSON...");
        console.log("Raw text:", text);
        
        try {
            // Try to extract JSON from code blocks (common in LLM responses)
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                console.log("Found JSON in code block:", jsonMatch[1]);
                return JSON.parse(jsonMatch[1]);
            }
            
            // Try to extract JSON object pattern
            const objectMatch = text.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                console.log("Found JSON object pattern:", objectMatch[0]);
                return JSON.parse(objectMatch[0]);
            }
            
            // If all extraction attempts fail, log and throw error
            console.error("Failed to extract JSON from response:", e);
            throw new Error(`Could not parse JSON: ${e.message}. Raw text: ${text.substring(0, 100)}...`);
        } catch (innerError) {
            console.error("All JSON parsing attempts failed:", innerError);
            throw innerError;
        }
    }
};

/**
 * Sends text and link content to Gemini AI for scam detection.
 */
export const analyzeScamText = async (message, linkContent) => {
    try {
        // Define the schema for scam analysis
        const scamAnalysisSchema = z.object({
            spamScore: z.number().describe("Score between 0-100 indicating spam likelihood"),
            dangerScore: z.number().describe("Score between 0-100 indicating danger level"),
            warnings: z.array(z.string()).describe("List of warning messages")
        });
        
        // Create the base model
        const baseModel = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash", 
            temperature: 0,
            maxOutputTokens: 2048,
        });
        
        // Create the structured output model
        const model = baseModel.withStructuredOutput(scamAnalysisSchema, {
            name: "scamAnalysis"
        });

        const prompt = `
            You are a spam detection system. Analyze this SMS message and the content of links it contains.

            Pay special attention to phishing attempts, suspicious links, and misleading content.

            MESSAGE:
            ${message}

            WEBSITE CONTENT FROM LINKS:
            ${linkContent}
        `;

        console.log("Sending prompt to Gemini API:", prompt.substring(0, 100) + "...");
        
        // Invoke the model with the prompt
        const response = await model.invoke(prompt);
        console.log("Response from Gemini API:", response);
        
        return response;
    } catch (error) {
        console.error("Error analyzing scam text:", error);
        return {
            spamScore: 0,
            dangerScore: 0,
            warnings: ["Failed to analyze: " + error.message]
        };
    }
};

/**
 * Fact checks a statement using LangChain, Google Generative AI, and Google Search.
 */
export const factCheckStatement = async (statement) => {
    try {
        // Define the schema for fact checking
        const factCheckSchema = z.object({
            factAccuracy: z.number().describe("Score between 0-100 indicating statement accuracy"),
            verifiedStatement: z.string().describe("The verified or corrected statement"),
            citations: z.array(
                z.object({
                    title: z.string().describe("Source title"),
                    url: z.string().describe("Source URL"),
                    snippet: z.string().describe("Relevant text from source")
                })
            ).describe("List of citations supporting the fact check"),
            visualContent: z.string().describe("HTML representation of the fact check")
        });
        
        // Create the base model with structured output
        const model = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash",
            temperature: 0.2,
            maxOutputTokens: 4096,
        }).withStructuredOutput(factCheckSchema, {
            name: "factCheck",
            method: "json_mode" // Explicitly set to use JSON mode
        });

        // Configure Google Search Tool for Gemini 2.0
        const searchTool = {
            google_search: {}  // Empty object is sufficient to enable search
        };

        // Create a prompt template that includes instructions for structured output
        const prompt = `
            You are an expert fact checker. Your task is to verify the following statement using web search.
            
            Statement: "${statement}"
            
            Analyze the statement and search results carefully. Then provide a comprehensive fact check.
            
            For visualContent, create a simple HTML visualization that represents your fact check.
            Use appropriate colors, formatting, and layout to make the information clear and visually appealing.
            
            IMPORTANT: Your response must be a valid JSON object with the following structure:
            {
                "factAccuracy": number (0-100),
                "verifiedStatement": "string",
                "citations": [
                    {
                        "title": "string",
                        "url": "string",
                        "snippet": "string"
                    }
                ],
                "visualContent": "HTML string"
            }
        `;

        console.log("Sending prompt to Gemini API with search retrieval:", prompt.substring(0, 100) + "...");
        
        // Create a chain that combines the search tool and structured output
        const chain = RunnableSequence.from([
            {
                // First, run the search using the tool
                searchResults: async () => {
                    const modelWithSearch = new ChatGoogleGenerativeAI({
                        apiKey: GOOGLE_API_KEY,
                        model: "gemini-2.0-flash",
                        temperature: 0.2,
                    }).bindTools([searchTool]);
                    
                    const searchResponse = await modelWithSearch.invoke(
                        `Search for information to verify this statement: "${statement}"`
                    );
                    return searchResponse.content;
                },
                // Pass through the original statement
                statement: () => statement,
            },
            // Then use the search results and statement with the structured output model
            async (input) => {
                const fullPrompt = `
                    ${prompt}
                    
                    Search Results:
                    ${input.searchResults}
                `;
                
                return model.invoke(fullPrompt);
            }
        ]);

        // Execute the chain
        const response = await chain.invoke({});
        console.log("Response from Gemini API:", response);
        
        return response;
    } catch (error) {
        console.error("Error fact checking statement:", error);
        
        return {
            factAccuracy: 0,
            verifiedStatement: "Unable to verify statement due to a system error.",
            citations: [],
            visualContent: `<div style="padding: 15px; background-color: #2d3748; border-radius: 8px; border-left: 4px solid #f56565;">
                <h3 style="color: #f56565; margin-top: 0;">System Error</h3>
                <p style="color: #e2e8f0;">The fact checking system encountered an error: ${error.message}</p>
            </div>`
        };
    }
};
