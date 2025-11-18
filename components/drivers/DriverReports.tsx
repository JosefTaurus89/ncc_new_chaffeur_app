import React, { useState, useMemo } from 'react';
import { Service, User, PaymentStatus } from '../../types';

interface DriverReportsProps {
  drivers: User[];
  services: Service[];
}

const MetricCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</h3>
    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
  </div>
);

const PaymentStatusBadge: React.FC<{status?: PaymentStatus}> = ({ status }) => {
    if (!status) return <span className="text-slate-400 dark:text-slate-500">-</span>;
    const colors: Record<PaymentStatus, string> = {
        [PaymentStatus.UNPAID]: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        [PaymentStatus.PAID]: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        [PaymentStatus.PARTIAL]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300',
    };
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
            {status}
        </span>
    );
}

export const DriverReports: React.FC<DriverReportsProps> = ({ drivers, services }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const driverData = useMemo(() => {
    if (!selectedDriverId) return null;
    
    const driverServices = services.filter(s => s.driverId === selectedDriverId);
    const totalServices = driverServices.length;
    const totalRevenue = driverServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    const outstandingPayments = driverServices
        .filter(s => s.clientPaymentStatus === PaymentStatus.UNPAID || s.clientPaymentStatus === PaymentStatus.PARTIAL)
        .reduce((sum, s) => sum + (s.clientPrice || 0), 0);

    const filteredServices = driverServices.filter(service => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return service.title.toLowerCase().includes(query) || service.clientName.toLowerCase().includes(query);
    }).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return { totalServices, totalRevenue, outstandingPayments, filteredServices };
  }, [selectedDriverId, services, searchQuery]);

  return (
    <div className="space-y-6">
        <div>
            <label htmlFor="driver-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select a Driver</label>
            <select
                id="driver-select"
                value={selectedDriverId}
                onChange={e => setSelectedDriverId(e.target.value)}
                className="mt-1 block w-full md:w-1/3 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600"
            >
                <option value="">-- View report for --</option>
                {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                ))}
            </select>
        </div>

        {driverData && (
            <div className="animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <MetricCard title="Total Services" value={driverData.totalServices.toString()} />
                    <MetricCard title="Total Revenue Generated" value={`$${driverData.totalRevenue.toFixed(2)}`} />
                    <MetricCard title="Outstanding Client Payments" value={`$${driverData.outstandingPayments.toFixed(2)}`} />
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
                        className="block w-full md:w-1/2 pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    />
                </div>

                <div className="shadow border border-slate-200 dark:border-slate-700 sm:rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Service</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Client</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Revenue</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Payment Status</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                            {driverData.filteredServices.map(service => (
                                <tr key={service.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(service.startTime).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{service.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{service.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-300">{`$${(service.clientPrice || 0).toFixed(2)}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center"><PaymentStatusBadge status={service.clientPaymentStatus} /></td>
                                </tr>
                            ))}
                            {driverData.filteredServices.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">No services found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
         {!selectedDriverId && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">Please select a driver to view their report.</p>
            </div>
        )}

    </div>
  )
}
