import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Assessment from './components/Assessment';
import PatientIntake from './components/PatientIntake';
import LandingPage from './components/landing/LandingPage';
import DoctorDashboard from './components/DoctorDashboard';
import DoctorLogin from './components/DoctorLogin';
import PatientAppointments from './components/PatientAppointments';

const parseUser = () => {
  try {
    const userStr = localStorage.getItem('serene_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    localStorage.removeItem('serene_user');
    localStorage.removeItem('serene_token');
    return null;
  }
};

// A protective wrapper that also enforces the Assessment requirement
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('serene_token');
  const user = parseUser();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'doctor') {
    return <Navigate to="/doctor" replace />;
  }

  if (user.needsIntake) {
    return <Navigate to="/intake" replace />;
  }
  
  // Intercept and force assessment
  if (user.needsAssessment) {
    return <Navigate to="/assessment" replace />;
  }

  return children;
};

// Assessment Wrapper to prevent re-taking
const AssessmentRoute = ({ children }) => {
  const token = localStorage.getItem('serene_token');
  const user = parseUser();
  
  if (!token || !user) return <Navigate to="/login" replace />;
  
  if (user.role === 'doctor') {
      return <Navigate to="/doctor" replace />;
  }
  if (user.needsIntake) {
      return <Navigate to="/intake" replace />;
  }
  if (!user.needsAssessment) {
      return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const IntakeRoute = ({ children }) => {
  const token = localStorage.getItem('serene_token');
  const user = parseUser();

  if (!token || !user) return <Navigate to="/login" replace />;

  if (user.role === 'doctor') {
      return <Navigate to="/doctor" replace />;
  }
  if (!user.needsIntake) {
      return <Navigate to={user.needsAssessment ? '/assessment' : '/dashboard'} replace />;
  }
  return children;
};

// Route wrapper for doctor access
const DoctorRoute = ({ children }) => {
  const token = localStorage.getItem('serene_token');
  const user = parseUser();
  
  if (!token || !user) return <Navigate to="/login" replace />;
  
  if (user.role !== 'doctor') {
      return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Layout component wrapping the Sidebar
const MainLayout = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#E8E8E8] text-[#0D1B2A] font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full h-full overflow-y-auto pb-16 md:pb-0">
        {/* Phase 0 Emergency Crisis Bar */}
        <div className="bg-[#0D1B2A] text-white px-4 py-1.5 text-xs flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
            <span className="bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">24/7 CRISIS</span>
            <span className="text-gray-200">If you are in immediate distress, call or text the Suicide & Crisis Lifeline at <strong className="text-[#C2FFF0]">988</strong></span>
          </div>
          <span className="hidden md:inline text-gray-400 text-[11px]">Non-Diagnostic AI Support</span>
        </div>
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/doctor-login" element={<DoctorLogin />} />

        <Route path="/intake" element={
          <IntakeRoute><PatientIntake /></IntakeRoute>
        } />
        
        {/* Assessment Route */}
        <Route path="/assessment" element={
          <AssessmentRoute><Assessment /></AssessmentRoute>
        } />
        
        {/* Authenticated Layout */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <MainLayout><ChatInterface /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout><Dashboard /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/appointments" element={
          <ProtectedRoute>
            <MainLayout><PatientAppointments /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <MainLayout><Reports /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <MainLayout><Settings /></MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/doctor" element={
          <DoctorRoute>
            <MainLayout><DoctorDashboard /></MainLayout>
          </DoctorRoute>
        } />

        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* 404 Catch-all */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center h-screen bg-[#E8E8E8] text-[#0D1B2A]">
            <h1 className="text-6xl font-bold mb-4">404</h1>
            <p className="text-xl mb-8">Page not found</p>
            <a href="/" className="px-6 py-3 bg-[#0E7C7B] text-white rounded-xl hover:bg-[#0C6B6A] transition">Go Home</a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
