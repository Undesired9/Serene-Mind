import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const BookingModal = ({ isOpen, onClose, onBooked }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchDoctors();
        }
    }, [isOpen]);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch(`${API_BASE}/api/appointments/doctors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDoctors(data);
            }
        } catch (error) {
            console.error('Failed to fetch doctors:', error);
        }
    };

    const fetchAvailability = async (doctorId) => {
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch(`${API_BASE}/api/appointments/doctors/${doctorId}/availability`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableSlots(data);
            }
        } catch (error) {
            console.error('Failed to fetch availability:', error);
        }
    };

    const handleDoctorSelect = (doctor) => {
        setSelectedDoctor(doctor);
        setSelectedSlot(null);
        fetchAvailability(doctor.id);
    };

    const handleBook = async () => {
        if (!selectedDoctor || !selectedSlot) return;
        
        setLoading(true);
        try {
            const token = localStorage.getItem('serene_token');
            const response = await fetch(`${API_BASE}/api/appointments/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctorId: selectedDoctor.id,
                    appointmentDatetime: selectedSlot.start_datetime,
                    notes
                })
            });
            
            if (response.ok) {
                setBookingSuccess(true);
                setTimeout(() => {
                    onBooked();
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to book appointment:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="text-emerald-600" />
                        Book a Session
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {bookingSuccess ? (
                        <div className="text-center py-12">
                            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Appointment Booked!</h3>
                            <p className="text-gray-600">Your session has been scheduled. Redirecting you back...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Select Doctor */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Select a Doctor</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {doctors.map(doctor => (
                                        <button
                                            key={doctor.id}
                                            onClick={() => handleDoctorSelect(doctor)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                selectedDoctor?.id === doctor.id
                                                    ? 'border-emerald-500 bg-emerald-50'
                                                    : 'border-gray-200 hover:border-emerald-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <User className="text-emerald-600" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{doctor.full_name}</p>
                                                    {doctor.specialization && (
                                                        <p className="text-xs text-gray-500">{doctor.specialization}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Select Time Slot */}
                            {selectedDoctor && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Select a Time</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {availableSlots.map((slot, index) => {
                                            const date = new Date(slot.start_datetime);
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                                                        selectedSlot?.start_datetime === slot.start_datetime
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : 'border-gray-200 hover:border-emerald-200'
                                                    }`}
                                                >
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                                                        <Clock size={12} />
                                                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedSlot && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Any specific concerns you'd like to mention..."
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            )}

                            {/* Book Button */}
                            {selectedSlot && (
                                <button
                                    onClick={handleBook}
                                    disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                                >
                                    {loading ? 'Booking...' : 'Confirm Booking'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingModal;