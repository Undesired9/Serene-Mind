const assert = require('assert');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { CRISIS_KEYWORDS } = require('../services/riskEngine');
const { getRecommendedInterventions } = require('../services/interventionEngine');
const db = require('../database/sqlite');

console.log('🧪 Starting Non-Functional Requirement (NFR) Validation Suite...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ [FAIL] ${name}:`, err.message);
        failed++;
    }
}

// 1. NFR-SEC: Risk Calculation Determinism & Safety Limits
test('NFR-SEC-1: Crisis keywords must flag CRITICAL risk deterministically', () => {
    const text1 = "I want to end my life, please help";
    const textLower = text1.toLowerCase();
    const hasCrisis = CRISIS_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(textLower));
    assert.strictEqual(hasCrisis, true, 'Must detect crisis keyword');
});

test('NFR-SEC-2: Benign emotional text must NOT trigger false positive crisis flags', () => {
    const text = "I had a stressful day at work and feel tired";
    const textLower = text.toLowerCase();
    const hasCrisis = CRISIS_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(textLower));
    assert.strictEqual(hasCrisis, false, 'Benign text should not flag crisis');
});

test('NFR-INT-1: Critical risk tier must recommend emergency grounding and safety protocols', () => {
    const interventions = getRecommendedInterventions('CRITICAL');
    assert(Array.isArray(interventions), 'Interventions must be an array');
    assert(interventions.some(i => i.type === 'GROUNDING'), 'Must include 5-4-3-2-1 Grounding');
    assert(interventions.some(i => i.type === 'BOX_BREATHING'), 'Must include Box Breathing');
});

test('NFR-INT-2: Moderate anxiety risk must recommend CBT reframing & breathing', () => {
    const interventions = getRecommendedInterventions('MODERATE', 'I feel overwhelmed with anxiety and panic');
    assert(interventions.some(i => i.type === 'GROUNDING' || i.type === 'BOX_BREATHING'), 'Must recommend targeted anxiety interventions');
});

// 2. NFR-INP: Input Bounds, Length Clamping & Anti-Overflow Rules
test('NFR-INP-1: PHQ-9 score bounds verification (0 - 27)', () => {
    const validScores = [0, 9, 14, 19, 27];
    validScores.forEach(score => {
        assert(score >= 0 && score <= 27, `Score ${score} must be within 0-27 range`);
    });
});

test('NFR-INP-2: GAD-7 score bounds verification (0 - 21)', () => {
    const validScores = [0, 5, 10, 15, 21];
    validScores.forEach(score => {
        assert(score >= 0 && score <= 21, `Score ${score} must be within 0-21 range`);
    });
});

test('NFR-INP-3: Contact number length bounding and infinite digit rejection', () => {
    const PHONE_PATTERN = /^\+?[0-9\s()-]{7,18}$/;
    
    // Valid phone numbers
    const validPhones = [
        '+15550199',
        '+1 (555) 019-9283',
        '03001234567',
        '+92 300 1234567'
    ];
    validPhones.forEach(phone => {
        assert.strictEqual(PHONE_PATTERN.test(phone), true, `Phone ${phone} should be valid`);
    });

    // Invalid & infinite-length phone numbers (must be rejected)
    const invalidPhones = [
        '123',                                  // Too short (< 7)
        '123456',                               // Too short (< 7)
        '123456789012345678901234567890',       // Infinite/Too long (> 18)
        '++155501992838382928392839283928',     // Infinite digits
        'abcdefghij',                           // Non-numeric letters
        '123-456-SQL-INJECT'                    // Injection text
    ];
    invalidPhones.forEach(phone => {
        assert.strictEqual(PHONE_PATTERN.test(phone), false, `Phone ${phone} should be rejected`);
    });
});

test('NFR-INP-4: Person Name length bounding & character set verification', () => {
    const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/;

    assert.strictEqual(PERSON_NAME_PATTERN.test('John Doe'), true);
    assert.strictEqual(PERSON_NAME_PATTERN.test('Sarah O\'Connor'), true);
    assert.strictEqual(PERSON_NAME_PATTERN.test('Dr. A. Smith-Jones'), true);

    // Rejections
    assert.strictEqual(PERSON_NAME_PATTERN.test('A'), false, 'Name of 1 char must be rejected');
    assert.strictEqual(PERSON_NAME_PATTERN.test('A'.repeat(81)), false, 'Name > 80 chars must be rejected');
    assert.strictEqual(PERSON_NAME_PATTERN.test('<script>alert()</script>'), false, 'XSS markup must be rejected');
});

