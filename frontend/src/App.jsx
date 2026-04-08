import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import LandingPage from './components/landing/LandingPage';

// A simple protective wrapper for authenticated routes
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('serene_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Layout component wrapping the Sidebar
const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-serene-dark text-serene-text font-sans overflow-hidden">
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

        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
