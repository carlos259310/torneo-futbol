import fetch from 'node-fetch';

async function testChat() {
  console.log("Testing Chat API...");
  try {
    const response = await fetch('http://localhost:4321/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hola, di "Prueba Exitosa" si funcionas.' }],
        provider: 'gemini'
      })
    });

    if (!response.ok) {
      console.log(`❌ Error Status: ${response.status}`);
      console.log(await response.text());
      return;
    }

    const data = await response.json();
    console.log("✅ Response Data:", JSON.stringify(data, null, 2));
    
    if (data.modelUsed) {
        console.log("✅ Model Used field present:", data.modelUsed);
    } else {
        console.log("⚠️ Model Used field MISSING");
    }

  } catch (error) {
    console.error("❌ Request Failed:", error.message);
    console.log("Make sure 'npm run dev' is running on port 4321!");
  }
}

testChat();
