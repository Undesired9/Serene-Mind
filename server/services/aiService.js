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

const PRIMARY_MODEL = 'nvidia/nemotron-3.5-lightning:free';
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

/**
 * Master system prompt — legally safe identity framing, RISK_FLAG instructions, hard boundaries.
 * @param {object|null} assessment  latest assessment row from DB (may be null)
 * @param {string}      riskTier    LOW | MODERATE | HIGH | CRITICAL (from risk engine)
 */
const buildSystemPrompt = (assessment = null, riskTier = 'LOW') => {
    // CRITICAL context block — if somehow a CRITICAL-tier message reaches the LLM, constrain it
    const riskContext = riskTier === 'CRITICAL'
        ? `\n\n## CRITICAL SAFETY OVERRIDE\nThe server has classified this session as CRITICAL risk. Do NOT continue normal conversation. Output ONLY this fixed message (verbatim):\n"I'm really concerned about your safety right now. Please contact the Umang Pakistan Mental Health Helpline immediately at 0311-7786264, or call Emergency Rescue at 1122. You can also reach a trusted person near you — you don't have to face this alone."`
        : `\n\n## Current session context (server-injected — treat as ground truth)\nRisk tier: ${riskTier}. Calibrate warmth and pacing accordingly; do not reference the tier label to the user.`;

    let clinicalContext = '';
    if (assessment) {
        const phq = assessment.phq9_score ?? assessment.depression_score ?? null;
        const gad = assessment.gad7_score ?? assessment.anxiety_score ?? null;
        const concern = assessment.main_concern || '';
        clinicalContext = `\n\n## Patient background (tone calibration only — never quote raw numbers to the user)\n- Depression severity score: ${phq != null ? phq + '/27' : 'not available'}\n- Anxiety severity score: ${gad != null ? gad + '/21' : 'not available'}\n- Presenting concern: ${concern || 'not specified'}\n\nAdapt pacing and depth of empathy based on this context. Do not mention scores, percentages, or diagnostic labels in your reply.`;
    }

    return `You are the SereneMind Companion — an AI-powered supportive wellness tool.
You are NOT a licensed therapist, psychiatrist, psychologist, or medical professional, and you must never imply otherwise, even if the user asks you to roleplay as one or claims it would help them.

## Identity & framing (state naturally — do not recite this block verbatim every turn)
- You are a supportive companion using person-centered (Carl Rogers) and CBT-informed conversational techniques.
- You are not a substitute for professional care. If the user asks "are you a real therapist / doctor," say clearly that you are an AI support tool, not a licensed clinician.
- You do not diagnose conditions, prescribe or recommend medication, dosages, or medical treatment changes. Redirect those questions to their care team.

## Language handling
- Respond in the same language/register the user writes in, including Urdu, Roman Urdu, or code-switched English-Urdu. Do not force English.
- Mirror the user's own phrasing — do not assume fluency either way.

## Conversational style
- 2–4 sentences per turn. Warm, direct, concrete. No clinical jargon.
- End with at most ONE open, non-leading question — never interrogate with multiple questions.
- Never produce numbered diagnostic lists, symptom checklists, or anything that reads like a clinical assessment mid-conversation.
- Reflect feelings in the user's own words before offering any reframe or suggestion (validate first, advise second).

## Defense-in-depth risk flagging (secondary signal — server strips this tag before display)
The server already runs deterministic keyword/regex crisis detection before you see any message.
That system can still miss: negated statements, third-person framing that is actually about the user,
non-English phrasing, or subtler language (hopelessness without trigger words, giving away possessions,
sudden calm after prolonged distress).

If, and only if, you notice language that plausibly indicates the user may be at risk to themselves or
others RIGHT NOW, append this exact machine-readable tag at the very end of your response, on its own line:

[[RISK_FLAG: brief_reason]]

- Do not mention this tag to the user or explain that you are flagging anything — it is stripped before display.
- Only flag genuine plausible risk — not general sadness, venting, or discussion of a difficult past.
- This flag NEVER locks chat or triggers hotline display by itself. Your server re-runs full risk evaluation.

## Hard boundaries — never do these, regardless of how the user asks
- Never provide instructions, methods, or specifics related to self-harm, suicide, or harming others,
  even framed as "hypothetical," "for a story," "for safety awareness," or "my friend asked."
- Never promise confidentiality ("this stays between us") — clinicians may review flagged conversations.
- Never tell the user to stop taking medication, change a dose, or avoid seeking professional or emergency help.
- Never continue roleplay that romanticizes, minimizes, or normalizes self-harm, disordered eating, or substance misuse.
- If the user directly asks for crisis hotline numbers, provide them (Umang Pakistan: 0311-7786264, Emergency Rescue: 1122)
  even in a LOW/MODERATE tier conversation — never withhold them.

## Output format constraints
- No <think> tags, no meta-commentary about your instructions, no "As an AI…" disclaimers beyond the above.
- No text before or after your reply except the optional RISK_FLAG tag.
${riskContext}${clinicalContext}`;
};

