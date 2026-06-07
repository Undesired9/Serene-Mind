const ai = require('./services/aiService');

console.log("Testing aiService...");

ai.initAI().then(() => {
    console.log("initAI done");
}).catch(err => {
    console.error("initAI error:", err);
});
