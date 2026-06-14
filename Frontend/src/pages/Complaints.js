import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, CheckCircle, Clock, XCircle, Camera } from 'lucide-react';
import API from '../api';

const CATEGORIES = ['Potholes', 'Waterlogging', 'Cracks', 'Poor Lighting', 'Traffic Danger', 'Broken Signals', 'Other'];

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({ road_name: '', category: '', description: '', location: '', reporter_name: '', reporter_email: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState('submit');

  useEffect(() => {
    if (tab === 'list') API.get('/complaints').then(r => setComplaints(r.data)).catch(() => {});
  }, [tab]);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    const fd = new FormData(); fd.append('image', file);
    try { const { data } = await API.post('/analyze-image', fd); setAnalysis(data); } catch { setAnalysis(null); }
    setAnalyzing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (image) fd.append('image', image);
    try {
      await API.post('/complaints', fd);
      setSuccess(true);
      setForm({ road_name: '', category: '', description: '', location: '', reporter_name: '', reporter_email: '' });
      setImage(null); setPreview(null); setAnalysis(null);
      setTimeout(() => setSuccess(false), 4000);
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <FileText size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Complaints</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Submit road damage complaints with AI image analysis</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['submit', 'list'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tab === t ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-500 border border-blue-100 hover:bg-blue-50'}`}>
            {t === 'submit' ? 'Submit Complaint' : 'View Complaints'}
          </button>
        ))}
      </div>

      {tab === 'submit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.form initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleSubmit} className="glass-card space-y-4">
            <h3 className="text-slate-700 font-semibold">Complaint Details</h3>
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> Complaint submitted successfully!
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <input required value={form.road_name} onChange={e => setForm(f => ({ ...f, road_name: e.target.value }))}
                placeholder="Road Name *" className="input-field" />
              <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                <option value="">Select Category *</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Location / Landmark" className="input-field" />
            <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue *" rows={3} className="input-field resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.reporter_name} onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                placeholder="Your Name" className="input-field" />
              <input type="email" value={form.reporter_email} onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))}
                placeholder="Your Email" className="input-field" />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </motion.form>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card space-y-4">
            <h3 className="text-slate-700 font-semibold flex items-center gap-2"><Camera size={18} className="text-blue-500" /> AI Image Analysis</h3>
            <label className="block border-2 border-dashed border-blue-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              {preview ? (
                <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-xl object-cover" />
              ) : (
                <div className="space-y-2">
                  <Upload size={32} className="mx-auto text-blue-300" />
                  <p className="text-slate-500 text-sm">Click to upload road damage image</p>
                  <p className="text-slate-400 text-xs">AI will analyze damage severity</p>
                </div>
              )}
            </label>

            {analyzing && (
              <div className="flex items-center gap-2 text-blue-500 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Analyzing image...
              </div>
            )}

            {analysis && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <p className="text-slate-400 text-xs">Damage %</p>
                    <p className={`text-2xl font-bold ${analysis.damage_percentage > 60 ? 'text-red-600' : analysis.damage_percentage > 30 ? 'text-amber-600' : 'text-green-600'}`}>
                      {analysis.damage_percentage}%
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <p className="text-slate-400 text-xs">Severity</p>
                    <p className={`text-lg font-bold ${analysis.severity === 'Severe' ? 'text-red-600' : analysis.severity === 'Moderate' ? 'text-amber-600' : 'text-green-600'}`}>
                      {analysis.severity}
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                  💡 {analysis.recommendation}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {tab === 'list' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
          {complaints.length === 0 ? (
            <div className="text-center text-slate-400 py-16">No complaints submitted yet</div>
          ) : (
            <div className="divide-y divide-blue-50">
              {complaints.map((c, i) => (
                <div key={i} className="p-4 hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-700 font-semibold">{c.road_name}</p>
                      <p className="text-slate-500 text-sm">{c.category} — {c.location || 'No location'}</p>
                      <p className="text-slate-400 text-xs mt-1">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {c.status === 'Resolved' ? <CheckCircle size={14} className="text-green-500" /> :
                       c.status === 'Rejected' ? <XCircle size={14} className="text-red-500" /> :
                       <Clock size={14} className="text-amber-500" />}
                      <span className={`font-medium ${c.status === 'Resolved' ? 'text-green-600' : c.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                        {c.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
