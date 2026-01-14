import { Link } from 'react-router-dom';
interface MetricCardProps {
  title: string;
  value: number | string;
  href: string;
}
export function MetricCard({
  title,
  value,
  href
}: MetricCardProps) {
  return <Link to={href} className="block">
      <div className="bg-white rounded-xl shadow-sm p-6 transition-shadow hover:shadow-lg cursor-pointer">
        <div className="text-xl font-bold text-slate-900">{value}</div>
        <div className="text-sm font-medium text-slate-500 mt-1">{title}</div>
      </div>
    </Link>;
}