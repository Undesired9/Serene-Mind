import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Filter, Download, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
             try {
                 const token = localStorage.getItem('serene_token');
                 const response = await fetch('http://localhost:5000/api/dashboard/reports', {
                     headers: { 'Authorization': `Bearer ${token}` }
                 });
                 if (response.ok) {
                     setReports(await response.json());
                 }
             } catch (error) {
                 console.error("Failed to fetch reports:", error);
             } finally {
                 setLoading(false);
             }
        };
        fetchReports();
    }, []);

    return (
        <div className="flex-1 overflow-y-auto w-full p-4 lg:p-10 scroll-smooth relative z-10 flex flex-col items-center">
            <div className="w-full max-w-5xl">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link to="/dashboard" className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800 bg-slate-200/50">
                                <ArrowLeft size={20} />
                            </Link>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Your Reports</h1>
                        </div>
                        <p className="text-slate-600 pl-14">View and manage your wellness insights and therapist feedbacks.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-200/60 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors font-medium text-sm border border-slate-300">
                            <Filter size={16} /> Filter
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-serene-accent hover:bg-opacity-90 text-white rounded-xl transition-colors font-medium text-sm shadow-md">
                            <Download size={16} /> Export All
                        </button>
                    </div>
                </header>

                <div className="bg-slate-200/30 backdrop-blur-md rounded-3xl border border-slate-300 p-3 mb-10 shadow-sm">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 border-b border-slate-300/50">
                        <Bell size={20} className="text-amber-500" />
                        <h2 className="text-lg font-semibold text-slate-700">Recent Notifications</h2>
                        <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                            {reports.filter(r => r.unread).length} Unread
                        </span>
                    </div>

                    <div className="space-y-3">
                        {reports.map((report) => (
                            <div key={report.id} className="bg-white/60 hover:bg-white/90 backdrop-blur-sm border border-slate-200/80 hover:border-slate-300 group flex flex-col sm:flex-row items-start gap-5 p-5 rounded-2xl transition duration-300 cursor-pointer shadow-sm hover:shadow-md">
                                <div className={`p-4 rounded-xl flex-shrink-0 transition-colors ${report.unread ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    <FileText size={24} className="group-hover:scale-110 transition-transform duration-300" />
                                </div>
                                <div className="flex-1 w-full pt-1">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                                        <h3 className={`text-lg font-bold ${report.unread ? 'text-slate-800' : 'text-slate-600'}`}>{report.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-slate-400 whitespace-nowrap">{report.date}</span>
                                            {report.unread && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse"></span>}
                                        </div>
                                    </div>
                                    <p className="text-slate-500 group-hover:text-slate-700 transition-colors leading-relaxed">{report.description}</p>
                                    
                                    <div className="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:flex">
                                        <button className="text-xs font-semibold text-serene-accent hover:underline">View Details</button>
                                        {!report.unread && <button className="text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline">Archive</button>}
                                        {report.unread && <button className="text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline">Mark as Read</button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
