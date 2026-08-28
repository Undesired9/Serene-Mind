import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function IntakeScreen({ onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Step 1: Identification & Contact
    const [fullLegalName, setFullLegalName] = useState('');
    const [preferredName, setPreferredName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
    const [genderSex, setGenderSex] = useState('Prefer not to say');
    const [phoneNumber, setPhoneNumber] = useState('+1 555-0199');
    const [emailAddress, setEmailAddress] = useState('');
    const [address, setAddress] = useState('123 Wellness Way, City');

    // Step 2: Emergency Contact
    const [emergencyContactName, setEmergencyContactName] = useState('Sarah Doe');
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('Sibling');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('+1 555-0188');

    // Step 3: Clinical Concerns & Goals
    const [presentingProblem, setPresentingProblem] = useState('Experiencing persistent stress and anxiety regarding work and sleep quality.');
    const [symptomDuration, setSymptomDuration] = useState('3-6 months');
    const [treatmentGoals, setTreatmentGoals] = useState('Learn effective mindfulness techniques, improve emotional regulation, and achieve better sleep.');

    // Step 4: Medical History
    const [currentMedications, setCurrentMedications] = useState('None');
    const [allergies, setAllergies] = useState('None');
    const [familyMentalHealthConditions, setFamilyMentalHealthConditions] = useState('None');

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

    const handleFinish = async () => {
        if (!fullLegalName.trim() || !dateOfBirth.trim() || !phoneNumber.trim()) {
            Alert.alert('Required Fields', 'Please complete your identification and contact info.');
            return;
        }

        if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) {
            Alert.alert('Emergency Contact Required', 'Please provide an emergency contact name and phone.');
            return;
        }

        if (presentingProblem.trim().length < 10 || treatmentGoals.trim().length < 10) {
            Alert.alert('Clinical Info Required', 'Presenting problems and goals must be at least 10 characters.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                fullLegalName: fullLegalName.trim(),
                preferredName: preferredName.trim() || fullLegalName.trim(),
                dateOfBirth: dateOfBirth.trim(),
                genderSex: genderSex.trim(),
                phoneNumber: phoneNumber.trim(),
                emailAddress: (emailAddress || userEmail).trim(),
                address: address.trim(),
                emergencyContactName: emergencyContactName.trim(),
                emergencyContactRelationship: emergencyContactRelationship.trim() || 'Contact',
                emergencyContactPhone: emergencyContactPhone.trim(),
                presentingProblem: presentingProblem.trim(),
                symptomDuration: symptomDuration.trim(),
                treatmentGoals: treatmentGoals.trim(),
                currentMedications: currentMedications.trim(),
                allergies: allergies.trim(),
                familyMentalHealthConditions: familyMentalHealthConditions.trim()
            };

            await api.submitIntake(payload);

            const userStr = await AsyncStorage.getItem('serene_user');
            const currentUser = userStr ? JSON.parse(userStr) : {};
            const updatedUser = { ...currentUser, needsIntake: false, needsAssessment: true };
            await AsyncStorage.setItem('serene_user', JSON.stringify(updatedUser));

            Alert.alert('Intake Completed', 'Your clinical intake form has been recorded.');
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
                    <Text style={styles.badge}>Step {step} of 3 • Patient Intake</Text>
                    <Text style={styles.title}>Clinical Onboarding</Text>
                    <Text style={styles.subtitle}>Confidential intake for personalized care planning</Text>
                </View>

                <View style={styles.card}>
                    {step === 1 && (
                        <View>
                            <Text style={styles.sectionTitle}>1. Personal Identification</Text>

                            <Text style={styles.label}>Full Legal Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Jane Doe"
                                value={fullLegalName}
                                onChangeText={setFullLegalName}
                            />

                            <Text style={styles.label}>Date of Birth (YYYY-MM-DD) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1995-06-15"
                                value={dateOfBirth}
                                onChangeText={setDateOfBirth}
                            />

                            <Text style={styles.label}>Phone Number *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="+1 555-0123"
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                            />

                            <Text style={styles.label}>Email Address *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="user@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={emailAddress}
                                onChangeText={setEmailAddress}
                            />

                            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
                                <Text style={styles.nextBtnText}>Next: Emergency Contact →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <Text style={styles.sectionTitle}>2. Emergency Contact Info</Text>

                            <Text style={styles.label}>Emergency Contact Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="John Doe"
                                value={emergencyContactName}
                                onChangeText={setEmergencyContactName}
                            />

                            <Text style={styles.label}>Relationship *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Parent, Spouse, Friend..."
                                value={emergencyContactRelationship}
                                onChangeText={setEmergencyContactRelationship}
                            />

                            <Text style={styles.label}>Emergency Contact Phone *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="+1 555-0199"
                                keyboardType="phone-pad"
                                value={emergencyContactPhone}
                                onChangeText={setEmergencyContactPhone}
                            />

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                                    <Text style={styles.backBtnText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.finishBtn} onPress={() => setStep(3)}>
                                    <Text style={styles.finishBtnText}>Next: Concerns & Goals →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View>
                            <Text style={styles.sectionTitle}>3. Concerns, Goals & Medical</Text>

                            <Text style={styles.label}>Primary Mental Health Concerns * (min 10 chars)</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={3}
                                placeholder="Describe what brings you here today..."
                                value={presentingProblem}
                                onChangeText={setPresentingProblem}
                            />

                            <Text style={styles.label}>Treatment Goals * (min 10 chars)</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={3}
                                placeholder="What changes or outcomes do you hope to achieve?"
                                value={treatmentGoals}
                                onChangeText={setTreatmentGoals}
                            />

                            <Text style={styles.label}>Current Medications or Allergies</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., None, or list medications..."
                                value={currentMedications}
                                onChangeText={setCurrentMedications}
                            />

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                                    <Text style={styles.backBtnText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.finishBtnText}>Submit & Continue</Text>}
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
    input: {
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#0D1B2A'
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
