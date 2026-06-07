require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const CRISIS_KEYWORDS = [
    'suicide', 'kill', 'end my life', 'hurt myself', 'die', 'self-harm'
];

let genAI;
let model;

async function initAI() {
    if (genAI) return;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY not found in environment variables");
        }
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });
        console.log("✅ Gemini API initialized");
    } catch (error) {
        console.error("❌ Gemini init failed:", error);
    }
}

initAI();

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

const cleanOutput = (text) => {
    return text
        .replace(/(?:^\s*\d+\.\s+.*(?:\n|$))+/gm, '')
        .replace(/thought[\s\S]*?\n\n/i, '')
        .replace(/plan:[\s\S]*/i, '')
        .replace(/^.*?(?=(I|It sounds|That feels|You))/i, '')
        .trim();
};

const handleChat = async (message, history = [], onTextChunk = null) => {
    const riskLevel = detectRisk(message);

    if (riskLevel === 'HIGH') {
        return {
            reply: "I’m really sorry you’re feeling this way. Please reach out to a trusted person or your local emergency service right now—you don’t have to face this alone.",
            riskLevel: 'HIGH',
            isCrisis: true
        };
    }

    await initAI();

    if (!model) {
        return {
            reply: "I'm having trouble connecting right now. Please try again shortly.",
            riskLevel,
            isCrisis: false
        };
    }

    try {
        const chatHistory = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text || msg.content || "" }]
        }));

        const chat = model.startChat({
            history: chatHistory,
            systemInstruction: buildSystemPrompt(),
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.7,
                topP: 0.9
            }
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const raw = response.text();

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
    }
};

const generatePatientReportMock = async (patient, moodLogs, recentSessions) => {
    await initAI();

    if (!model) {
        return {
            title: `AI Wellness Summary for ${patient.username}`,
            content: "AI service unavailable."
        };
    }

    try {
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

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: "You are a clinical therapist AI assistant. Be concise, objective, and professional.",
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.3
            }
        });

        const response = await result.response;
        const content = response.text();

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
    }
};

module.exports = {
    handleChat,
    detectRisk,
    generatePatientReportMock
};
