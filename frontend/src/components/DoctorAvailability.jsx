
import React, { useState } from 'react';

const DoctorAvailability = () => {
  const [availability, setAvailability] = useState([]);
  const [newSlot, setNewSlot] = useState({ start: '', end: '' });

  const handleAddSlot = (e) => {
    e.preventDefault();
    setAvailability([...availability, { id: Date.now(), ...newSlot }]);
    setNewSlot({ start: '', end: '' });
  };

  return (
    <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0D1B2A] mb-6">Manage Availability</h2>
      
      <form onSubmit={handleAddSlot} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#3D5A80] uppercase mb-2">Start Time</label>
            <input
              type="datetime-local"
              value={newSlot.start}
              onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })}
              className="w-full rounded-xl border border-[#0E7C7B]/15 bg-[#E8E8E8]/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B98E0]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3D5A80] uppercase mb-2">End Time</label>
            <input
              type="datetime-local"
              value={newSlot.end}
              onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })}
              className="w-full rounded-xl border border-[#0E7C7B]/15 bg-[#E8E8E8]/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B98E0]"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-[#0E7C7B] hover:bg-[#0A5E5D] text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Add Availability Slot
        </button>
      </form>

      {availability.length === 0 ? (
        <p className="text-[#3D5A80] text-center py-10">No availability slots set yet.</p>
      ) : (
        <div className="space-y-3">
          {availability.map((slot) => (
            <div key={slot.id} className="bg-[#C2FFF0]/30 rounded-2xl p-4 border border-[#0E7C7B]/15 flex items-center justify-between">
              <div>
                <p className="font-medium text-[#0D1B2A]">
                  {new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setAvailability(availability.filter(s => s.id !== slot.id))}
                className="text-rose-600 hover:text-rose-700 text-sm font-semibold"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorAvailability;
