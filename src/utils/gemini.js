import axios from "axios";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent";

/**
 * Sends text and link content to Gemini AI for scam detection.
 */
export const analyzeScamText = async (message, linkContent) => {
    const content = {
        parts: [
            {
                text: `
                    You are a spam detection system. Analyze this SMS message and the content of links it contains.
                    Return a JSON object with:
                    - spamScore (0-100)
                    - dangerScore (0-100)
                    - warnings (array)

                    Pay special attention to phishing attempts, suspicious links, and misleading content.

                    MESSAGE:
                    ${message}

                    WEBSITE CONTENT FROM LINKS:
                    ${linkContent}
                `
            }
        ]
    };

    try {
        const response = await axios.post(
            `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
            { contents: [content] },
            { headers: { "Content-Type": "application/json" } }
        );

        // ✅ Ensure response structure is valid before parsing
        if (
            !response.data ||
            !response.data.candidates ||
            !response.data.candidates[0] ||
            !response.data.candidates[0].content ||
            !response.data.candidates[0].content.parts ||
            !response.data.candidates[0].content.parts[0] ||
            !response.data.candidates[0].content.parts[0].text
        ) {
            throw new Error("Invalid API response format");
        }

        const rawText = response.data.candidates[0].content.parts[0].text;

        // ✅ Ensure valid JSON response before parsing
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : rawText;

        const analysis = JSON.parse(jsonString);
        return analysis;
    } catch (error) {
        console.error("Error analyzing scam text:", error);
        return { spamScore: 0, dangerScore: 0, warnings: ["Failed to analyze"] };
    }
};
