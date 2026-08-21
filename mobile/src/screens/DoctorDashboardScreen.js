import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../services/api';

export default function DoctorDashboardScreen() {
    const [patients, setPatients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('patients'); // 'patients' | 'appointments'

    const loadDoctorData = async () => {
        try {
            const [patsData, apptsData] = await Promise.all([
                api.getDoctorPatients(),
                api.getDoctorAppointments()
            ]);
            setPatients(patsData);
            setAppointments(apptsData);
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
                <Text style={styles.title}>Clinician Triage Portal</Text>
                <Text style={styles.subtitle}>Patient Risk Monitoring & Schedule Management</Text>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'patients' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('patients')}
                >
                    <Text style={[styles.tabText, activeTab === 'patients' && styles.tabTextActive]}>
                        Patient Risk List ({patients.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'appointments' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('appointments')}
                >
                    <Text style={[styles.tabText, activeTab === 'appointments' && styles.tabTextActive]}>
                        Appointments ({appointments.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'patients' ? (
                <FlatList
                    data={patients}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDoctorData(); }} />}
                    renderItem={({ item }) => {
                        const phq = item.phq9_score ?? 'N/A';
                        const gad = item.gad7_score ?? 'N/A';
                        const isHighRisk = (typeof phq === 'number' && phq >= 15) || (typeof gad === 'number' && gad >= 15);

                        return (
                            <View style={styles.patientCard}>
                                <View style={styles.patientHeader}>
                                    <View>
                                        <Text style={styles.patientName}>{item.full_name || item.email}</Text>
                                        <Text style={styles.patientEmail}>{item.email}</Text>
                                    </View>
                                    <View style={[styles.riskBadge, isHighRisk ? styles.riskHigh : styles.riskLow]}>
                                        <Text style={styles.riskText}>{isHighRisk ? 'High Risk' : 'Moderate/Low'}</Text>
                                    </View>
                                </View>

                                <View style={styles.scoresRow}>
                                    <Text style={styles.scoreText}>PHQ-9: <Text style={{ fontWeight: 'bold' }}>{phq}</Text></Text>
                                    <Text style={styles.scoreText}>GAD-7: <Text style={{ fontWeight: 'bold' }}>{gad}</Text></Text>
                                </View>

                                {item.medical_history ? (
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
    riskHigh: {
        backgroundColor: '#FEE2E2'
    },
    riskLow: {
        backgroundColor: '#E0F2FE'
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
        fontWeight: 'bold'
    }
});
