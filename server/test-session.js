async function test() {
    const { getLlama, LlamaChatSession } = await import("node-llama-cpp");
    const llama = await getLlama();
    const path = require("path");
    const model = await llama.loadModel({
        modelPath: path.join(__dirname, "models/medgemma-1.5-4b-it-Q4_K_M.gguf")
    });
    const context = await model.createContext();
    const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt: "You are a mental health counselor."
    });
    
    console.log(typeof session.setChatHistory);
    console.log(session.getChatHistory());
}
test().catch(console.error);
