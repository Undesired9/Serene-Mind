import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary', 'Prefer not to say'];
const DURATION_OPTIONS = ['< 1 month', '1-3 months', '3-6 months', '6+ months'];

export default function IntakeScreen({ onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Step 1: Identification & Contact
    const [fullLegalName, setFullLegalName] = useState('');
    const [preferredName, setPreferredName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
    const [genderSex, setGenderSex] = useState('Prefer not to say');
    const [phoneNumber, setPhoneNumber] = useState('0300-1234567');
    const [emailAddress, setEmailAddress] = useState('');

    // Step 2: Emergency Contact
    const [emergencyContactName, setEmergencyContactName] = useState('Family Member');
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('Parent / Sibling');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('0312-3456789');

    // Step 3: Clinical Concerns & Goals
    const [presentingProblem, setPresentingProblem] = useState('Experiencing persistent stress, overwhelm, and sleep disturbances.');
    const [symptomDuration, setSymptomDuration] = useState('3-6 months');
    const [treatmentGoals, setTreatmentGoals] = useState('Learn effective coping strategies, emotional regulation, and achieve better sleep.');

    // Medical Conditions (Optional)
    const [currentMedications, setCurrentMedications] = useState('None');
    const [allergies, setAllergies] = useState('None');

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userStr = await AsyncStorage.getItem('serene_user');
                if (userStr) {
                    const parsed = JSON.parse(userStr);
                    if (parsed.email) {
                        setUserEmail(parsed.email);
                        setEmailAddress(parsed.email);
                    }
                    if (parsed.username) {
                        setFullLegalName(parsed.username);
                    }
                }
            } catch (e) {
                console.warn('Failed to load user email', e);
            }
        };
        loadUser();
    }, []);

    const sanitizePhone = (text) => {
        return text.replace(/[^0-9+\s()-]/g, '').slice(0, 16);
    };

    const handleNext = () => {
        if (step === 1) {
            if (!fullLegalName.trim() || fullLegalName.trim().length < 2) {
                Alert.alert('Required Field', 'Please enter your full legal name.');
                return;
            }
            if (!dateOfBirth.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
                Alert.alert('Invalid Date', 'Please enter your Date of Birth in YYYY-MM-DD format.');
                return;
            }
            if (!phoneNumber.trim() || phoneNumber.trim().length < 7) {
                Alert.alert('Phone Required', 'Please enter a valid phone number.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!emergencyContactName.trim()) {
                Alert.alert('Required Field', 'Please provide an emergency contact name.');
                return;
            }
            if (!emergencyContactPhone.trim() || emergencyContactPhone.trim().length < 7) {
                Alert.alert('Required Field', 'Please provide a valid emergency contact phone number.');
                return;
            }
            setStep(3);
        }
    };

    const handleFinish = async () => {
        if (presentingProblem.trim().length < 8) {
            Alert.alert('Clinical Info Required', 'Please briefly describe what you would like support with.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                fullLegalName: fullLegalName.trim().slice(0, 80),
                preferredName: (preferredName || fullLegalName).trim().slice(0, 80),
                dateOfBirth: dateOfBirth.trim(),
                genderSex: genderSex.trim(),
                phoneNumber: phoneNumber.trim().slice(0, 18),
                emailAddress: (emailAddress || userEmail).trim(),
                emergencyContactName: emergencyContactName.trim().slice(0, 80),
                emergencyContactRelationship: emergencyContactRelationship.trim() || 'Contact',
                emergencyContactPhone: emergencyContactPhone.trim().slice(0, 18),
                presentingProblem: presentingProblem.trim().slice(0, 1000),
                symptomDuration: symptomDuration.trim(),
                treatmentGoals: treatmentGoals.trim().slice(0, 500),
                currentMedications: currentMedications.trim(),
                allergies: allergies.trim(),
                familyMentalHealthConditions: 'None'
            };

            await api.submitIntake(payload);

            const userStr = await AsyncStorage.getItem('serene_user');
            const currentUser = userStr ? JSON.parse(userStr) : {};
            const updatedUser = { ...currentUser, needsIntake: false, needsAssessment: true };
            await AsyncStorage.setItem('serene_user', JSON.stringify(updatedUser));

            Alert.alert('Intake Completed', 'Your confidential intake profile has been created.');
            onComplete(updatedUser);
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
                    <Text style={styles.badge}>Step {step} of 3 • Confidential Intake</Text>
                    <Text style={styles.title}>Client Onboarding</Text>
                    <Text style={styles.subtitle}>Streamlined information for your personalized care plan</Text>
                </View>

                <View style={styles.card}>
                    {step === 1 && (
                        <View>
                            <Text style={styles.sectionTitle}>1. Personal Identification</Text>

                            <Text style={styles.label}>Full Legal Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Abdullah Khan"
                                value={fullLegalName}
                                onChangeText={setFullLegalName}
                                maxLength={80}
                            />

                            <Text style={styles.label}>Preferred Name (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="What should we call you?"
                                value={preferredName}
                                onChangeText={setPreferredName}
                                maxLength={80}
                            />

                            <Text style={styles.label}>Date of Birth (YYYY-MM-DD) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="2000-01-01"
                                value={dateOfBirth}
                                onChangeText={setDateOfBirth}
                                maxLength={10}
                            />

                            <Text style={styles.label}>Gender Identity *</Text>
                            <View style={styles.pillRow}>
                                {GENDER_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.pill, genderSex === opt && styles.pillActive]}
                                        onPress={() => setGenderSex(opt)}
                                    >
                                        <Text style={[styles.pillText, genderSex === opt && styles.pillTextActive]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Contact Phone Number *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0300-1234567"
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={t => setPhoneNumber(sanitizePhone(t))}
                                maxLength={16}
                            />

                            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                                <Text style={styles.nextBtnText}>Continue to Step 2 →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <Text style={styles.sectionTitle}>2. Emergency Contact</Text>
                            <Text style={styles.helperText}>Used only for clinical safety and urgent escalations.</Text>

                            <Text style={styles.label}>Contact Person Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Sarah Khan"
                                value={emergencyContactName}
                                onChangeText={setEmergencyContactName}
                                maxLength={80}
                            />

                            <Text style={styles.label}>Relationship *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Sibling / Parent / Spouse / Friend"
                                value={emergencyContactRelationship}
                                onChangeText={setEmergencyContactRelationship}
                                maxLength={50}
                            />

                            <Text style={styles.label}>Emergency Phone Number *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0312-3456789"
                                keyboardType="phone-pad"
                                value={emergencyContactPhone}
                                onChangeText={t => setEmergencyContactPhone(sanitizePhone(t))}
                                maxLength={16}
                            />

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                                    <Text style={styles.backBtnText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.nextBtn, { flex: 1 }]} onPress={handleNext}>
                                    <Text style={styles.nextBtnText}>Continue to Step 3 →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View>
                            <Text style={styles.sectionTitle}>3. Clinical Focus & Goals</Text>

                            <Text style={styles.label}>What brings you to SereneMind today? *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe any stress, mood changes, anxiety, or challenges you are experiencing..."
                                multiline
                                numberOfLines={3}
                                value={presentingProblem}
                                onChangeText={setPresentingProblem}
                                maxLength={1000}
                            />

                            <Text style={styles.label}>How long have you felt this way?</Text>
                            <View style={styles.pillRow}>
                                {DURATION_OPTIONS.map(dur => (
                                    <TouchableOpacity
                                        key={dur}
                                        style={[styles.pill, symptomDuration === dur && styles.pillActive]}
                                        onPress={() => setSymptomDuration(dur)}
                                    >
                                        <Text style={[styles.pillText, symptomDuration === dur && styles.pillTextActive]}>{dur}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>What are your main goals for therapy?</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="e.g. Better emotional control, reduced anxiety, improved sleep..."
                                multiline
                                numberOfLines={2}
                                value={treatmentGoals}
                                onChangeText={setTreatmentGoals}
                                maxLength={500}
                            />

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                                    <Text style={styles.backBtnText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.finishBtn, { flex: 1 }]} onPress={handleFinish} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.finishBtnText}>Submit & Start Screening ✓</Text>}
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
        padding: 16
    },
    header: {
        alignItems: 'center',
        marginVertical: 14
    },
    badge: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0E7C7B',
        backgroundColor: '#D1F2EB',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 6
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    subtitle: {
        fontSize: 13,
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
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0E7C7B',
        marginBottom: 12
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0D1B2A',
        marginTop: 10,
        marginBottom: 6
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#0D1B2A'
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top'
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 4
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    pillActive: {
        backgroundColor: '#0E7C7B',
        borderColor: '#0E7C7B'
    },
    pillText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500'
    },
    pillTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    nextBtn: {
        backgroundColor: '#1B98E0',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 20
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15
    },
    btnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20
    },
    backBtn: {
        backgroundColor: '#E2E8F0',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 18,
        alignItems: 'center'
    },
    backBtnText: {
        color: '#334155',
        fontWeight: '600',
        fontSize: 14
    },
    finishBtn: {
        backgroundColor: '#1B98E0',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center'
    },
    finishBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15
    }
});
