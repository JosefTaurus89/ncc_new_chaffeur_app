
import React, { useState, useMemo } from 'react';
import { Service, Supplier, PaymentStatus, AppSettings } from '../../types';
import { printReport } from '../../lib/print-utils';
import { downloadCSV } from '../../lib/csv-utils';
import { useTranslation } from '../../hooks/useTranslation';

interface SupplierReportsProps {
  suppliers: Supplier[];
  services: Service[];
  settings: AppSettings;
}

const MetricCard: React.FC<{ title: string; value: string; subtitle?: string; color?: string }> = ({ title, value, subtitle, color }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</h3>
    <p className={`mt-1 text-2xl font-semibold ${color || 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
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

export const SupplierReports: React.FC<SupplierReportsProps> = ({ suppliers, services, settings }) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation(settings.language);

  const supplierData = useMemo(() => {
    if (!selectedSupplierId) return null;
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return null;

    // --- 1. AGGREGATE ALL HISTORY FOR YEARLY SUMMARY ---
    const allHistoryServices = services.filter(s => s.supplierId === selectedSupplierId || s.clientName === supplier.name);
    
    const monthlyAggregates: Record<string, {
        month: string;
        servicesCount: number;
        payable: number;
        receivable: number;
        net: number;
    }> = {};

    allHistoryServices.forEach(s => {
        // Use local time for grouping
        const sDate = new Date(s.startTime);
        const monthKey = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyAggregates[monthKey]) {
            monthlyAggregates[monthKey] = { month: monthKey, servicesCount: 0, payable: 0, receivable: 0, net: 0 };
        }
        
        monthlyAggregates[monthKey].servicesCount++;
        
        if (s.supplierId === selectedSupplierId) {
            // Outsourced (Payable)
            monthlyAggregates[monthKey].payable += (s.supplierCost || 0);
        }
        if (s.clientName === supplier.name) {
            // Agency Job (Receivable)
            monthlyAggregates[monthKey].receivable += (s.clientPrice || 0);
        }
    });

    // Calculate Net for each month and convert to array sorted by date desc
    const yearlySummary = Object.values(monthlyAggregates).map(item => ({
        ...item,
        net: item.receivable - item.payable
    })).sort((a, b) => b.month.localeCompare(a.month));


    // --- 2. FILTER FOR SELECTED MONTH DETAIL VIEW ---
    
    // 1. OUTSOURCED: Services where they are the SUPPLIER (We owe them)
    const outsourcedServices = services.filter(s => {
        if (s.supplierId !== selectedSupplierId) return false;
        if (selectedMonth) {
             const sDate = new Date(s.startTime);
             const sMonth = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
             if (sMonth !== selectedMonth) return false;
        }
        return true;
    });

    // 2. AGENCY/CLIENT: Services where they are the CLIENT (They owe us)
    const agencyServices = services.filter(s => {
        if (s.clientName !== supplier.name) return false;
        if (selectedMonth) {
             const sDate = new Date(s.startTime);
             const sMonth = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
             if (sMonth !== selectedMonth) return false;
        }
        return true;
    });

    // Combine lists for display
    const combinedServices = [
        ...outsourcedServices.map(s => ({ ...s, reportType: 'OUTSOURCED' as const })),
        ...agencyServices.map(s => ({ ...s, reportType: 'AGENCY' as const }))
    ];

    // Filtering by search query
    const displayServices = combinedServices.filter(service => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return service.title.toLowerCase().includes(query) || service.title.toLowerCase().includes(query);
    }).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Calculations for Selected Month
    const totalPayable = outsourcedServices.reduce((sum, s) => sum + (s.supplierCost || 0), 0);
    const totalReceivable = agencyServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);
    
    // Calculate amount held by supplier for the selected month (Cash Balance + Extras)
    const totalHeldBySupplier = outsourcedServices.reduce((sum, s) => {
        const isPrepaid = s.paymentMethod === 'Prepaid' || s.paymentMethod === 'Future Invoice';
        const price = s.clientPrice || 0;
        const deposit = s.deposit || 0;
        const balanceDue = isPrepaid ? 0 : Math.max(0, price - deposit);
        return sum + balanceDue + (s.extrasAmount || 0);
    }, 0);
    
    // Outstanding (Unpaid) for Selected Month
    const outstandingPayable = outsourcedServices
        .filter(s => s.supplierPaymentStatus !== PaymentStatus.PAID)
        .reduce((sum, s) => sum + (s.supplierCost || 0), 0);

    const outstandingReceivable = agencyServices
        .filter(s => s.clientPaymentStatus !== PaymentStatus.PAID)
        .reduce((sum, s) => sum + Math.max(0, (s.clientPrice || 0) - (s.deposit || 0)), 0);

    const netBalance = totalReceivable - (totalPayable - totalHeldBySupplier);

    return { 
        supplierName: supplier.name,
        yearlySummary,
        totalServices: combinedServices.length, 
        totalPayable,
        totalReceivable,
        totalHeldBySupplier,
        outstandingPayable,
        outstandingReceivable,
        netBalance,
        displayServices 
    };
  }, [selectedSupplierId, services, selectedMonth, searchQuery, suppliers]);

  const handlePrint = () => {
    if (!supplierData || !selectedSupplierId) return;
    
    const locale = settings.language === 'it' ? 'it-IT' : (settings.language === 'es' ? 'es-ES' : (settings.language === 'fr' ? 'fr-FR' : 'en-US'));
    const monthName = new Date(selectedMonth + '-01').toLocaleString(locale, { month: 'long', year: 'numeric' });
    
    const metrics = [
        { label: 'Period', value: monthName },
        { label: t('amount_payable'), value: `$${supplierData.totalPayable.toFixed(2)}` },
        { label: t('supplier_holds_cash'), value: `$${supplierData.totalHeldBySupplier.toFixed(2)}` },
        { label: t('amount_receivable'), value: `$${supplierData.totalReceivable.toFixed(2)}` },
        { label: t('net_balance'), value: `${supplierData.netBalance >= 0 ? '+' : ''}$${supplierData.netBalance.toFixed(2)}` }
    ];

    const headers = [
        t('date'), 
        t('service'), 
        t('type'), 
        t('payment_method'),
        t('payable_cost'), 
        t('supplier_holds'),
        t('receivable_price'),
        t('net_balance'),
        t('status')
    ];
    
    const rows = supplierData.displayServices.map(s => {
        let cost = 0;
        let held = 0;
        let receivable = 0;
        let net = 0;

        if (s.reportType === 'OUTSOURCED') {
             cost = s.supplierCost || 0;
             const isPrepaid = s.paymentMethod === 'Prepaid' || s.paymentMethod === 'Future Invoice';
             const balance = isPrepaid ? 0 : Math.max(0, (s.clientPrice || 0) - (s.deposit || 0));
             held = balance + (s.extrasAmount || 0);
             net = cost - held;
        } else {
            // Agency Job
            receivable = s.clientPrice || 0;
            // Supplier owes Agency
            net = -receivable; 
        }
        
        return [
            new Date(s.startTime).toLocaleDateString(locale),
            s.title,
            s.reportType === 'OUTSOURCED' ? 'Outsourced' : 'Agency Job',
            s.paymentMethod || '-',
            s.reportType === 'OUTSOURCED' ? `$${cost.toFixed(2)}` : '-',
            s.reportType === 'OUTSOURCED' ? `$${held.toFixed(2)}` : '-',
            s.reportType === 'AGENCY' ? `$${receivable.toFixed(2)}` : '-',
            `<span style="font-weight:bold; color:${net > 0 ? '#dc2626' : '#16a34a'}">${net > 0 ? 'To Prov: ' : 'To Agcy: '}$${Math.abs(net).toFixed(2)}</span>`,
            (s.reportType === 'OUTSOURCED' ? s.supplierPaymentStatus : s.clientPaymentStatus) || '-'
        ]
    });

     // Add Calculation Footer Rows
    // Row 1: Totals
    rows.push([
        "", "", "", `<b>${t('totals_upper')}</b>`, 
        `<b>$${supplierData.totalPayable.toFixed(2)}</b>`, 
        `<b>$${supplierData.totalHeldBySupplier.toFixed(2)}</b>`, 
        `<b>$${supplierData.totalReceivable.toFixed(2)}</b>`, 
        "", ""
    ]);

    // Row 2: Math Explanation
    const finalDirection = supplierData.netBalance >= 0 ? t('report_supplier_pays_agency') : t('report_agency_pays_supplier');

    const finalAmount = Math.abs(supplierData.netBalance);

    rows.push([
        "", "", "", "",
        `<i>${t('report_total_cost')}</i>`, 
        `<i>${t('report_total_held')}</i>`, 
        `<i>${t('report_agency_price')}</i>`, 
        `<b>${t('report_final_total')}</b>`, ""
    ]);

    rows.push([
        "", "", "", `<b>${t('report_final_settlement')}</b>`, 
        "", "", "",
        `<b style="font-size: 14px;">$${finalAmount.toFixed(2)}</b><br/><i>${finalDirection}</i>`, 
        ""
    ]);

    printReport(
        `Statement: ${supplierData.supplierName}`, 
        `Generated via NCC`, 
        metrics, 
        headers, 
        rows
    );
  };

  const handleExportCSV = () => {
      if (!supplierData || !selectedSupplierId) return;
      const monthName = selectedMonth;
      const locale = settings.language === 'it' ? 'it-IT' : (settings.language === 'es' ? 'es-ES' : (settings.language === 'fr' ? 'fr-FR' : 'en-US'));
      
      const headers = [
          t('date'), 
          t('service'), 
          t('type'), 
          t('payment_method'),
          t('amount_payable'), 
          t('supplier_holds'), 
          t('amount_receivable'), 
          "Net Settlement", 
          t('status')
      ];
      
      const rows = supplierData.displayServices.map(s => {
          let cost = 0;
          let held = 0;
          let receivable = 0;
          let net = 0;

           if (s.reportType === 'OUTSOURCED') {
                cost = s.supplierCost || 0;
                const isPrepaid = s.paymentMethod === 'Prepaid' || s.paymentMethod === 'Future Invoice';
                const balance = isPrepaid ? 0 : Math.max(0, (s.clientPrice || 0) - (s.deposit || 0));
                held = balance + (s.extrasAmount || 0);
                net = cost - held;
           } else {
                receivable = s.clientPrice || 0;
                net = -receivable;
           }

          return [
            new Date(s.startTime).toLocaleDateString(locale),
            s.title,
            s.reportType,
            s.paymentMethod || 'N/A',
            s.reportType === 'OUTSOURCED' ? cost.toFixed(2) : '0.00',
            s.reportType === 'OUTSOURCED' ? held.toFixed(2) : '0.00',
            s.reportType === 'AGENCY' ? receivable.toFixed(2) : '0.00',
            net.toFixed(2),
            (s.reportType === 'OUTSOURCED' ? s.supplierPaymentStatus : s.clientPaymentStatus) || 'N/A'
          ]
      });

      // Add Footer Rows to CSV
      rows.push(["", "", "", "", "", "", "", "", ""]); // Spacer
      rows.push(["", "", "", t('totals_upper'), 
          supplierData.totalPayable.toFixed(2), 
          supplierData.totalHeldBySupplier.toFixed(2), 
          supplierData.totalReceivable.toFixed(2), 
          "", ""
      ]);

      const direction = supplierData.netBalance >= 0 ? t('report_supplier_pays_agency') : t('report_agency_pays_supplier');
      const absAmount = Math.abs(supplierData.netBalance).toFixed(2);
      
      const checkMath = supplierData.totalReceivable - supplierData.totalPayable + supplierData.totalHeldBySupplier;
      
      rows.push(["", "", "", t('calculation'), 
          `(-${supplierData.totalPayable.toFixed(2)})`, 
          `(+${supplierData.totalHeldBySupplier.toFixed(2)})`, 
          `(+${supplierData.totalReceivable.toFixed(2)})`, 
          `= ${checkMath.toFixed(2)}`, 
          ""
      ]);
      
      rows.push(["", "", "", t('report_final_settlement'), "", "", "", `${absAmount} (${direction})`, ""]);

      downloadCSV(`statement_${supplierData.supplierName.replace(/\s/g, '_')}_${monthName}`, headers, rows);
  };

  return (
    <div className="space-y-6">
        {/* Selection Header */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <label htmlFor="supplier-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('select_supplier_partner')}</label>
            <select
                id="supplier-select"
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="block w-full max-w-md bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
                <option value="">-- Select --</option>
                {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
            </select>
        </div>

        {supplierData && selectedSupplierId && (
            <div className="animate-fade-in-down space-y-8">
                
                {/* Yearly Summary Table */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Yearly Performance Overview</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('month')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('total_services')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('payable_cost')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('receivable_price')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('net_balance')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                {supplierData.yearlySummary.map((summary) => (
                                    <tr key={summary.month} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${summary.month === selectedMonth ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {new Date(summary.month + '-01').toLocaleString(settings.language === 'it' ? 'it-IT' : (settings.language === 'es' ? 'es-ES' : (settings.language === 'fr' ? 'fr-FR' : 'en-US')), { month: 'long', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-500 dark:text-slate-400">
                                            {summary.servicesCount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                                            ${summary.payable.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                                            ${summary.receivable.toFixed(2)}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${summary.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                            {summary.net >= 0 ? '+' : ''}{summary.net.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button 
                                                onClick={() => setSelectedMonth(summary.month)}
                                                className="text-xs text-primary-600 hover:text-primary-800 font-semibold underline"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {supplierData.yearlySummary.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-6 text-slate-500">No activity found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detailed Monthly Breakdown Header */}
                <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 dark:border-slate-700 pb-4 mt-8">
                    <div>
                         <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Detailed Report: {new Date(selectedMonth + '-01').toLocaleString(settings.language === 'it' ? 'it-IT' : (settings.language === 'es' ? 'es-ES' : (settings.language === 'fr' ? 'fr-FR' : 'en-US')), { month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Detailed list of services and financial status.</p>
                    </div>
                    <div className="flex space-x-2 mt-4 md:mt-0">
                         <button
                            onClick={handleExportCSV}
                            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            CSV
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            PDF
                        </button>
                    </div>
                </div>

                {/* Metrics for Selected Month */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard 
                        title={t('amount_payable')}
                        value={`$${supplierData.totalPayable.toFixed(2)}`} 
                        subtitle={`${t('outstanding_balance')}: $${supplierData.outstandingPayable.toFixed(2)}`}
                        color="text-red-600 dark:text-red-400"
                    />
                    <MetricCard 
                        title={t('amount_receivable')} 
                        value={`$${supplierData.totalReceivable.toFixed(2)}`} 
                        subtitle={`${t('outstanding_balance')}: $${supplierData.outstandingReceivable.toFixed(2)}`}
                        color="text-green-600 dark:text-green-400"
                    />
                    <MetricCard 
                        title={t('net_balance')} 
                        value={`${supplierData.netBalance >= 0 ? '+' : ''}$${supplierData.netBalance.toFixed(2)}`} 
                        subtitle={supplierData.netBalance >= 0 ? "They owe you" : "You owe them"}
                        color={supplierData.netBalance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}
                    />
                    <MetricCard 
                        title={t('total_services')}
                        value={supplierData.totalServices.toString()} 
                        subtitle="Combined In/Out"
                    />
                </div>

                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search services in this month..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    />
                </div>

                <div className="shadow border border-slate-200 dark:border-slate-700 sm:rounded-lg overflow-x-auto bg-white dark:bg-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('service')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('type')}</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('payable_cost')}</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('receivable_price')}</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('status')}</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {supplierData.displayServices.map(service => {
                                const isOutsourced = service.reportType === 'OUTSOURCED';
                                return (
                                <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(service.startTime).toLocaleDateString(settings.language === 'it' ? 'it-IT' : 'en-US')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{service.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isOutsourced ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                            {isOutsourced ? 'Outsourced' : 'Agency Job'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 font-medium">
                                        {isOutsourced ? `$${(service.supplierCost || 0).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-medium">
                                        {isOutsourced ? '-' : `$${(service.clientPrice || 0).toFixed(2)}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <PaymentStatusBadge status={isOutsourced ? service.supplierPaymentStatus : service.clientPaymentStatus} />
                                    </td>
                                </tr>
                            )})}
                            {supplierData.displayServices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">No services found for this period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        {!selectedSupplierId && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">Please select a supplier to view their performance and statement.</p>
            </div>
        )}
    </div>
  )
}
