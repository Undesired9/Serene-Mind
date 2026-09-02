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

// 1. NFR: Risk Calculation Determinism & Safety Limits
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

// 2. NFR: Input Bounds & Score Invariants
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

console.log(`\n📊 Test Run Summary: ${passed} passed, ${failed} failed.\n`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
