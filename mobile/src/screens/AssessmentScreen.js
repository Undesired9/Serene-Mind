import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure",
    "Trouble concentrating on things, such as reading or TV",
    "Moving or speaking so slowly that other people could have noticed",
    "Thoughts that you would be better off dead, or of hurting yourself"
];

const GAD7_QUESTIONS = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it is hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen"
];

const OPTIONS = [
    { label: 'Not at all', value: 0 },
    { label: 'Several days', value: 1 },
    { label: 'More than half the days', value: 2 },
    { label: 'Nearly every day', value: 3 }
];

export default function AssessmentScreen({ onComplete }) {
    const [phq9Answers, setPhq9Answers] = useState(Array(9).fill(0));
    const [gad7Answers, setGad7Answers] = useState(Array(7).fill(0));
    const [loading, setLoading] = useState(false);

    const handlePhqSelect = (idx, val) => {
        const updated = [...phq9Answers];
        updated[idx] = val;
        setPhq9Answers(updated);
    };

    const handleGadSelect = (idx, val) => {
        const updated = [...gad7Answers];
        updated[idx] = val;
        setGad7Answers(updated);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const phqTotal = phq9Answers.reduce((a, b) => a + b, 0);
            const gadTotal = gad7Answers.reduce((a, b) => a + b, 0);
            const hasSelfHarm = phq9Answers[8] > 0;

            const result = await api.submitAssessment({
                depressionScore: phqTotal,
                anxietyScore: gadTotal,
                phq9_score: phqTotal,
                gad7_score: gadTotal,
                totalScore: phqTotal + gadTotal,
                answers: [...phq9Answers, ...gad7Answers],
                selfHarmRisk: hasSelfHarm,
                mainConcerns: 'Clinical Assessment'
            });

            const userStr = await AsyncStorage.getItem('serene_user');
            const currentUser = userStr ? JSON.parse(userStr) : {};
            const updatedUser = { ...currentUser, ...(result.user || {}), needsAssessment: false, needsIntake: false };
            await AsyncStorage.setItem('serene_user', JSON.stringify(updatedUser));
            Alert.alert('Assessment Completed', 'Your clinical baseline has been recorded.');
            onComplete(updatedUser);
        } catch (err) {
            Alert.alert('Assessment Error', err.message || 'Failed to submit assessment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.badge}>Clinical Screening</Text>
                    <Text style={styles.title}>PHQ-9 & GAD-7 Assessment</Text>
                    <Text style={styles.subtitle}>Over the last 2 weeks, how often have you been bothered by any of the following?</Text>
                </View>

                {/* PHQ-9 Section */}
                <Text style={styles.sectionHeader}>PHQ-9 (Depression Inventory)</Text>
                {PHQ9_QUESTIONS.map((q, qIdx) => (
                    <View key={`phq-${qIdx}`} style={styles.qCard}>
                        <Text style={styles.qText}>{qIdx + 1}. {q}</Text>
                        <View style={styles.optionsRow}>
                            {OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.optChip,
                                        phq9Answers[qIdx] === opt.value && styles.optChipActive
                                    ]}
                                    onPress={() => handlePhqSelect(qIdx, opt.value)}
                                >
                                    <Text style={[
                                        styles.optText,
                                        phq9Answers[qIdx] === opt.value && styles.optTextActive
                                    ]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* GAD-7 Section */}
                <Text style={[styles.sectionHeader, { marginTop: 24 }]}>GAD-7 (Anxiety Inventory)</Text>
                {GAD7_QUESTIONS.map((q, qIdx) => (
                    <View key={`gad-${qIdx}`} style={styles.qCard}>
                        <Text style={styles.qText}>{qIdx + 1}. {q}</Text>
                        <View style={styles.optionsRow}>
                            {OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.optChip,
                                        gad7Answers[qIdx] === opt.value && styles.optChipActive
                                    ]}
                                    onPress={() => handleGadSelect(qIdx, opt.value)}
                                >
                                    <Text style={[
                                        styles.optText,
                                        gad7Answers[qIdx] === opt.value && styles.optTextActive
                                    ]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Complete Assessment</Text>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8E8E8'
    },
    scrollContent: {
        padding: 16
    },
    header: {
        alignItems: 'center',
        marginVertical: 16
    },
    badge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0E7C7B',
        backgroundColor: '#C2FFF0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
        textTransform: 'uppercase'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0D1B2A',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 13,
        color: '#3D5A80',
        textAlign: 'center',
        marginTop: 4
    },
    sectionHeader: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0E7C7B',
        marginBottom: 12
    },
    qCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    qText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0D1B2A',
        marginBottom: 10
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    optChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    optChipActive: {
        backgroundColor: '#0E7C7B',
        borderColor: '#0E7C7B'
    },
    optText: {
        fontSize: 12,
        color: '#3D5A80'
    },
    optTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    submitBtn: {
        backgroundColor: '#0E7C7B',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginVertical: 24
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold'
    }
});
