import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { api } from '../services/api';


export default function AppointmentsScreen() {
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [dateText, setDateText] = useState('');
    const [notesText, setNotesText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        try {
            const [docsData, apptsData] = await Promise.all([
                api.getDoctors(),
                api.getAppointments()
            ]);
            setDoctors(docsData);
            setAppointments(apptsData);
        } catch (err) {
            console.error('Error loading appointments data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenBooking = (doctor) => {
        setSelectedDoctor(doctor);
        setDateText(new Date(Date.now() + 86400000).toISOString().split('T')[0] + ' 10:00');
        setBookingModalVisible(true);
    };

    const handleBookSubmit = async () => {
        if (!selectedDoctor || !dateText) {
            Alert.alert('Required', 'Please specify appointment date and time.');
            return;
        }

        setSubmitting(true);
        try {
            await api.bookAppointment(selectedDoctor.id, dateText, notesText);
            Alert.alert('Success', 'Appointment booked successfully!');
            setBookingModalVisible(false);
            setNotesText('');
            loadData();
        } catch (err) {
            Alert.alert('Booking Error', err.message || 'Failed to book appointment.');
        } finally {
            setSubmitting(false);
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
            <FlatList
                data={appointments}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View>
                        <Text style={styles.headerTitle}>Available Clinicians</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorsScroll}>
                            {doctors.map(doc => (
                                <View key={doc.id} style={styles.docCard}>
                                    <View style={styles.docAvatar}>
                                        <Text style={{ fontSize: 20 }}>👨‍⚕️</Text>
                                    </View>
                                    <Text style={styles.docName}>{doc.full_name}</Text>
                                    <Text style={styles.docSpec}>{doc.specialization || 'Psychiatrist / Counselor'}</Text>
                                    <TouchableOpacity style={styles.bookBtn} onPress={() => handleOpenBooking(doc)}>
                                        <Text style={styles.bookBtnText}>Book Session</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <Text style={styles.headerTitle}>My Booked Appointments</Text>
                        {appointments.length === 0 && (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No upcoming appointments scheduled.</Text>
                            </View>
                        )}
                    </View>
                }
                renderItem={({ item }) => {
                    const isScheduled = item.status === 'SCHEDULED' || item.status === 'confirmed';
                    const apptTime = item.appointment_datetime || item.appointment_date;
                    return (
                        <View style={styles.apptCard}>
                            <View style={styles.apptHeader}>
                                <Text style={styles.apptDocName}>Dr. {item.doctor_name || 'Clinician'}</Text>
                                <View style={[
                                    styles.statusBadge,
                                    isScheduled ? styles.statusConfirmed : styles.statusPending
                                ]}>
                                    <Text style={styles.statusText}>{item.status || 'SCHEDULED'}</Text>
                                </View>
                            </View>
                            <Text style={styles.apptDate}>📅 {apptTime ? new Date(apptTime).toLocaleString() : 'Date not specified'}</Text>
                            {item.notes ? <Text style={styles.apptNotes}>Note: {item.notes}</Text> : null}
                        </View>
                    );
                }}
            />

            {/* Booking Modal */}
            <Modal visible={bookingModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Book Appointment</Text>
                        <Text style={styles.modalSub}>Doctor: {selectedDoctor?.full_name}</Text>

                        <Text style={styles.label}>Date & Time (YYYY-MM-DD HH:MM)</Text>
                        <TextInput
                            style={styles.input}
                            value={dateText}
                            onChangeText={setDateText}
                        />

                        <Text style={styles.label}>Notes for Doctor (Optional)</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            multiline
                            placeholder="Describe your concerns or goals..."
                            value={notesText}
                            onChangeText={setNotesText}
                        />

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleBookSubmit} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>Confirm Booking</Text>}
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8E8E8'
    },
    listContent: {
        padding: 16
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 12,
        marginTop: 8
    },
    doctorsScroll: {
        marginBottom: 20
    },
    docCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        width: 170,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    docAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#C2FFF0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
    },
    docName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0D1B2A',
        textAlign: 'center'
    },
    docSpec: {
        fontSize: 11,
        color: '#3D5A80',
        textAlign: 'center',
        marginBottom: 12
    },
    bookBtn: {
        backgroundColor: '#0E7C7B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center'
    },
    bookBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold'
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16
    },
    emptyText: {
        color: '#3D5A80',
        fontSize: 14
    },
    apptCard: {
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
    apptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    apptDocName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0D1B2A'
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8
    },
    statusConfirmed: {
        backgroundColor: '#D1FAE5'
    },
    statusPending: {
        backgroundColor: '#FEF3C7'
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#0D1B2A'
    },
    apptDate: {
        fontSize: 13,
        color: '#3D5A80',
        marginBottom: 4
    },
    apptNotes: {
        fontSize: 12,
        color: '#4A5568',
        fontStyle: 'italic'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 4
    },
    modalSub: {
        fontSize: 14,
        color: '#0E7C7B',
        fontWeight: '600',
        marginBottom: 16
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3D5A80',
        marginBottom: 4,
        marginTop: 8
    },
    input: {
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        padding: 10,
        fontSize: 14,
        color: '#0D1B2A'
    },
    modalBtnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#F0F4F8',
        alignItems: 'center'
    },
    cancelBtnText: {
        color: '#3D5A80',
        fontWeight: '600'
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#0E7C7B',
        alignItems: 'center'
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    }
});
