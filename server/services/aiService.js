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

const FAST_FREE_MODELS = [
    'google/gemini-2.0-flash-lite-preview:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3.5-lightning:free',
    'mistralai/mistral-7b-instruct:free'
];

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || FAST_FREE_MODELS[0];
const MAX_RETRIES = Math.max(0, Number(process.env.OPENROUTER_MAX_RETRIES || 2));
const BASE_RETRY_DELAY_MS = Math.max(150, Number(process.env.OPENROUTER_RETRY_DELAY_MS || 400));
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

let apiKeyAvailable = false;

function checkApiKey() {
    const apiKey = process.env.serenemind;
    if (!apiKey) {
        console.error("❌ OpenRouter API key not found. Set 'serenemind' environment variable.");
        return false;
    }
    apiKeyAvailable = true;
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
    let prompt = `You are SereneMind, a compassionate, warm, and highly skilled licensed psychotherapist and mental wellness companion. You are in a 1-on-1 private therapy session with a client.

CORE THERAPEUTIC APPROACH:
- Person-Centered Therapy (Carl Rogers): Offer unconditional positive regard, deep empathy, and genuine emotional validation.
- Cognitive Behavioral Therapy (CBT): Gently help the client identify feelings, reframe negative thoughts, and explore healthy coping strategies.

CRITICAL INSTRUCTIONS FOR EVERY RESPONSE:
1. TALK DIRECTLY TO THE CLIENT: Always speak directly to the person in front of you ("I hear you", "You are not alone", "It's completely understandable to feel that way").
2. ABSOLUTELY NO META-ANALYSIS OR REASONING: NEVER output any thinking process, internal monologue, notes, outlines, or headers like "Here's a thinking process:" or bullet points analyzing what the user said. Output ONLY your spoken therapist words.
3. CONVERSATIONAL FLOW (2-4 natural sentences):
   - First, deeply validate their emotion (e.g. "I can hear how exhausting and heavy depression feels right now. It takes real courage to put those feelings into words.").
   - Then, ask exactly ONE gentle, open-ended question or offer a comforting reflection to help them explore what they are going through.
4. NATURAL HUMAN TONE: Sound like an empathetic, real therapist sitting across from them — warm, gentle, non-judgmental, and validating.
5. LANGUAGE: Respond in the exact same language or dialect the client is writing in (English, Urdu, etc.).

CRISIS PROTOCOL:
- If the user hints at self-harm, suicide, or severe crisis, immediately prioritize safety. Acknowledge their pain with profound warmth and urgent care, and explicitly direct them to emergency services or support hotlines (Umang 0311-7786264, Rescue 1122).`;

    if (assessment) {
        prompt += `

PATIENT ASSESSMENT CONTEXT:
- PHQ-9 (Depression): ${assessment.phq9_score || 'Not provided'}
- GAD-7 (Anxiety): ${assessment.gad7_score || 'Not provided'}
- Main Concern: ${assessment.main_concern || 'Not provided'}
- Notes: ${assessment.notes || 'Not provided'}

Keep this clinical context in mind to tailor your empathy, without explicitly citing scores unless helpful.`;
    }

    return prompt;
};

const cleanOutput = (text) => {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text;

    // 1. Strip explicit <think>...</think> XML blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 2. Strip "Here's a thinking process:" / "Thinking Process:" blocks and any following bullet points
    cleaned = cleaned.replace(/(?:here(?:'s| is) (?:a |the )?(?:thinking|thought) process|thinking process|thought process):?[\s\S]*?(?=\n\s*\n\s*[A-Za-z"']|\n\s*\n\s*\*\*|$)/gi, '');

    // 3. Strip any leading or isolated reasoning bullet points (e.g. lines starting with "- User:", "* User:", "- Language:", "- Tone:")
    cleaned = cleaned.replace(/(?:^|\n)[-*•]\s*(?:User|Language|Tone|Intent|Response|Therapeutic|Goal|Emotional|State|Observation|Plan)[^\n]*/gi, '');

    // 4. If the text still contains separate paragraphs and the first paragraph is an outline/analysis, grab the conversational text
    const paragraphs = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 1 && (paragraphs[0].startsWith('-') || paragraphs[0].startsWith('*') || /thinking process/i.test(paragraphs[0]))) {
        const directReply = paragraphs.find(p => !p.startsWith('-') && !p.startsWith('*') && !/thinking process/i.test(p) && p.length > 15);
        if (directReply) {
            cleaned = directReply;
        }
    }

    // 5. Strip persona prefixes (e.g. "SereneMind:", "Therapist:", "AI:")
    cleaned = cleaned.replace(/^(?:SereneMind|Counselor|Counselor AI|Therapist|AI|System)\s*:\s*/i, '');

    // 6. Strip numbered lists if any were accidentally produced
    cleaned = cleaned.replace(/(?:^\s*\d+\.\s+.*(?:\n|$))+/gm, '');

    return cleaned.trim();
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
    BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 150);

