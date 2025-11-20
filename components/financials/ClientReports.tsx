
import React, { useState, useMemo } from 'react';
import { Service, PaymentStatus, AppSettings } from '../../types';
import { printReport } from '../../lib/print-utils';
import { downloadCSV } from '../../lib/csv-utils';
import { useTranslation } from '../../hooks/useTranslation';

interface ClientReportsProps {
  services: Service[];
  settings: AppSettings;
}

const MetricCard: React.FC<{ title: string; value: string; isHighlighted?: boolean }> = ({ title, value, isHighlighted }) => (
  <div className={`p-4 rounded-lg shadow-sm border ${isHighlighted ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
    <h3 className={`text-sm font-medium truncate ${isHighlighted ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h3>
    <p className={`mt-1 text-2xl font-semibold ${isHighlighted ? 'text-blue-700 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
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

export const ClientReports: React.FC<ClientReportsProps> = ({ services, settings }) => {
  const { t } = useTranslation(settings.language);

  // Get unique client names (Agencies)
  const clientNames = useMemo(() => {
    const names = new Set(services.map(s => s.clientName));
    return Array.from(names).sort();
  }, [services]);

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');

  const clientData = useMemo(() => {
    if (!selectedClient) return null;
    
    // Filter by Client Name AND Selected Month
    const filteredServices = services.filter(s => {
        if (s.clientName !== selectedClient) return false;
        if (!selectedMonth) return true;
        
        const serviceMonth = s.startTime.toISOString().slice(0, 7);
        return serviceMonth === selectedMonth;
    });

    const totalServices = filteredServices.length;
    const totalBilled = filteredServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    
    const outstandingBalance = filteredServices
        .filter(s => s.clientPaymentStatus === PaymentStatus.UNPAID || s.clientPaymentStatus === PaymentStatus.PARTIAL)
        .reduce((sum, s) => {
            const price = s.clientPrice || 0;
            const deposit = s.deposit || 0;
            if (s.clientPaymentStatus === PaymentStatus.PAID) return sum;
            return sum + Math.max(0, price - deposit);
        }, 0);
    
    const totalPaid = totalBilled - outstandingBalance;

    const displayServices = filteredServices.filter(service => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return service.title.toLowerCase().includes(query) || service.pickupAddress.toLowerCase().includes(query);
    }).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return { totalServices, totalBilled, totalPaid, outstandingBalance, displayServices };
  }, [selectedClient, services, selectedMonth, searchQuery]);

  const handlePrint = () => {
    if (!clientData || !selectedClient) return;
    
    const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[settings.language] || 'en-US';
    const monthName = new Date(selectedMonth + '-01').toLocaleString(locale, { month: 'long', year: 'numeric' });
    
    const metrics = [
        { label: t('total_services'), value: clientData.totalServices.toString() },
        { label: t('total_billed'), value: `$${clientData.totalBilled.toFixed(2)}` },
        { label: t('outstanding_balance'), value: `$${clientData.outstandingBalance.toFixed(2)}` }
    ];

    const headers = [t('date'), t('service'), t('passengers'), t('payment_method'), t('client_price'), t('deposit'), t('balance_due'), t('status')];
    const rows = clientData.displayServices.map(s => {
        const price = s.clientPrice || 0;
        const deposit = s.deposit || 0;
        const balance = Math.max(0, price - deposit);
        
        return [
            new Date(s.startTime).toLocaleDateString(locale),
            s.title,
            s.numberOfPassengers || '-',
            s.paymentMethod || 'Not specified',
            `$${price.toFixed(2)}`,
            `$${deposit.toFixed(2)}`,
            `$${balance.toFixed(2)}`,
            s.clientPaymentStatus || '-'
        ];
    });

    printReport(
        `Agency Report: ${selectedClient}`, 
        `Period: ${monthName}`, 
        metrics, 
        headers, 
        rows
    );
  };

  const handleExportCSV = () => {
      if (!clientData || !selectedClient) return;
      const monthName = selectedMonth;
      const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
      const locale = localeMap[settings.language] || 'en-US';
      
      const headers = [t('date'), t('service'), t('passengers'), t('payment_method'), t('client_price'), t('deposit'), t('balance_due'), t('status')];
      const rows = clientData.displayServices.map(s => {
          const price = s.clientPrice || 0;
          const deposit = s.deposit || 0;
          const balance = Math.max(0, price - deposit);
          
          return [
            new Date(s.startTime).toLocaleDateString(locale),
            s.title,
            s.numberOfPassengers,
            s.paymentMethod || 'N/A',
            price.toFixed(2),
            deposit.toFixed(2),
            balance.toFixed(2),
            s.clientPaymentStatus || 'N/A'
          ];
      });

      downloadCSV(`agency_report_${selectedClient.replace(/\s/g, '_')}_${monthName}`, headers, rows);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
                <label htmlFor="client-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select Agency</label>
                <select
                    id="client-select"
                    value={selectedClient}
                    onChange={e => setSelectedClient(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                    <option value="">-- Select Agency --</option>
                    {clientNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="w-full md:w-48">
                <label htmlFor="month-select-client" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Period</label>
                <input 
                    type="month" 
                    id="month-select-client"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
            </div>
             <div className="flex items-end space-x-2">
                <button
                    onClick={handleExportCSV}
                    disabled={!selectedClient || !clientData}
                    className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-lg shadow-sm hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed transition-colors"
                >
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                   Export CSV
                </button>
                <button
                    onClick={handlePrint}
                    disabled={!selectedClient || !clientData}
                    className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Print PDF
                </button>
            </div>
        </div>

        {clientData && selectedClient && (
            <div className="animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <MetricCard title={t('total_services')} value={clientData.totalServices.toString()} />
                    <MetricCard title={t('total_billed')} value={`$${clientData.totalBilled.toFixed(2)}`} />
                    <MetricCard title={t('outstanding_balance')} value={`$${clientData.outstandingBalance.toFixed(2)}`} isHighlighted={clientData.outstandingBalance > 0} />
                </div>

                 <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="block w-full md:w-1/2 pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="shadow border border-slate-200 dark:border-slate-700 sm:rounded-lg overflow-x-auto bg-white dark:bg-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('service')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('payment_method')}</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('client_price')}</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('deposit')}</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('balance_due')}</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('status')}</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {clientData.displayServices.map(service => {
                                const price = service.clientPrice || 0;
                                const deposit = service.deposit || 0;
                                const balance = Math.max(0, price - deposit);
                                
                                return (
                                <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(service.startTime).toLocaleDateString(settings.language === 'it' ? 'it-IT' : (settings.language === 'es' ? 'es-ES' : (settings.language === 'fr' ? 'fr-FR' : 'en-US')))}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{service.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{service.paymentMethod || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900 dark:text-slate-100 font-medium">{`$${price.toFixed(2)}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500 dark:text-slate-400">{`$${deposit.toFixed(2)}`}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{`$${balance.toFixed(2)}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center"><PaymentStatusBadge status={service.clientPaymentStatus} /></td>
                                </tr>
                            )})}
                            {clientData.displayServices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">No services found for this period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        {!selectedClient && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">Please select an Agency to generate the report.</p>
            </div>
        )}
    </div>
  )
}