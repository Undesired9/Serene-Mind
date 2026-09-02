import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, setApiBaseUrl } from '../services/api';

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ur', label: 'اردو', flag: '🇵🇰' }
];

export default function SettingsScreen({ onLogout }) {
    const [user, setUser] = useState(null);
    const [apiUrl, setApiUrlState] = useState('');
    const [selectedLang, setSelectedLang] = useState('en');
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const userStr = await AsyncStorage.getItem('serene_user');
            if (userStr) setUser(JSON.parse(userStr));

            const currentUrl = await getApiBaseUrl();
            setApiUrlState(currentUrl);

            const savedLang = await AsyncStorage.getItem('serene_lang');
            if (savedLang) setSelectedLang(savedLang);
        };
        loadUser();
    }, []);

    const handleSaveApiUrl = async () => {
        if (!apiUrl.trim()) return;
        await setApiBaseUrl(apiUrl.trim());
        Alert.alert('Saved', 'Backend API Server URL updated successfully.');
    };

    const handleSelectLanguage = async (langCode) => {
        setSelectedLang(langCode);
        await AsyncStorage.setItem('serene_lang', langCode);
        Alert.alert('Language Updated', `Application language set to ${LANGUAGES.find(l => l.code === langCode)?.label}.`);
    };

    const handleLogoutSubmit = async () => {
        await AsyncStorage.removeItem('serene_token');
        await AsyncStorage.removeItem('serene_user');
        onLogout();
    };

    return (
        <SafeAreaView style={[styles.container, darkMode && styles.darkContainer]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.title, darkMode && styles.darkText]}>Account & Settings</Text>

                {/* User Profile Card */}
                <View style={[styles.profileCard, darkMode && styles.darkCard]}>
                    <View style={styles.profileAvatar}>
                        <Text style={styles.avatarText}>{user?.role === 'doctor' ? '🩺' : '👤'}</Text>
                    </View>
                    <View>
                        <Text style={[styles.profileName, darkMode && styles.darkText]}>{user?.full_name || user?.email || 'User'}</Text>
                        <Text style={styles.profileRole}>{user?.role === 'doctor' ? 'Clinician' : 'Patient'}</Text>
                        <Text style={styles.profileEmail}>{user?.email}</Text>
                    </View>
                </View>

                {/* Language Picker */}
                <View style={[styles.card, darkMode && styles.darkCard]}>
                    <Text style={[styles.cardTitle, darkMode && styles.darkText]}>Application Language</Text>
                    <View style={styles.langRow}>
                        {LANGUAGES.map(lang => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.langBtn,
                                    selectedLang === lang.code && styles.langBtnActive
                                ]}
                                onPress={() => handleSelectLanguage(lang.code)}
                            >
                                <Text style={{ fontSize: 18 }}>{lang.flag}</Text>
                                <Text style={[
                                    styles.langText,
                                    selectedLang === lang.code && styles.langTextActive
                                ]}>{lang.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Theme Selector */}
                <View style={[styles.card, darkMode && styles.darkCard]}>
                    <Text style={[styles.cardTitle, darkMode && styles.darkText]}>Appearance & Theme</Text>
                    <TouchableOpacity 
                        style={styles.themeToggle} 
                        onPress={() => setDarkMode(!darkMode)}
                    >
                        <Text style={[styles.themeLabel, darkMode && styles.darkText]}>
                            {darkMode ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'}
                        </Text>
                        <Text style={styles.themeSub}>Tap to toggle preview theme</Text>
                    </TouchableOpacity>
                </View>

                {/* Server Endpoint Settings */}
                <View style={[styles.card, darkMode && styles.darkCard]}>
                    <Text style={[styles.cardTitle, darkMode && styles.darkText]}>Backend Server Configuration</Text>
                    <Text style={styles.label}>Quick Presets</Text>
                    <View style={styles.presetRow}>
                        <TouchableOpacity 
                            style={[styles.presetBtn, apiUrl.includes('vercel') && styles.presetBtnActive]}
                            onPress={() => { setApiUrlState('https://serenemind.vercel.app/api'); setApiBaseUrl('https://serenemind.vercel.app/api'); }}
                        >
                            <Text style={[styles.presetBtnText, apiUrl.includes('vercel') && styles.presetBtnTextActive]}>☁️ Vercel Cloud</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.presetBtn, apiUrl.includes('localhost') && styles.presetBtnActive]}
                            onPress={() => { setApiUrlState('http://localhost:5000/api'); setApiBaseUrl('http://localhost:5000/api'); }}
                        >
                            <Text style={[styles.presetBtnText, apiUrl.includes('localhost') && styles.presetBtnTextActive]}>💻 Localhost</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.presetBtn, apiUrl.includes('10.0.2.2') && styles.presetBtnActive]}
                            onPress={() => { setApiUrlState('http://10.0.2.2:5000/api'); setApiBaseUrl('http://10.0.2.2:5000/api'); }}
                        >
                            <Text style={[styles.presetBtnText, apiUrl.includes('10.0.2.2') && styles.presetBtnTextActive]}>📱 Android</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.label, { marginTop: 12 }]}>Custom API Base URL</Text>
                    <TextInput
                        style={[styles.input, darkMode && styles.darkInput]}
                        value={apiUrl}
                        onChangeText={setApiUrlState}
                        placeholder="https://serenemind.vercel.app/api"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveApiUrl}>
                        <Text style={styles.saveUrlText}>Save Custom Server URL</Text>
                    </TouchableOpacity>
                </View>

                {/* Pakistani Helplines Directory Card */}
                <View style={[styles.card, darkMode && styles.darkCard]}>
                    <Text style={[styles.cardTitle, darkMode && styles.darkText]}>🇵🇰 Emergency Support (Pakistan)</Text>
                    <View style={styles.helplineList}>
                        <View style={styles.helplineRow}>
                            <Text style={styles.helplineLabel}>Umang Mental Health 24/7</Text>
                            <Text style={styles.helplineNum}>0311-7786264</Text>
                        </View>
                        <View style={styles.helplineRow}>
                            <Text style={styles.helplineLabel}>Emergency Rescue</Text>
                            <Text style={styles.helplineNum}>1122</Text>
                        </View>
                        <View style={styles.helplineRow}>
                            <Text style={styles.helplineLabel}>Rozan Emotional Helpline</Text>
                            <Text style={styles.helplineNum}>0304-1111741</Text>
                        </View>
                        <View style={styles.helplineRow}>
                            <Text style={styles.helplineLabel}>Taskeen Mental Health</Text>
                            <Text style={styles.helplineNum}>0316-8275336</Text>
                        </View>
                    </View>
                </View>

                {/* App Information Card */}
                <View style={[styles.card, darkMode && styles.darkCard]}>
                    <Text style={[styles.cardTitle, darkMode && styles.darkText]}>About SereneMind</Text>
                    <Text style={styles.infoText}>Version 1.0.0 (Expo SDK 54 Native)</Text>
                    <Text style={styles.infoText}>Privacy-First AI Psychotherapist & Clinical Triage</Text>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutSubmit}>
                    <Text style={styles.logoutBtnText}>Sign Out of SereneMind</Text>
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
    darkContainer: {
        backgroundColor: '#0D1B2A'
    },
    scrollContent: {
        padding: 16
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 16
    },
    darkText: {
        color: '#FFFFFF'
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    profileAvatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#C2FFF0',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: {
        fontSize: 26
    },
    profileName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    profileRole: {
        fontSize: 12,
        color: '#0E7C7B',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2
    },
    profileEmail: {
        fontSize: 12,
        color: '#3D5A80',
        marginTop: 2
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
    },
    darkCard: {
        backgroundColor: '#1E293B'
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 12
    },
    langRow: {
        flexDirection: 'row',
        gap: 8
    },
    langBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        gap: 4
    },
    langBtnActive: {
        backgroundColor: '#0E7C7B',
        borderColor: '#0E7C7B'
    },
    langText: {
        fontSize: 12,
        color: '#3D5A80',
        fontWeight: '600'
    },
    langTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    themeToggle: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#F0F4F8'
    },
    themeLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    themeSub: {
        fontSize: 12,
        color: '#3D5A80',
        marginTop: 2
    },
    label: {
        fontSize: 12,
        color: '#3D5A80',
        fontWeight: '600',
        marginBottom: 4
    },
    input: {
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        padding: 10,
        fontSize: 13,
        color: '#0D1B2A',
        marginBottom: 12
    },
    darkInput: {
        backgroundColor: '#0F172A',
        color: '#FFF',
        borderColor: '#334155'
    },
    saveUrlBtn: {
        backgroundColor: '#0E7C7B',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center'
    },
    saveUrlText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 13
    },
    infoText: {
        fontSize: 13,
        color: '#3D5A80',
        marginBottom: 4
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8
    },
    presetBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center'
    },
    presetBtnActive: {
        backgroundColor: '#0E7C7B',
        borderColor: '#0E7C7B'
    },
    presetBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569'
    },
    presetBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    helplineList: {
        gap: 6
    },
    helplineRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    helplineLabel: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '500'
    },
    helplineNum: {
        fontSize: 12,
        color: '#0E7C7B',
        fontWeight: 'bold'
    },
    logoutBtn: {
        backgroundColor: '#E63946',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 30
    },
    logoutBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15
    }
});
