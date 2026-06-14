import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity } from 'lucide-react';
import API from '../api';
import { SafetyBadge } from '../components/UI';

export default function MapView() {
  const [roads, setRoads] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [mapCenter, setMapCenter] = useState([11.0168, 76.9558]);
  const [mapZoom, setMapZoom] = useState(12);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedDistrict !== 'all') params.append('district', selectedDistrict);
        const res = await API.get(`/map/roads?${params.toString()}`);
        setRoads(res.data);
        
        // Extract unique districts for dropdown
        const uniqueDistricts = [...new Set(res.data.map(r => r.district))];
        setDistricts(uniqueDistricts.sort());
        
        // Update map center based on selected district
        if (selectedDistrict !== 'all' && res.data.length > 0) {
          const avgLat = res.data.reduce((sum, r) => sum + r.lat, 0) / res.data.length;
          const avgLng = res.data.reduce((sum, r) => sum + r.lng, 0) / res.data.length;
          setMapCenter([avgLat, avgLng]);
          setMapZoom(13);
        } else {
          setMapCenter([11.0168, 76.9558]);
          setMapZoom(12);
        }
      } catch (err) {
        console.error('Error fetching map data:', err);
      }
    };
    fetchData();
  }, [selectedDistrict]);

  const filtered = filter === 'all' ? roads : roads.filter(r => r.safety_rating.toLowerCase() === filter);
  const colorMap = { Good: '#16a34a', Moderate: '#d97706', Dangerous: '#dc2626' };

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Activity size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Live Road Map</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Interactive map showing road safety conditions with accurate locations</p>
      </motion.div>

      {/* District Filter */}
      <div className="glass-card">
        <label className="text-slate-500 text-sm font-medium">District:</label>
        <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}
          className="mt-2 w-full md:w-48 px-3 py-2 rounded-lg border border-blue-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option value="all">All Districts</option>
          {districts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Safety Filter */}
      <div className="glass-card flex flex-wrap items-center gap-4">
        <span className="text-slate-500 text-sm font-medium">Safety Filter:</span>
        {['all', 'good', 'moderate', 'dangerous'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${filter === f ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-blue-50 text-slate-500 hover:bg-blue-100 border border-blue-100'}`}>
            {f}
          </button>
        ))}
        <div className="ml-auto flex gap-4 text-xs">
          {[['Good', '#16a34a'], ['Moderate', '#d97706'], ['Dangerous', '#dc2626']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm" style={{ height: '65vh' }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {filtered.map((road, i) => (
            <CircleMarker key={i} center={[road.lat, road.lng]}
              radius={road.accident_count > 500 ? 14 : road.accident_count > 200 ? 10 : 7}
              pathOptions={{ color: colorMap[road.safety_rating] || '#3b82f6', fillColor: colorMap[road.safety_rating] || '#3b82f6', fillOpacity: 0.75, weight: 2 }}>
              <Popup>
                <div className="text-sm font-semibold text-slate-800">{road.road_name}</div>
                <div className="text-xs text-slate-500">{road.district}, {road.state}</div>
                <div className="text-xs mt-1 text-slate-600">🚨 Accidents: {road.accident_count}</div>
                <div className="text-xs text-slate-600">📋 Complaints: {road.complaints}</div>
                <div className="text-xs text-slate-600">💰 Budget: ₹{road.budget_lakhs} L</div>
                <div className="text-xs text-slate-600">Safety: <span style={{color: colorMap[road.safety_rating]}}>{road.safety_rating}</span></div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </motion.div>

      <div className="glass-card">
        <p className="text-slate-500 text-sm">Showing <span className="text-blue-600 font-semibold">{filtered.length}</span> roads. Circle size indicates accident severity. Click any marker for details.</p>
      </div>
    </div>
  );
}
