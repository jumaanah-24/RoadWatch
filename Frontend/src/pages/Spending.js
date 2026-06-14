import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, AlertTriangle, CheckCircle, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, Legend } from 'recharts';
import API from '../api';
import { Loader } from '../components/UI';

const COLORS = ['#16a34a', '#d97706', '#dc2626', '#3b82f6', '#a855f7', '#f97316'];
const TT = { background: '#fff', border: '1px solid #e0f2fe', borderRadius: 10, color: '#1e293b', boxShadow: '0 4px 20px rgba(59,130,246,0.1)' };

export default function Spending() {
  const [summary, setSummary] = useState([]);
  const [roads, setRoads] = useState([]);
  const [efficiency, setEfficiency] = useState([]);
  const [districtDetails, setDistrictDetails] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('Coimbatore');
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get('/spending/summary'),
      API.get('/spending/roads'),
      API.get('/spending/efficiency'),
      selectedDistrict ? API.get(`/spending/district/${selectedDistrict}`) : Promise.resolve(null)
    ])
      .then(([s, r, e, d]) => {
        setSummary(s.data || []);
        setRoads(r.data || []);
        setEfficiency(e.data || []);
        setDistrictDetails(d?.data || null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching spending data:', err);
        setLoading(false);
      });
  }, [selectedDistrict]);

  if (loading) return <Loader />;

  const totalSpending = summary.reduce((sum, d) => sum + d.total_spending, 0);
  const topDistrict = summary[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-md shadow-green-200">
            <DollarSign size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Public Spending Tracker</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Monitor road budget allocation, detect fund misuse & inefficiencies</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Spending', value: `₹${(totalSpending / 100000).toFixed(0)}L`, icon: DollarSign, bg: 'bg-green-50', border: 'border-green-100', color: 'text-green-700' },
          { label: 'Roads Tracked', value: roads.length, icon: BarChart3, bg: 'bg-blue-50', border: 'border-blue-100', color: 'text-blue-700' },
          { label: 'Problematic Roads', value: efficiency.filter(r => r.status === 'High Risk').length, icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-100', color: 'text-red-600' },
          { label: 'Avg per Road', value: `₹${(totalSpending / roads.length / 100000).toFixed(1)}L`, icon: CheckCircle, bg: 'bg-purple-50', border: 'border-purple-100', color: 'text-purple-700' },
        ].map(({ label, value, icon: Icon, bg, border, color }) => (
          <div key={label} className={`rounded-2xl p-5 border ${bg} ${border} hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
              <Icon size={24} className={`${color} opacity-20`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'summary', label: '📊 Spending Summary' },
          { id: 'efficiency', label: '🚨 Problematic Roads' },
          { id: 'district', label: '🏘️ District Breakdown' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 font-medium transition-all border-b-2 ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUMMARY TAB */}
      {tab === 'summary' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* District Spending Pie Chart */}
          <div className="glass-card">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Spending by District</h2>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary} dataKey="total_spending" nameKey="district" cx="50%" cy="50%" outerRadius={100} label={({ district, total_spending }) => `${district}: ₹${(total_spending / 100000).toFixed(0)}L`}>
                    {summary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={value => `₹${(value / 100000).toFixed(1)}L`} contentStyle={TT} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* District Comparison Table */}
          <div className="glass-card">
            <h2 className="text-lg font-bold text-slate-800 mb-4">District Spending Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">District</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total Spending</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Roads</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Avg/Road</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Accidents</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Complaints</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((d, i) => (
                    <tr key={d.district} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800">{d.district}</td>
                      <td className="text-right py-3 px-4 font-semibold text-green-600">₹{(d.total_spending / 100000).toFixed(1)}L</td>
                      <td className="text-right py-3 px-4 text-slate-600">{d.road_count}</td>
                      <td className="text-right py-3 px-4 text-slate-600">₹{(d.spending_per_road / 100000).toFixed(2)}L</td>
                      <td className="text-right py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.total_accidents > 500 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {d.total_accidents}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {d.total_complaints}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* EFFICIENCY TAB */}
      {tab === 'efficiency' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
            <AlertTriangle size={18} className="inline mr-2" />
            <strong>⚠️ Warning:</strong> These roads have high spending but poor outcomes. Flag for audit.
          </div>

          <div className="glass-card">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Roads Needing Audit (High Spending, Low Efficiency)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Road Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Spending</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Accidents</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Complaints</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {efficiency.map(r => (
                    <tr key={r.road_name} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${r.status === 'High Risk' ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-800">{r.road_name}</div>
                          <div className="text-xs text-slate-500">{r.district}</div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-red-600">₹{r.spending_lakhs}L</td>
                      <td className="text-right py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {r.accident_count}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {r.citizen_complaints}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          r.status === 'High Risk' ? 'bg-red-200 text-red-800' :
                          r.status === 'Medium Risk' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* DISTRICT BREAKDOWN TAB */}
      {tab === 'district' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            {summary.map(d => (
              <button
                key={d.district}
                onClick={() => setSelectedDistrict(d.district)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDistrict === d.district
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {d.district}
              </button>
            ))}
          </div>

          {districtDetails && (
            <>
              {/* District Summary */}
              <div className="glass-card">
                <h2 className="text-lg font-bold text-slate-800 mb-4">📍 {selectedDistrict} Spending Summary</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Spending', value: `₹${districtDetails.summary.total_spending_lakhs}L` },
                    { label: 'Roads', value: districtDetails.summary.road_count },
                    { label: 'Avg per Road', value: `₹${(districtDetails.summary.avg_spending_per_road / 100000).toFixed(2)}L` },
                    { label: 'Total Accidents', value: districtDetails.summary.total_accidents },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                      <p className="text-slate-600 text-sm">{label}</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highest Spending Roads */}
              <div className="glass-card">
                <h3 className="text-lg font-bold text-slate-800 mb-4">💸 Highest Budget Roads</h3>
                <div className="space-y-2">
                  {districtDetails.highest_spending_roads.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-800">{r.Road_Name}</p>
                        <p className="text-xs text-slate-500">{r.Accident_Count} accidents • {r.Citizen_Complaints} complaints</p>
                      </div>
                      <p className="text-lg font-bold text-green-600">₹{(r.Road_Expenditure / 100000).toFixed(1)}L</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Problematic Roads */}
              <div className="glass-card">
                <h3 className="text-lg font-bold text-slate-800 mb-4">🚨 Most Problematic Roads</h3>
                <div className="space-y-2">
                  {districtDetails.most_problematic_roads.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-transparent rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-800">{r.Road_Name}</p>
                        <p className="text-xs text-slate-500">₹{(r.Road_Expenditure / 100000).toFixed(1)}L spent • {r.Citizen_Complaints} complaints</p>
                      </div>
                      <p className="text-lg font-bold text-red-600">{r.Accident_Count} accidents</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
