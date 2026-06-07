require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const CRISIS_KEYWORDS = [
    'suicide', 'kill', 'end my life', 'hurt myself', 'die', 'self-harm'
];

let genAI;

async function initAI() {
    if (genAI) return;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY not found in environment variables");
        }
        genAI = new GoogleGenerativeAI(apiKey);
        console.log("✅ Gemini API initialized");
    } catch (error) {
        console.error("❌ Gemini init failed:", error);
    }
}

initAI();

const detectRisk = (message) => {
    const text = message.toLowerCase();

    const hasHighRisk = CRISIS_KEYWORDS.some(k => {
        const regex = new RegExp(`\\b${k}\\b`, 'i');
        return regex.test(text);
    });
    if (hasHighRisk) {
        return 'HIGH';
    }

    const mid = ['anxious', 'panic', 'overwhelmed', "can't breathe", 'depressed', 'sad'];
    const hasMidRisk = mid.some(k => {
        const regex = new RegExp(`\\b${k}\\b`, 'i');
        return regex.test(text);
    });
    if (hasMidRisk) {
        return 'MEDIUM';
    }

    return 'LOW';
};

const buildSystemPrompt = () => `You are SereneMind, a warm, professional, and empathetic therapist. Your approach is grounded in Person-Centered Therapy, Cognitive Behavioral Therapy (CBT), and mindfulness-based counseling.

ROLE:
- Provide a safe, non-judgmental space for emotional exploration and validation.
- Practice active listening: reflect feelings, validate experiences, and encourage self-compassion.
- Guide the user gently toward self-discovery, helping them reframe unhelpful thoughts or explore coping strategies.

HOW TO RESPOND:
- Always respond in the EXACT same language that the user is using (e.g. English, Spanish, French, Urdu, Hindi, Arabic, Chinese, etc.).
- Always acknowledge and validate the user's emotion first (e.g., "It sounds like you're carrying a lot of weight," or "That sounds incredibly stressful to navigate").
- Keep responses short, concise, and natural (1-3 sentences max).
- Ask exactly one open-ended, thought-provoking question to help them reflect further (e.g., "How does that thought make you feel about yourself?" or "What kind of support do you feel you need most right now?").
- Maintain a warm, conversational, yet clinically sound therapeutic tone.

STRICT RULES:
- Never offer quick fixes, unsolicited advice, or lists of instructions.
- Do not make clinical diagnoses or prescribe medication.
- Avoid sounding clinical, robotic, or overly structured.
- Do not repeat the user's statements word-for-word.
- Never output reasoning blocks, thoughts, plans, or bulleted lists.

CRISIS PROTOCOL:
- If the user hints at self-harm, suicide, or severe crisis, immediately prioritize safety. Acknowledge their pain with profound warmth and urgent care, and explicitly direct them to emergency services or support hotlines.`;

const cleanOutput = (text) => {
    return text
        .replace(/(?:^\s*\d+\.\s+.*(?:\n|$))+/gm, '')
        .replace(/thought[\s\S]*?\n\n/i, '')
        .replace(/plan:[\s\S]*/i, '')
        .replace(/^(?:SereneMind|Counselor|Counselor AI|Therapist|AI|System)\s*:\s*/i, '')
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

    if (!genAI) {
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

        const modelInstance = genAI.getGenerativeModel({
            model: "gemini-3.5-flash",
            systemInstruction: buildSystemPrompt()
        });

        const chat = modelInstance.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 1000,
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

    if (!genAI) {
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

        const modelInstance = genAI.getGenerativeModel({
            model: "gemini-3.5-flash",
            systemInstruction: "You are an expert clinical therapist. Write an objective, concise, and professional mental health wellness summary of the patient's current psychological state, mood trends, and potential focus areas based on the provided session data."
        });

        const result = await modelInstance.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 1000,
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
