const path = require('path');

const CRISIS_KEYWORDS = [
    'suicide', 'kill', 'end my life', 'hurt myself', 'die', 'self-harm'
];

let llama;
let model;
let context;

/* =========================
   INIT MODEL (Singleton)
========================= */
async function initAI() {
    if (llama) return;

    try {
        const llamaModule = await import("node-llama-cpp");
        llama = await llamaModule.getLlama();

        model = await llama.loadModel({
            modelPath: path.join(__dirname, "../models/qwen2.5-3b-instruct-q4_k_m.gguf")
        });

        context = await model.createContext({
            contextSize: 4096
        });

        console.log("✅ Qwen-2.5 model loaded");
    } catch (error) {
        console.error("❌ Model load failed:", error);
    }
}

// preload
initAI();

/* =========================
   RISK DETECTION
========================= */
const detectRisk = (message) => {
    const text = message.toLowerCase();

    if (CRISIS_KEYWORDS.some(k => text.includes(k))) {
        return 'HIGH';
    }

    const mid = ['anxious', 'panic', 'overwhelmed', "can't breathe", 'depressed', 'sad'];
    if (mid.some(k => text.includes(k))) {
        return 'MEDIUM';
    }

    return 'LOW';
};

/* =========================
   BUILD THERAPIST PROMPT
========================= */
const buildSystemPrompt = () => `You are SereneMind, a warm, compassionate, human-like emotional support counselor.

ROLE:
- Be empathetic, calm, and non-judgmental.
- Help the user feel heard, not fixed.
- Focus on emotions, not solutions.

HOW TO RESPOND:
- Always acknowledge the user's feelings first.
- Reflect emotional meaning gently.
- Keep replies VERY short (1-2 sentences max).
- Ask at most ONE soft, open-ended question if helpful.
- Sound natural and conversational.

STRICT RULES:
- No bullet points, lists, or structured plans.
- No "Thought:", "Plan:", or reasoning output.
- No clinical or robotic tone.
- No long explanations.
- No diagnosis or medical advice.
- Do not repeat the user's message verbatim.

CRISIS RULE:
If the user expresses self-harm or suicidal intent, override normal behavior, respond with urgency, and direct them to immediate help.`;

/* =========================
   CLEAN MODEL OUTPUT
========================= */
const cleanOutput = (text) => {
    return text
        .replace(/(?:^\s*\d+\.\s+.*(?:\n|$))+/gm, '') // remove lists
        .replace(/thought[\s\S]*?\n\n/i, '')
        .replace(/plan:[\s\S]*/i, '')
        .replace(/^.*?(?=(I|It sounds|That feels|You))/i, '')
        .trim();
};

/* =========================
   CHAT HANDLER
========================= */
const handleChat = async (message, history = [], onTextChunk = null) => {
    const riskLevel = detectRisk(message);

    /* -------- HIGH RISK -------- */
    if (riskLevel === 'HIGH') {
        return {
            reply: "I’m really sorry you’re feeling this way. Please reach out to a trusted person or your local emergency service right now—you don’t have to face this alone.",
            riskLevel: 'HIGH',
            isCrisis: true
        };
    }

    await initAI();

    if (!context) {
        return {
            reply: "I'm having trouble connecting right now. Please try again shortly.",
            riskLevel,
            isCrisis: false
        };
    }

    const { LlamaChatSession } = await import("node-llama-cpp");
    const sequence = context.getSequence();

    try {
        // node-llama-cpp v3 handles chatML format properly when using systemPrompt.
        const session = new LlamaChatSession({
            contextSequence: sequence,
            systemPrompt: buildSystemPrompt()
        });

        // Set up history for node-llama-cpp v3 session
        if (history && history.length > 0) {
            const chatHistory = history.map(msg => ({
                type: msg.sender === 'user' ? 'user' : 'model',
                text: msg.text || msg.content || "",
                ...(msg.sender !== 'user' && { response: [msg.text || msg.content || ""] })
            }));
            session.setChatHistory(chatHistory);
        }

        const raw = await session.prompt(message, {
            maxTokens: 100, // Short responses (1-2 sentences)
            temperature: 0.7, // Warm, human-like variability
            topP: 0.9, 
            repeatPenalty: 1.1, // Prevent looping
            onTextChunk: onTextChunk ? (chunk) => onTextChunk(chunk) : undefined
        });

        const reply = cleanOutput(raw) || "I hear you. Tell me more about that.";

        return {
            reply,
            riskLevel,
            isCrisis: false
        };

    } catch (error) {
        console.error("❌ Generation error:", error);

        return {
            reply: "I’m here with you—could you say that again?",
            riskLevel,
            isCrisis: false
        };
    } finally {
        sequence.dispose();
    }
};

/* =========================
   REPORT GENERATION
========================= */
const generatePatientReportMock = async (patient, moodLogs, recentSessions) => {
    await initAI();

    if (!context) {
        return {
            title: `AI Wellness Summary for ${patient.username}`,
            content: "AI service unavailable."
        };
    }

    const { LlamaChatSession } = await import("node-llama-cpp");
    const sequence = context.getSequence();

    try {
        const session = new LlamaChatSession({
            contextSequence: sequence,
            systemPrompt: "You are a clinical therapist AI assistant. Be concise, objective, and professional."
        });

        const moodSummary = moodLogs.length
            ? `Average mood: ${Math.round(
                moodLogs.reduce((a, b) => a + b.mood_score, 0) / moodLogs.length
            )}/10`
            : "No mood data.";

        const hasHighRisk = recentSessions.some(s => s.risk_level === 'HIGH');

        const prompt = `
Patient: ${patient.username}
Mood: ${moodSummary}
Risk: ${hasHighRisk ? "Recent HIGH risk detected" : "No recent high risk"}

Write a short clinical summary.
`;

        const content = await session.prompt(prompt, {
            maxTokens: 150,
            temperature: 0.3
        });

        return {
            title: `AI Wellness Summary for ${patient.username}`,
            content
        };

    } catch (err) {
        console.error("❌ Report error:", err);

        return {
            title: `AI Wellness Summary for ${patient.username}`,
            content: "Error generating report."
        };
    } finally {
        sequence.dispose();
    }
};

/* =========================
   EXPORTS
========================= */
module.exports = {
    handleChat,
    detectRisk,
    generatePatientReportMock
};