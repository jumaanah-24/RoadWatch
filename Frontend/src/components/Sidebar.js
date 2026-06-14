import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, MessageSquare, Map, AlertTriangle, FileText, BarChart2, Shield, LogOut, Menu, X, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', icon: MessageSquare, label: 'AI Chatbot' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/roads', icon: Map, label: 'Road Details' },
  { path: '/map', icon: Activity, label: 'Live Map' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/predict', icon: AlertTriangle, label: 'Risk Predictor' },
  { path: '/complaints', icon: FileText, label: 'Complaints' },
  { path: '/admin', icon: Shield, label: 'Admin Panel' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 lg:hidden bg-white border border-blue-100 shadow-md p-2 rounded-xl text-slate-600">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -280 }}
        className="fixed left-0 top-0 h-full w-64 z-40 lg:translate-x-0 lg:static lg:block bg-white border-r border-blue-50 shadow-sm"
      >
        {/* Logo */}
        <div className="p-6 border-b border-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm">RoadWatch AI</h1>
              <p className="text-xs text-slate-400">Road Transparency</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-4 flex flex-col gap-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = pathname === path;
            return (
              <Link key={path} to={path} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                }`}>
                <Icon size={18} />
                {label}
                {active && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-50 bg-white">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary w-full text-center text-sm block">Sign In</Link>
          )}
        </div>
      </motion.aside>

      {open && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
