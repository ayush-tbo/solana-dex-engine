import { TrendingUp, CheckCircle, XCircle, Activity } from 'lucide-react';

interface StatsPanelProps {
  stats: {
    total: number;
    confirmed: number;
    failed: number;
    active: number;
  };
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const statCards = [
    {
      label: 'Total Orders',
      value: stats.total,
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Confirmed',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
      iconColor: 'text-green-400',
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'from-red-500 to-orange-500',
      iconColor: 'text-red-400',
    },
    {
      label: 'Active',
      value: stats.active,
      icon: Activity,
      color: 'from-blue-500 to-cyan-500',
      iconColor: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div
          key={stat.label}
          className="glass rounded-xl p-6 hover:scale-105 transition-transform animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-20`}>
              <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">
            {stat.value}
          </div>
          <div className="text-sm text-purple-300">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
