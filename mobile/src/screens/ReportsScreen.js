import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../services/api';

export default function ReportsScreen() {
    const [reportsData, setReportsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadReports = async () => {
        try {
            const data = await api.getReports();
            setReportsData(data);
        } catch (err) {
            console.error('Error fetching reports', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0E7C7B" />
            </SafeAreaView>
        );
    }

    const latestPhq = reportsData?.phq9_score ?? 'N/A';
    const latestGad = reportsData?.gad7_score ?? 'N/A';
    const moodHistory = reportsData?.mood_history || [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} />}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Mental Health Report</Text>
                    <Text style={styles.subtitle}>Clinical Progress & PHQ-9 / GAD-7 Overview</Text>
                </View>

                {/* Score Cards */}
                <View style={styles.scoreRow}>
                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreTitle}>PHQ-9 (Depression)</Text>
                        <Text style={styles.scoreValue}>{latestPhq}</Text>
                        <Text style={styles.scoreSub}>
                            {typeof latestPhq === 'number' ? (latestPhq < 5 ? 'Minimal' : latestPhq < 10 ? 'Mild' : latestPhq < 15 ? 'Moderate' : 'Severe') : 'Not Taken'}
                        </Text>
                    </View>

                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreTitle}>GAD-7 (Anxiety)</Text>
                        <Text style={styles.scoreValue}>{latestGad}</Text>
                        <Text style={styles.scoreSub}>
                            {typeof latestGad === 'number' ? (latestGad < 5 ? 'Minimal' : latestGad < 10 ? 'Mild' : latestGad < 15 ? 'Moderate' : 'Severe') : 'Not Taken'}
                        </Text>
                    </View>
                </View>

                {/* AI Summary Card */}
                <View style={styles.aiSummaryCard}>
                    <Text style={styles.aiBadge}>🤖 SereneMind AI Clinical Insights</Text>
                    <Text style={styles.aiText}>
                        {reportsData?.ai_summary || "Based on your recent interactions and check-ins, your mood stability is progressing steadily. Regular grounding exercises and session chats are recommended."}
                    </Text>
                </View>

                {/* Mood Logs History */}
                <Text style={styles.sectionHeader}>Mood Log History</Text>
                {moodHistory.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No recent mood logs recorded.</Text>
                    </View>
                ) : (
                    moodHistory.map((item, idx) => (
                        <View key={idx} style={styles.historyCard}>
                            <View style={styles.historyLeft}>
                                <Text style={styles.historyMoodScore}>{item.mood_score} / 5</Text>
                                <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                            </View>
                            {item.notes ? <Text style={styles.historyNotes}>{item.notes}</Text> : null}
                        </View>
                    ))
                )}
            </ScrollView>
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
    header: {
        marginBottom: 16
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    subtitle: {
        fontSize: 13,
        color: '#3D5A80',
        marginTop: 2
    },
    scoreRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16
    },
    scoreCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    scoreTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3D5A80'
    },
    scoreValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0E7C7B',
        marginVertical: 4
    },
    scoreSub: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    aiSummaryCard: {
        backgroundColor: '#0D1B2A',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20
    },
    aiBadge: {
        color: '#C2FFF0',
        fontWeight: 'bold',
        fontSize: 13,
        marginBottom: 8
    },
    aiText: {
        color: '#E0E0E0',
        fontSize: 13,
        lineHeight: 20
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 12
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center'
    },
    emptyText: {
        color: '#3D5A80',
        fontSize: 14
    },
    historyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    historyMoodScore: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0E7C7B',
        backgroundColor: '#C2FFF0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    historyDate: {
        fontSize: 12,
        color: '#3D5A80'
    },
    historyNotes: {
        fontSize: 12,
        color: '#4A5568',
        fontStyle: 'italic',
        maxWidth: 140
    }
});
