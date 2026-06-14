import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Send, CheckCircle } from 'lucide-react';

const contacts = [
  { icon: Phone, title: 'Phone', value: '+91 98765 43210', sub: 'Mon–Fri, 9am–6pm', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: Mail, title: 'Email', value: 'support@roadwatch.ai', sub: 'We reply within 24 hours', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { icon: MapPin, title: 'Office', value: 'Coimbatore, Tamil Nadu', sub: 'India — 641001', color: 'bg-green-50 text-green-600 border-green-100' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
        <h1 className="text-4xl font-bold text-slate-800 mb-3">Contact Us</h1>
        <p className="text-slate-500 text-lg">Have a question or want to report an issue? We'd love to hear from you.</p>
      </motion.div>

      {/* Contact Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {contacts.map(({ icon: Icon, title, value, sub, color }) => (
          <div key={title} className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-center">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mx-auto mb-3 ${color}`}>
              <Icon size={22} />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
            <p className="text-slate-600 text-sm font-medium">{value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Contact Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-blue-100 shadow-sm p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Send us a Message</h2>

        {sent && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
            <CheckCircle size={20} />
            <div>
              <p className="font-semibold text-sm">Message sent successfully!</p>
              <p className="text-xs text-green-600">We'll get back to you within 24 hours.</p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Full Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Email Address</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com" className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Subject</label>
            <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="What is this about?" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Message</label>
            <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Write your message here..." rows={5} className="input-field resize-none" />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Send size={16} /> Send Message
          </button>
        </form>
      </motion.div>
    </div>
  );
}
