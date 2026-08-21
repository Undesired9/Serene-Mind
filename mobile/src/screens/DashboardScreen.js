import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { api } from '../services/api';
import GroundingModal from '../components/GroundingModal';

const MOODS = [
    { score: 1, emoji: '😭', label: 'Very Low' },
    { score: 2, emoji: '😔', label: 'Low' },
    { score: 3, emoji: '😐', label: 'Neutral' },
    { score: 4, emoji: '🙂', label: 'Good' },
    { score: 5, emoji: '😄', label: 'Great' }
];

export default function DashboardScreen({ navigation }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedMood, setSelectedMood] = useState(3);
    const [submittingCheckin, setSubmittingCheckin] = useState(false);
    const [groundingVisible, setGroundingVisible] = useState(false);

    const loadData = async () => {
        try {
            const data = await api.getDashboard();
            setDashboardData(data);
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCheckin = async () => {
        setSubmittingCheckin(true);
        try {
            await api.postCheckin({ mood_score: selectedMood, notes: `Check-in mood: ${selectedMood}/5` });
            Alert.alert('Mood Logged', 'Thank you for logging your daily mood check-in!');
            loadData();
        } catch (err) {
            Alert.alert('Error', 'Failed to submit check-in.');
        } finally {
            setSubmittingCheckin(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0E7C7B" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            >
                {/* Header Banner */}
                <View style={styles.welcomeBanner}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>🌿</Text>
                    </View>
                    <View>
                        <Text style={styles.welcomeTitle}>Welcome Back</Text>
                        <Text style={styles.welcomeSubtitle}>How are you feeling right now?</Text>
                    </View>
                </View>

                {/* Mood Check-In Widget */}
                <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>Daily Mood Check-In</Text>
                    <View style={styles.moodRow}>
                        {MOODS.map(m => (
                            <TouchableOpacity
                                key={m.score}
                                style={[
                                    styles.moodBtn,
                                    selectedMood === m.score && styles.moodBtnActive
                                ]}
                                onPress={() => setSelectedMood(m.score)}
                            >
                                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                                <Text style={[
                                    styles.moodLabel,
                                    selectedMood === m.score && styles.moodLabelActive
                                ]}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.checkinSubmitBtn} onPress={handleCheckin} disabled={submittingCheckin}>
                        {submittingCheckin ? <ActivityIndicator color="#FFF" /> : <Text style={styles.checkinSubmitText}>Log Mood Entry</Text>}
                    </TouchableOpacity>
                </View>

                {/* Grounding Exercise Card */}
                <TouchableOpacity style={styles.groundingCard} onPress={() => setGroundingVisible(true)}>
                    <View style={styles.groundingIconContainer}>
                        <Text style={styles.groundingIcon}>🧘</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.groundingTitle}>Panic & Anxiety Relief</Text>
                        <Text style={styles.groundingSubtitle}>Tap to start 5-4-3-2-1 Grounding Visualizer</Text>
                    </View>
                    <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{dashboardData?.stats?.checkinsCount || 0}</Text>
                        <Text style={styles.statLabel}>Total Check-ins</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{dashboardData?.stats?.sessionsCount || 0}</Text>
                        <Text style={styles.statLabel}>AI Companion Sessions</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionHeader}>Quick Actions</Text>
                <View style={styles.quickActionRow}>
                    <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Chat')}>
                        <Text style={styles.quickActionEmoji}>💬</Text>
                        <Text style={styles.quickActionTitle}>Talk to Companion</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Appointments')}>
                        <Text style={styles.quickActionEmoji}>📅</Text>
                        <Text style={styles.quickActionTitle}>Book Doctor</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <GroundingModal visible={groundingVisible} onClose={() => setGroundingVisible(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8E8E8'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8E8E8'
    },
    scrollContent: {
        padding: 16
    },
    welcomeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#C2FFF0',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: {
        fontSize: 24
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    welcomeSubtitle: {
        fontSize: 13,
        color: '#3D5A80'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3
    },
    cardHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 12
    },
    moodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    moodBtn: {
        alignItems: 'center',
        padding: 10,
        borderRadius: 14,
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        width: '18%'
    },
    moodBtnActive: {
        backgroundColor: '#0E7C7B',
        borderColor: '#0E7C7B'
    },
    moodEmoji: {
        fontSize: 22,
        marginBottom: 4
    },
    moodLabel: {
        fontSize: 10,
        color: '#3D5A80',
        fontWeight: '500'
    },
    moodLabelActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    checkinSubmitBtn: {
        backgroundColor: '#0E7C7B',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    checkinSubmitText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14
    },
    groundingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0D1B2A',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        gap: 12
    },
    groundingIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0E7C7B',
        alignItems: 'center',
        justifyContent: 'center'
    },
    groundingIcon: {
        fontSize: 22
    },
    groundingTitle: {
        color: '#C2FFF0',
        fontSize: 16,
        fontWeight: 'bold'
    },
    groundingSubtitle: {
        color: '#A0AEC0',
        fontSize: 12,
        marginTop: 2
    },
    arrowText: {
        color: '#C2FFF0',
        fontSize: 20,
        fontWeight: 'bold'
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0E7C7B'
    },
    statLabel: {
        fontSize: 12,
        color: '#3D5A80',
        marginTop: 4,
        textAlign: 'center'
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 12
    },
    quickActionRow: {
        flexDirection: 'row',
        gap: 12
    },
    quickActionCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#0E7C7B',
        borderStyle: 'dashed'
    },
    quickActionEmoji: {
        fontSize: 28,
        marginBottom: 8
    },
    quickActionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0E7C7B'
    }
});
