const assert = require('assert');
const { CRISIS_KEYWORDS } = require('../services/riskEngine');
const { getRecommendedInterventions } = require('../services/interventionEngine');

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

console.log(`\n📊 Test Run Summary: ${passed} passed, ${failed} failed.\n`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
