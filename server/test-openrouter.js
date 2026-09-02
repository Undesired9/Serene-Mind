const { handleChat } = require('./services/aiService');

async function runTest() {
    console.log("Testing OpenRouter handleChat with nvidia/nemotron-3.5-lightning:free...");
    try {
        const response = await handleChat("Hello, how are you feeling today?", [
            { text: "Hello", sender: "user" }
        ]);
        console.log("Response:", response);
    } catch (e) {
        console.error("Test Error:", e);
    }
}

runTest();
