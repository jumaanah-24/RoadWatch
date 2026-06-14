import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, BarChart2, Map, MessageSquare, Shield, Sparkles } from 'lucide-react';

const features = [
  { icon: MessageSquare, title: 'AI Chatbot', desc: 'Ask anything about roads — safety tips, traffic rules, accident data, maintenance status and more using our NLP-powered chatbot.', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: BarChart2, title: 'Analytics Dashboard', desc: 'Deep insights into road safety, expenditure trends, accident distributions and maintenance patterns across all districts.', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { icon: Map, title: 'Live Road Map', desc: 'Interactive map showing real-time road safety conditions with color-coded markers for Good, Moderate and Dangerous roads.', color: 'bg-green-50 text-green-600 border-green-100' },
  { icon: AlertTriangle, title: 'Risk Predictor', desc: 'AI-powered risk prediction using road and complaint data to highlight priority repairs and safety hotspots.', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { icon: Shield, title: 'Complaint System', desc: 'Submit road damage complaints and track responses for faster resolution and transparent accountability.', color: 'bg-red-50 text-red-600 border-red-100' },
  { icon: Activity, title: 'Road Transparency', desc: 'Full transparency on road expenditure, contractor details, maintenance schedules and citizen complaint resolution.', color: 'bg-teal-50 text-teal-600 border-teal-100' },
];

const stats = [
  { value: '50+', label: 'Roads Monitored' },
  { value: '12K+', label: 'Accidents Tracked' },
  { value: '38', label: 'Districts Covered' },
  { value: '∞', label: 'AI Queries Answered' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-sky-500 shadow-xl shadow-blue-200 mb-5">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-4">RoadWatch AI</h1>
        <p className="text-slate-500 text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
          Intelligent road transparency and public accountability system. Monitor accidents, track maintenance, and ensure road safety with AI.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => navigate('/chatbot')} className="btn-primary px-6 py-3">Ask AI Chatbot</button>
          <button onClick={() => navigate('/analytics')} className="btn-secondary px-6 py-3">View Dashboard</button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ value, label }) => (
          <div key={label} className="bg-white rounded-3xl border border-blue-100 p-6 text-center shadow-sm hover:shadow-md transition-all">
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-slate-500 mt-2 text-sm">{label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}
              className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 ${color}`}>
                <Icon size={22} />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-blue-600 to-sky-500 rounded-3xl p-10 text-white shadow-xl shadow-blue-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Our Mission</h2>
          <p className="text-slate-100 text-base lg:text-lg leading-relaxed">
            To bring full transparency to road infrastructure management by combining AI, real-time data and citizen participation — making roads safer for everyone.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
