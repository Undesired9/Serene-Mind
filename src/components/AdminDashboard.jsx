import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  LogOut,
  X,
  AlertTriangle,
  FileClock,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import { API_BASE } from '../apiConfig';

const authFetch = async (path, options = {}) => {
  const token = localStorage.getItem('serene_token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const statusBadge = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

const StatCard = ({ icon, label, value, tone }) => (
  <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${tone}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-[#3D5A80]">{label}</p>
      <p className="text-2xl font-bold text-[#0D1B2A] mt-1">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('ALL');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [rejectDoctor, setRejectDoctor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const adminUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('serene_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('serene_token');
    localStorage.removeItem('serene_user');
    navigate('/admin-login', { replace: true });
  }, [navigate]);

  const fetchData = useCallback(async () => {
    try {
      const [statsResponse, docsResponse] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/doctors'),
      ]);

      if (statsResponse.status === 401 || statsResponse.status === 403) {
        handleUnauthorized();
        return;
      }
      if (docsResponse.status === 401 || docsResponse.status === 403) {
        handleUnauthorized();
        return;
      }

      const statsData = await statsResponse.json();
      const docsData = await docsResponse.json();

      if (!statsResponse.ok) {
        throw new Error(statsData.error || 'Failed to load statistics');
      }
      if (!docsResponse.ok) {
        throw new Error(docsData.error || 'Failed to load doctors');
      }

      setStats(statsData);
      setDoctors(Array.isArray(docsData) ? docsData : []);
      setError('');
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    const run = async () => {
      await fetchData();
    };
    run();
  }, [fetchData]);

  const pendingCount = useMemo(
    () => (Array.isArray(doctors) ? doctors.filter((d) => d.approval_status === 'PENDING').length : 0),
    [doctors]
  );

  const filteredDoctors = useMemo(() => {
    if (!Array.isArray(doctors)) return [];
    if (filter === 'ALL') return doctors;
    return doctors.filter((d) => d.approval_status === filter);
  }, [doctors, filter]);

  const handleLogout = () => {
    localStorage.removeItem('serene_token');
    localStorage.removeItem('serene_user');
    navigate('/admin-login', { replace: true });
  };

  const openDetail = (doctor) => {
    setActionError('');
    setSelectedDoctor(doctor);
  };

  const closeDetail = () => {
    setSelectedDoctor(null);
  };

  const handleApprove = async (doctor) => {
    setActionLoading(true);
    setActionError('');
    setRejectDoctor(null);

    try {
      const response = await authFetch(`/api/admin/doctors/${doctor.id}/approve`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve doctor');
      }

      await fetchData();
      if (selectedDoctor && selectedDoctor.id === doctor.id) {
        setSelectedDoctor(data.doctor || doctor);
      }
    } catch (approveError) {
      setActionError(approveError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = (doctor) => {
    setRejectDoctor(doctor);
    setRejectReason('');
    setRejectError('');
    setActionError('');
  };

  const closeReject = () => {
    setRejectDoctor(null);
    setRejectReason('');
    setRejectError('');
  };

  const submitReject = async (e) => {
    e.preventDefault();
    if (!rejectDoctor) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError('A reason is required to reject a doctor application.');
      return;
    }
    if (reason.length > 500) {
      setRejectError('Reason must be 500 characters or fewer.');
      return;
    }

    setRejectLoading(true);
    setRejectError('');

    try {
      const response = await authFetch(`/api/admin/doctors/${rejectDoctor.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject doctor');
      }

      await fetchData();
      closeReject();
      if (selectedDoctor && selectedDoctor.id === rejectDoctor.id) {
        setSelectedDoctor(null);
      }
    } catch (rejError) {
      setRejectError(rejError.message);
    } finally {
      setRejectLoading(false);
    }
  };

  const filterTabs = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[#0D1B2A] text-white rounded-3xl px-6 py-5 shadow-lg">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-[#C2FFF0]" size={26} /> Admin Panel
            </h1>
            <p className="text-[#C2FFF0]/70 text-sm mt-1">
              Manage doctor approvals and monitor platform activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-[#C2FFF0]/20 flex items-center justify-center font-bold text-[#C2FFF0]">
                {(adminUser?.fullName || adminUser?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{adminUser?.fullName || adminUser?.username || 'Admin'}</p>
                <p className="text-[10px] uppercase tracking-wider text-[#C2FFF0]/60">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500/90 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Stats Row */}
        {loading && !stats ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[#1B98E0]" />
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-700">{error}</div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={<Users className="text-[#0E7C7B]" />}
              label="Total Doctors"
              value={stats.totalDoctors ?? '—'}
              tone="bg-[#C2FFF0]/40 border-[#0E7C7B]/10 text-[#0E7C7B]"
            />
            <StatCard
              icon={<Clock className="text-amber-600" />}
              label="Pending Approvals"
              value={stats.pendingDoctors ?? '—'}
              tone="bg-amber-50 border-amber-100 text-amber-600"
            />
            <StatCard
              icon={<CheckCircle className="text-emerald-600" />}
              label="Approved"
              value={stats.approvedDoctors ?? '—'}
              tone="bg-emerald-50 border-emerald-100 text-emerald-600"
            />
            <StatCard
              icon={<XCircle className="text-red-600" />}
              label="Rejected"
              value={stats.rejectedDoctors ?? '—'}
              tone="bg-red-50 border-red-100 text-red-600"
            />
            <StatCard
              icon={<Users className="text-[#1B98E0]" />}
              label="Total Patients"
              value={stats.totalPatients ?? '—'}
              tone="bg-sky-50 border-sky-100 text-[#1B98E0]"
            />
            <StatCard
              icon={<AlertTriangle className="text-rose-600" />}
              label="At-Risk Patients"
              value={stats.atRiskPatients ?? '—'}
              tone="bg-rose-50 border-rose-100 text-rose-600"
            />
          </div>
        ) : null}

        {/* Doctors section */}
        <div className="bg-white/60 backdrop-blur-md border border-[#0E7C7B]/15 rounded-3xl p-4 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-[#0D1B2A] flex items-center gap-2">
                <FileClock className="text-[#0E7C7B]" size={20} /> Doctor Applications
              </h2>
              <p className="text-sm text-[#3D5A80]">{Array.isArray(doctors) ? doctors.length : 0} doctors registered</p>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    filter === tab.key
                      ? 'bg-[#0E7C7B] text-white shadow-sm'
                      : 'bg-white text-[#3D5A80] hover:bg-[#C2FFF0]/30'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'PENDING' && pendingCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        filter === tab.key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Loading / error / table */}
          {loading && !stats ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="w-8 h-8 border-t-2 border-[#1B98E0] animate-spin rounded-full"></div>
            </div>
          ) : error ? (
            <div className="rounded-3xl bg-rose-50 border border-rose-100 p-10 text-center">
              <p className="text-rose-700 mb-4">{error}</p>
              <button
                onClick={fetchData}
                className="px-5 py-2.5 rounded-xl bg-[#0E7C7B] text-white text-sm font-semibold hover:bg-[#0A5E5D] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="border border-dashed border-[#0E7C7B]/20 rounded-3xl p-10 text-center text-[#3D5A80]">
              {filter === 'PENDING' ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="text-emerald-500" size={36} />
                  <p className="text-base font-semibold">No pending approvals — all caught up!</p>
                  <p className="text-sm">New doctor registrations will appear here.</p>
                </div>
              ) : (
                'No doctors found.'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#3D5A80] uppercase bg-[#C2FFF0]/20 rounded-t-xl">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-xl">Full name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Specialization</th>
                    <th className="px-4 py-3">License #</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 rounded-tr-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((doctor) => (
                    <tr key={doctor.id} className="border-b border-[#0E7C7B]/10 last:border-0 hover:bg-[#C2FFF0]/10">
                      <td className="px-4 py-3 font-semibold text-[#0D1B2A] whitespace-nowrap">
                        {doctor.full_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#3D5A80] break-all">{doctor.email || '—'}</td>
                      <td className="px-4 py-3 text-[#3D5A80]">{doctor.specialization || '—'}</td>
                      <td className="px-4 py-3 text-[#3D5A80]">{doctor.license_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                            statusBadge[doctor.approval_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {doctor.approval_status || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#3D5A80] whitespace-nowrap">
                        {formatDate(doctor.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetail(doctor)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0E7C7B]/10 text-[#0E7C7B] hover:bg-[#0E7C7B]/20 transition-colors"
                          >
                            <Eye size={14} /> View
                          </button>
                          {doctor.approval_status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(doctor)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                              >
                                <BadgeCheck size={14} /> Approve
                              </button>
                              <button
                                onClick={() => openReject(doctor)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {actionError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
              {actionError}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDoctor && (
        <div
          className="fixed inset-0 bg-[#0D1B2A]/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-[#E8E8E8] border border-[#0E7C7B]/15 w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#0E7C7B]/15 flex items-center justify-between bg-[#C2FFF0]/30">
              <h2 className="text-xl font-bold text-[#0D1B2A] flex items-center gap-2">
                <Eye className="text-[#0E7C7B]" size={22} /> Doctor details
              </h2>
              <button
                onClick={closeDetail}
                className="p-2 rounded-full hover:bg-[#0E7C7B]/10 text-[#3D5A80] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#C2FFF0]/50 text-[#0E7C7B] border border-[#0E7C7B]/20 flex items-center justify-center text-xl font-bold shrink-0">
                  {(selectedDoctor.full_name || 'D').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#0D1B2A]">
                    {selectedDoctor.full_name || '—'}
                  </h3>
                  <p className="text-sm text-[#3D5A80]">@{selectedDoctor.username || '—'}</p>
                </div>
                <span
                  className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border self-start ${
                    statusBadge[selectedDoctor.approval_status] || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {selectedDoctor.approval_status || '—'}
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-[#0E7C7B]/10 p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-[#3D5A80] mb-1">Email</span>
                    <span className="font-medium text-[#0D1B2A] break-all">{selectedDoctor.email || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[#3D5A80] mb-1">Specialization</span>
                    <span className="font-medium text-[#0D1B2A]">{selectedDoctor.specialization || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[#3D5A80] mb-1">License number</span>
                    <span className="font-medium text-[#0D1B2A]">{selectedDoctor.license_number || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[#3D5A80] mb-1">Username</span>
                    <span className="font-medium text-[#0D1B2A]">@{selectedDoctor.username || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[#3D5A80] mb-1">Registered at</span>
                    <span className="font-medium text-[#0D1B2A]">{formatDateTime(selectedDoctor.created_at)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-[#3D5A80] mb-1">Reviewed at</span>
                    <span className="font-medium text-[#0D1B2A]">
                      {selectedDoctor.reviewed_at ? formatDateTime(selectedDoctor.reviewed_at) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-[#3D5A80] mb-1">Reviewer ID</span>
                    <span className="font-medium text-[#0D1B2A]">
                      {selectedDoctor.reviewed_by != null
                        ? String(selectedDoctor.reviewed_by)
                        : selectedDoctor.reviewer_id != null
                        ? String(selectedDoctor.reviewer_id)
                        : '—'}
                    </span>
                  </div>
                </div>

                {selectedDoctor.rejection_reason && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <span className="block text-xs text-red-700 font-bold uppercase tracking-wider mb-1">
                      Rejection reason
                    </span>
                    <p className="text-sm text-red-800">{selectedDoctor.rejection_reason}</p>
                  </div>
                )}
              </div>

              {selectedDoctor.approval_status === 'PENDING' && (
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => openReject(selectedDoctor)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedDoctor)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    <BadgeCheck size={16} /> Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectDoctor && (
        <div
          className="fixed inset-0 bg-[#0D1B2A]/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={closeReject}
        >
          <div
            className="bg-[#E8E8E8] border border-[#0E7C7B]/15 w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#0E7C7B]/15 flex items-center justify-between bg-red-50">
              <h2 className="text-lg font-bold text-[#0D1B2A] flex items-center gap-2">
                <XCircle className="text-red-500" size={20} /> Reject application
              </h2>
              <button
                onClick={closeReject}
                className="p-2 rounded-full hover:bg-[#0E7C7B]/10 text-[#3D5A80] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitReject} className="p-6 space-y-4">
              <p className="text-sm text-[#3D5A80]">
                Rejecting <span className="font-semibold text-[#0D1B2A]">{rejectDoctor.full_name || rejectDoctor.username}</span>.
                A reason is required and will be shared with the applicant.
              </p>

              <div>
                <label className="block text-xs text-[#3D5A80] font-semibold uppercase tracking-wider mb-1">
                  Rejection reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError('');
                  }}
                  maxLength={500}
                  rows={4}
                  placeholder="Explain why this application is being rejected…"
                  className="w-full rounded-xl border border-[#0E7C7B]/15 bg-white px-4 py-3 outline-none focus:border-[#1B98E0] text-sm text-[#0D1B2A] resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-red-500">{rejectError}</p>
                  <p className="text-xs text-[#3D5A80]">{rejectReason.length}/500</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeReject}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-[#3D5A80] hover:bg-[#C2FFF0]/30 transition-colors border border-[#0E7C7B]/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {rejectLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  {rejectLoading ? 'Rejecting…' : 'Reject application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
