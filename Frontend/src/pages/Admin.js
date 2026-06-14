import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/complaints').then(r => { setComplaints(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    await API.put(`/complaints/${id}`, { status });
    setComplaints(prev => prev.map(c => c._id === id ? { ...c, status } : c));
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Shield size={36} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Admin Access Required</h2>
        <p className="text-slate-400">Please login with an admin account to access this panel.</p>
      </div>
    );
  }

  const counts = { Pending: 0, Resolved: 0, Rejected: 0 };
  complaints.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Shield size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Manage complaints and road data</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {[
          ['Pending', counts.Pending, 'bg-amber-50 border-amber-100', 'text-amber-600', <Clock size={20} className="text-amber-500" />],
          ['Resolved', counts.Resolved, 'bg-green-50 border-green-100', 'text-green-600', <CheckCircle size={20} className="text-green-500" />],
          ['Rejected', counts.Rejected, 'bg-red-50 border-red-100', 'text-red-600', <XCircle size={20} className="text-red-500" />],
        ].map(([label, val, bg, tc, icon]) => (
          <div key={label} className={`rounded-2xl p-5 border ${bg} text-center hover:shadow-md transition-all`}>
            <div className="flex justify-center mb-2">{icon}</div>
            <p className="text-slate-500 text-sm">{label}</p>
            <p className={`text-3xl font-bold ${tc}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-blue-50 bg-blue-50/50">
          <h3 className="text-slate-700 font-semibold">All Complaints</h3>
        </div>
        {loading ? (
          <div className="text-center text-slate-400 py-10">Loading...</div>
        ) : complaints.length === 0 ? (
          <div className="text-center text-slate-400 py-10">No complaints yet</div>
        ) : (
          <div className="divide-y divide-blue-50">
            {complaints.map((c, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4 hover:bg-blue-50/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 font-semibold">{c.road_name}</p>
                  <p className="text-slate-500 text-sm">{c.category} — {c.description?.slice(0, 60)}...</p>
                  <p className="text-slate-400 text-xs mt-0.5">{c.reporter_name} · {c.reporter_email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === 'Resolved' ? 'bg-green-100 text-green-700' : c.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.status || 'Pending'}
                  </span>
                  {c.status !== 'Resolved' && (
                    <button onClick={() => updateStatus(c._id, 'Resolved')} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  {c.status !== 'Rejected' && (
                    <button onClick={() => updateStatus(c._id, 'Rejected')} className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
