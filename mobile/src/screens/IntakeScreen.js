import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function IntakeScreen({ onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [medicalHistory, setMedicalHistory] = useState('');
    const [familyHistory, setFamilyHistory] = useState('');
    const [lifestyle, setLifestyle] = useState('');
    const [therapyHistory, setTherapyHistory] = useState('');
    const [goals, setGoals] = useState('');

    const handleFinish = async () => {
        setLoading(true);
        try {
            const result = await api.submitIntake({
                medical_history: medicalHistory,
                family_history: familyHistory,
                lifestyle: lifestyle,
                therapy_history: therapyHistory,
                goals: goals
            });

            if (result.user) {
                await AsyncStorage.setItem('serene_user', JSON.stringify(result.user));
                onComplete(result.user);
            }
        } catch (err) {
            Alert.alert('Submission Error', err.message || 'Failed to submit intake questionnaire.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.badge}>Initial Onboarding</Text>
                    <Text style={styles.title}>Patient Intake Questionnaire</Text>
                    <Text style={styles.subtitle}>Help us personalize your care journey</Text>
                </View>

                <View style={styles.card}>
                    {step === 1 && (
                        <View>
                            <Text style={styles.sectionTitle}>1. Medical & Family History</Text>

                            <Text style={styles.label}>Medical Conditions or Medications</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={3}
                                placeholder="List any diagnosed medical conditions or current medications..."
                                value={medicalHistory}
                                onChangeText={setMedicalHistory}
                            />

                            <Text style={styles.label}>Family Mental Health History</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={3}
                                placeholder="Any known mental health conditions in immediate family?"
                                value={familyHistory}
                                onChangeText={setFamilyHistory}
                            />

                            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
                                <Text style={styles.nextBtnText}>Continue to Step 2 →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <Text style={styles.sectionTitle}>2. Lifestyle & Goals</Text>

                            <Text style={styles.label}>Sleep & Daily Routine</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={3}
                                placeholder="Describe your sleep quality, exercise habits, or work stress..."
                                value={lifestyle}
                                onChangeText={setLifestyle}
                            />

                            <Text style={styles.label}>Previous Therapy / Counseling Experience</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={2}
                                placeholder="Have you been in therapy before?"
                                value={therapyHistory}
                                onChangeText={setTherapyHistory}
                            />

                            <Text style={styles.label}>Goals for SereneMind</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={3}
                                placeholder="What would you like to achieve (e.g. reduce anxiety, improve sleep)?"
                                value={goals}
                                onChangeText={setGoals}
                            />

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                                    <Text style={styles.backBtnText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.finishBtnText}>Submit Intake</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
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
        padding: 20
    },
    header: {
        alignItems: 'center',
        marginVertical: 20
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0D1B2A',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 14,
        color: '#3D5A80',
        textAlign: 'center',
        marginTop: 4
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 16
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3D5A80',
        marginBottom: 6,
        marginTop: 8
    },
    textArea: {
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        textAlignVertical: 'top',
        color: '#0D1B2A',
        minHeight: 70
    },
    nextBtn: {
        backgroundColor: '#0E7C7B',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15
    },
    btnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24
    },
    backBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F0F4F8',
        alignItems: 'center'
    },
    backBtnText: {
        color: '#3D5A80',
        fontWeight: '600'
    },
    finishBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#0E7C7B',
        alignItems: 'center'
    },
    finishBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    }
});
