import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function LoginScreen({ navigation, onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (isRegister) {
            if (!username.trim() || !email.trim() || !password || !confirmPassword) {
                Alert.alert('Required Fields', 'Please complete all required fields.');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Password Mismatch', 'Passwords do not match.');
                return;
            }
        } else {
            if (!email.trim() || !password) {
                Alert.alert('Required Fields', 'Please enter your username/email and password.');
                return;
            }
        }

        setLoading(true);
        try {
            if (isRegister) {
                const data = await api.register({
                    username: username.trim(),
                    email: email.trim(),
                    password,
                    confirmPassword
                });
                await AsyncStorage.setItem('serene_token', data.token);
                await AsyncStorage.setItem('serene_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            } else {
                const data = await api.login({
                    identifier: email.trim(),
                    password
                });
                await AsyncStorage.setItem('serene_token', data.token);
                await AsyncStorage.setItem('serene_user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            }
        } catch (err) {
            Alert.alert('Authentication Failed', err.message || 'Error signing in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={styles.logoCircle}>
                            <Text style={styles.logoText}>SM</Text>
                        </View>
                        <Text style={styles.title}>SereneMind</Text>
                        <Text style={styles.subtitle}>Your AI-Powered Mental Wellness Companion</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{isRegister ? 'Create Patient Account' : 'Patient Login'}</Text>

                        {isRegister && (
                            <>
                                <Text style={styles.label}>Username</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="janedoe"
                                    autoCapitalize="none"
                                    value={username}
                                    onChangeText={setUsername}
                                />
                            </>
                        )}

                        <Text style={styles.label}>{isRegister ? 'Email Address' : 'Username or Email'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={isRegister ? "user@example.com" : "username or user@example.com"}
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

                        {isRegister && (
                            <>
                                <Text style={styles.label}>Confirm Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                            </>
                        )}

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>{isRegister ? 'Sign Up' : 'Log In'}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.switchMode} onPress={() => setIsRegister(!isRegister)}>
                            <Text style={styles.switchModeText}>
                                {isRegister ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.doctorPortalBtn} onPress={() => navigation.navigate('DoctorLogin')}>
                            <Text style={styles.doctorPortalText}>👨‍⚕️ Clinician & Doctor Portal</Text>
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
        marginBottom: 24
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0E7C7B',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    logoText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 24
    },
    title: {
        fontSize: 28,
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
        fontSize: 20,
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
        backgroundColor: '#0E7C7B',
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
    switchMode: {
        marginTop: 16,
        alignItems: 'center'
    },
    switchModeText: {
        color: '#0E7C7B',
        fontWeight: '600',
        fontSize: 14
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 20
    },
    doctorPortalBtn: {
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#C2FFF0',
        alignItems: 'center'
    },
    doctorPortalText: {
        color: '#0E7C7B',
        fontWeight: 'bold',
        fontSize: 14
    }
});
