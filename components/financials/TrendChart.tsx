
import React from 'react';

interface TrendData {
    label: string;
    revenue: number;
    profit: number;
}

interface TrendChartProps {
    data: TrendData[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-400">No data available for trends.</div>;
    }

    // Dimensions
    const width = 800;
    const height = 300;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Scales
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.profit)), 100) * 1.1; // Add 10% buffer
    
    const getX = (index: number) => padding + (index * (chartWidth / (data.length - 1)));
    const getY = (value: number) => height - padding - ((value / maxVal) * chartHeight);

    // Path Generators
    const createPath = (key: 'revenue' | 'profit') => {
        if (data.length < 2) return '';
        return data.map((d, i) => 
            `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key])}`
        ).join(' ');
    };

    const revenuePath = createPath('revenue');
    const profitPath = createPath('profit');

    return (
        <div className="w-full overflow-x-auto bg-white p-4 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-md font-semibold text-slate-700 mb-4">Revenue vs. Profit Trend (Last 6 Months)</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px]">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const y = height - padding - (t * chartHeight);
                    return (
                        <g key={t}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4" />
                            <text x={padding - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400">
                                ${Math.round(t * maxVal)}
                            </text>
                        </g>
                    );
                })}

                {/* Data Lines */}
                <path d={revenuePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={profitPath} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {data.map((d, i) => (
                    <g key={i}>
                        <circle cx={getX(i)} cy={getY(d.revenue)} r="4" fill="#3b82f6" className="hover:r-6 transition-all cursor-pointer">
                            <title>{d.label} Revenue: ${d.revenue.toFixed(2)}</title>
                        </circle>
                        <circle cx={getX(i)} cy={getY(d.profit)} r="4" fill="#22c55e" className="hover:r-6 transition-all cursor-pointer">
                            <title>{d.label} Profit: ${d.profit.toFixed(2)}</title>
                        </circle>
                        <text x={getX(i)} y={height - padding + 20} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">
                            {d.label}
                        </text>
                    </g>
                ))}
                
                {/* Legend */}
                 <g transform={`translate(${width - 150}, ${padding})`}>
                    <rect x="0" y="0" width="10" height="10" fill="#3b82f6" rx="2" />
                    <text x="15" y="9" className="text-[11px] fill-slate-600 font-semibold">Revenue</text>
                    
                    <rect x="0" y="20" width="10" height="10" fill="#22c55e" rx="2" />
                    <text x="15" y="29" className="text-[11px] fill-slate-600 font-semibold">Profit</text>
                </g>
            </svg>
        </div>
    );
};
