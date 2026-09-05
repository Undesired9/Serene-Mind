import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function DoctorLoginScreen({ navigation, onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDoctorLogin = async () => {
        if (!email || !password) {
            Alert.alert('Required Fields', 'Please enter your clinician email and password.');
            return;
        }

        setLoading(true);
        try {
            const data = await api.doctorLogin({ email, password });
            await AsyncStorage.setItem('serene_token', data.token);
            await AsyncStorage.setItem('serene_user', JSON.stringify(data.user));
            onLoginSuccess(data.user);
        } catch (err) {
            Alert.alert('Login Failed', err.message || 'Invalid clinician credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Doctor Portal</Text>
                        <Text style={styles.subtitle}>SereneMind Clinical Triage & Risk Monitoring</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Clinician Authentication</Text>

                        <Text style={styles.label}>Doctor Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="doctor@hospital.org"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleDoctorLogin} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Access Doctor Dashboard</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.backBtnText}>← Back to Patient Login</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8E8E8'
    },
    scrollContent: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1
    },
    header: {
        alignItems: 'center',
        marginBottom: 28
    },
    logo: {
        width: 112,
        height: 80,
        marginBottom: 12
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    subtitle: {
        fontSize: 14,
        color: '#3D5A80',
        marginTop: 4,
        textAlign: 'center'
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 20,
        textAlign: 'center'
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3D5A80',
        marginBottom: 6
    },
    input: {
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 16,
        color: '#0D1B2A'
    },
    submitBtn: {
        backgroundColor: '#1B98E0',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold'
    },
    backBtn: {
        marginTop: 16,
        alignItems: 'center'
    },
    backBtnText: {
        color: '#3D5A80',
        fontWeight: '600',
        fontSize: 14
    }
});
