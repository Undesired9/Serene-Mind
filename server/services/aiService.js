const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free';
const MAX_RETRIES = Math.max(0, Number(process.env.OPENROUTER_MAX_RETRIES || 2));
const BASE_RETRY_DELAY_MS = Math.max(200, Number(process.env.OPENROUTER_RETRY_DELAY_MS || 700));
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

let apiKeyAvailable = false;

function checkApiKey() {
    const apiKey = process.env.serenemind;
    if (!apiKey) {
        console.error("❌ OpenRouter API key not found. Set 'serenemind' environment variable.");
        return false;
    }
    apiKeyAvailable = true;
    console.log("✅ OpenRouter API key found");
    return true;
}

checkApiKey();

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

const sanitizeHistoryForOpenRouter = (history = []) => {
    return history
        .map((msg) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: (msg.text || msg.content || '').trim()
        }))
        .filter((msg) => msg.content);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (status) => {
    return RETRYABLE_STATUS_CODES.has(status);
};

const getRetryDelay = (attempt) =>
    BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 250);

/**
 * Call OpenRouter API with the given messages.
 * Uses the OpenAI-compatible chat completions endpoint.
 */
const callOpenRouter = async (messages, options = {}) => {
    const apiKey = process.env.serenemind;
    if (!apiKey) {
        throw new Error("OpenRouter API key ('serenemind') not found in environment variables");
    }

    const {
        model = PRIMARY_MODEL,
        maxTokens = 1000,
        temperature = 0.7,
        topP = 0.9
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://serenemind.vercel.app',
                    'X-Title': 'SereneMind'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: maxTokens,
                    temperature,
                    top_p: topP
                })
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unknown error');
                const error = new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
                error.status = response.status;

                if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
                    const delay = getRetryDelay(attempt);
                    console.warn(`OpenRouter request failed (attempt ${attempt + 1}). Retrying in ${delay}ms...`, {
                        status: response.status
                    });
                    await sleep(delay);
                    continue;
                }

                throw error;
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('No content in OpenRouter response');
            }

            return content;
        } catch (error) {
            lastError = error;

            if (error.status && isRetryableError(error.status) && attempt < MAX_RETRIES) {
                const delay = getRetryDelay(attempt);
                console.warn(`OpenRouter request failed (attempt ${attempt + 1}). Retrying in ${delay}ms...`);
                await sleep(delay);
                continue;
            }

            if (attempt >= MAX_RETRIES) {
                throw error;
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
            reply: "I'm really sorry you're feeling this way. Please reach out to a trusted person or your local emergency service right now—you don't have to face this alone.",
            riskLevel,
            riskScore,
            riskTier,
            isCrisis: true
        };
    }

    if (!checkApiKey()) {
        return {
            reply: "I'm having trouble connecting right now. Please try again shortly.",
            riskLevel,
            riskScore,
            riskTier,
            isCrisis: false
        };
    }

    try {
        const chatHistory = sanitizeHistoryForOpenRouter(history);
        const systemPrompt = buildSystemPrompt(assessment);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: message }
        ];

        const raw = await callOpenRouter(messages, {
            maxTokens: 1000,
            temperature: 0.7,
            topP: 0.9
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
            reply: "I'm here with you—could you say that again?",
            riskLevel,
            riskScore,
            riskTier,
            isCrisis: false
        };
    }
};

const generatePatientReportMock = async (patient, moodLogs, recentSessions) => {
    if (!checkApiKey()) {
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

        const userPrompt = `
Patient: ${patient.username}
Mood: ${moodSummary}
Risk: ${hasHighRisk ? "Recent HIGH risk detected" : "No recent high risk"}

Write a short clinical summary.
`;

        const messages = [
            {
                role: 'system',
                content: "You are an expert clinical therapist. Write an objective, concise, and professional mental health wellness summary of the patient's current psychological state, mood trends, and potential focus areas based on the provided session data."
            },
            { role: 'user', content: userPrompt }
        ];

        const content = await callOpenRouter(messages, {
            maxTokens: 1000,
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
    }
};

module.exports = {
    handleChat,
    detectRisk,
    getRiskTier,
    getRiskLevelFromTier,
    generatePatientReportMock
};