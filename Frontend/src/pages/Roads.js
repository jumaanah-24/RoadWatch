import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Map, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../api';
import { SafetyBadge, RiskBadge, Loader } from '../components/UI';

function RoadDetailModal({ road, onClose }) {
  if (!road) return null;
  const fields = [
    ['Road Name', road.Road_Name], ['District', road.District], ['Area', road.Area],
    ['Road Type', road.Road_Type], ['Accident Count', road.Accident_Count?.toLocaleString()],
    ['Safety Rating', road.Safety_Rating], ['Risk Level', road.Risk_Level],
    ['Last Repair Date', road.Last_Maintenance_Date], ['Maintenance Status', road.Maintenance_Status],
    ['Budget Allocated', road.Budget_Lakhs ? `₹${road.Budget_Lakhs} Lakhs` : 'N/A'],
    ['Contractor', road.Contractor], ['Citizen Complaints', road.Citizen_Complaints],
  ];
  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-blue-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">{road.Road_Name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([k, v]) => (
            <div key={k} className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-slate-400 text-xs mb-1">{k}</p>
              <p className="text-slate-700 font-semibold text-sm">{String(v ?? 'N/A')}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function Roads() {
  const [roads, setRoads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ safety_rating: '', maintenance_status: '', min_accidents: '', max_accidents: '' });
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const fetchRoads = async (p = 1) => {
    setLoading(true);
    const params = { page: p, limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
    const { data } = await API.get('/roads', { params });
    setRoads(data.roads); setTotal(data.total); setPages(data.pages); setPage(p);
    setLoading(false);
  };

  useEffect(() => { fetchRoads(); }, []);

  const handleSearch = async () => {
    if (!search.trim()) { setSearchResults(null); return; }
    const { data } = await API.get('/roads/search', { params: { q: search } });
    setSearchResults(data);
  };

  const displayRoads = searchResults || roads;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Map size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Road Details</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Browse and filter all roads — {total} total</p>
      </motion.div>

      {/* Search & Filters */}
      <div className="glass-card space-y-4">
        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search road name..." className="input-field flex-1" />
          <button onClick={handleSearch} className="btn-primary px-4"><Search size={18} /></button>
          {searchResults && <button onClick={() => { setSearchResults(null); setSearch(''); }} className="btn-ghost px-4">Clear</button>}
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={filters.safety_rating} onChange={e => setFilters(f => ({ ...f, safety_rating: e.target.value }))} className="input-field w-40">
            <option value="">All Safety</option>
            <option value="Good">Good</option>
            <option value="Moderate">Moderate</option>
            <option value="Dangerous">Dangerous</option>
          </select>
          <select value={filters.maintenance_status} onChange={e => setFilters(f => ({ ...f, maintenance_status: e.target.value }))} className="input-field w-44">
            <option value="">All Maintenance</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
          <input type="number" placeholder="Min accidents" value={filters.min_accidents}
            onChange={e => setFilters(f => ({ ...f, min_accidents: e.target.value }))} className="input-field w-36" />
          <input type="number" placeholder="Max accidents" value={filters.max_accidents}
            onChange={e => setFilters(f => ({ ...f, max_accidents: e.target.value }))} className="input-field w-36" />
          <button onClick={() => fetchRoads(1)} className="btn-primary flex items-center gap-2"><Filter size={16} /> Apply</button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-100 text-slate-500 text-xs uppercase">
                  {['Road Name', 'District', 'Accidents', 'Safety', 'Last Repair', 'Maintenance', 'Budget (L)', 'Complaints', 'Risk'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRoads.map((road, i) => (
                  <tr key={i} onClick={() => setSelected(road)}
                    className="border-b border-blue-50 hover:bg-blue-50/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-slate-700 font-semibold">{road.Road_Name}</td>
                    <td className="px-4 py-3 text-slate-500">{road.District}</td>
                    <td className="px-4 py-3 text-slate-600">{road.Accident_Count?.toLocaleString()}</td>
                    <td className="px-4 py-3"><SafetyBadge rating={road.Safety_Rating} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{road.Last_Maintenance_Date || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${road.Maintenance_Status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {road.Maintenance_Status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">₹{road.Budget_Lakhs}</td>
                    <td className="px-4 py-3 text-slate-600">{road.Citizen_Complaints}</td>
                    <td className="px-4 py-3"><RiskBadge level={road.Risk_Level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!searchResults && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-blue-50 bg-blue-50/30">
              <span className="text-slate-400 text-sm">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => fetchRoads(page - 1)} disabled={page <= 1} className="btn-ghost px-3 py-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
                <button onClick={() => fetchRoads(page + 1)} disabled={page >= pages} className="btn-ghost px-3 py-2 disabled:opacity-40"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </motion.div>
      )}
      {selected && <RoadDetailModal road={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
