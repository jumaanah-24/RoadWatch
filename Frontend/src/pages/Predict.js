import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Search } from 'lucide-react';
import API from '../api';
import { Loader, RiskBadge } from '../components/UI';

export default function Predict() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [single, setSingle] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);

  useEffect(() => {
    API.get('/predict/all').then(r => { setPredictions(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const searchRoad = async () => {
    if (!search.trim()) return;
    setSingleLoading(true);
    try {
      const { data } = await API.get(`/predict/road/${encodeURIComponent(search)}`);
      setSingle(data);
    } catch { setSingle({ error: 'Road not found' }); }
    setSingleLoading(false);
  };

  const urgencyColor = { Low: 'text-green-600', Medium: 'text-amber-600', High: 'text-orange-600', Critical: 'text-red-600' };
  const urgencyBg = { Low: 'bg-green-50 border-green-100', Medium: 'bg-amber-50 border-amber-100', High: 'bg-orange-50 border-orange-100', Critical: 'bg-red-50 border-red-100' };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <TrendingUp size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Risk Predictor</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">AI-powered road risk prediction using Random Forest ML model</p>
      </motion.div>

      {/* Single Road Search */}
      <div className="glass-card">
        <h3 className="text-slate-700 font-semibold mb-3">Predict Risk for Specific Road</h3>
        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchRoad()}
            placeholder="Enter road name (e.g. Road_5)" className="input-field flex-1" />
          <button onClick={searchRoad} disabled={singleLoading} className="btn-primary px-4 flex items-center gap-2">
            <Search size={16} /> Predict
          </button>
        </div>
        {single && !single.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Road', value: single.road_name, cls: 'text-slate-700' },
              { label: 'Risk %', value: `${single.risk_percentage}%`, cls: single.risk_percentage > 70 ? 'text-red-600' : single.risk_percentage > 40 ? 'text-amber-600' : 'text-green-600' },
              { label: 'Urgency', value: single.maintenance_urgency, cls: urgencyColor[single.maintenance_urgency] },
              { label: 'Accidents', value: single.accident_count, cls: 'text-slate-700' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-slate-400 text-xs">{label}</p>
                <p className={`font-bold text-lg ${cls}`}>{value}</p>
              </div>
            ))}
          </motion.div>
        )}
        {single?.error && <p className="text-red-500 mt-3 text-sm">{single.error}</p>}
      </div>

      {loading ? <Loader /> : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-blue-50 flex items-center gap-2 bg-blue-50/50">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-slate-700 font-semibold">Top 20 High-Risk Roads</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-50 text-slate-500 text-xs uppercase bg-blue-50/30">
                  {['#', 'Road', 'District', 'Risk %', 'Urgency', 'Accidents', 'Complaints'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr key={i} className="border-b border-blue-50 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{p.road_name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.district}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-20">
                          <div className="h-1.5 rounded-full" style={{ width: `${p.risk_percentage}%`, background: p.risk_percentage > 70 ? '#ef4444' : p.risk_percentage > 40 ? '#f59e0b' : '#22c55e' }} />
                        </div>
                        <span className={`font-bold text-xs ${urgencyColor[p.maintenance_urgency]}`}>{p.risk_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RiskBadge level={p.maintenance_urgency} /></td>
                    <td className="px-4 py-3 text-slate-600">{p.accident_count?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{p.complaints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
