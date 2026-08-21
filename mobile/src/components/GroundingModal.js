import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const STEPS = [
    { title: "5 Things You Can See", desc: "Look around you and notice 5 distinct objects near you.", color: "#0E7C7B" },
    { title: "4 Things You Can Touch", desc: "Feel 4 physical textures (e.g. fabric of your shirt, surface of table).", color: "#3D5A80" },
    { title: "3 Things You Can Hear", desc: "Listen carefully for 3 distinct ambient sounds.", color: "#0E7C7B" },
    { title: "2 Things You Can Smell", desc: "Notice 2 scents or take deep breaths.", color: "#3D5A80" },
    { title: "1 Thing You Can Taste", desc: "Focus on 1 taste in your mouth or sip some water.", color: "#0E7C7B" }
];

export default function GroundingModal({ visible, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setCurrentStep(0);
            onClose();
        }
    };

    const step = STEPS[currentStep];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <Text style={styles.badge}>Grounding Exercise</Text>
                    <Text style={[styles.stepTitle, { color: step.color }]}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>

                    <View style={styles.progressRow}>
                        {STEPS.map((_, idx) => (
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
                                {currentStep === STEPS.length - 1 ? 'Finish' : 'Next Step'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(13, 27, 42, 0.6)',
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
    badge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0E7C7B',
        backgroundColor: '#C2FFF0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 16,
        textTransform: 'uppercase'
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
    }
});
