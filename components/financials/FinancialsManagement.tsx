import React, { useMemo, useState } from 'react';
import { Service, ServiceStatus, User, Supplier, ServiceType, PaymentStatus } from '../../types';
import { AIFinancialAssistant } from './AIFinancialAssistant';

interface FinancialsManagementProps {
  services: Service[];
  drivers: User[];
  suppliers: Supplier[];
}

type FinancialView = 'overview' | 'reports';
type DateRangePreset = 'this_month' | 'last_month' | 'year_to_date' | 'all';

// --- Chart and UI Components ---

const ServiceTypeChartColors: Record<ServiceType, string> = {
  [ServiceType.AIRPORT_TRANSFER]: '#fb923c', // orange-400
  [ServiceType.CITY_TOUR]: '#34d399', // emerald-400
  [ServiceType.HOTEL_TRANSFER]: '#38bdf8', // sky-400
  [ServiceType.WINE_TOUR]: '#a78bfa', // violet-400
  [ServiceType.CUSTOM]: '#94a3b8', // slate-400
};


const MetricCard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
    <h3 className="text-sm font-medium text-slate-500 truncate">{title}</h3>
    <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
    <p className="text-sm text-slate-500 mt-2">{description}</p>
  </div>
);

const ReportBarChart: React.FC<{title: string, data: {label: string, value: number}[]}> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 0);
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    return (
        <div className="p-4 bg-white rounded-lg">
            <h3 className="text-md font-semibold text-slate-700 mb-4">{title}</h3>
            <div className="space-y-3">
                {sortedData.map(item => {
                    const isNegative = item.value < 0;
                    const width = maxValue > 0 ? (Math.abs(item.value) / maxValue) * 100 : 0;
                    const barColor = isNegative ? 'bg-red-500' : 'bg-blue-600';

                    return (
                        <div key={item.label} className="grid grid-cols-12 items-center gap-2 text-sm">
                            <span className="col-span-3 text-slate-600 truncate text-right pr-2">{item.label}</span>
                            <div className="col-span-9 bg-slate-200 rounded-full h-6">
                                <div 
                                    className={`${barColor} h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-medium`}
                                    style={{ width: `${width}%` }}
                                >
                                    ${item.value.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {data.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No data available for this report.</p>}
            </div>
        </div>
    )
}

const PieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return <div className="flex items-center justify-center h-48 text-sm text-slate-500">No data to display.</div>;

    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };
    
    return (
        <div className="flex flex-col sm:flex-row items-center justify-center">
            <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-48 h-48 transform -rotate-90">
                {data.map(item => {
                    const percent = item.value / total;
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                    cumulativePercent += percent;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);

                    const largeArcFlag = percent > 0.5 ? 1 : 0;

                    const pathData = [
                        `M ${startX} ${startY}`,
                        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `L 0 0`,
                    ].join(' ');

                    return <path key={item.label} d={pathData} fill={item.color} />;
                })}
            </svg>
            <div className="mt-4 sm:mt-0 sm:ml-6 space-y-1">
                {data.map(item => (
                    <div key={item.label} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-700">{item.label}:</span>
                        <span className="font-semibold ml-1">${item.value.toFixed(2)}</span>
                        <span className="text-slate-500 ml-1">({((item.value / total) * 100).toFixed(1)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---

export const FinancialsManagement: React.FC<FinancialsManagementProps> = ({ services, drivers, suppliers }) => {
  const [view, setView] = useState<FinancialView>('overview');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch(dateRangePreset) {
        case 'this_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
        case 'year_to_date':
            start = new Date(now.getFullYear(), 0, 1);
            end = now;
            break;
        case 'all':
            return null;
    }
    return { start, end };
  }, [dateRangePreset]);

  const financialData = useMemo(() => {
    const filteredServices = dateRange 
      ? services.filter(s => s.startTime >= dateRange.start && s.startTime <= dateRange.end)
      : services;

    const completedServices = filteredServices.filter(s => s.status === ServiceStatus.COMPLETED);
    const totalRevenue = completedServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    const totalCosts = completedServices.reduce((sum, s) => sum + (s.supplierCost || 0), 0);
    const netProfit = totalRevenue - totalCosts;

    // Live financial data
    const relevantServices = filteredServices.filter(s => 
        [ServiceStatus.CONFIRMED, ServiceStatus.IN_PROGRESS, ServiceStatus.COMPLETED].includes(s.status)
    );
    const receivableServices = relevantServices.filter(s =>
        s.clientPaymentStatus && [PaymentStatus.UNPAID, PaymentStatus.PARTIAL].includes(s.clientPaymentStatus)
    );
    const payableServices = relevantServices.filter(s =>
        s.supplierId && s.supplierPaymentStatus && [PaymentStatus.UNPAID, PaymentStatus.PARTIAL].includes(s.supplierPaymentStatus)
    );
    const accountsReceivable = receivableServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    const accountsPayable = payableServices.reduce((sum, s) => sum + (s.supplierCost || 0), 0);
    const totalCommission = completedServices.filter(s => s.supplierId).reduce((sum, s) => sum + ((s.clientPrice || 0) - (s.supplierCost || 0)), 0);

    // Monthly Reports Data
    const monthlyReports: { [key: string]: {
        totalRevenue: number;
        totalCosts: number;
        netProfit: number;
        services: Service[];
        revenueByServiceType: {label: string, value: number, color: string}[];
        profitByDriver: {label: string, value: number}[];
    } } = {};

    completedServices.forEach(service => {
        const monthKey = `${service.startTime.getFullYear()}-${String(service.startTime.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyReports[monthKey]) {
            monthlyReports[monthKey] = {
                totalRevenue: 0, totalCosts: 0, netProfit: 0, services: [], revenueByServiceType: [], profitByDriver: [],
            };
        }
        const report = monthlyReports[monthKey];
        const revenue = service.clientPrice || 0;
        const cost = service.supplierCost || 0;
        const profit = revenue - cost;
        
        report.totalRevenue += revenue;
        report.totalCosts += cost;
        report.netProfit += profit;
        report.services.push(service);
    });
    
    // Aggregate data for charts within each month
    Object.values(monthlyReports).forEach(report => {
        const revenueByServiceTypeMap: { [key in ServiceType]?: number } = {};
        const profitByDriverMap: { [key: string]: number } = {};

        report.services.forEach(s => {
            const revenue = s.clientPrice || 0;
            revenueByServiceTypeMap[s.serviceType] = (revenueByServiceTypeMap[s.serviceType] || 0) + revenue;

            if (s.driverId) {
                const profit = revenue - (s.supplierCost || 0);
                profitByDriverMap[s.driverId] = (profitByDriverMap[s.driverId] || 0) + profit;
            }
        });

        report.revenueByServiceType = Object.entries(revenueByServiceTypeMap)
            .map(([type, value]) => ({ label: type.replace(/_/g, ' '), value, color: ServiceTypeChartColors[type as ServiceType] }))
            .filter(item => item.value > 0);

        report.profitByDriver = Object.entries(profitByDriverMap)
            .map(([driverId, value]) => ({ label: drivers.find(d => d.id === driverId)?.name || 'Unknown', value }))
            .filter(item => item.value !== 0);
    });


    return {
      totalRevenue, totalCosts, netProfit, completedServices, totalServicesCount: completedServices.length,
      accountsReceivable, accountsPayable, receivableServices, payableServices, totalCommission,
      monthlyReports
    };
  }, [services, drivers, suppliers, dateRange]);
  
  // Set the first month as open by default when the component loads or data changes
  React.useEffect(() => {
    const monthKeys = Object.keys(financialData.monthlyReports);
    if (monthKeys.length > 0 && !openMonth) {
        setOpenMonth(monthKeys.sort().reverse()[0]); // Open latest month
    }
  }, [financialData.monthlyReports, openMonth]);


  const TabButton: React.FC<{tabName: FinancialView, label: string}> = ({ tabName, label }) => (
    <button 
        onClick={() => setView(tabName)}
        className={`px-4 py-2 text-sm font-semibold rounded-t-md focus:outline-none ${view === tabName ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
    >
        {label}
    </button>
  );
  
  const PaymentStatusBadge: React.FC<{status?: PaymentStatus}> = ({ status }) => {
    if (!status) return null;
    const colors: Record<PaymentStatus, string> = {
        [PaymentStatus.UNPAID]: 'bg-red-100 text-red-700',
        [PaymentStatus.PAID]: 'bg-green-100 text-green-700',
        [PaymentStatus.PARTIAL]: 'bg-yellow-100 text-yellow-700',
    };
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
            {status}
        </span>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-y-auto bg-slate-50">
        <div className="flex justify-between items-center border-b border-slate-200">
            <nav className="-mb-px flex space-x-4">
                <TabButton tabName="overview" label="Overview" />
                <TabButton tabName="reports" label="Reports" />
            </nav>
            <div>
                 <select 
                    value={dateRangePreset} 
                    onChange={e => {
                        setDateRangePreset(e.target.value as DateRangePreset);
                        setOpenMonth(null); // Reset open month when range changes
                    }}
                    className="border-slate-300 rounded-lg shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="year_to_date">Year to Date</option>
                    <option value="all">All Time</option>
                </select>
            </div>
        </div>

        {view === 'overview' && (
            <div className="pt-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-800">Completed Service Totals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <MetricCard title="Total Revenue" value={`$${financialData.totalRevenue.toFixed(2)}`} description={`From ${financialData.totalServicesCount} completed services`} />
                    <MetricCard title="Total Costs" value={`$${financialData.totalCosts.toFixed(2)}`} description="Supplier & operational costs" />
                    <MetricCard title="Net Profit" value={`$${financialData.netProfit.toFixed(2)}`} description="Revenue minus costs" />
                </div>
                <h2 className="text-xl font-semibold mb-4 text-slate-800">Live Financials</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                     <MetricCard title="Accounts Receivable" value={`$${financialData.accountsReceivable.toFixed(2)}`} description="Money to be collected" />
                    <MetricCard title="Accounts Payable" value={`$${financialData.accountsPayable.toFixed(2)}`} description="Money to be paid" />
                    <MetricCard title="Outsourced Profit" value={`$${financialData.totalCommission.toFixed(2)}`} description="From completed supplier jobs" />
                </div>
                <AIFinancialAssistant financialData={financialData} />
                <h2 className="text-xl font-semibold mb-4 text-slate-800 mt-8">Profitability Breakdown (Completed Services)</h2>
                <div className="shadow border border-slate-200 sm:rounded-lg overflow-x-auto bg-white max-h-96">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Revenue</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Cost</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Profit</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {financialData.completedServices.length > 0 ? (
                            financialData.completedServices.map(service => {
                              const revenue = service.clientPrice || 0;
                              const cost = service.supplierCost || 0;
                              const profit = revenue - cost;
                              return (
                                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{service.title} <br/><span className="text-slate-500 font-normal">{service.clientName}</span></td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">${revenue.toFixed(2)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">${cost.toFixed(2)}</td>
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${profit.toFixed(2)}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr><td colSpan={4} className="text-center py-10 text-slate-500">No completed services in this period.</td></tr>
                          )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {view === 'reports' && (
            <div className="pt-6 space-y-4">
                {Object.keys(financialData.monthlyReports).length > 0 ? (
                     Object.entries(financialData.monthlyReports)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([monthKey, monthData]) => {
                            const [year, month] = monthKey.split('-');
                            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                            const isOpen = openMonth === monthKey;
                            
                            return (
                                <div key={monthKey} className="bg-white rounded-xl shadow-md border border-slate-200">
                                    <button 
                                        onClick={() => setOpenMonth(isOpen ? null : monthKey)}
                                        className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 rounded-t-xl"
                                    >
                                        <h3 className="text-lg font-bold text-slate-800">{monthName}</h3>
                                        <div className="flex items-center space-x-6 text-sm">
                                            <span><span className="font-semibold">Revenue:</span> ${monthData.totalRevenue.toFixed(2)}</span>
                                            <span><span className="font-semibold">Profit:</span> <span className={`${monthData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${monthData.netProfit.toFixed(2)}</span></span>
                                            <svg className={`w-5 h-5 transition-transform text-slate-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </button>
                                    {isOpen && (
                                        <div className="p-6 border-t border-slate-200 space-y-8 bg-slate-50 rounded-b-xl">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                <div>
                                                     <h4 className="text-md font-semibold text-slate-700 mb-4 text-center">Revenue by Service Type</h4>
                                                     <PieChart data={monthData.revenueByServiceType} />
                                                </div>
                                                <ReportBarChart title="Profit by Driver" data={monthData.profitByDriver} />
                                            </div>
                                            <div>
                                                 <h4 className="text-md font-semibold text-slate-700 mb-2">Completed Services in {monthName}</h4>
                                                 <div className="shadow border border-slate-200 rounded-lg overflow-x-auto max-h-96">
                                                     <table className="min-w-full divide-y divide-slate-200">
                                                        <thead className="bg-slate-100 sticky top-0">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                                                                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Revenue</th>
                                                                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Cost</th>
                                                                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Profit</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-slate-200">
                                                            {monthData.services.map(service => {
                                                                const profit = (service.clientPrice || 0) - (service.supplierCost || 0);
                                                                return (
                                                                    <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                                                        <td className="px-4 py-2 text-sm text-slate-800">{service.title}</td>
                                                                        <td className="px-4 py-2 text-sm text-right">${(service.clientPrice || 0).toFixed(2)}</td>
                                                                        <td className="px-4 py-2 text-sm text-right text-red-600">${(service.supplierCost || 0).toFixed(2)}</td>
                                                                        <td className={`px-4 py-2 text-sm text-right font-semibold ${profit >=0 ? 'text-green-600' : 'text-red-600'}`}>${profit.toFixed(2)}</td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                     </table>
                                                 </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-slate-200">
                        <p className="text-slate-500">No completed services to report in the selected period.</p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};