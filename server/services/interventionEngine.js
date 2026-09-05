const INTERVENTION_CATALOG = {
    GROUNDING: {
        type: 'GROUNDING',
        title: '5-4-3-2-1 Sensory Grounding',
        description: 'Engage your five senses to alleviate acute anxiety, dissociation, or panic symptoms.'
    },
    BOX_BREATHING: {
        type: 'BOX_BREATHING',
        title: '4-4-4-4 Box Breathing Visualizer',
        description: 'Regulate your autonomic nervous system with guided 4-second breath cycles (Inhale, Hold, Exhale, Hold).'
    },
    COGNITIVE_REFRAMING: {
        type: 'COGNITIVE_REFRAMING',
        title: 'CBT Thought Reframing Exercise',
        description: 'Identify unhelpful cognitive distortions (e.g. catastrophizing) and construct balanced alternative perspectives.'
    },
    SLEEP_HYGIENE: {
        type: 'SLEEP_HYGIENE',
        title: 'Sleep Hygiene & Bedtime Decompression',
        description: 'Structured wind-down routine, stimulus control guidelines, and progressive muscle relaxation for restful sleep.'
    },
    EXPRESSIVE_JOURNALING: {
        type: 'EXPRESSIVE_JOURNALING',
        title: 'Emotional Containment Journaling',
        description: 'Structured reflection prompt to unpack overwhelming daily stressors and identify manageable next steps.'
    }
};

const getRecommendedInterventions = (riskLevel, presentingConcern = '') => {
    const concern = presentingConcern.toLowerCase();
    const recommended = [];

    if (concern.includes('anx') || concern.includes('panic') || concern.includes('worry') || riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        recommended.push(INTERVENTION_CATALOG.GROUNDING);
        recommended.push(INTERVENTION_CATALOG.BOX_BREATHING);
    }
    
    if (concern.includes('sleep') || concern.includes('insomnia') || concern.includes('tired')) {
        recommended.push(INTERVENTION_CATALOG.SLEEP_HYGIENE);
    }

    if (concern.includes('depress') || concern.includes('worthless') || concern.includes('negative') || concern.includes('hopeless')) {
        recommended.push(INTERVENTION_CATALOG.COGNITIVE_REFRAMING);
    }

    // Default wellness fallbacks
    if (recommended.length === 0) {
        recommended.push(INTERVENTION_CATALOG.BOX_BREATHING);
        recommended.push(INTERVENTION_CATALOG.EXPRESSIVE_JOURNALING);
    }

    return recommended;
};

module.exports = {
    INTERVENTION_CATALOG,
    getRecommendedInterventions
};
