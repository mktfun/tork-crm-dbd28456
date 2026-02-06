import React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ChartComponentProps {
    data: any[];
    type?: 'area' | 'bar';
    dataKeys: { key: string; color: string; name?: string }[];
    xAxisKey?: string;
    height?: number;
    title?: string;
    className?: string;
}

export const ChartComponent: React.FC<ChartComponentProps> = ({
    data,
    type = 'area',
    dataKeys,
    xAxisKey = 'date',
    height = 250,
    title,
    className
}) => {
    if (!data || data.length === 0) return null;

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
            maximumFractionDigits: 1
        });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 border border-white/10 p-3 rounded-lg backdrop-blur-md shadow-xl">
                    <p className="text-xs text-muted-foreground mb-2">{formatDate(label)}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-white/70">{entry.name}:</span>
                            <span className="font-bold text-white">
                                {entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn("w-full", className)}
        >
            <GlassCard className="p-4 overflow-hidden">
                {title && (
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 pl-1">
                        {title}
                    </h3>
                )}
                <div style={{ width: '100%', height }}>
                    <ResponsiveContainer>
                        {type === 'area' ? (
                            <AreaChart data={data}>
                                <defs>
                                    {dataKeys.map((k, i) => (
                                        <linearGradient key={k.key} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={k.color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={k.color} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey={xAxisKey}
                                    tickFormatter={formatDate}
                                    stroke="rgba(255,255,255,0.2)"
                                    tick={{ fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tickFormatter={formatCurrency}
                                    stroke="rgba(255,255,255,0.2)"
                                    tick={{ fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                {dataKeys.map((k, i) => (
                                    <Area
                                        key={k.key}
                                        type="monotone"
                                        dataKey={k.key}
                                        stroke={k.color}
                                        fillOpacity={1}
                                        fill={`url(#color${i})`}
                                        name={k.name || k.key}
                                        strokeWidth={2}
                                    />
                                ))}
                            </AreaChart>
                        ) : (
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey={xAxisKey}
                                    tickFormatter={formatDate}
                                    stroke="rgba(255,255,255,0.2)"
                                    tick={{ fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tickFormatter={formatCurrency}
                                    stroke="rgba(255,255,255,0.2)"
                                    tick={{ fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                {dataKeys.map((k) => (
                                    <Bar
                                        key={k.key}
                                        dataKey={k.key}
                                        fill={k.color}
                                        name={k.name || k.key}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={50}
                                    />
                                ))}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </GlassCard>
        </motion.div>
    );
};
