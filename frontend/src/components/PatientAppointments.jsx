
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000';

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('serene_token');
        const response = await fetch(`${API_BASE}/api/appointments/my-appointments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAppointments(data);
        }
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const getTierColor = (tier) => {
    switch (tier) {
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'ELEVATED': return 'bg-amber-100 text-amber-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-700';
      case 'NO_SHOW': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-[#3D5A80]">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#0D1B2A] mb-6">My Appointments</h1>
        
        {appointments.length === 0 ? (
          <div className="bg-white/80 rounded-2xl border border-[#0E7C7B]/15 p-10 text-center">
            <p className="text-[#3D5A80] text-lg">You don't have any upcoming appointments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => (
              <div key={appt.id} className="bg-white rounded-2xl border border-[#0E7C7B]/15 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-[#0D1B2A]">
                        With {appt.doctor_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTierColor(appt.risk_tier)}`}>
                        {appt.risk_tier}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                    </div>
                    
                    <p className="text-[#3D5A80] flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(appt.appointment_datetime).toLocaleString()}
                    </p>
                    
                    {appt.notes && (
                      <p className="text-[#3D5A80] mt-2 text-sm">
                        Notes: {appt.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAppointments;
