import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function DoctorDashboardScreen({ onLogout }) {
    const [patients, setPatients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('critical'); // 'critical' | 'high' | 'monitoring' | 'stable' | 'appointments'

    const handleLogout = async () => {
        await AsyncStorage.removeItem('serene_token');
        await AsyncStorage.removeItem('serene_user');
        if (onLogout) onLogout();
    };

    const loadDoctorData = async () => {
        try {
            const [patsData, apptsData] = await Promise.all([
                api.getDoctorPatients(),
                api.getDoctorAppointments()
            ]);
            setPatients(patsData || []);
            setAppointments(apptsData || []);
        } catch (err) {
            console.error('Error fetching doctor data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDoctorData();
    }, []);

    const handleUpdateAppointment = async (id, status) => {
        try {
            await api.updateDoctorAppointment(id, status);
            loadDoctorData();
        } catch (err) {
            console.error('Error updating appointment status', err);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3D5A80" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Clinician Triage Portal</Text>
                    <Text style={styles.subtitle}>Patient Risk Monitoring & Schedule</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'critical' && styles.tabBtnCritical]}
                    onPress={() => setActiveTab('critical')}
                >
                    <Text style={[styles.tabText, activeTab === 'critical' && styles.tabTextActive]}>
                        🚨 Critical ({patients.filter(p => p.risk_level === 'CRITICAL' || p.crisis_risk).length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'high' && styles.tabBtnHigh]}
                    onPress={() => setActiveTab('high')}
                >
                    <Text style={[styles.tabText, activeTab === 'high' && styles.tabTextActive]}>
                        ⚠️ High ({patients.filter(p => p.risk_level === 'HIGH').length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'monitoring' && styles.tabBtnMonitoring]}
                    onPress={() => setActiveTab('monitoring')}
                >
                    <Text style={[styles.tabText, activeTab === 'monitoring' && styles.tabTextActive]}>
                        🔍 Monitor ({patients.filter(p => p.risk_level === 'MODERATE').length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'stable' && styles.tabBtnStable]}
                    onPress={() => setActiveTab('stable')}
                >
                    <Text style={[styles.tabText, activeTab === 'stable' && styles.tabTextActive]}>
                        ✅ Stable ({patients.filter(p => p.risk_level === 'LOW' || (!p.risk_level && !p.crisis_risk)).length})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab !== 'appointments' ? (
                <FlatList
                    data={
                        activeTab === 'critical' 
                            ? patients.filter(p => p.risk_level === 'CRITICAL' || p.crisis_risk)
                            : activeTab === 'high'
                            ? patients.filter(p => p.risk_level === 'HIGH')
                            : activeTab === 'monitoring'
                            ? patients.filter(p => p.risk_level === 'MODERATE')
                            : activeTab === 'stable'
                            ? patients.filter(p => p.risk_level === 'LOW' || (!p.risk_level && !p.crisis_risk))
                            : patients
                    }
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDoctorData(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No patients currently in this triage queue.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const phq = item.phq9_score ?? 'N/A';
                        const gad = item.gad7_score ?? 'N/A';
                        const isHighRisk = (typeof phq === 'number' && phq >= 15) || (typeof gad === 'number' && gad >= 15);
                        const isCritical = item.risk_level === 'CRITICAL' || item.crisis_risk;

                        return (
                            <View style={styles.patientCard}>
                                <View style={styles.patientHeader}>
                                    <View>
                                        <Text style={styles.patientName}>{item.full_name || item.email}</Text>
                                        <Text style={styles.patientEmail}>{item.email}</Text>
                                    </View>
                                    <View style={[
                                        styles.riskBadge, 
                                        isCritical ? styles.riskCritical : (isHighRisk ? styles.riskHigh : styles.riskLow)
                                    ]}>
                                        <Text style={styles.riskText}>
                                            {isCritical ? '🚨 Critical' : (isHighRisk ? 'High Risk' : 'Moderate/Low')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.scoresRow}>
                                    <Text style={styles.scoreText}>PHQ-9: <Text style={{ fontWeight: 'bold' }}>{phq}</Text></Text>
                                    <Text style={styles.scoreText}>GAD-7: <Text style={{ fontWeight: 'bold' }}>{gad}</Text></Text>
                                    <Text style={styles.scoreText}>Risk: <Text style={{ fontWeight: 'bold', color: isCritical ? '#DC2626' : '#0E7C7B' }}>{item.risk_level || 'LOW'}</Text></Text>
                                </View>

                                {item.presenting_problem ? (
                                    <Text style={styles.historyText} numberOfLines={2}>
                                        Concern: {item.presenting_problem}
                                    </Text>
                                ) : item.medical_history ? (
                                    <Text style={styles.historyText} numberOfLines={2}>
                                        Medical: {item.medical_history}
                                    </Text>
                                ) : null}
                            </View>
                        );
                    }}
                />
            ) : (
                <FlatList
                    data={appointments}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDoctorData(); }} />}
                    renderItem={({ item }) => (
                        <View style={styles.apptCard}>
                            <View style={styles.patientHeader}>
                                <Text style={styles.patientName}>{item.patient_name || item.patient_email}</Text>
                                <Text style={styles.statusText}>{item.status}</Text>
                            </View>
                            <Text style={styles.apptDate}>📅 {new Date(item.appointment_date).toLocaleString()}</Text>
                            {item.notes ? <Text style={styles.historyText}>Notes: {item.notes}</Text> : null}

                            <View style={styles.actionRow}>
                                <TouchableOpacity 
                                    style={styles.confirmBtn} 
                                    onPress={() => handleUpdateAppointment(item.id, 'confirmed')}
                                >
                                    <Text style={styles.actionBtnText}>Confirm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.cancelBtn} 
                                    onPress={() => handleUpdateAppointment(item.id, 'cancelled')}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
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
    header: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    subtitle: {
        fontSize: 12,
        color: '#3D5A80',
        marginTop: 2
    },
    tabRow: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#FFFFFF',
        gap: 8
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F0F4F8',
        alignItems: 'center'
    },
    tabBtnActive: {
        backgroundColor: '#3D5A80'
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3D5A80'
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    listContent: {
        padding: 16
    },
    patientCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
    },
    patientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    patientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    patientEmail: {
        fontSize: 12,
        color: '#3D5A80'
    },
    riskBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    tabBtnCritical: {
        backgroundColor: '#EF4444'
    },
    tabBtnHigh: {
        backgroundColor: '#F59E0B'
    },
    tabBtnMonitoring: {
        backgroundColor: '#0284C7'
    },
    tabBtnStable: {
        backgroundColor: '#10B981'
    },
    riskCritical: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#EF4444'
    },
    riskHigh: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#F59E0B'
    },
    riskLow: {
        backgroundColor: '#E0F2FE'
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center'
    },
    emptyText: {
        color: '#64748B',
        fontSize: 13
    },
    riskText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#0D1B2A'
    },
    scoresRow: {
        flexDirection: 'row',
        gap: 16,
        marginVertical: 8,
        backgroundColor: '#F8FAF9',
        padding: 8,
        borderRadius: 8
    },
    scoreText: {
        fontSize: 12,
        color: '#3D5A80'
    },
    historyText: {
        fontSize: 12,
        color: '#4A5568',
        marginTop: 4
    },
    apptCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0E7C7B',
        textTransform: 'uppercase'
    },
    apptDate: {
        fontSize: 13,
        color: '#3D5A80',
        marginVertical: 4
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12
    },
    confirmBtn: {
        backgroundColor: '#0E7C7B',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold'
    },
    cancelBtn: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8
    },
    cancelBtnText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600'
    },
    logoutBtn: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'center'
    },
    logoutBtnText: {
        color: '#DC2626',
        fontWeight: 'bold',
        fontSize: 12
    }
});
