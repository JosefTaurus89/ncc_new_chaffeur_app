
import React, { useMemo, useState } from 'react';
import { Service, ServiceStatus, User, Supplier, ServiceType, PaymentStatus, AppSettings } from '../../types';
import { AIFinancialAssistant } from './AIFinancialAssistant';
import { TrendChart } from './TrendChart';
import { InvoiceManagement } from './InvoiceManagement';
import { SupplierReports } from '../suppliers/SupplierReports'; // Reuse existing or create new wrapper if needed
import { ClientReports } from './ClientReports';
import { useTranslation } from '../../hooks/useTranslation';

interface FinancialsManagementProps {
  services: Service[];
  drivers: User[];
  suppliers: Supplier[];
  settings: AppSettings;
}

type FinancialView = 'overview' | 'reports' | 'invoices';

const ServiceTypeChartColors: Record<ServiceType, string> = {
  [ServiceType.TRANSFER]: '#8b5cf6',
  [ServiceType.TRANSFER_WITH_STOP]: '#3b82f6',
  [ServiceType.TOUR]: '#10b981',
  [ServiceType.CUSTOM]: '#64748b',
};

const MetricCard: React.FC<{ title: string; value: string; description: string; highlight?: boolean; colorClass?: string }> = ({ title, value, description, highlight, colorClass }) => (
  <div className={`p-6 rounded-xl shadow-md border ${highlight ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
    <h3 className={`text-sm font-medium truncate ${highlight ? 'text-blue-800 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h3>
    <p className={`mt-1 text-3xl font-semibold ${colorClass || (highlight ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100')}`}>{value}</p>
    <p className={`text-sm mt-2 ${highlight ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{description}</p>
  </div>
);

const ReportBarChart: React.FC<{title: string, data: {label: string, value: number}[]}> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 0);
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    return (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-full">
            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-4">{title}</h3>
            <div className="space-y-3">
                {sortedData.map(item => {
                    const isNegative = item.value < 0;
                    const width = maxValue > 0 ? (Math.abs(item.value) / maxValue) * 100 : 0;
                    const barColor = isNegative ? 'bg-red-500' : 'bg-blue-600';

                    return (
                        <div key={item.label} className="grid grid-cols-12 items-center gap-2 text-sm">
                            <span className="col-span-4 text-slate-600 dark:text-slate-400 truncate text-right pr-2">{item.label}</span>
                            <div className="col-span-8 bg-slate-100 dark:bg-slate-700 rounded-full h-6">
                                <div 
                                    className={`${barColor} h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-medium`}
                                    style={{ width: `${Math.max(width, 5)}%` }}
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
        <div className="flex flex-col sm:flex-row items-center justify-center h-full bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-48 h-48 transform -rotate-90 flex-shrink-0">
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
            <div className="mt-4 sm:mt-0 sm:ml-6 space-y-2">
                {data.map(item => (
                    <div key={item.label} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-700 dark:text-slate-300 mr-2">{item.label}:</span>
                        <span className="font-semibold dark:text-slate-100 ml-auto">${item.value.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const FinancialsManagement: React.FC<FinancialsManagementProps> = ({ services, drivers, suppliers, settings }) => {
  const [view, setView] = useState<FinancialView>('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all'); // 'all' or '0' to '11'
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [reportFilterMethod, setReportFilterMethod] = useState<string>('ALL');

  const { t } = useTranslation(settings.language);

  // Generate Year Options
  const yearOptions = useMemo(() => {
      const years = new Set(services.map(s => s.startTime.getFullYear()));
      years.add(new Date().getFullYear());
      return Array.from(years).sort((a, b) => b - a);
  }, [services]);

  // Generate Month Options
  const monthOptions = useMemo(() => {
      const months = [];
      for(let i=0; i<12; i++) {
          const date = new Date(2000, i, 1);
          months.push({ value: i.toString(), label: date.toLocaleString('default', { month: 'long' }) });
      }
      return months;
  }, []);

  const dateRange = useMemo(() => {
    const start = new Date(selectedYear, selectedMonthFilter === 'all' ? 0 : parseInt(selectedMonthFilter), 1);
    const end = new Date(selectedYear, selectedMonthFilter === 'all' ? 11 : parseInt(selectedMonthFilter) + 1, 0, 23, 59, 59);
    return { start, end };
  }, [selectedYear, selectedMonthFilter]);

  const financialData = useMemo(() => {
    const now = new Date();
    const filteredServices = dateRange 
      ? services.filter(s => s.startTime >= dateRange.start && s.startTime <= dateRange.end)
      : services;

    const completedServices = filteredServices.filter(s => s.status === ServiceStatus.COMPLETED);
    
    const totalRevenue = completedServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    const totalCosts = completedServices.reduce((sum, s) => sum + (s.supplierCost || 0), 0);
    const totalExtras = completedServices.reduce((sum, s) => sum + (s.extrasAmount || 0), 0);
    
    // Profit = Revenue - Costs + Extras
    const netProfit = totalRevenue - totalCosts + totalExtras;

    const depositsReceived = filteredServices.reduce((sum, s) => sum + (s.deposit || 0), 0);

    // Cash collected logic (Assuming driver keeps all cash price if method is Cash)
    const cashCollectedByDrivers = completedServices
        .filter(s => s.paymentMethod === 'Cash')
        .reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    
    const supplierLiability = filteredServices
        .filter(s => s.supplierId && s.supplierPaymentStatus !== PaymentStatus.PAID)
        .reduce((sum, s) => sum + (s.supplierCost || 0), 0);

    const futureServices = filteredServices.filter(s => s.startTime > now && s.status !== ServiceStatus.CANCELLED);
    const futureCash = futureServices
        .filter(s => s.paymentMethod === 'Cash')
        .reduce((sum, s) => sum + ((s.clientPrice || 0) - (s.deposit || 0)), 0);
    
    const futureBank = futureServices
        .filter(s => s.paymentMethod !== 'Cash')
        .reduce((sum, s) => sum + ((s.clientPrice || 0) - (s.deposit || 0)), 0);

    const pastServices = filteredServices.filter(s => s.startTime <= now && s.status !== ServiceStatus.CANCELLED);
    const pastPending = pastServices
        .filter(s => s.clientPaymentStatus !== PaymentStatus.PAID)
        .reduce((sum, s) => {
            const balance = (s.clientPrice || 0) - (s.deposit || 0);
            return sum + balance;
        }, 0);

    const monthlyReports: { [key: string]: {
        totalRevenue: number;
        totalCosts: number;
        totalExtras: number;
        netProfit: number;
        services: Service[];
        revenueByServiceType: {label: string, value: number, color: string}[];
        profitByDriver: {label: string, value: number}[];
        cashCollected: number;
        bankCollected: number;
        supplierPaid: number;
        supplierPending: number;
        totalDeposits: number;
    } } = {};

    const allCompletedServices = services.filter(s => s.status === ServiceStatus.COMPLETED);
    const trendMap: {[key: string]: {revenue: number, profit: number}} = {};
    
    allCompletedServices.forEach(service => {
        const monthKey = `${service.startTime.getFullYear()}-${String(service.startTime.getMonth() + 1).padStart(2, '0')}`;
        if (!trendMap[monthKey]) trendMap[monthKey] = { revenue: 0, profit: 0 };
        trendMap[monthKey].revenue += (service.clientPrice || 0);
        // Trend profit also includes extras
        trendMap[monthKey].profit += ((service.clientPrice || 0) - (service.supplierCost || 0) + (service.extrasAmount || 0));
    });
    
    filteredServices.forEach(service => {
        const monthKey = `${service.startTime.getFullYear()}-${String(service.startTime.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyReports[monthKey]) {
             monthlyReports[monthKey] = {
                totalRevenue: 0, totalCosts: 0, totalExtras: 0, netProfit: 0, services: [], 
                revenueByServiceType: [], profitByDriver: [],
                cashCollected: 0, bankCollected: 0, supplierPaid: 0, supplierPending: 0, totalDeposits: 0
            };
        }
        const report = monthlyReports[monthKey];
        report.services.push(service);
        
        if (service.status !== ServiceStatus.CANCELLED) {
             const price = service.clientPrice || 0;
             const cost = service.supplierCost || 0;
             const deposit = service.deposit || 0;
             const extra = service.extrasAmount || 0;
             
             report.totalRevenue += price;
             report.totalCosts += cost;
             report.totalExtras += extra;
             report.netProfit += (price - cost + extra);
             report.totalDeposits += deposit;

             if (service.paymentMethod === 'Cash') {
                 report.cashCollected += (price - deposit);
             } else {
                 report.bankCollected += (price - deposit);
             }
             
             if (service.supplierPaymentStatus === PaymentStatus.PAID) {
                 report.supplierPaid += cost;
             } else {
                 report.supplierPending += cost;
             }
        }
    });
    
    const sortedMonths = Object.keys(trendMap).sort();
    const last6Months = sortedMonths.slice(-6);
    const trendData = last6Months.map(key => {
        const [year, month] = key.split('-');
        const label = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' });
        return {
            label,
            revenue: trendMap[key].revenue,
            profit: trendMap[key].profit
        };
    });

    Object.values(monthlyReports).forEach(report => {
        const revenueByServiceTypeMap: { [key in ServiceType]?: number } = {};
        const profitByDriverMap: { [key: string]: number } = {};

        report.services.forEach(s => {
            if (s.status === ServiceStatus.CANCELLED) return;
            const revenue = s.clientPrice || 0;
            revenueByServiceTypeMap[s.serviceType] = (revenueByServiceTypeMap[s.serviceType] || 0) + revenue;

            if (s.driverId) {
                // Profit contribution includes extra commission
                const profit = revenue - (s.supplierCost || 0) + (s.extrasAmount || 0);
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

    const sortedMonthlyReports = Object.entries(monthlyReports).sort(([a], [b]) => b.localeCompare(a));

    return {
      totalRevenue, totalCosts, totalExtras, netProfit, totalServicesCount: completedServices.length,
      depositsReceived, cashCollectedByDrivers, supplierLiability,
      futureCash, futureBank, pastPending,
      monthlyReports: sortedMonthlyReports, trendData
    };
  }, [services, drivers, suppliers, dateRange]);
  
  React.useEffect(() => {
    if (financialData.monthlyReports.length > 0 && !openMonth) {
        setOpenMonth(financialData.monthlyReports[0][0]); 
    }
  }, [financialData.monthlyReports, openMonth]);


  const TabButton: React.FC<{tabName: FinancialView, label: string}> = ({ tabName, label }) => (
    <button 
        onClick={() => setView(tabName)}
        className={`px-4 py-2 text-sm font-semibold rounded-t-md focus:outline-none ${view === tabName ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
    >
        {label}
    </button>
  );
  
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-wrap gap-2">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
                <TabButton tabName="overview" label={t('overview')} />
                <TabButton tabName="reports" label={t('monthly_reports')} />
                <TabButton tabName="invoices" label={t('invoice_management')} />
            </nav>
            {view !== 'invoices' && (
                <div className="flex items-center gap-2">
                    <select 
                        value={selectedYear} 
                        onChange={e => {
                            setSelectedYear(parseInt(e.target.value));
                            setOpenMonth(null);
                        }}
                        className="bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select 
                        value={selectedMonthFilter} 
                        onChange={e => {
                            setSelectedMonthFilter(e.target.value);
                            setOpenMonth(null);
                        }}
                        className="bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        <option value="all">{t('all_time')}</option>
                        {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            )}
        </div>

        {view === 'overview' && (
            <div className="pt-6 animate-fade-in-down space-y-8">
                {/* Top Level Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title={t('total_amount')} value={`$${financialData.totalRevenue.toFixed(2)}`} description={`From ${financialData.totalServicesCount} completed services`} highlight />
                    <MetricCard title="Total Costs" value={`$${financialData.totalCosts.toFixed(2)}`} description="Supplier costs & Driver pay" />
                     <MetricCard title={t('total_extras')} value={`$${financialData.totalExtras.toFixed(2)}`} description="Commissions earned" />
                    <MetricCard title={t('profit')} value={`$${financialData.netProfit.toFixed(2)}`} description="Revenue - Cost + Extras" />
                </div>
                
                <div className="w-full">
                    <TrendChart data={financialData.trendData} />
                </div>

                {/* Financial Health & Forecast Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {t('financial_health')}
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Actuals & Debt */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2">Current Position (Actuals)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                                    <p className="text-xs text-green-800 dark:text-green-300 font-bold uppercase">{t('cash_collected')}</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">${financialData.cashCollectedByDrivers.toFixed(2)}</p>
                                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">Physical money held</p>
                                </div>
                                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <p className="text-xs text-blue-800 dark:text-blue-300 font-bold uppercase">{t('deposits_received')}</p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">${financialData.depositsReceived.toFixed(2)}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Prepayments</p>
                                </div>
                                 <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800 col-span-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-red-800 dark:text-red-300 font-bold uppercase">{t('supplier_debt')}</p>
                                            <p className="text-2xl font-bold text-red-700 dark:text-red-400">${financialData.supplierLiability.toFixed(2)}</p>
                                            <p className="text-xs text-red-600 dark:text-red-500 mt-1">Total unpaid bills to partners/suppliers</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 uppercase font-bold">{t('past_pending')}</p>
                                            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">${financialData.pastPending.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Forecast */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2">{t('projected_income')}</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('future_cash')}</p>
                                            <p className="text-xs text-slate-500">To be collected by drivers</p>
                                        </div>
                                    </div>
                                    <p className="text-xl font-bold text-green-600">${financialData.futureCash.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('future_bank')}</p>
                                            <p className="text-xs text-slate-500">Cards, Transfers, Invoices</p>
                                        </div>
                                    </div>
                                    <p className="text-xl font-bold text-blue-600">${financialData.futureBank.toFixed(2)}</p>
                                </div>
                                <div className="mt-2 text-right">
                                    <span className="text-xs font-bold uppercase text-slate-500 mr-2">Total Projected:</span>
                                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">${(financialData.futureCash + financialData.futureBank).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <AIFinancialAssistant financialData={financialData} />
            </div>
        )}

        {view === 'reports' && (
            <div className="pt-6 space-y-4 animate-fade-in-down">
                {financialData.monthlyReports.length > 0 ? (
                     financialData.monthlyReports.map(([monthKey, monthData]) => {
                            const [year, month] = monthKey.split('-');
                            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                            const isOpen = openMonth === monthKey;
                            
                            const filteredServices = monthData.services.filter(s => {
                                if (reportFilterMethod === 'ALL') return true;
                                if (reportFilterMethod === 'Cash') return s.paymentMethod === 'Cash';
                                if (reportFilterMethod === 'Card/Bank') return s.paymentMethod !== 'Cash';
                                return true;
                            });

                            return (
                                <div key={monthKey} className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <button 
                                        onClick={() => setOpenMonth(isOpen ? null : monthKey)}
                                        className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{monthName}</h3>
                                            <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 font-medium">
                                                {monthData.services.length} Services
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 md:space-x-6 text-sm">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-slate-500 uppercase font-bold">Revenue</p>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">${monthData.totalRevenue.toFixed(2)}</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-slate-500 uppercase font-bold">Profit</p>
                                                <p className={`font-bold ${monthData.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>${monthData.netProfit.toFixed(2)}</p>
                                            </div>
                                            <svg className={`w-6 h-6 transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </button>
                                    
                                    {isOpen && (
                                        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-6">
                                            {/* Detailed breakdown cards for this month */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <p className="text-xs font-bold text-green-600 uppercase">{t('cash_collected')}</p>
                                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">${monthData.cashCollected.toFixed(2)}</p>
                                                </div>
                                                 <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <p className="text-xs font-bold text-blue-600 uppercase">Digital/Bank Revenue</p>
                                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">${monthData.bankCollected.toFixed(2)}</p>
                                                </div>
                                                 <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <p className="text-xs font-bold text-indigo-600 uppercase">{t('deposits_received')}</p>
                                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">${monthData.totalDeposits.toFixed(2)}</p>
                                                </div>
                                                 <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <p className="text-xs font-bold text-red-600 uppercase">Supplier Costs (Paid: ${monthData.supplierPaid.toFixed(0)})</p>
                                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">${monthData.totalCosts.toFixed(2)}</p>
                                                </div>
                                            </div>
                                            
                                            {monthData.totalExtras > 0 && (
                                                 <div className="mb-8 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between">
                                                    <div>
                                                        <h5 className="font-bold text-purple-800 dark:text-purple-200 text-sm uppercase">Total Extra Commission</h5>
                                                        <p className="text-xs text-purple-600 dark:text-purple-300">Included in profit calculation</p>
                                                    </div>
                                                    <span className="text-2xl font-black text-purple-700 dark:text-purple-300">+${monthData.totalExtras.toFixed(2)}</span>
                                                 </div>
                                            )}

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 h-80">
                                                <PieChart data={monthData.revenueByServiceType} />
                                                <ReportBarChart title="Profit by Driver" data={monthData.profitByDriver} />
                                            </div>
                                            
                                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                     <h4 className="text-md font-bold text-slate-700 dark:text-slate-200">Service Details</h4>
                                                     <select 
                                                        value={reportFilterMethod}
                                                        onChange={(e) => setReportFilterMethod(e.target.value)}
                                                        className="text-xs bg-slate-50 text-slate-900 border-slate-300 rounded shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                                     >
                                                         <option value="ALL">All Payment Methods</option>
                                                         <option value="Cash">Cash Only</option>
                                                         <option value="Card/Bank">Card / Bank Transfer</option>
                                                     </select>
                                                </div>
                                                <div className="overflow-x-auto max-h-96">
                                                     <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                                        <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Service</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Type</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Method</th>
                                                                <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Revenue</th>
                                                                <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Cost</th>
                                                                 <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Extras</th>
                                                                <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Profit</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                            {filteredServices.map(service => {
                                                                const profit = (service.clientPrice || 0) - (service.supplierCost || 0) + (service.extrasAmount || 0);
                                                                return (
                                                                    <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                                        <td className="px-4 py-2">
                                                                            <div className="font-medium text-slate-900 dark:text-slate-100">{service.title}</div>
                                                                            <div className="text-xs text-slate-500">{new Date(service.startTime).toLocaleDateString()}</div>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                                                                            {service.serviceType.replace(/_/g, ' ')}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                                                             <span className={`text-xs px-2 py-0.5 rounded ${service.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                                                                {service.paymentMethod || '-'}
                                                                             </span>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">${(service.clientPrice || 0).toFixed(2)}</td>
                                                                        <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">${(service.supplierCost || 0).toFixed(2)}</td>
                                                                        <td className="px-4 py-2 text-right text-purple-600 dark:text-purple-400">{(service.extrasAmount || 0) > 0 ? `+$${service.extrasAmount?.toFixed(2)}` : '-'}</td>
                                                                        <td className={`px-4 py-2 text-right font-bold ${profit >=0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>${profit.toFixed(2)}</td>
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
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400">No completed services found for this period.</p>
                    </div>
                )}
            </div>
        )}

        {view === 'invoices' && (
            <div className="pt-6 h-full">
                <InvoiceManagement services={services} suppliers={suppliers} settings={settings} />
            </div>
        )}
    </div>
  );
};
