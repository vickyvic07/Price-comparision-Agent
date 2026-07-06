import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../utils/currency';

/* One distinct colour per site */
const SITE_COLORS = {
  amazon:           '#f97316',
  flipkart:         '#3b82f6',
  croma:            '#6366f1',
  reliance_digital: '#ef4444',
  other:            '#10b981',
};
const siteColor = (site) => SITE_COLORS[site?.toLowerCase()] || SITE_COLORS.other;

const fmt = (ts) => {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

/* Custom tooltip */
const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      <p className="text-gray-500 mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="capitalize text-gray-700">{p.dataKey}</span>
          </span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(p.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * PriceHistoryChart
 * Props:
 *   bySite   — { amazon: [{timestamp, price}], flipkart: [...], ... }
 *   currency — ISO code
 */
export default function PriceHistoryChart({ bySite = {}, currency = 'INR' }) {
  const sites = Object.keys(bySite);
  if (!sites.length) return (
    <div className="h-56 flex items-center justify-center text-sm text-gray-400">
      No price history available yet.
    </div>
  );

  /* Merge all timestamps into one unified timeline, fill gaps with null */
  const allTimestamps = [...new Set(
    sites.flatMap((s) => bySite[s].map((e) => e.timestamp))
  )].sort();

  const chartData = allTimestamps.map((ts) => {
    const row = { date: fmt(ts), _ts: ts };
    sites.forEach((site) => {
      const entry = bySite[site].find((e) => e.timestamp === ts);
      row[site] = entry ? entry.price : null;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, currency)}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => (
            <span className="capitalize text-xs text-gray-600">
              {v.replace('_', ' ')}
            </span>
          )}
        />
        {sites.map((site) => (
          <Line
            key={site}
            type="monotone"
            dataKey={site}
            stroke={siteColor(site)}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