/**
 * Call OpenRouter API with the given messages and fallback models.
 */
const callOpenRouter = async (messages, options = {}) => {
    const apiKey = process.env.serenemind;
    if (!apiKey) {
        throw new Error("OpenRouter API key ('serenemind') not found in environment variables");
    }

    const {
        model = PRIMARY_MODEL,
        maxTokens = 250,
        temperature = 0.6,
        topP = 0.9
    } = options;

    const candidateModels = Array.from(new Set([
        model,
        ...FAST_FREE_MODELS
    ]));

    let lastError;

    for (const currentModel of candidateModels) {
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
                        model: currentModel,
                        messages,
                        max_tokens: maxTokens,
                        temperature,
                        top_p: topP
                    })
                });

                if (!response.ok) {
                    const errorBody = await response.text().catch(() => 'Unknown error');
                    const error = new Error(`OpenRouter API error (${currentModel}): ${response.status} - ${errorBody}`);
                    error.status = response.status;

                    if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
                        const delay = getRetryDelay(attempt);
                        await sleep(delay);
                        continue;
                    }

                    // Try next model candidate
                    lastError = error;
                    break;
                }

                const data = await response.json();
                const content = data?.choices?.[0]?.message?.content;

                if (!content) {
                    throw new Error(`No content in OpenRouter response from ${currentModel}`);
                }

                return content;
            } catch (error) {
                lastError = error;

                if (error.status && isRetryableError(error.status) && attempt < MAX_RETRIES) {
                    const delay = getRetryDelay(attempt);
                    await sleep(delay);
                    continue;
                }
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

/**
 * Stream OpenRouter completions using server-sent chunks
 */
const streamOpenRouter = async (messages, onChunk, options = {}) => {
    const apiKey = process.env.serenemind;
    if (!apiKey) {
        throw new Error("OpenRouter API key ('serenemind') not found in environment variables");
    }

    const {
        model = PRIMARY_MODEL,
        maxTokens = 250,
        temperature = 0.6,
        topP = 0.9
    } = options;

    const candidateModels = Array.from(new Set([
        model,
        ...FAST_FREE_MODELS
    ]));

    let lastError;

    for (const currentModel of candidateModels) {
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
                        model: currentModel,
                        messages,
                        max_tokens: maxTokens,
                        temperature,
                        top_p: topP,
                        stream: true
                    })
                });

                if (!response.ok) {
                    const errorBody = await response.text().catch(() => 'Unknown error');
                    const error = new Error(`OpenRouter stream error (${currentModel}): ${response.status} - ${errorBody}`);
                    error.status = response.status;

                    if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
                        const delay = getRetryDelay(attempt);
                        await sleep(delay);
                        continue;
                    }
                    lastError = error;
                    break;
                }

                let fullContent = '';

                if (response.body && response.body.getReader) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || !trimmed.startsWith('data:')) continue;
                            const jsonStr = trimmed.replace(/^data:\s*/, '');
                            if (jsonStr === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(jsonStr);
                                const delta = parsed?.choices?.[0]?.delta?.content || '';
                                if (delta) {
                                    fullContent += delta;
                                    if (onChunk) onChunk(delta);
                                }
                            } catch (parseErr) {}
                        }
                    }
                } else if (response.body && typeof response.body.on === 'function') {
                    await new Promise((resolve, reject) => {
                        let buffer = '';
                        response.body.on('data', (chunk) => {
                            buffer += chunk.toString();
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || !trimmed.startsWith('data:')) continue;
                                const jsonStr = trimmed.replace(/^data:\s*/, '');
                                if (jsonStr === '[DONE]') continue;

                                try {
                                    const parsed = JSON.parse(jsonStr);
                                    const delta = parsed?.choices?.[0]?.delta?.content || '';
                                    if (delta) {
                                        fullContent += delta;
                                        if (onChunk) onChunk(delta);
                                    }
                                } catch (parseErr) {}
                            }
                        });
                        response.body.on('end', () => resolve());
                        response.body.on('error', (err) => reject(err));
                    });
                } else {
                    // Fallback to json text
                    const data = await response.json();
                    fullContent = data?.choices?.[0]?.message?.content || '';
                    if (onChunk && fullContent) onChunk(fullContent);
                }

                return fullContent;
            } catch (err) {
                lastError = err;
                if (err.status && isRetryableError(err.status) && attempt < MAX_RETRIES) {
                    const delay = getRetryDelay(attempt);
                    await sleep(delay);
                    continue;
                }
                break;
            }
        }
    }

    throw lastError;
};

module.exports = {
    handleChat,
    callOpenRouter,
    streamOpenRouter,
    detectRisk,
    getRiskTier,
    getRiskLevelFromTier,
    generatePatientReportMock,
    cleanOutput,
    buildSystemPrompt,
    checkApiKey,
    sanitizeHistoryForOpenRouter
};