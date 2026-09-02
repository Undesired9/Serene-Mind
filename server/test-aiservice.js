const { handleChat } = require('./services/aiService');

async function runTest() {
    console.log("Testing handleChat...");
    try {
        const response = await handleChat("Hello, how are you?", [
            { text: "Hello", sender: "user" }
        ]);
        console.log("Response:", response);
    } catch (e) {
        console.error("Test Error:", e);
    }
}

runTest();