test('NFR-INP-5: Date of Birth age invariant verification (5 <= age <= 120)', () => {
    const today = new Date();
    const calculateAge = (dobString) => {
        const dob = new Date(dobString);
        return today.getFullYear() - dob.getFullYear() - (
            today.getMonth() < dob.getMonth() ||
            (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate()) ? 1 : 0
        );
    };

    const validDob = `${today.getFullYear() - 25}-05-15`;
    const age = calculateAge(validDob);
    assert(age >= 5 && age <= 120, '25 y/o must be in valid age range');

    const futureDob = `${today.getFullYear() + 1}-01-01`;
    assert(futureDob > today.toISOString().split('T')[0], 'Future DOB must be flagged invalid');
});

// 3. NFR-AI: Empathetic AI Output Sanitization & Persona Invariants
test('NFR-AI-1: Must strip "Here\'s a thinking process:" and reasoning meta-analysis', () => {
    const { cleanOutput } = require('../services/aiService');
    const rawAiOutput = `Here's a thinking process:
- User says: "i am feeling so depresses"
- Language: English (with a typo "depresses" -> likely "depressed")
- Emotional state: Low mood, feeling down
- Therapeutic Goal: Validate emotion, provide warmth

I hear how heavy and exhausting things feel for you right now, and I'm really glad you reached out. When you're carrying so much, what has felt like the hardest part of your day?`;

    const cleaned = cleanOutput(rawAiOutput);
    assert(!cleaned.includes("thinking process"), "Must not include 'thinking process'");
    assert(!cleaned.includes("- User says:"), "Must not include bullet analysis");
    assert(cleaned.startsWith("I hear how heavy"), "Must start directly with the empathetic therapist reply");
});

test('NFR-AI-2: Must strip <think> XML tags from reasoning models', () => {
    const { cleanOutput } = require('../services/aiService');
    const rawXml = `<think>
Analyze user anxiety.
Apply Carl Rogers validation.
</think>
It sounds like everything is feeling overwhelming right now. Take a gentle breath with me. What is weighing on your mind most?`;

    const cleaned = cleanOutput(rawXml);
    assert(!cleaned.includes("<think>"), "Must strip <think>");
    assert(!cleaned.includes("</think>"), "Must strip </think>");
    assert(cleaned.startsWith("It sounds like"), "Must retain clean therapeutic text");
});

test('NFR-AI-3: Must extract quoted therapist speech from meta-thinking paragraphs', () => {
    const { cleanOutput } = require('../services/aiService');
    const rawMetaText = `The user repeated "my fiance cheated on me". This is the second time they said it. Previously they said "i am so depresses". Now they disclosed the reason: fiancé cheated. This is a huge betrayal, likely causing the depression/anxiety. I need to respond with empathy, validate, and keep the conversation going.

I need to output therapist words only, no meta. Speak directly to client. Use person-centered and CBT gently. Validate emotion. Ask one open-ended question or offer reflection.

I'll respond: "I'm so deeply sorry you're going through this devastating betrayal. It makes complete sense you'd feel heartbroken, angry, and utterly confused. How are you taking care of yourself right now, and who has been supporting you through this incredibly painful time?"`;

    const cleaned = cleanOutput(rawMetaText);
    assert(!cleaned.includes("The user repeated"), "Must strip third-person meta paragraph");
    assert(!cleaned.includes("I need to output"), "Must strip internal rules paragraph");
    assert(!cleaned.includes("I'll respond:"), "Must strip I'll respond prefix");
    assert(cleaned.startsWith("I'm so deeply sorry you're going through this devastating betrayal"), "Must extract direct spoken therapist words");
});

// ─────────────────────────────────────────────────────────────────────────────
// NFR-ADM: Admin Panel + Doctor Approval workflow (API-level integration tests)
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained harness: spawns the server on an ephemeral port, polls /api/health,
// runs all NFR-ADM cases against it, then kills the child and cleans up the real
// dev DB (removing any nfr_adm_% rows created by this run).

