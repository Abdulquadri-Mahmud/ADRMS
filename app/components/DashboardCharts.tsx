'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import { motion } from 'framer-motion'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1']

export default function DashboardCharts({ chartData, pieData }: { chartData: any[], pieData: any[] }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 md:rounded-[2.5rem] rounded-2xl border border-gray-100"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Financial Velocity</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">6-Month Collection Trend</p>
                    </div>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 900 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 900 }}
                                tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Total']}
                            />
                            <Bar
                                dataKey="value"
                                fill="#10b981"
                                radius={[6, 6, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 md:rounded-[2.5rem] rounded-2xl border border-gray-100"
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Tajnid Composition</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Majlis Distribution</p>
                    </div>
                </div>
                <div className="h-80 w-full flex items-center">
                    <div className="flex-1 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-shrink-0 w-32 space-y-3">
                        {pieData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter truncate w-24">{entry.name}</span>
                                    <span className="text-[9px] text-gray-400 font-bold">{entry.value} members</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