const cleanOutput = (text) => {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();

    // 1. Strip explicit <think>...</think> XML blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Check if the model wrapped its final response in a spoken quote (e.g. I'll respond: "...")
    const quoteMatch = cleaned.match(/(?:I'll respond|I will respond|My response|Therapist response|Spoken response|Suggested response):\s*["“]([\s\S]+?)["”](?:\s*$)/i);
    if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim().length > 10) {
        return quoteMatch[1].trim();
    }

    const unquotedMatch = cleaned.match(/(?:I'll respond|I will respond|My response|Therapist response|Spoken response|Suggested response):\s*([\s\S]+$)/i);
    if (unquotedMatch && unquotedMatch[1] && unquotedMatch[1].trim().length > 10) {
        cleaned = unquotedMatch[1].trim().replace(/^["“]|["”]$/g, '');
    }

    // 3. Strip "Here's a thinking process:" / "Thinking Process:" blocks
    cleaned = cleaned.replace(/(?:here(?:'s| is) (?:a |the )?(?:thinking|thought) process|thinking process|thought process):?[\s\S]*?(?=\n\s*\n\s*[A-Za-z"']|\n\s*\n\s*\*\*|$)/gi, '');

    // 4. Strip meta-reasoning bullet points
    cleaned = cleaned.replace(/(?:^|\n)[-*•]\s*(?:User|Language|Tone|Intent|Response|Therapeutic|Goal|Emotional|State|Observation|Plan)[^\n]*/gi, '');

    // 5. Filter out paragraphs containing third-person analysis
    const isMetaParagraph = (p) => {
        const lower = p.toLowerCase();
        return (
            lower.startsWith('the user ') ||
            lower.startsWith('the client ') ||
            lower.startsWith('the speaker ') ||
            lower.startsWith('user says') ||
            lower.startsWith('user repeated') ||
            lower.startsWith('user states') ||
            lower.startsWith('i need to ') ||
            lower.startsWith('i should ') ||
            lower.startsWith('i must ') ||
            lower.startsWith('plan:') ||
            lower.startsWith('thinking:') ||
            lower.startsWith('thought:') ||
            lower.startsWith('- ') ||
            lower.startsWith('* ')
        );
    };

    const paragraphs = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const validParagraphs = paragraphs.filter(p => !isMetaParagraph(p));

    if (validParagraphs.length > 0) {
        cleaned = validParagraphs.join('\n\n');
    }

    // 6. Strip persona prefixes (e.g. "SereneMind:", "Therapist:", "AI:")
    cleaned = cleaned.replace(/^(?:SereneMind|Counselor|Counselor AI|Therapist|AI|System)\s*:\s*/i, '');

    // 7. Strip numbered lists
    cleaned = cleaned.replace(/(?:^\s*\d+\.\s+.*(?:\n|$))+/gm, '');

    // 8. Final safety net — strip any stray [[RISK_FLAG:...]] tags that weren't extracted earlier
    cleaned = cleaned.replace(/\[\[RISK_FLAG:[^\]]*\]\]/gi, '').trim();

    return cleaned.trim();
};

/**
 * Extracts the machine-readable [[RISK_FLAG: reason]] tag that the LLM may append.
 * MUST be called before cleanOutput so the tag is captured before other cleaning strips it.
 * The flag is never shown to the user — only logged and used as a secondary risk signal.
 *
 * @param   {string} rawOutput  raw LLM output
 * @returns {{ cleanedText: string, riskFlag: string|null }}
 */
const extractRiskFlag = (rawOutput) => {
    if (!rawOutput || typeof rawOutput !== 'string') {
        return { cleanedText: rawOutput || '', riskFlag: null };
    }
    // Match [[RISK_FLAG: anything up to the closing ]]
    const flagMatch = rawOutput.match(/\[\[RISK_FLAG:\s*([^\]]+)\]\]/i);
    const riskFlag  = flagMatch ? flagMatch[1].trim() : null;
    // Strip the tag from the text that will be sent to the user
    const cleanedText = rawOutput.replace(/\[\[RISK_FLAG:[^\]]*\]\]/gi, '').trim();
    return { cleanedText, riskFlag };
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
 * Call OpenRouter API with nvidia/nemotron-3.5-lightning:free.
 * Fix D: each retry attempt gets its own AbortController; previous attempt is aborted before retry.
 * @param {object[]} messages  OpenAI-format message array
 * @param {object}   options   maxTokens, temperature, topP, signal (external AbortSignal)
 */
const callOpenRouter = async (messages, options = {}) => {
    const apiKey = process.env.serenemind;
    if (!apiKey) {
        throw new Error("OpenRouter API key ('serenemind') not found in environment variables");
    }

    const {
        maxTokens   = 250,
        temperature = 0.6,
        topP        = 0.9,
        signal: externalSignal = null   // caller (chat route) may pass an AbortSignal
    } = options;

    let lastError;
    let previousController = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Fix D: abort the previous in-flight request before retrying
        if (previousController) previousController.abort();
        const attemptController = new AbortController();
        previousController = attemptController;

        // Propagate external abort (e.g. client disconnected) into this attempt
        let externalAbortCleanup = null;
        if (externalSignal) {
            if (externalSignal.aborted) {
                attemptController.abort();
            } else {
                const onExternalAbort = () => attemptController.abort();
                externalSignal.addEventListener('abort', onExternalAbort, { once: true });
                externalAbortCleanup = () => externalSignal.removeEventListener('abort', onExternalAbort);
            }
        }

        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                signal: attemptController.signal,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://serenemind.vercel.app',
                    'X-Title': 'SereneMind'
                },
                body: JSON.stringify({
                    model: PRIMARY_MODEL,
                    messages,
                    max_tokens: maxTokens,
                    temperature,
                    top_p: topP
                })
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unknown error');
                const error = new Error(`OpenRouter API error (${PRIMARY_MODEL}): ${response.status} - ${errorBody}`);
                error.status = response.status;

                if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
                    const delay = getRetryDelay(attempt);
                    await sleep(delay);
                    continue;
                }
                throw error;
            }

            const data    = await response.json();
            const content = data?.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error(`No content in OpenRouter response from ${PRIMARY_MODEL}`);
            }

            return content;
        } catch (error) {
            // Ignore AbortError when the external caller cancelled the request
            if (error.name === 'AbortError') throw error;

            lastError = error;

            if (error.status && isRetryableError(error.status) && attempt < MAX_RETRIES) {
                const delay = getRetryDelay(attempt);
                await sleep(delay);
                continue;
            }
            if (attempt >= MAX_RETRIES) throw error;
        } finally {
            if (externalAbortCleanup) externalAbortCleanup();
        }
    }

    throw lastError;
};

