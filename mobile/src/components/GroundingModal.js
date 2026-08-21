import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const STEPS_54321 = [
    { title: "5 Things You Can See", desc: "Look around you and notice 5 distinct objects near you.", color: "#0E7C7B" },
    { title: "4 Things You Can Touch", desc: "Feel 4 physical textures (e.g. fabric of your shirt, surface of table).", color: "#3D5A80" },
    { title: "3 Things You Can Hear", desc: "Listen carefully for 3 distinct ambient sounds.", color: "#0E7C7B" },
    { title: "2 Things You Can Smell", desc: "Notice 2 scents or take deep breaths.", color: "#3D5A80" },
    { title: "1 Thing You Can Taste", desc: "Focus on 1 taste in your mouth or sip some water.", color: "#0E7C7B" }
];

const BREATH_PHASES = [
    { name: "Inhale", duration: 4, instruction: "Breathe in deeply through your nose..." },
    { name: "Hold", duration: 4, instruction: "Hold your breath gently..." },
    { name: "Exhale", duration: 4, instruction: "Slowly exhale through your mouth..." },
    { name: "Hold", duration: 4, instruction: "Pause and relax before next breath..." }
];

export default function GroundingModal({ visible, onClose }) {
    const [mode, setMode] = useState('54321'); // '54321' | 'breathing'
    const [currentStep, setCurrentStep] = useState(0);

    // Box Breathing State
    const [breathPhaseIdx, setBreathPhaseIdx] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(4);

    useEffect(() => {
        let timer = null;
        if (visible && mode === 'breathing') {
            timer = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        setBreathPhaseIdx(pIdx => (pIdx + 1) % BREATH_PHASES.length);
                        return BREATH_PHASES[(breathPhaseIdx + 1) % BREATH_PHASES.length].duration;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [visible, mode, breathPhaseIdx]);

    const handleNext = () => {
        if (currentStep < STEPS_54321.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setCurrentStep(0);
            onClose();
        }
    };

    const step = STEPS_54321[currentStep];
    const breathPhase = BREATH_PHASES[breathPhaseIdx];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Mode Toggle */}
                    <View style={styles.toggleRow}>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, mode === '54321' && styles.toggleBtnActive]}
                            onPress={() => setMode('54321')}
                        >
                            <Text style={[styles.toggleText, mode === '54321' && styles.toggleTextActive]}>5-4-3-2-1 Technique</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, mode === 'breathing' && styles.toggleBtnActive]}
                            onPress={() => { setMode('breathing'); setBreathPhaseIdx(0); setSecondsLeft(4); }}
                        >
                            <Text style={[styles.toggleText, mode === 'breathing' && styles.toggleTextActive]}>Box Breathing</Text>
                        </TouchableOpacity>
                    </View>

                    {mode === '54321' ? (
                        <>
                            <Text style={[styles.stepTitle, { color: step.color }]}>{step.title}</Text>
                            <Text style={styles.stepDesc}>{step.desc}</Text>

                            <View style={styles.progressRow}>
                                {STEPS_54321.map((_, idx) => (
                                    <View 
                                        key={idx} 
                                        style={[
                                            styles.progressDot, 
                                            { backgroundColor: idx === currentStep ? '#0E7C7B' : '#E0E0E0' }
                                        ]} 
                                    />
                                ))}
                            </View>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                    <Text style={styles.closeBtnText}>Exit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                                    <Text style={styles.nextBtnText}>
                                        {currentStep === STEPS_54321.length - 1 ? 'Finish' : 'Next Step'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={styles.breathContainer}>
                            <View style={styles.breathCircle}>
                                <Text style={styles.breathCountdown}>{secondsLeft}</Text>
                                <Text style={styles.breathPhaseName}>{breathPhase.name}</Text>
                            </View>
                            <Text style={styles.breathInstruction}>{breathPhase.instruction}</Text>

                            <TouchableOpacity style={styles.closeBtnFull} onPress={onClose}>
                                <Text style={styles.closeBtnText}>Done Relaxing</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(13, 27, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: '#F0F4F8',
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
        width: '100%'
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10
    },
    toggleBtnActive: {
        backgroundColor: '#0E7C7B'
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3D5A80'
    },
    toggleTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12
    },
    stepDesc: {
        fontSize: 15,
        color: '#3D5A80',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24
    },
    progressRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24
    },
    progressDot: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12
    },
    closeBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F0F4F8',
        alignItems: 'center'
    },
    closeBtnFull: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F0F4F8',
        alignItems: 'center',
        marginTop: 20
    },
    closeBtnText: {
        color: '#3D5A80',
        fontWeight: '600'
    },
    nextBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#0E7C7B',
        alignItems: 'center'
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    breathContainer: {
        alignItems: 'center',
        width: '100%'
    },
    breathCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#C2FFF0',
        borderWidth: 6,
        borderColor: '#0E7C7B',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16
    },
    breathCountdown: {
        fontSize: 44,
        fontWeight: 'bold',
        color: '#0E7C7B'
    },
    breathPhaseName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0D1B2A',
        textTransform: 'uppercase'
    },
    breathInstruction: {
        fontSize: 15,
        color: '#3D5A80',
        textAlign: 'center',
        marginVertical: 8
    }
});
