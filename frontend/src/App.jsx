import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Assessment from './components/Assessment';
import LandingPage from './components/landing/LandingPage';
import DoctorDashboard from './components/DoctorDashboard';

// A protective wrapper that also enforces the Assessment requirement
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('serene_token');
  const userStr = localStorage.getItem('serene_user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);
  
  // Intercept and force assessment
  if (user.needsAssessment) {
    return <Navigate to="/assessment" replace />;
  }

  return children;
};

// Assessment Wrapper to prevent re-taking
const AssessmentRoute = ({ children }) => {
  const token = localStorage.getItem('serene_token');
  const userStr = localStorage.getItem('serene_user');
  
  if (!token || !userStr) return <Navigate to="/login" replace />;
  
  const user = JSON.parse(userStr);
  if (!user.needsAssessment) {
      return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Layout component wrapping the Sidebar
const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#E8E8E8] text-[#0D1B2A] font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full h-full">
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
          <ProtectedRoute>
            <MainLayout><DoctorDashboard /></MainLayout>
          </ProtectedRoute>
        } />

        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