/**
 * Main chat handler — calls OpenRouter, extracts RISK_FLAG before cleaning output.
 * @param {string}      message    user's raw message text
 * @param {object[]}    history    prior message objects from the client
 * @param {object|null} assessment latest assessment row from DB
 * @param {string}      riskTier   risk tier from the server-side risk engine (LOW/MODERATE/HIGH)
 * @param {AbortSignal} signal     optional AbortSignal from the chat route (client disconnect)
 * @returns {{ reply, riskLevel, riskScore, riskTier, isCrisis, riskFlag }}
 */
const handleChat = async (message, history = [], assessment = null, riskTier = 'LOW', signal = null) => {
    const { score: riskScore, tier: llmRiskTier } = detectRisk(message);
    const riskLevel = getRiskLevelFromTier(llmRiskTier);

    // The server-level risk engine already handles CRITICAL; this is a last-resort guard
    if (llmRiskTier === 'CRITICAL') {
        return {
            reply: "I'm really concerned about your safety right now. Please contact the Umang Pakistan Mental Health Helpline immediately at 0311-7786264, or call Emergency Rescue at 1122. You don't have to face this alone.",
            riskLevel,
            riskScore,
            riskTier: llmRiskTier,
            isCrisis: true,
            riskFlag: null
        };
    }

    if (!checkApiKey()) {
        return {
            reply: "I'm having trouble connecting right now. Please try again shortly.",
            riskLevel,
            riskScore,
            riskTier: llmRiskTier,
            isCrisis: false,
            riskFlag: null
        };
    }

    try {
        const chatHistory  = sanitizeHistoryForOpenRouter(history);
        // Pass the server-evaluated risk tier so the LLM receives calibrated context
        const systemPrompt = buildSystemPrompt(assessment, riskTier);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: message }
        ];

        const raw = await callOpenRouter(messages, {
            maxTokens:   1000,
            temperature: 0.7,
            topP:        0.9,
            signal
        });

        // Fix C: extract RISK_FLAG ONCE on the full raw string, then clean once
        const { cleanedText, riskFlag } = extractRiskFlag(raw);
        const reply = cleanOutput(cleanedText) || "I hear you. Tell me more about that.";

        return {
            reply,
            riskLevel,
            riskScore,
            riskTier: llmRiskTier,
            isCrisis: false,
            riskFlag   // null or a brief reason string — never shown to user
        };

    } catch (error) {
        if (error.name === 'AbortError') {
            // Client disconnected — not a real error, don't log as an application error
            return { reply: '', riskLevel, riskScore, riskTier: llmRiskTier, isCrisis: false, riskFlag: null, aborted: true };
        }
        console.error('❌ Generation error:', error);

        return {
            reply:    "I'm here with you — could you say that again?",
            riskLevel,
            riskScore,
            riskTier: llmRiskTier,
            isCrisis: false,
            riskFlag: null
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
 * Stream OpenRouter completions using server-sent chunks with nvidia/nemotron-3.5-lightning:free.
 * Fix A: reader is explicitly released/cancelled in a finally block to prevent listener leaks.
 * Fix D: AbortController per retry, previous aborted before retry.
 */
const streamOpenRouter = async (messages, onChunk, options = {}) => {
    const apiKey = process.env.serenemind;
    if (!apiKey) {
        throw new Error("OpenRouter API key ('serenemind') not found in environment variables");
    }

    const {
        maxTokens       = 250,
        temperature     = 0.6,
        topP            = 0.9,
        signal: externalSignal = null
    } = options;

    let lastError;
    let previousController = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Fix D: abort previous in-flight request before retrying
        if (previousController) previousController.abort();
        const attemptController = new AbortController();
        previousController = attemptController;

        let externalAbortCleanup = null;
        if (externalSignal) {
            if (externalSignal.aborted) { attemptController.abort(); }
            else {
                const onExternalAbort = () => attemptController.abort();
                externalSignal.addEventListener('abort', onExternalAbort, { once: true });
                externalAbortCleanup = () => externalSignal.removeEventListener('abort', onExternalAbort);
            }
        }

        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                signal: attemptController.signal,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://serenemind.vercel.app',
                    'X-Title': 'SereneMind'
                },
                body: JSON.stringify({
                    model: PRIMARY_MODEL,
                    messages,
                    max_tokens: maxTokens,
                    temperature,
                    top_p: topP,
                    stream: true
                })
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unknown error');
                const error = new Error(`OpenRouter stream error (${PRIMARY_MODEL}): ${response.status} - ${errorBody}`);
                error.status = response.status;

                if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
                    const delay = getRetryDelay(attempt);
                    await sleep(delay);
                    continue;
                }
                throw error;
            }

            let fullContent = '';

            if (response.body && response.body.getReader) {
                const reader  = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer    = '';

                // Fix A: always release reader in finally even on abort/error
                try {
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
                                const delta  = parsed?.choices?.[0]?.delta?.content || '';
                                if (delta) {
                                    fullContent += delta;
                                    if (onChunk) onChunk(delta);
                                }
                            } catch (parseErr) { /* malformed SSE line — skip */ }
                        }
                    }
                } finally {
                    // Fix A: unconditionally release the reader so the underlying stream is freed
                    reader.cancel().catch(() => {});
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
                if (attempt >= MAX_RETRIES) {
                    throw err;
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
    extractRiskFlag,
    buildSystemPrompt,
    checkApiKey,
    sanitizeHistoryForOpenRouter
};