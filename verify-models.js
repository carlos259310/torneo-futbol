const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("No GEMINI_API_KEY found in environment.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Placeholder
    // Actually, there isn't a direct listModels on genAI instance in the node SDK easily exposed 
    // without using the model manager or similar, but let's try a simple generation with a known fallback 
    // OR just try to hit the list endpoint if possible. 
    // The Node SDK doesn't always expose listModels directly on the main class in older versions, 
    // but let's try to just run a test generation with 'gemini-1.5-flash' and 'gemini-pro' to see which works.
    
    console.log("Testing gemini-1.5-flash...");
    try {
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const resultFlash = await modelFlash.generateContent("Test");
        console.log("SUCCESS: gemini-1.5-flash works.");
    } catch (e) {
        console.log("FAIL: gemini-1.5-flash failed:", e.message);
    }

    console.log("Testing gemini-pro...");
    try {
        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        const resultPro = await modelPro.generateContent("Test");
        console.log("SUCCESS: gemini-pro works.");
    } catch (e) {
        console.log("FAIL: gemini-pro failed:", e.message);
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
