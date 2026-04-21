// Mock AI Service with Crisis Detection

const CRISIS_KEYWORDS = ['suicide', 'kill', 'end my life', 'hurt myself', 'die', 'self-harm'];

// Simulate processing delay to meet the 1-2s response requirement naturally
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const detectRisk = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Check for crisis (High Risk)
    for (const keyword of CRISIS_KEYWORDS) {
        if (lowerMessage.includes(keyword)) {
            return 'HIGH';
        }
    }
    
    // Simple basic checks for medium risk (e.g. anxiety, panic)
    const midRiskKeywords = ['anxious', 'panic', 'overwhelmed', 'can\'t breathe', 'depressed', 'sad'];
    for (const keyword of midRiskKeywords) {
        if (lowerMessage.includes(keyword)) {
            return 'MEDIUM';
        }
    }
    
    return 'LOW';
};

const generateMockResponse = (message, riskLevel) => {
    if (riskLevel === 'HIGH') {
        return "I am so sorry you're feeling this way, but please know you are not alone. This system is an AI and cannot provide the help you need right now. Please immediately call your local emergency services (like 911) or a crisis hotline (like 988 in the US/Canada). I am escalating this to our crisis mode.";
    }
    
    if (riskLevel === 'MEDIUM') {
        return "It sounds like you're going through a very overwhelming time. Let's take a deep breath together. In through your nose, out through your mouth. Can you tell me a little more about what triggered these feelings?";
    }
    
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        return "Hello there! I'm SereneMind, your AI companion. I'm here to listen, support, and help you navigate your thoughts. How are you feeling today?";
    }
    
    return "I hear you, and your feelings are completely valid. Sometimes just writing out our thoughts can start to untangle them. How does it make you feel to talk about this?";
};

const handleChat = async (message, history) => {
    // 1. Analyze risk
    const riskLevel = detectRisk(message);
    
    // 2. Generate appropriate response
    const responseText = generateMockResponse(message, riskLevel);
    
    // 3. Simulate network & AI thinking delay (1-2 seconds)
    const simulatedDelay = Math.floor(Math.random() * 1000) + 1000; // 1s to 2s
    await delay(simulatedDelay);
    
    return {
        reply: responseText,
        riskLevel: riskLevel,
        isCrisis: riskLevel === 'HIGH'
    };
};

const generatePatientReportMock = async (patient, moodLogs, recentSessions) => {
    // Simulate AI parsing data and writing a report
    const simulatedDelay = Math.floor(Math.random() * 2000) + 1500; // 1.5s to 3.5s delay
    await delay(simulatedDelay);
    
    // Simple rule-based mock template for AI report
    const aiInsight = "Patient has been experiencing fluctuating moods. " +
        (moodLogs.length > 0 ? `Recent average mood is roughly ${Math.round(moodLogs.reduce((acc, log) => acc + log.mood_score, 0) / moodLogs.length)}/10. ` : "No mood logs available for analysis. ") +
        (recentSessions.some(s => s.risk_level === 'HIGH') ? "There are indications of high-stress scenarios needing immediate doctor review. " : "General conversational patterns appear stable. ");

    return {
        title: `AI Wellness Summary for ${patient.username}`,
        content: `Based on automated analysis of recent chat interactions and mood logs:\n\n${aiInsight}\n\nRecommended Action: Doctor to review the latest sessions and provide a follow-up assessment.`
    };
};

module.exports = {
    handleChat,
    detectRisk,
    generatePatientReportMock
};
