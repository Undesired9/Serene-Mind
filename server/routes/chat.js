const express = require('express');
const router = express.Router();
const { 
    handleChat, 
    streamOpenRouter, 
    buildSystemPrompt, 
    cleanOutput, 
    sanitizeHistoryForOpenRouter, 
    checkApiKey 
} = require('../services/aiService');
const { evaluateMultiSignalRisk } = require('../services/riskEngine');
const { getRecommendedInterventions } = require('../services/interventionEngine');
const { logAuditEvent } = require('../services/auditLogger');
const { verifyToken } = require('../middleware/auth');
const db = require('../database/sqlite');

// Helper to get or create today's session for a user
async function getOrCreateTodaySession(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT id FROM Chat_Sessions WHERE user_id = ? AND date(created_at, 'localtime') = date('now', 'localtime') LIMIT 1`,
            [userId],
            (err, row) => {
                if (err) return reject(err);
                if (row) {
                    resolve(row.id);
                } else {
                    db.get(
                        `SELECT COUNT(*) as count FROM Chat_Sessions WHERE user_id = ?`,
                        [userId],
                        (err, countRow) => {
                            if (err) return reject(err);
                            const nextNumber = (countRow ? countRow.count : 0) + 1;
                            const title = `Session ${nextNumber}`;
                            
                            db.run(
                                `INSERT INTO Chat_Sessions (user_id, title) VALUES (?, ?)`,
                                [userId, title],
                                function(err) {
                                    if (err) return reject(err);
                                    resolve(this.lastID);
                                }
                            );
                        }
                    );
                }
            }
        );
    });
}

// Helper to get or create user escalation status
async function getOrCreateUserEscalationStatus(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM User_Escalation_Status WHERE user_id = ?`,
            [userId],
            (err, row) => {
                if (err) return reject(err);
                if (row) {
                    resolve(row);
                } else {
                    db.run(
                        `INSERT INTO User_Escalation_Status (user_id) VALUES (?)`,
                        [userId],
                        function(err) {
                            if (err) return reject(err);
                            db.get(
                                `SELECT * FROM User_Escalation_Status WHERE id = ?`,
                                [this.lastID],
                                (err, newRow) => {
                                    if (err) return reject(err);
                                    resolve(newRow);
                                }
                            );
                        }
                    );
                }
            }
        );
    });
}

// Helper to update user escalation status
async function updateUserEscalationStatus(userId, riskScore, riskTier, isChatLocked) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE User_Escalation_Status 
             SET current_risk_score = ?, current_risk_tier = ?, is_chat_locked = ?, last_escalation_timestamp = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [riskScore, riskTier, isChatLocked ? 1 : 0, userId],
            function(err) {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

// GET: Fetch user's escalation status
router.get('/escalation-status', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const status = await getOrCreateUserEscalationStatus(userId);
        res.json(status);
    } catch (err) {
        console.error('Failed to get escalation status:', err);
        res.status(500).json({ error: 'Failed to get escalation status' });
    }
});

// POST: Unlock chat for user
router.post('/unlock', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        await updateUserEscalationStatus(userId, 0, 'LOW', false);
        const status = await getOrCreateUserEscalationStatus(userId);
        res.json({ message: 'Chat unlocked successfully', status });
    } catch (err) {
        console.error('Failed to unlock chat:', err);
        res.status(500).json({ error: 'Failed to unlock chat' });
    }
});

// GET: Fetch all sessions for a user
router.get('/sessions', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(
        `SELECT * FROM Chat_Sessions WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Fetch sessions error:', err);
                return res.status(500).json({ error: 'Failed to retrieve chat sessions.' });
            }
            res.json(rows);
        }
    );
});

// POST: Create a new explicit chat session
router.post('/sessions', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    db.get(
        `SELECT COUNT(*) as count FROM Chat_Sessions WHERE user_id = ?`,
        [userId],
        (err, row) => {
            if (err) {
                console.error('Count sessions error:', err);
                return res.status(500).json({ error: 'Failed to count sessions.' });
            }
            const nextNumber = (row ? row.count : 0) + 1;
            const title = `Session ${nextNumber}`;
            
            db.run(
                `INSERT INTO Chat_Sessions (user_id, title) VALUES (?, ?)`,
                [userId, title],
                function(err) {
                    if (err) {
                        console.error('Create session error:', err);
                        return res.status(500).json({ error: 'Failed to create chat session.' });
                    }
                    res.json({ id: this.lastID, title });
                }
            );
        }
    );
});

// GET: Fetch history for the latest active session (dashboard hydration/fallback)
router.get('/history', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        db.get(
            `SELECT id, title FROM Chat_Sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
            [userId],
            async (err, sessionRow) => {
                if (err) {
                    console.error('History latest session error:', err);
                    return res.status(500).json({ error: 'Failed to retrieve history.' });
                }
                
                let sessionId;
                let sessionTitle = '';
                if (sessionRow) {
                    sessionId = sessionRow.id;
                    sessionTitle = sessionRow.title;
                } else {
                    sessionId = await getOrCreateTodaySession(userId);
                    sessionTitle = await new Promise((resolve) => {
                        db.get(`SELECT title FROM Chat_Sessions WHERE id = ?`, [sessionId], (err, row) => {
                            resolve(row ? row.title : '');
                        });
                    });
                }
                
                db.all(
                    `SELECT * FROM Sessions WHERE user_id = ? AND session_id = ? ORDER BY timestamp ASC`,
                    [userId, sessionId],
                    (err, rows) => {
                        if (err) {
                            console.error('History fetch messages error:', err);
                            return res.status(500).json({ error: 'Failed to retrieve messages.' });
                        }
                        res.json({ messages: rows, sessionId, sessionTitle });
                    }
                );
            }
        );
    } catch (error) {
        console.error('History route error:', error);
        res.status(500).json({ error: 'Failed to retrieve history.' });
    }
});