// Reuse the same synchronous test() helper for consistency, plus an async variant.
async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ [FAIL] ${name}:`, err.message);
        failed++;
    }
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.on('error', reject);
        srv.listen(0, '127.0.0.1', () => {
            const port = srv.address().port;
            srv.close(() => resolve(port));
        });
    });
}

async function waitForHealth(port, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`http://127.0.0.1:${port}/api/health`);
            if (res.ok) return true;
        } catch (e) { /* server not ready yet */ }
        await new Promise(r => setTimeout(r, 300));
    }
    return false;
}

const runAdminTests = async () => {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const PORT = await getFreePort();
    const BASE = `http://127.0.0.1:${PORT}`;

    // Unique names per process so the suite is idempotent across repeated runs.
    // Usernames are capped at 24 chars by validation, so use a compact token
    // (ts36 + 2 random chars) with the nfr_adm_ prefix required for cleanup.
    const tok = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    const rand = Math.floor(Math.random() * 1000000);
    const docA = { username: `nfr_adm_${tok}_docA`, email: `nfr_adm_${tok}_a@serenemind.test`, password: 'Passw0rd!123', fullName: 'Nfr Test Doc A', licenseNumber: 'LIC-A-' + rand };
    const docB = { username: `nfr_adm_${tok}_docB`, email: `nfr_adm_${tok}_b@serenemind.test`, password: 'Passw0rd!123', fullName: 'Nfr Test Doc B', licenseNumber: 'LIC-B-' + rand };
    const docC = { username: `nfr_adm_${tok}_docC`, email: `nfr_adm_${tok}_c@serenemind.test`, password: 'Passw0rd!123', fullName: 'Nfr Test Doc C', licenseNumber: 'LIC-C-' + rand };
    const patient = { username: `nfr_adm_${tok}_pat`, email: `nfr_adm_${tok}_pat@serenemind.test`, password: 'Passw0rd!123' };

    // Every entity id this run created, for precise audit-log/row cleanup.
    const createdIds = { doctorIds: [], patientIds: [] };

    const api = async (method, p, { token, body } = {}) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${BASE}${p}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
        return { status: res.status, data };
    };

    const waitForAudit = async (eventType, entityId = null, timeoutMs = 6000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const rows = await db.queryAll(
                `SELECT event_type FROM Audit_Logs WHERE event_type = ? AND user_id = ?`,
                [eventType, entityId]
            );
            if (rows.length > 0) return true;
            await new Promise(r => setTimeout(r, 250));
        }
        return false;
    };

    // Snapshot the audit log watermark BEFORE the run: cleanup only ever deletes
    // audit rows created after this point, so pre-existing audit records (e.g. the
    // seeded admin's own login history) can never be touched — even when a test
    // entity's id collides with the admin's id (empty Users table -> patient id 1).
    const preRunMaxAuditId = (await db.queryGet(`SELECT COALESCE(MAX(id), 0) AS m FROM Audit_Logs`)).m || 0;

    let child;
    try {
        child = spawn(process.execPath, ['server/server.js'], {
            cwd: repoRoot,
            env: { ...process.env, PORT: String(PORT) },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        // Drain stdout/stderr so the child doesn't block on a full pipe.
        child.stdout.on('data', () => {});
        child.stderr.on('data', () => {});
        child.on('error', (err) => { console.error('❌ [HARNESS] Server spawn error:', err.message); });

        const healthy = await waitForHealth(PORT);
        assert.ok(healthy, `Server did not become healthy on port ${PORT} within timeout`);
        console.log(`  🧪 [HARNESS] Server healthy on port ${PORT}`);

        // NFR-ADM-1: Admin login with default seeded admin.
        await testAsync('NFR-ADM-1: Admin login (admin/Admin@12345) -> 200, token + role admin', async () => {
            const r = await api('POST', '/api/auth/admin/login', { body: { identifier: 'admin', password: 'Admin@12345' } });
            assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(r.data.token, 'Token must be present');
            assert.strictEqual(r.data.user.role, 'admin', 'user.role must be admin');
            createdIds.adminToken = r.data.token;
        });

        // NFR-ADM-2: Admin login with wrong password -> 401, no token.
        await testAsync('NFR-ADM-2: Admin login with wrong password -> 401, no token', async () => {
            const r = await api('POST', '/api/auth/admin/login', { body: { identifier: 'admin', password: 'WrongPass123' } });
            assert.strictEqual(r.status, 401, `Expected 401, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(!r.data.token, 'No token on failed login');
        });

        // NFR-ADM-3: Admin login with {email, password} shape -> 200.
        await testAsync('NFR-ADM-3: Admin login with {email,password} (mobile-style) -> 200', async () => {
            const r = await api('POST', '/api/auth/admin/login', { body: { email: 'admin@serenemind.app', password: 'Admin@12345' } });
            assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(r.data.token, 'Token must be present');
        });

        // Fresh patient token used in NFR-ADM-4 and NFR-ADM-15.
        await testAsync('NFR-ADM-4a: Register fresh patient (setup)', async () => {
            const r = await api('POST', '/api/auth/register', { body: { ...patient, confirmPassword: patient.password } });
            assert.strictEqual(r.status, 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(r.data.token, 'Patient token must be present');
            createdIds.patientIds.push(r.data.user.id);
            createdIds.patientToken = r.data.token;
        });

        // NFR-ADM-4: Admin endpoints reject patient token -> 403.
        await testAsync('NFR-ADM-4: Admin endpoints reject patient token -> 403 on /admin/stats', async () => {
            const r = await api('GET', '/api/admin/stats', { token: createdIds.patientToken });
            assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.data)}`);
        });

        // NFR-ADM-6: Doctor register -> 201, no token, approvalStatus PENDING.
        await testAsync('NFR-ADM-6: Doctor register -> 201, no token, approvalStatus PENDING', async () => {
            const r = await api('POST', '/api/auth/doctor/register', { body: { ...docA, confirmPassword: docA.password } });
            assert.strictEqual(r.status, 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(!('token' in r.data), 'Register must NOT return a token');
            assert.strictEqual(r.data.doctor.approvalStatus, 'PENDING', 'approvalStatus must be PENDING');
            createdIds.doctorIds.push(r.data.doctor.id);
            createdIds.docAId = r.data.doctor.id;
        });

        // NFR-ADM-7: Pending doctor login -> 403 'pending admin approval'.
        await testAsync('NFR-ADM-7: Pending doctor login -> 403 pending admin approval', async () => {
            const r = await api('POST', '/api/auth/doctor/login', { body: { identifier: docA.username, password: docA.password } });
            assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(String(r.data.error || '').toLowerCase().includes('pending admin approval'), 'Error must mention pending admin approval');
        });

        // NFR-ADM-8: Approve docA -> 200 APPROVED; then login -> 200 approvalStatus APPROVED.
        await testAsync('NFR-ADM-8: Approve pending doctor -> 200 APPROVED; login -> 200 approvalStatus APPROVED', async () => {
            const ap = await api('POST', `/api/admin/doctors/${createdIds.docAId}/approve`, { token: createdIds.adminToken, body: {} });
            assert.strictEqual(ap.status, 200, `Approve expected 200, got ${ap.status}: ${JSON.stringify(ap.data)}`);
            assert.strictEqual(ap.data.doctor.approval_status, 'APPROVED', 'approval_status must be APPROVED');

            const lg = await api('POST', '/api/auth/doctor/login', { body: { identifier: docA.username, password: docA.password } });
            assert.strictEqual(lg.status, 200, `Login expected 200, got ${lg.status}: ${JSON.stringify(lg.data)}`);
            assert.strictEqual(lg.data.user.approvalStatus, 'APPROVED', 'user.approvalStatus must be APPROVED');
            assert.ok(lg.data.token, 'Approved doctor login must return a token');
            createdIds.approvedDoctorToken = lg.data.token;
        });

        // NFR-ADM-5: Admin endpoints reject doctor token -> 403 (using the approved doctor's token).
        await testAsync('NFR-ADM-5: Admin endpoints reject doctor token -> 403 on /admin/stats', async () => {
            const r = await api('GET', '/api/admin/stats', { token: createdIds.approvedDoctorToken });
            assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.data)}`);
        });

        // NFR-ADM-9a: Register docB (setup).
        await testAsync('NFR-ADM-9a: Register second test doctor (setup)', async () => {
            const r = await api('POST', '/api/auth/doctor/register', { body: { ...docB, confirmPassword: docB.password } });
            assert.strictEqual(r.status, 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
            createdIds.doctorIds.push(r.data.doctor.id);
            createdIds.docBId = r.data.doctor.id;
        });

        // NFR-ADM-9: Reject docB with reason -> 200 REJECTED; login -> 403 rejectionReason.
        await testAsync('NFR-ADM-9: Reject doctor with reason -> 200 REJECTED; login -> 403 rejectionReason', async () => {
            const rj = await api('POST', `/api/admin/doctors/${createdIds.docBId}/reject`, { token: createdIds.adminToken, body: { reason: 'Invalid license' } });
            assert.strictEqual(rj.status, 200, `Reject expected 200, got ${rj.status}: ${JSON.stringify(rj.data)}`);
            assert.strictEqual(rj.data.doctor.approval_status, 'REJECTED', 'approval_status must be REJECTED');
            assert.strictEqual(rj.data.doctor.rejection_reason, 'Invalid license', 'rejection_reason must be stored');

            const lg = await api('POST', '/api/auth/doctor/login', { body: { identifier: docB.email, password: docB.password } });
            assert.strictEqual(lg.status, 403, `Login expected 403, got ${lg.status}: ${JSON.stringify(lg.data)}`);
            assert.strictEqual(lg.data.rejectionReason, 'Invalid license', 'rejectionReason must match');
        });

        // NFR-ADM-10a: Register docC (setup) for reject-without-reason test.
        await testAsync('NFR-ADM-10a: Register third test doctor (setup)', async () => {
            const r = await api('POST', '/api/auth/doctor/register', { body: { ...docC, confirmPassword: docC.password } });
            assert.strictEqual(r.status, 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
            createdIds.doctorIds.push(r.data.doctor.id);
            createdIds.docCId = r.data.doctor.id;
        });

        // NFR-ADM-10: Reject without reason -> 400.
        await testAsync('NFR-ADM-10: Reject without reason -> 400', async () => {
            const r = await api('POST', `/api/admin/doctors/${createdIds.docCId}/reject`, { token: createdIds.adminToken, body: {} });
            assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.data)}`);
        });

        // NFR-ADM-11: Approve an already-APPROVED doctor -> 400 'not pending'.
        await testAsync('NFR-ADM-11: Approve already-APPROVED doctor -> 400 not pending', async () => {
            const r = await api('POST', `/api/admin/doctors/${createdIds.docAId}/approve`, { token: createdIds.adminToken, body: {} });
            assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(String(r.data.error || '').toLowerCase().includes('not pending'), 'Error must mention not pending');
        });

        // NFR-ADM-12: Invalid status filter -> 400; PENDING filter -> 200 all PENDING.
        // Exercised over the live HTTP server (server.js now preserves query strings).
        await testAsync('NFR-ADM-12: GET /admin/doctors?status=INVALID -> 400 (live HTTP)', async () => {
            const r = await api('GET', '/api/admin/doctors?status=INVALID', { token: createdIds.adminToken });
            assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.data)}`);
        });
        await testAsync('NFR-ADM-12b: GET /admin/doctors?status=PENDING -> 200, all PENDING (live HTTP)', async () => {
            const r = await api('GET', '/api/admin/doctors?status=PENDING', { token: createdIds.adminToken });
            assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(Array.isArray(r.data), 'Response must be an array');
            assert.ok(r.data.length > 0, 'At least one PENDING doctor expected');
            r.data.forEach(d => assert.strictEqual(d.approval_status, 'PENDING', 'All returned doctors must be PENDING'));
            assert.ok(r.data.some(d => d.id === createdIds.docCId), 'docC (still pending) must be included');
        });

        // NFR-ADM-13: Get single doctor -> 200 full row; nonexistent -> 404.
        await testAsync('NFR-ADM-13a: GET /admin/doctors/:id -> 200 full row with expected columns', async () => {
            const r = await api('GET', `/api/admin/doctors/${createdIds.docAId}`, { token: createdIds.adminToken });
            assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
            ['approval_status', 'license_number', 'email', 'created_at', 'full_name'].forEach(col => {
                assert.ok(col in r.data, `Column '${col}' must be present`);
            });
        });
        await testAsync('NFR-ADM-13b: GET /admin/doctors/999999 -> 404', async () => {
            const r = await api('GET', '/api/admin/doctors/999999', { token: createdIds.adminToken });
            assert.strictEqual(r.status, 404, `Expected 404, got ${r.status}: ${JSON.stringify(r.data)}`);
        });

        // NFR-ADM-14: GET /admin/stats -> all 7 keys numeric.
        await testAsync('NFR-ADM-14: GET /admin/stats returns all 7 keys with numeric values', async () => {
            const r = await api('GET', '/api/admin/stats', { token: createdIds.adminToken });
            assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
            ['totalDoctors', 'pendingDoctors', 'approvedDoctors', 'rejectedDoctors', 'totalPatients', 'totalAppointments', 'atRiskPatients'].forEach(k => {
                assert.ok(k in r.data, `Stats key '${k}' must be present`);
                assert.strictEqual(typeof r.data[k], 'number', `Stats key '${k}' must be numeric`);
            });
        });

        // NFR-ADM-15: /appointments/doctors (patient token) excludes PENDING/REJECTED, includes approved.
        await testAsync('NFR-ADM-15: /appointments/doctors lists approved but NOT pending/rejected test doctors', async () => {
            const r = await api('GET', '/api/appointments/doctors', { token: createdIds.patientToken });
            assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
            assert.ok(Array.isArray(r.data), 'Response must be an array');
            const ids = r.data.map(d => d.id);
            assert.ok(ids.includes(createdIds.docAId), 'Approved test doctor (docA) must be listed');
            assert.ok(!ids.includes(createdIds.docBId), 'Rejected test doctor (docB) must NOT be listed');
            assert.ok(!ids.includes(createdIds.docCId), 'Pending test doctor (docC) must NOT be listed');
        });

        // NFR-ADM-16: Audit trail for approve + reject.
        await testAsync('NFR-ADM-16: Audit_Logs contains DOCTOR_APPROVED and DOCTOR_REJECTED', async () => {
            assert.ok(await waitForAudit('DOCTOR_APPROVED', createdIds.docAId), 'DOCTOR_APPROVED audit row must exist for docA');
            assert.ok(await waitForAudit('DOCTOR_REJECTED', createdIds.docBId), 'DOCTOR_REJECTED audit row must exist for docB');
        });
    } finally {
        if (child) {
            child.kill();
            await new Promise(r => setTimeout(r, 300));
        }
        // Cleanup: remove every row this run inserted, so the real dev DB is never polluted.
        const cleanupFailures = [];
        try {
            const allIds = [...createdIds.doctorIds.filter(Boolean), ...createdIds.patientIds.filter(Boolean)];
            if (allIds.length > 0) {
                const placeholders = allIds.map(() => '?').join(',');
                // Only rows created after the run started (id > watermark) and tied to
                // test entities are removed; pre-existing audit history is preserved.
                await db.queryRun(
                    `DELETE FROM Audit_Logs WHERE id > ? AND (user_id IN (${placeholders}) OR actor_id IN (${placeholders}))`,
                    [preRunMaxAuditId, ...allIds, ...allIds]
                ).catch(err => cleanupFailures.push(`entity audit cleanup: ${err.message}`));
            }
            // Suite-window admin login records are test artifacts too (the suite logs
            // into the seeded admin as part of NFR-ADM-1/3). The id > ? watermark keeps
            // any pre-existing login history untouched.
            await db.queryRun(
                `DELETE FROM Audit_Logs WHERE id > ? AND event_type = 'ADMIN_LOGIN'`,
                [preRunMaxAuditId]
            ).catch(err => cleanupFailures.push(`admin-login audit cleanup: ${err.message}`));
            await db.queryRun(`DELETE FROM Doctors WHERE username LIKE ?`, ['nfr_adm_%'])
                .catch(err => cleanupFailures.push(`doctor cleanup: ${err.message}`));
            await db.queryRun(`DELETE FROM Users WHERE username LIKE ?`, ['nfr_adm_%'])
                .catch(err => cleanupFailures.push(`user cleanup: ${err.message}`));
            if (cleanupFailures.length > 0) {
                console.error('⚠️ [HARNESS] Cleanup failures: ' + cleanupFailures.join(' | '));
            }
        } catch (cleanupErr) {
            console.error('⚠️ [HARNESS] Cleanup error:', cleanupErr.message);
        }
    }
};

(async () => {
    console.log('\n--- NFR-ADM Admin Panel + Doctor Approval Tests ---');
    await runAdminTests();
    console.log(`\n📊 Test Run Summary: ${passed} passed, ${failed} failed.\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
})();
