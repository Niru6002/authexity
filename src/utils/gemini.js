import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const TAVILY_API_KEY = process.env.NEXT_PUBLIC_TAVILY_API_KEY;


export const analyzeScamText = async (message, linkContent) => {
    try {
        const model = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash-lite",
            temperature: 0,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: {
                    spamScore: {
                        type: "number",
                        description: "Score between 0-100 indicating spam likelihood"
                    },
                    dangerScore: {
                        type: "number",
                        description: "Score between 0-100 indicating danger level"
                    },
                    warnings: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        description: "List of warning messages"
                    }
                },
                required: ["spamScore", "dangerScore", "warnings"]
            }
        });

        const prompt = `
            You are a spam detection system. Analyze this SMS message and the content of links it contains.

            Pay special attention to phishing attempts, suspicious links, and misleading content.

            MESSAGE:
            ${message}

            WEBSITE CONTENT FROM LINKS:
            ${linkContent}
        `;

        const response = await model.invoke(prompt);
        
        return JSON.parse(response.content);
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
        const model = new ChatGoogleGenerativeAI({
            apiKey: GOOGLE_API_KEY,
            model: "gemini-2.0-flash-lite",
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: {
                    factAccuracy: {
                        type: "number",
                        description: "Score between 0-100 indicating statement accuracy"
                    },
                    verifiedStatement: {
                        type: "string",
                        description: "The verified or corrected statement"
                    },
                    citations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: {
                                    type: "string",
                                    description: "Source title"
                                },
                                url: {
                                    type: "string",
                                    description: "Source URL"
                                },
                                snippet: {
                                    type: "string",
                                    description: "Relevant text from source"
                                }
                            }
                        },
                        description: "List of citations supporting the fact check"
                    },
                    visualContent: {
                        type: "string",
                        description: "HTML representation of the fact check"
                    }
                },
                required: ["factAccuracy", "verifiedStatement", "citations", "visualContent"]
            }
        });

        let retriever = null;
        if (TAVILY_API_KEY) {
            retriever = new TavilySearchAPIRetriever({
                apiKey: TAVILY_API_KEY,
                k: 5,
            });
        }

        if (!retriever) {
            const prompt = `
                Fact check the following statement and provide an analysis:
                
                Statement: "${statement}"
                
                For visualContent, create a simple HTML visualization that represents your fact check.
            `;

            const response = await model.invoke(prompt);
            return JSON.parse(response.content);
        }

      
        const docs = await retriever.invoke(statement);
        const context = formatDocumentsAsString(docs);

        const prompt = `
            You are an expert fact checker. Your task is to verify the following statement using the provided search results.
            
            Statement: ${statement}
            
            Search Results:
            ${context}
            
            Analyze the statement and search results carefully. Then provide a comprehensive fact check.
            
            For visualContent, create a simple HTML visualization that represents your fact check.
            Use appropriate colors, formatting, and layout to make the information clear and visually appealing.
        `;


        const response = await model.invoke(prompt);
        
        return JSON.parse(response.content);
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