// GET: Fetch messages for a specific session
router.get('/sessions/:sessionId/history', verifyToken, (req, res) => {
    const userId = req.user.id;
    const sessionId = req.params.sessionId;
    
    db.all(
        `SELECT * FROM Sessions WHERE user_id = ? AND session_id = ? ORDER BY timestamp ASC`,
        [userId, sessionId],
        (err, rows) => {
            if (err) {
                console.error('Fetch session history error:', err);
                return res.status(500).json({ error: 'Failed to retrieve messages for this session.' });
            }
            res.json(rows);
        }
    );
});

// Helper to get user's latest assessment
async function getUserAssessment(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM Assessments WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1`,
            [userId],
            (err, row) => {
                if (err) return reject(err);
                if (row) {
                    // Map DB column names to the names the AI service expects
                    row.phq9_score = row.depression_score;
                    row.gad7_score = row.anxiety_score;
                }
                resolve(row);
            }
        );
    });
}

// POST: Add new message to a session and get AI response (supports streaming)
router.post('/', verifyToken, async (req, res) => {
    let { message, history, sessionId, stream = true } = req.body;
    const userId = req.user.id;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Multi-Signal Risk Evaluation (Deterministic Preprocessor)
        const multiSignalEval = await evaluateMultiSignalRisk(userId, { messageText: message });
        const isCritical = multiSignalEval.isCrisis;

        if (!sessionId) {
            sessionId = await getOrCreateTodaySession(userId);
        }

        // 1. Instantly save the user's message to the SQL DB
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO Sessions (user_id, sender, content, session_id) VALUES (?, 'user', ?, ?)`, 
            [userId, message, sessionId], 
            function(err) {
                if (err) reject(err);
                resolve();
            });
        });

        const wantsStream = stream === true || req.headers.accept?.includes('text/event-stream');

        // 2. If Critical Risk flagged on active message, send safe crisis fallback immediately
        if (isCritical) {
            const crisisReply = "I’m hearing how painful and difficult things are for you right now. Your safety is our highest priority. Please contact the Umang Pakistan Mental Health Helpline (call 0311-7786264), call Rescue 1122, or reach out to a trusted loved one or emergency doctor immediately. You do not have to carry this alone.";
            
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO Sessions (user_id, sender, content, risk_level, risk_score, session_id) VALUES (?, 'ai', ?, 'CRITICAL', 95, ?)`, 
                [userId, crisisReply, sessionId], 
                function(err) {
                    if (err) reject(err);
                    resolve();
                });
            });

            await updateUserEscalationStatus(userId, 95, 'CRITICAL', true);
            const updatedStatus = await getOrCreateUserEscalationStatus(userId);
            const interventions = getRecommendedInterventions('CRITICAL', message);

            if (wantsStream) {
                res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
                res.setHeader('Cache-Control', 'no-cache, no-transform');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders?.();

                res.write(`data: ${JSON.stringify({ chunk: crisisReply })}\n\n`);
                res.write(`data: ${JSON.stringify({ 
                    done: true, 
                    reply: crisisReply, 
                    riskLevel: 'CRITICAL', 
                    riskScore: 95, 
                    riskTier: 'CRITICAL', 
                    isCrisis: true,
                    interventions,
                    sessionId, 
                    escalationStatus: updatedStatus 
                })}\n\n`);
                return res.end();
            }

            return res.json({
                reply: crisisReply,
                riskLevel: 'CRITICAL',
                riskScore: 95,
                riskTier: 'CRITICAL',
                isCrisis: true,
                interventions,
                sessionId,
                escalationStatus: updatedStatus
            });
        }

        // 3. Process via AI service with assessment data
        const assessment = await getUserAssessment(userId);
        const chatHistory = sanitizeHistoryForOpenRouter(history);
        const systemPrompt = buildSystemPrompt(assessment);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: message }
        ];

        // 4. Try streaming if requested
        if (wantsStream && checkApiKey()) {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders?.();

            let accumulatedRaw = '';

            try {
                await streamOpenRouter(messages, (chunk) => {
                    accumulatedRaw += chunk;
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                }, { maxTokens: 250, temperature: 0.6, topP: 0.9 });

                const cleanedReply = cleanOutput(accumulatedRaw) || "I hear you. Tell me more about that.";

                // Save to SQL DB
                await new Promise((resolve, reject) => {
                    db.run(`INSERT INTO Sessions (user_id, sender, content, risk_level, risk_score, session_id) VALUES (?, 'ai', ?, ?, ?, ?)`, 
                    [userId, cleanedReply, multiSignalEval.riskLevel, multiSignalEval.riskScore, sessionId], 
                    function(err) {
                        if (err) reject(err);
                        resolve();
                    });
                });

                await updateUserEscalationStatus(userId, multiSignalEval.riskScore, multiSignalEval.riskLevel, false);
                const updatedStatus = await getOrCreateUserEscalationStatus(userId);
                const recommendedInterventions = getRecommendedInterventions(multiSignalEval.riskLevel, message);

                res.write(`data: ${JSON.stringify({
                    done: true,
                    reply: cleanedReply,
                    riskLevel: multiSignalEval.riskLevel,
                    riskScore: multiSignalEval.riskScore,
                    riskTier: multiSignalEval.riskLevel,
                    interventions: recommendedInterventions,
                    sessionId,
                    escalationStatus: updatedStatus
                })}\n\n`);
                return res.end();
            } catch (streamErr) {
                console.warn('Stream failed, continuing to non-streaming fallback:', streamErr.message);
            }
        }

        // 5. Non-streaming fallback
        const responseData = await handleChat(message, history, assessment);
        
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO Sessions (user_id, sender, content, risk_level, risk_score, session_id) VALUES (?, 'ai', ?, ?, ?, ?)`, 
            [userId, responseData.reply, multiSignalEval.riskLevel, multiSignalEval.riskScore, sessionId], 
            function(err) {
                if (err) reject(err);
                resolve();
            });
        });

        await updateUserEscalationStatus(userId, multiSignalEval.riskScore, multiSignalEval.riskLevel, false);
        const updatedStatus = await getOrCreateUserEscalationStatus(userId);
        const recommendedInterventions = getRecommendedInterventions(multiSignalEval.riskLevel, message);

        if (wantsStream && !res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders?.();
            res.write(`data: ${JSON.stringify({ chunk: responseData.reply })}\n\n`);
            res.write(`data: ${JSON.stringify({
                done: true,
                ...responseData,
                riskLevel: multiSignalEval.riskLevel,
                riskScore: multiSignalEval.riskScore,
                riskTier: multiSignalEval.riskLevel,
                interventions: recommendedInterventions,
                sessionId,
                escalationStatus: updatedStatus
            })}\n\n`);
            return res.end();
        }

        res.json({ 
            ...responseData, 
            riskLevel: multiSignalEval.riskLevel,
            riskScore: multiSignalEval.riskScore,
            riskTier: multiSignalEval.riskLevel,
            interventions: recommendedInterventions,
            sessionId,
            escalationStatus: updatedStatus
        });
    } catch (error) {
        console.error('Chat routing error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'An error occurred while communicating with the AI Therapist' });
        } else {
            res.end();
        }
    }
});

