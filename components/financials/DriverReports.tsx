
import React, { useState, useMemo } from 'react';
import { Service, User, PaymentStatus } from '../../types';

interface DriverReportsProps {
  drivers: User[];
  services: Service[];
}

const MetricCard: React.FC<{ title: string; value: string; subtitle?: string; color?: string }> = ({ title, value, subtitle, color }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</h3>
    <p className={`mt-1 text-2xl font-semibold ${color || 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

export const DriverReports: React.FC<DriverReportsProps> = ({ drivers, services }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const driverData = useMemo(() => {
    if (!selectedDriverId) return null;
    
    const driverServices = services.filter(s => s.driverId === selectedDriverId);
    const totalServices = driverServices.length;

    // 1. Total Revenue: What the client is charged for trips done by this driver
    const totalRevenue = driverServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);

    // 2. Driver Pay: What the company AGREED to pay the driver (stored in supplierCost)
    const totalDriverPay = driverServices.reduce((sum, s) => sum + (s.supplierCost || 0), 0);

    // 3. Cash Collected: Money the driver physically took from clients
    // Logic: If paymentMethod is 'Cash', the driver holds the full 'clientPrice' amount.
    const cashCollected = driverServices
        .filter(s => s.paymentMethod === 'Cash')
        .reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    
    // 4. Net Payable: What company owes driver. 
    // Formula: (Driver Pay) - (Cash they kept)
    // If Positive: Company pays Driver.
    // If Negative: Driver pays Company (they collected more cash than their wage).
    const netPayable = totalDriverPay - cashCollected;

    const filteredServices = driverServices.filter(service => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return service.title.toLowerCase().includes(query) || service.clientName.toLowerCase().includes(query);
    }).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return { totalServices, totalRevenue, totalDriverPay, cashCollected, netPayable, filteredServices };
  }, [selectedDriverId, services, searchQuery]);

  return (
    <div className="space-y-6">
        <div>
            <label htmlFor="driver-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select a Driver</label>
            <select
                id="driver-select"
                value={selectedDriverId}
                onChange={e => setSelectedDriverId(e.target.value)}
                className="mt-1 block w-full md:w-1/3 bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
                <option value="">-- View report for --</option>
                {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                ))}
            </select>
        </div>

        {driverData && (
            <div className="animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard title="Total Services" value={driverData.totalServices.toString()} />
                    <MetricCard title="Total Agreed Pay" value={`$${driverData.totalDriverPay.toFixed(2)}`} subtitle="Wages / Commission" />
                    <MetricCard 
                        title="Cash Collected" 
                        value={`$${driverData.cashCollected.toFixed(2)}`} 
                        subtitle="Held by Driver" 
                        color="text-orange-600 dark:text-orange-400" 
                    />
                    <MetricCard 
                        title={driverData.netPayable >= 0 ? "Net Payable to Driver" : "Driver Owes Company"} 
                        value={`$${Math.abs(driverData.netPayable).toFixed(2)}`} 
                        subtitle={driverData.netPayable >= 0 ? "(Pay - Cash Held)" : "(Cash Held > Pay)"}
                        color={driverData.netPayable >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                    />
                </div>

                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by service title or client name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="block w-full md:w-1/2 pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="shadow border border-slate-200 dark:border-slate-700 sm:rounded-lg overflow-x-auto bg-white dark:bg-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100 dark:bg-slate-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Service</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Client</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Method</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Total Price</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Agreed Pay</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Cash Held</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {driverData.filteredServices.map(service => {
                                const isCash = service.paymentMethod === 'Cash';
                                return (
                                <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(service.startTime).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{service.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{service.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isCash ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 ring-1 ring-green-500' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {service.paymentMethod || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-300">{`$${(service.clientPrice || 0).toFixed(2)}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                                        {service.supplierCost ? `$${service.supplierCost.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-orange-600 dark:text-orange-400">
                                        {isCash ? `$${(service.clientPrice || 0).toFixed(2)}` : '-'}
                                    </td>
                                </tr>
                            )})}
                            {driverData.filteredServices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">No services found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
         {!selectedDriverId && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">Please select a driver to view their settlement report.</p>
            </div>
        )}

    </div>
  )
}
