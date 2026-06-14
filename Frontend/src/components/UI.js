import React from 'react';

export function SafetyBadge({ rating }) {
  const map = { Good: 'badge-good', Moderate: 'badge-moderate', Dangerous: 'badge-dangerous' };
  return <span className={map[rating] || 'badge-moderate'}>{rating}</span>;
}

export function RiskBadge({ level }) {
  const map = {
    Low: 'bg-green-100 text-green-700 border-green-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    High: 'bg-red-100 text-red-700 border-red-200',
    Critical: 'bg-red-200 text-red-800 border-red-300',
  };
  return (
    <span className={`border px-2 py-0.5 rounded-full text-xs font-medium ${map[level] || map.Medium}`}>
      {level}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, color = 'blue', sub }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   val: 'text-blue-700',   border: 'border-blue-100' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',     val: 'text-red-700',    border: 'border-red-100' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', val: 'text-green-700',  border: 'border-green-100' },
    yellow: { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600', val: 'text-amber-700',  border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600',val: 'text-purple-700',border: 'border-purple-100' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600',val: 'text-orange-700',border: 'border-orange-100' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-2xl p-5 border ${c.bg} ${c.border} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className={`text-3xl font-bold ${c.val}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
