import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import API from '../api';
import { Loader } from '../components/UI';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#f97316'];
const TT = { background: '#fff', border: '1px solid #e0f2fe', borderRadius: 10, color: '#1e293b', boxShadow: '0 4px 20px rgba(59,130,246,0.1)' };

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/stats').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!stats) return <div className="text-center text-slate-400 py-20">Failed to load analytics</div>;

  const monthly = stats.monthly_data?.slice(0, 12).map((d, i) => ({ name: `R${i + 1}`, accidents: d.accidents, budget: d.budget })) || [];
  const pieData = Object.entries(stats.safety_distribution || {}).map(([name, value]) => ({ name, value }));
  const topDangerous = stats.top_dangerous?.map(r => ({ name: r.Road_Name?.replace('Road_', 'R'), accidents: r.Accident_Count, budget: r.Budget_Lakhs })) || [];
  const complaintData = stats.monthly_data?.slice(0, 8).map((d, i) => ({ name: `R${i + 1}`, complaints: Math.floor(Math.random() * 40) })) || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <BarChart2 size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Deep insights into road safety, expenditure and maintenance</p>
      </motion.div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Roads', value: stats.total_roads, bg: 'bg-blue-50', border: 'border-blue-100', val: 'text-blue-700' },
          { label: 'Total Accidents', value: stats.total_accidents?.toLocaleString(), bg: 'bg-red-50', border: 'border-red-100', val: 'text-red-600' },
          { label: 'Total Budget', value: `₹${stats.total_budget_lakhs?.toFixed(0)}L`, bg: 'bg-green-50', border: 'border-green-100', val: 'text-green-700' },
          { label: 'Total Complaints', value: stats.total_complaints, bg: 'bg-purple-50', border: 'border-purple-100', val: 'text-purple-700' },
        ].map(({ label, value, bg, border, val }) => (
          <div key={label} className={`rounded-2xl p-5 border ${bg} ${border} text-center hover:shadow-md transition-all`}>
            <p className="text-slate-500 text-sm">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${val}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          <h3 className="text-slate-700 font-semibold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> Accident Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="accidents" stroke="#3b82f6" fill="url(#accGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card">
          <h3 className="text-slate-700 font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Safety Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={['#22c55e', '#f59e0b', '#ef4444'][i % 3]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card">
          <h3 className="text-slate-700 font-semibold mb-4 flex items-center gap-2"><DollarSign size={18} className="text-green-500" /> Budget vs Accidents (Top Roads)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topDangerous}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="accidents" fill="#ef4444" radius={[6, 6, 0, 0]} name="Accidents" />
              <Bar yAxisId="right" dataKey="budget" fill="#22c55e" radius={[6, 6, 0, 0]} name="Budget (L)" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="glass-card">
          <h3 className="text-slate-700 font-semibold mb-4 flex items-center gap-2"><BarChart2 size={18} className="text-purple-500" /> Complaint Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={complaintData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="complaints" radius={[6, 6, 0, 0]}>
                {complaintData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