// DELETE: Delete a specific chat session and its messages
router.delete('/sessions/:sessionId', verifyToken, (req, res) => {
    const userId = req.user.id;
    const sessionId = req.params.sessionId;
    
    db.run(
        `DELETE FROM Chat_Sessions WHERE id = ? AND user_id = ?`,
        [sessionId, userId],
        function(err) {
            if (err) {
                console.error('Delete session error:', err);
                return res.status(500).json({ error: 'Failed to delete chat session.' });
            }
            
            // Delete associated messages (cascading delete fallback)
            db.run(
                `DELETE FROM Sessions WHERE session_id = ? AND user_id = ?`,
                [sessionId, userId],
                function(err2) {
                    if (err2) {
                        console.error('Delete session messages error:', err2);
                    }
                    res.json({ message: 'Chat session deleted successfully.' });
                }
            );
        }
    );
});

// DELETE: Ensure data autonomy by clearing history (all sessions and messages)
router.delete('/history', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    db.serialize(() => {
        db.run(`DELETE FROM Chat_Sessions WHERE user_id = ?`, [userId]);
        db.run(`DELETE FROM Sessions WHERE user_id = ?`, [userId], function(err) {
            if (err) {
                console.error('Delete history error:', err);
                return res.status(500).json({ error: 'Failed to delete chat history.' });
            }
            res.json({ message: 'History successfully cleared.' });
        });
    });
});

module.exports = router;