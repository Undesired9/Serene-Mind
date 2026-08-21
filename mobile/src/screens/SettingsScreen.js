import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, setApiBaseUrl } from '../services/api';

export default function SettingsScreen({ onLogout }) {
    const [user, setUser] = useState(null);
    const [apiUrl, setApiUrlState] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            const userStr = await AsyncStorage.getItem('serene_user');
            if (userStr) setUser(JSON.parse(userStr));

            const currentUrl = await getApiBaseUrl();
            setApiUrlState(currentUrl);
        };
        loadUser();
    }, []);

    const handleSaveApiUrl = async () => {
        if (!apiUrl.trim()) return;
        await setApiBaseUrl(apiUrl.trim());
        Alert.alert('Saved', 'Backend API Server URL updated successfully.');
    };

    const handleLogoutSubmit = async () => {
        await AsyncStorage.removeItem('serene_token');
        await AsyncStorage.removeItem('serene_user');
        onLogout();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Account & Settings</Text>

                {/* User Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}>
                        <Text style={styles.avatarText}>{user?.role === 'doctor' ? '🩺' : '👤'}</Text>
                    </View>
                    <View>
                        <Text style={styles.profileName}>{user?.full_name || user?.email || 'User'}</Text>
                        <Text style={styles.profileRole}>{user?.role === 'doctor' ? 'Clinician' : 'Patient'}</Text>
                        <Text style={styles.profileEmail}>{user?.email}</Text>
                    </View>
                </View>

                {/* Server Endpoint Settings */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Backend Server Configuration</Text>
                    <Text style={styles.label}>API Base URL</Text>
                    <TextInput
                        style={styles.input}
                        value={apiUrl}
                        onChangeText={setApiUrlState}
                        placeholder="http://localhost:5000/api"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveApiUrl}>
                        <Text style={styles.saveUrlText}>Save API Server URL</Text>
                    </TouchableOpacity>
                </View>

                {/* App Information Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>About SereneMind</Text>
                    <Text style={styles.infoText}>Version 1.0.0 (Native Expo App)</Text>
                    <Text style={styles.infoText}>Privacy-First AI Companion & Clinical Triage</Text>
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
    scrollContent: {
        padding: 16
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 16
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
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 12
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
    logoutBtn: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#F87171',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 12
    },
    logoutBtnText: {
        color: '#DC2626',
        fontWeight: 'bold',
        fontSize: 15
    }
});
