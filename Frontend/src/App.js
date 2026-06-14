import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import Roads from './pages/Roads';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import Spending from './pages/Spending';
import Predict from './pages/Predict';
import Complaints from './pages/Complaints';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Contact from './pages/Contact';

function Layout() {
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';

  if (isLogin) return (
    <Routes>
      <Route path="/login" element={<Login />} />
    </Routes>
  );

  return (
    <div className="min-h-screen bg-[#F5F9FF]">
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 lg:px-8 pt-24 pb-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/roads" element={<Roads />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/spending" element={<Spending />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: '#fff', color: '#1e293b', border: '1px solid #e0f2fe', boxShadow: '0 4px 20px rgba(59,130,246,0.1)' } }} />
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  );
}
