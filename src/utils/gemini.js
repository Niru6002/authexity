import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";


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
            warnings: z.array(z.string()).describe("List of warning messages")
        });
        
        const baseModel = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash", 
            temperature: 0,
            maxOutputTokens: 2048,
        });
        
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
            visualContent: z.string().describe("HTML representation of the fact check")
        });

        
        const model = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash",
            temperature: 0.2,
        }).withStructuredOutput(factCheckSchema, {
            method: "json_mode"
        });

        
        const searchTool = {
            google_search: {}  
        };

        
        const modelWithSearch = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash",
            temperature: 0.2,
        }).bindTools([searchTool]);
        
        
        const searchResponse = await modelWithSearch.invoke(
            `Find reliable information to fact check this statement: ${statement}`
        );
        
        
        const groundingMetadata = searchResponse.response_metadata?.groundingMetadata || {};
        console.log("Grounding metadata:", JSON.stringify(groundingMetadata, null, 2));
        
        
        const webSearchQueries = groundingMetadata.webSearchQueries || [];
        const groundingChunks = groundingMetadata.groundingChunks || [];
        
        
        const extractedCitations = groundingChunks.map(chunk => {
            return {
                title: chunk.web?.title || "Unknown Source",
                url: chunk.web?.uri || "#",
                snippet: chunk.web?.snippet || "No snippet available",
                confidence: chunk.confidence || 0.0
            };
        });
        
        
        const promptTemplate = PromptTemplate.fromTemplate(`
            You are a fact-checking expert. Analyze the following statement and verify its accuracy.
            Use the search results provided to determine if the statement is true, partially true, or false.
            
            Statement to fact check: {statement}
            
            Search Results:
            {searchResults}
            
            Provide a detailed fact check with:
            1. A factAccuracy score (0-100)
            2. A verified or corrected statement
            3. Citations with title, URL, snippet, and confidence score
            4. HTML visualization of the fact check
            
            Format your response as a valid JSON object matching the required schema.
        `);
        
        
        const formattedSearchResults = extractedCitations.map((citation, index) => 
            `Source ${index + 1}: ${citation.title}\nURL: ${citation.url}\nSnippet: ${citation.snippet}\nConfidence: ${citation.confidence}`
        ).join('\n\n');
        
        
        const prompt = await promptTemplate.format({
            statement: statement,
            searchResults: formattedSearchResults
        });
        
        
        const structuredResponse = await model.invoke(prompt);
        
        
        return {
            ...structuredResponse,
            groundingMetadata: {
                webSearchQueries,
                groundingChunks,
                searchEntryPoint: groundingMetadata.searchEntryPoint || {},
                confidence: groundingMetadata.confidence || 0
            }
        };
    } catch (error) {
        console.error("Error fact-checking statement:", error);
        return {
            factAccuracy: 0,
            verifiedStatement: "Failed to fact-check the statement",
            citations: [],
            visualContent: `<div class="error">Error: ${error.message}</div>`,
            error: error.message
        };
    }
};
