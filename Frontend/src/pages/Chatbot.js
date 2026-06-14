import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Mic, MicOff, Sparkles, AlertTriangle, Activity, Info } from 'lucide-react';
import API from '../api';
import { SafetyBadge, RiskBadge } from '../components/UI';

const SUGGESTIONS = [
  'Which road has highest accidents?',
  'Show roads with pending maintenance',
  'What are the speed limits in India?',
  'Show total road statistics',
  'Traffic rules and fines in India',
  'How to report a pothole?',
  'Top states by road accidents',
  'Tamil Nadu district accident data',
  'Road safety tips',
  'Emergency numbers for road accidents',
  'Roads with more than 20 complaints',
  'How much budget is spent?',
];

function RoadCard({ road }) {
  return (
    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-slate-700">{road.Road_Name || road.road_name}</span>
        {road.Safety_Rating && <SafetyBadge rating={road.Safety_Rating} />}
      </div>
      <div className="text-slate-500 text-xs space-y-0.5">
        {road.District && <p>📍 {road.District}</p>}
        {road.Accident_Count !== undefined && <p>🚨 Accidents: {road.Accident_Count?.toLocaleString()}</p>}
        {road.Citizen_Complaints !== undefined && <p>📝 Complaints: {road.Citizen_Complaints}</p>}
        {road.Budget_Lakhs !== undefined && <p>💰 Budget: ₹{road.Budget_Lakhs} Lakhs</p>}
        {road.Risk_Level && <RiskBadge level={road.Risk_Level} />}
      </div>
    </div>
  );
}

function RoadDetail({ road }) {
  const fields = [
    ['Road Name', road.Road_Name], ['District', road.District], ['Road Type', road.Road_Type],
    ['Accidents', road.Accident_Count?.toLocaleString()], ['Safety Rating', road.Safety_Rating],
    ['Last Repair', road.Last_Repair], ['Maintenance', road.Maintenance_Status],
    ['Budget', road.Budget_Lakhs ? `₹${road.Budget_Lakhs} Lakhs` : null],
    ['Contractor', road.Contractor], ['Complaints', road.Citizen_Complaints],
    ['Risk Level', road.Risk_Level],
  ].filter(([, v]) => v != null);

  return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 grid grid-cols-2 gap-2 text-xs">
      {fields.map(([k, v]) => (
        <div key={k} className="bg-white rounded-lg p-2 border border-blue-50">
          <span className="text-slate-400 block">{k}</span>
          <span className="text-slate-700 font-semibold">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

function StatsDisplay({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="bg-blue-50 rounded-lg p-2 border border-blue-100">
          <p className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</p>
          <p className="text-blue-700 font-bold text-sm">{typeof v === 'number' ? v.toLocaleString() : String(v)}</p>
        </div>
      ))}
    </div>
  );
}

function TableDisplay({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-blue-100 text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-blue-50">
            {columns.map(c => <th key={c} className="px-3 py-2 text-left text-slate-600 font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-blue-50 hover:bg-blue-50/50 bg-white">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Message({ msg }) {
  const isBot = msg.role === 'bot';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${isBot ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-violet-500 to-violet-700'}`}>
        {isBot ? <Bot size={15} className="text-white" /> : <User size={15} className="text-white" />}
      </div>
      <div className={`max-w-[80%] space-y-2 ${isBot ? '' : 'items-end flex flex-col'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${isBot ? 'bg-white border border-blue-100 text-slate-700 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
          {msg.text}
        </div>
        {isBot && msg.data && (
          <div className="w-full space-y-2">
            {msg.data.type === 'road_detail' && msg.data.road && <RoadDetail road={msg.data.road} />}
            {(msg.data.type === 'list' || msg.data.type === 'search_results') && msg.data.roads?.map((r, i) => <RoadCard key={i} road={r} />)}
            {msg.data.type === 'stats' && msg.data.stats && <StatsDisplay stats={msg.data.stats} />}
            {msg.data.type === 'table' && msg.data.columns && <TableDisplay columns={msg.data.columns} rows={msg.data.rows} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello! I'm RoadWatch AI 🚦 Ask me anything about roads — safety tips, traffic rules, accident data, specific road details, maintenance status, emergency numbers, and more!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef();
  const recognitionRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (query) => {
    const q = query || input.trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const { data } = await API.post('/chatbot', { query: q });
      const bubbleText = data.type === 'info' ? data.message : (data.message || 'Here is what I found:');
      setMessages(prev => [...prev, { role: 'bot', text: bubbleText, data: data.type !== 'info' ? data : null }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I could not process that. Please try again.' }]);
    }
    setLoading(false);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window)) { alert('Voice not supported in this browser'); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new window.webkitSpeechRecognition();
    rec.lang = 'en-IN'; rec.continuous = false;
    rec.onresult = e => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start(); setListening(true);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Sparkles size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">AI Road Chatbot</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Ask anything about roads, accidents, safety rules, maintenance & more</p>
      </motion.div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Chat */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FBFF]">
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-white border border-blue-100 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center shadow-sm">
                  {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-blue-50 bg-white">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about any road, safety rule, accident data..." className="input-field flex-1" />
              <button onClick={toggleVoice} className={`p-3 rounded-xl transition-all border ${listening ? 'bg-red-500 text-white border-red-500' : 'bg-white border-blue-100 text-slate-500 hover:bg-blue-50'}`}>
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={() => send()} disabled={loading} className="btn-primary px-4 py-3">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="w-60 hidden lg:flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 overflow-y-auto flex-1">
            <h3 className="text-slate-700 font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity size={16} className="text-blue-500" /> Quick Queries
            </h3>
            <div className="space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="w-full text-left text-xs text-slate-500 hover:text-blue-600 bg-blue-50/50 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all border border-blue-100/50 hover:border-blue-200">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-4">
            <h3 className="text-slate-700 font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Tips
            </h3>
            <p className="text-xs text-slate-500">Ask about specific roads like "Tell me about Road_5" or general questions like "What are traffic fines?"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
