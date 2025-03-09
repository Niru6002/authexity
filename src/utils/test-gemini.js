// Test file for Gemini API integration
import { factCheckStatement } from './gemini.js';

async function testGeminiAPI() {
  try {
    console.log("Testing Gemini API fact checking...");
    
    const statement = "The Earth is flat.";
    console.log(`Fact checking statement: "${statement}"`);
    
    const result = await factCheckStatement(statement);
    console.log("Fact check result:", JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGeminiAPI()
    .then(() => console.log("Test completed successfully"))
    .catch(err => console.error("Test failed:", err));
}

export default testGeminiAPI; 