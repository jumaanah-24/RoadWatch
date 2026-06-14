import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, LayoutDashboard, MessageSquare, Map, AlertTriangle,
  FileText, BarChart2, Shield, LogOut, Menu, X, ChevronDown,
  Phone, LogIn, DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const mainNav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chatbot', label: 'AI Chatbot', icon: MessageSquare },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/complaints', label: 'Complaints', icon: FileText },
  { path: '/contact', label: 'Contact', icon: Phone },
];

const moreNav = [
  { path: '/roads', label: 'Road Details', icon: Map },
  { path: '/map', label: 'Live Map', icon: Activity },
  { path: '/spending', label: 'Budget Tracker', icon: DollarSign },
  { path: '/predict', label: 'Risk Predictor', icon: AlertTriangle },
  { path: '/admin', label: 'Admin Panel', icon: Shield },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setMobileOpen(false); };
  const isActive = (path) => pathname === path;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200">
                <Activity size={18} className="text-white" />
              </div>
              <span className="font-bold text-slate-800 text-base">RoadWatch AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {mainNav.map(({ path, label }) => (
                <Link key={path} to={path}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(path)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}>
                  {label}
                  {isActive(path) && (
                    <motion.div layoutId="navUnderline"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </Link>
              ))}

              {/* More dropdown */}
              <div className="relative">
                <button onClick={() => setMoreOpen(o => !o)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    moreNav.some(n => isActive(n.path))
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}>
                  More <ChevronDown size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl border border-blue-100 shadow-xl shadow-blue-100/50 py-2 z-50">
                      {moreNav.map(({ path, label, icon: Icon }) => (
                        <Link key={path} to={path} onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            isActive(path) ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}>
                          <Icon size={16} /> {label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right side */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{user.name}</span>
                    <span className="text-xs text-slate-400 capitalize bg-white px-1.5 py-0.5 rounded-md border border-blue-100">{user.role}</span>
                  </div>
                  <button onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 border border-blue-100 transition-all">
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
                  <LogIn size={15} /> Sign In
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 rounded-xl border border-blue-100 text-slate-600 hover:bg-blue-50 transition-colors">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-blue-100 shadow-lg lg:hidden">
            <div className="px-4 py-3 space-y-1">
              {[...mainNav, ...moreNav].map(({ path, label, icon: Icon }) => (
                <Link key={path} to={path} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(path) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}>
                  <Icon size={17} /> {label}
                </Link>
              ))}
              <div className="pt-2 border-t border-blue-50">
                {user ? (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{user.name}</span>
                    </div>
                    <button onClick={handleLogout} className="text-sm text-red-500 flex items-center gap-1">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-center text-sm block py-3">
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close dropdown */}
      {(moreOpen || mobileOpen) && (
        <div className="fixed inset-0 z-30" onClick={() => { setMoreOpen(false); setMobileOpen(false); }} />
      )}
    </>
  );
}
