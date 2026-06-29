require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'hurt myself', 'die', 'self-harm',
    'want to die', 'no reason to live', 'can\'t go on', 'give up'
];

const HIGH_RISK_KEYWORDS = [
    'depressed', 'hopeless', 'overwhelmed', 'can\'t cope', 'worthless',
    'panic attack', 'anxious', 'terrified', 'scared'
];

const MEDIUM_RISK_KEYWORDS = [
    'sad', 'stressed', 'worried', 'upset', 'frustrated', 'angry', 'tired'
];

let genAI;

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODELS = [
    ...new Set(
        (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash')
            .split(',')
            .map((model) => model.trim())
            .filter(Boolean)
            .filter((model) => model !== PRIMARY_MODEL)
    )
];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = Math.max(0, Number(process.env.GEMINI_MAX_RETRIES || 2));
const BASE_RETRY_DELAY_MS = Math.max(200, Number(process.env.GEMINI_RETRY_DELAY_MS || 700));

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

const getRiskTier = (score) => {
    if (score >= 90) return 'CRITICAL';
    if (score >= 66) return 'HIGH';
    if (score >= 31) return 'ELEVATED';
    return 'ROUTINE';
};

const getRiskLevelFromTier = (tier) => {
    if (tier === 'CRITICAL' || tier === 'HIGH') return 'HIGH';
    if (tier === 'ELEVATED') return 'MEDIUM';
    return 'LOW';
};

const detectRisk = (message) => {
    const text = message.toLowerCase();
    let score = 0;

    // Check for crisis keywords first (highest priority)
    const hasCrisis = CRISIS_KEYWORDS.some(k => {
        const regex = new RegExp(`\\b${k}\\b`, 'i');
        return regex.test(text);
    });
    if (hasCrisis) {
        return { score: 95, tier: 'CRITICAL' };
    }

    // Check for high risk keywords
    const highRiskCount = HIGH_RISK_KEYWORDS.filter(k => {
        const regex = new RegExp(`\\b${k}\\b`, 'i');
        return regex.test(text);
    }).length;
    score += highRiskCount * 15;

    // Check for medium risk keywords
    const mediumRiskCount = MEDIUM_RISK_KEYWORDS.filter(k => {
        const regex = new RegExp(`\\b${k}\\b`, 'i');
        return regex.test(text);
    }).length;
    score += mediumRiskCount * 8;

    // Cap the score at 89 (since 90+ is CRITICAL)
    score = Math.min(score, 89);

    const tier = getRiskTier(score);
    return { score, tier };
};

const buildSystemPrompt = (assessment) => {
    let prompt = `You are SereneMind, a warm, professional, and empathetic therapist. Your approach is grounded in Person-Centered Therapy, Cognitive Behavioral Therapy (CBT), and mindfulness-based counseling.

ROLE:
- Provide a safe, non-judgmental space for emotional exploration and validation.
- Practice active listening: reflect feelings, validate experiences, and encourage self-compassion.
- Guide the user gently toward self-discovery, helping them reframe unhelpful thoughts or explore coping strategies.

HOW TO RESPOND:
- Always respond in the EXACT same language that the user is using (e.g., English, Spanish, French, Urdu, Hindi, Arabic, Chinese, etc.).
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

    if (assessment) {
        prompt += `

PATIENT ASSESSMENT INFORMATION:
- Completed intake assessment: Yes
- PHQ-9 (Depression) Score: ${assessment.phq9_score || 'Not provided'}
- GAD-7 (Anxiety) Score: ${assessment.gad7_score || 'Not provided'}
- Severity: ${assessment.severity || 'Not provided'}
- Main Concern: ${assessment.main_concern || 'Not provided'}
- Additional Notes: ${assessment.notes || 'Not provided'}

INSTRUCTIONS:
- Take the above assessment into account when responding to the user.
- Tailor your support to their specific concerns and severity level.
- Reference their assessment data naturally in your responses only when relevant, without being clinical about it.`;
    }

    return prompt;
};

const cleanOutput = (text) => {
    return text
        .replace(/(?:^\s*\d+\.\s+.*(?:\n|$))+/gm, '')
        .replace(/thought[\s\S]*?\n\n/i, '')
        .replace(/plan:[\s\S]*/i, '')
        .replace(/^(?:SereneMind|Counselor|Counselor AI|Therapist|AI|System)\s*:\s*/i, '')
        .trim();
};

const sanitizeHistoryForGemini = (history = []) => {
    const normalizedHistory = history
        .map((msg) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            text: (msg.text || msg.content || '').trim()
        }))
        .filter((msg) => msg.text)
        .map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

    while (normalizedHistory.length > 0 && normalizedHistory[0].role !== 'user') {
        normalizedHistory.shift();
    }

    return normalizedHistory;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGeminiError = (error) => {
    const status = error?.status;
    const message = `${error?.message || ''} ${error?.statusText || ''}`.toLowerCase();

    return RETRYABLE_STATUS_CODES.has(status) ||
        message.includes('service unavailable') ||
        message.includes('high demand') ||
        message.includes('temporarily unavailable') ||
        message.includes('overloaded');
};

const getRetryDelay = (attempt) =>
    BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 250);

const runWithModelResilience = async (runner) => {
    const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
    let lastError;

    for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
            try {
                return await runner(modelName);
            } catch (error) {
                lastError = error;
                const canRetrySameModel = isRetryableGeminiError(error) && attempt < MAX_RETRIES;

                if (canRetrySameModel) {
                    const delay = getRetryDelay(attempt);
                    console.warn(`Gemini request failed on ${modelName} (attempt ${attempt + 1}). Retrying in ${delay}ms...`, {
                        status: error?.status,
                        statusText: error?.statusText
                    });
                    await sleep(delay);
                    continue;
                }

                console.warn(`Gemini request failed on ${modelName}.`, {
                    status: error?.status,
                    statusText: error?.statusText
                });
                break;
            }
        }
    }

    throw lastError;
};

const handleChat = async (message, history = [], assessment = null, onTextChunk = null) => {
    const { score: riskScore, tier: riskTier } = detectRisk(message);
    const riskLevel = getRiskLevelFromTier(riskTier);

    if (riskTier === 'CRITICAL') {
        return {
            reply: "I’m really sorry you’re feeling this way. Please reach out to a trusted person or your local emergency service right now—you don’t have to face this alone.",
            riskLevel,
            riskScore,
            riskTier,
            isCrisis: true
        };
    }

    await initAI();

    if (!genAI) {
        return {
            reply: "I'm having trouble connecting right now. Please try again shortly.",
            riskLevel,
            riskScore,
            riskTier,
            isCrisis: false
        };
    }

    try {
        const chatHistory = sanitizeHistoryForGemini(history);
        const raw = await runWithModelResilience(async (modelName) => {
            const modelInstance = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: buildSystemPrompt(assessment)
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
            return response.text();
        });
        const reply = cleanOutput(raw) || "I hear you. Tell me more about that.";

        return {
            reply,
            riskLevel,
            riskScore,
            riskTier,
            isCrisis: false
        };

    } catch (error) {
        console.error("❌ Generation error:", error);

        return {
            reply: "I’m here with you—could you say that again?",
            riskLevel,
            riskScore,
            riskTier,
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

        const content = await runWithModelResilience(async (modelName) => {
            const modelInstance = genAI.getGenerativeModel({
                model: modelName,
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
            return response.text();
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
    }
};

module.exports = {
    handleChat,
    detectRisk,
    getRiskTier,
    getRiskLevelFromTier,
    generatePatientReportMock
};