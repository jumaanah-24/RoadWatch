import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Shield, BarChart2, MessageSquare, Map, AlertTriangle } from 'lucide-react';

const features = [
  { icon: MessageSquare, title: 'AI Chatbot', desc: 'Ask anything about roads — safety tips, traffic rules, accident data, maintenance status and more using our NLP-powered chatbot.', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: BarChart2, title: 'Analytics Dashboard', desc: 'Deep insights into road safety, expenditure trends, accident distributions and maintenance patterns across all districts.', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { icon: Map, title: 'Live Road Map', desc: 'Interactive map showing real-time road safety conditions with color-coded markers for Good, Moderate and Dangerous roads.', color: 'bg-green-50 text-green-600 border-green-100' },
  { icon: AlertTriangle, title: 'Risk Predictor', desc: 'AI-powered Random Forest ML model that predicts maintenance urgency and risk levels for every road based on accident and complaint data.', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { icon: Shield, title: 'Complaint System', desc: 'Submit road damage complaints with AI image analysis that automatically detects damage severity and recommends action.', color: 'bg-red-50 text-red-600 border-red-100' },
  { icon: Activity, title: 'Road Transparency', desc: 'Full transparency on road expenditure, contractor details, maintenance schedules and citizen complaint resolution.', color: 'bg-teal-50 text-teal-600 border-teal-100' },
];

const stats = [
  { value: '50+', label: 'Roads Monitored' },
  { value: '4', label: 'Datasets Integrated' },
  { value: 'AI', label: 'Powered Chatbot' },
  { value: '100%', label: 'Open & Transparent' },
];

export default function About() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-200">
          <Activity size={30} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-3">About RoadWatch AI</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
          A smart city platform for road safety transparency, powered by AI and real-world datasets to help citizens, administrators and planners make better decisions.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ value, label }) => (
          <div key={label} className="bg-white rounded-2xl border border-blue-100 p-5 text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <p className="text-3xl font-bold text-blue-600">{value}</p>
            <p className="text-slate-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Features */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Mission */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center shadow-xl shadow-blue-200">
        <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
        <p className="text-blue-100 leading-relaxed max-w-2xl mx-auto">
          To bring full transparency to road infrastructure management by combining AI, real-time data and citizen participation — making roads safer for everyone.
        </p>
      </motion.div>
    </div>
  );
}
