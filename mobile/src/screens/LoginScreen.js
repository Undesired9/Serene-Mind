import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getApiBaseUrl, setApiBaseUrl, checkServerHealth, DEFAULT_API_URLS } from '../services/api';

export default function LoginScreen({ navigation, onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Server Configuration State
    const [serverUrl, setServerUrl] = useState('');
    const [showServerModal, setShowServerModal] = useState(false);
    const [testingServer, setTestingServer] = useState(false);
    const [serverStatus, setServerStatus] = useState(null);

    useEffect(() => {
        const loadServerConfig = async () => {
            const currentUrl = await getApiBaseUrl();
            setServerUrl(currentUrl);
        };
        loadServerConfig();
    }, []);

    const handleTestConnection = async (urlToTest = null) => {
        setTestingServer(true);
        setServerStatus(null);
        const result = await checkServerHealth(urlToTest || serverUrl);
        setTestingServer(false);
        setServerStatus(result);
        if (result.ok) {
            Alert.alert('Server Connected', `Successfully reached backend at ${result.url}`);
        } else {
            Alert.alert('Connection Failed', `Cannot reach backend at ${result.url}.\nError: ${result.error}\n\nTip: If testing on a phone, use the 'Wi-Fi' preset while both phone and PC are on the same Wi-Fi.`);
        }
    };

    const handleApplyServerUrl = async (newUrl) => {
        const cleaned = await setApiBaseUrl(newUrl);
        setServerUrl(cleaned);
        setShowServerModal(false);
        Alert.alert('Server URL Updated', `API base set to: ${cleaned}`);
    };

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
            Alert.alert(
                'Authentication Failed', 
                err.message || 'Error signing in',
                [
                    { text: 'OK' },
                    { text: '⚙️ Server Config', onPress: () => setShowServerModal(true) }
                ]
            );
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

                    {/* Server Connection Bar */}
                    <TouchableOpacity style={styles.serverBar} onPress={() => setShowServerModal(true)}>
                        <Text style={styles.serverBarLabel}>📡 Server API: </Text>
                        <Text style={styles.serverBarUrl} numberOfLines={1}>{serverUrl || 'Loading...'}</Text>
                        <Text style={styles.serverBarEdit}>⚙️ Change</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Server Configuration Modal */}
            <Modal visible={showServerModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>⚙️ Backend Server Connection</Text>
                        <Text style={styles.modalSub}>Select your environment to ensure mobile connectivity:</Text>

                        {/* Presets */}
                        <Text style={styles.presetLabel}>Quick Presets</Text>
                        <View style={styles.presetGrid}>
                            <TouchableOpacity 
                                style={[styles.presetCard, serverUrl === DEFAULT_API_URLS.localWifi && styles.presetCardActive]}
                                onPress={() => setServerUrl(DEFAULT_API_URLS.localWifi)}
                            >
                                <Text style={styles.presetTitle}>📶 Physical Phone (Wi-Fi)</Text>
                                <Text style={styles.presetUrl}>{DEFAULT_API_URLS.localWifi}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.presetCard, serverUrl === DEFAULT_API_URLS.androidEmulator && styles.presetCardActive]}
                                onPress={() => setServerUrl(DEFAULT_API_URLS.androidEmulator)}
                            >
                                <Text style={styles.presetTitle}>📱 Android Emulator</Text>
                                <Text style={styles.presetUrl}>{DEFAULT_API_URLS.androidEmulator}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.presetCard, serverUrl === DEFAULT_API_URLS.vercel && styles.presetCardActive]}
                                onPress={() => setServerUrl(DEFAULT_API_URLS.vercel)}
                            >
                                <Text style={styles.presetTitle}>☁️ Vercel Cloud</Text>
                                <Text style={styles.presetUrl}>{DEFAULT_API_URLS.vercel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.presetCard, serverUrl === DEFAULT_API_URLS.localhost && styles.presetCardActive]}
                                onPress={() => setServerUrl(DEFAULT_API_URLS.localhost)}
                            >
                                <Text style={styles.presetTitle}>💻 Localhost (5000)</Text>
                                <Text style={styles.presetUrl}>{DEFAULT_API_URLS.localhost}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.presetLabel, { marginTop: 12 }]}>Custom API Base URL</Text>
                        <TextInput 
                            style={styles.modalInput}
                            value={serverUrl}
                            onChangeText={setServerUrl}
                            placeholder="http://172.28.250.3:5000/api"
                            autoCapitalize="none"
                        />

                        {serverStatus && (
                            <View style={[styles.statusBox, serverStatus.ok ? styles.statusOk : styles.statusErr]}>
                                <Text style={styles.statusText}>
                                    {serverStatus.ok ? '✅ Server Reachable' : `❌ ${serverStatus.error}`}
                                </Text>
                            </View>
                        )}

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity 
                                style={styles.testBtn} 
                                onPress={() => handleTestConnection()}
                                disabled={testingServer}
                            >
                                {testingServer ? <ActivityIndicator color="#0E7C7B" /> : <Text style={styles.testBtnText}>🔌 Test</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.saveBtn} 
                                onPress={() => handleApplyServerUrl(serverUrl)}
                            >
                                <Text style={styles.saveBtnText}>Save & Apply</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.cancelBtn} 
                                onPress={() => setShowServerModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    logo: {
        width: 112,
        height: 80,
        marginBottom: 12
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
    },
    serverBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginTop: 18,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        maxWidth: 320
    },
    serverBarLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600'
    },
    serverBarUrl: {
        fontSize: 11,
        color: '#0E7C7B',
        fontWeight: 'bold',
        flexShrink: 1,
        marginRight: 6
    },
    serverBarEdit: {
        fontSize: 11,
        color: '#1B98E0',
        fontWeight: 'bold'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(13, 27, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 4
    },
    modalSub: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 14
    },
    presetLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 6
    },
    presetGrid: {
        gap: 6
    },
    presetCard: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    presetCardActive: {
        backgroundColor: '#D1F2EB',
        borderColor: '#0E7C7B'
    },
    presetTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0F172A'
    },
    presetUrl: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 2
    },
    modalInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        padding: 10,
        fontSize: 13,
        color: '#0F172A',
        marginTop: 4
    },
    statusBox: {
        marginTop: 10,
        padding: 8,
        borderRadius: 8
    },
    statusOk: {
        backgroundColor: '#DCFCE7'
    },
    statusErr: {
        backgroundColor: '#FEE2E2'
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold'
    },
    modalBtnRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16
    },
    testBtn: {
        flex: 1,
        backgroundColor: '#E2E8F0',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center'
    },
    testBtnText: {
        color: '#334155',
        fontWeight: 'bold',
        fontSize: 12
    },
    saveBtn: {
        flex: 2,
        backgroundColor: '#1B98E0',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center'
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 13
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center'
    },
    cancelBtnText: {
        color: '#64748B',
        fontWeight: 'bold',
        fontSize: 12
    }
});
