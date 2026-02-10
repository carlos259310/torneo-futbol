import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

console.log("🔍 STARTING INTERNAL CONNECTION TESTS...\n");

// TEST 1: GEMINI
async function testGemini() {
    console.log("👉 Testing Gemini API...");
    if (!GEMINI_KEY) {
        console.log("❌ SKIPPED: No GEMINI_API_KEY found.");
        return;
    }
    
    const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash"];
    
    for (const modelName of modelsToTry) {
        console.log(`   Trying ${modelName}...`);
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'OK'");
            const text = result.response.text();
            console.log(`   ✅ SUCCESS (${modelName}): "${text.trim()}"`);
            return; // Exit after first success
        } catch (e) {
            console.log(`   ❌ FAILED (${modelName}): ${e.message}`);
        }
    }
}

// TEST 2: GROQ
async function testGroq() {
    console.log("\n👉 Testing Groq API...");
    if (!GROQ_KEY) {
        console.log("❌ SKIPPED: No GROQ_API_KEY found.");
        return;
    }
    
    // Updated Groq models
    const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192"];
    
    for (const modelName of modelsToTry) {
        console.log(`   Trying ${modelName}...`);
        try {
            const groq = new Groq({ apiKey: GROQ_KEY });
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: "Say 'OK'" }],
                model: modelName,
            });
            console.log(`   ✅ SUCCESS (${modelName}): "${completion.choices[0]?.message?.content?.trim()}"`);
            return;
        } catch (e) {
            console.log(`   ❌ FAILED (${modelName}): ${e.message}`);
        }
    }
}

async function run() {
    await testGemini();
    await testGroq();
    console.log("\n🏁 DIAGNOSTIC COMPLETE.");
}

run();
