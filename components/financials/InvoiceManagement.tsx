
import React, { useState, useMemo } from 'react';
import { Service, Supplier, PaymentStatus, AppSettings } from '../../types';
import { printReport } from '../../lib/print-utils';
import { downloadCSV } from '../../lib/csv-utils';
import { useTranslation } from '../../hooks/useTranslation';

interface InvoiceManagementProps {
  services: Service[];
  suppliers: Supplier[];
  settings: AppSettings;
}

type InvoiceMode = 'RECEIVABLE' | 'PAYABLE'; // Receivable (Clients owe us) | Payable (We owe suppliers)

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({ services, suppliers, settings }) => {
  const [mode, setMode] = useState<InvoiceMode>('RECEIVABLE');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>(''); // Specific Client Name or Supplier ID
  const { t } = useTranslation(settings.language);

  // Get unique client names for filter dropdown
  const clientNames = useMemo(() => {
    const names = new Set(services.map(s => s.clientName).filter(Boolean));
    return Array.from(names).sort();
  }, [services]);

  const filteredData = useMemo(() => {
    let data = services.filter(s => {
        // 1. Date Filter (Monthly View)
        const serviceMonth = s.startTime.toISOString().slice(0, 7);
        if (selectedMonth && serviceMonth !== selectedMonth) return false;

        // 2. Mode Filter
        if (mode === 'RECEIVABLE') {
             // Show services where we expect payment from client
             return true;
        } else {
            // Show services where we outsourced to a supplier
            return !!s.supplierId;
        }
    });

    // 3. Payment Method Filter
    // Strictly show only services where payment method is exactly "Future Invoice"
    // This excludes Cash, Deposit, Prepaid, Pay to driver, etc.
    if (mode === 'RECEIVABLE') {
        data = data.filter(s => s.paymentMethod === 'Future Invoice');
    } else {
        // For PAYABLE, we usually just look at outsourced status, but could add filters if needed
    }

    // 4. Entity Filter
    if (selectedEntity) {
        if (mode === 'RECEIVABLE') {
            data = data.filter(s => s.clientName === selectedEntity);
        } else {
            data = data.filter(s => s.supplierId === selectedEntity);
        }
    }

    // 5. Search Filter
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        data = data.filter(s => 
            s.title.toLowerCase().includes(lowerTerm) || 
            s.clientName.toLowerCase().includes(lowerTerm) ||
            s.id.toLowerCase().includes(lowerTerm)
        );
    }

    return data.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [services, mode, selectedMonth, selectedEntity, searchTerm]);

  // Calculate Totals
  const totals = useMemo(() => {
      let totalAmount = 0;
      let totalPaid = 0;
      let totalDue = 0;

      filteredData.forEach(s => {
          let amount = 0;
          let paid = 0; 
          
          if (mode === 'RECEIVABLE') {
              amount = s.clientPrice || 0;
              if (s.clientPaymentStatus === PaymentStatus.PAID) {
                  paid = amount;
              } else if (s.clientPaymentStatus === PaymentStatus.PARTIAL) {
                  paid = s.deposit || 0;
              }
          } else {
              amount = s.supplierCost || 0;
               if (s.supplierPaymentStatus === PaymentStatus.PAID) {
                  paid = amount;
              } 
          }

          totalAmount += amount;
          totalPaid += paid;
      });
      
      totalDue = totalAmount - totalPaid;

      return { totalAmount, totalPaid, totalDue, count: filteredData.length };
  }, [filteredData, mode]);

  // Calculate settlement data for Payable mode (if a supplier is selected)
  const settlementData = useMemo(() => {
      if (mode !== 'PAYABLE' || !selectedEntity) return null;

      const supplier = suppliers.find(s => s.id === selectedEntity);
      if (!supplier) return null;

      // 1. Total Cost (From the filtered Payable list - Outsourced jobs)
      const totalCost = filteredData.reduce((sum, s) => sum + (s.supplierCost || 0), 0);
      
      // 2. Total Held (Cash/Extras kept by supplier from these outsourced jobs)
      const totalHeld = filteredData.reduce((sum, s) => {
          const isPrepaid = s.paymentMethod === 'Prepaid' || s.paymentMethod === 'Future Invoice';
          const balance = isPrepaid ? 0 : Math.max(0, (s.clientPrice || 0) - (s.deposit || 0));
          return sum + balance + (s.extrasAmount || 0);
      }, 0);

      // 3. Agency Price (Services where this Supplier is the Client in the same period)
      // We need to search the main services array for this.
      const agencyServices = services.filter(s => {
         const serviceMonth = s.startTime.toISOString().slice(0, 7);
         return s.clientName === supplier.name && serviceMonth === selectedMonth;
      });
      
      const agencyPrice = agencyServices.reduce((sum, s) => sum + (s.clientPrice || 0), 0);

      // Final Calculation: Cost - Held - AgencyPrice? 
      // Formula requested: (Total Cost) (- Total Held) (+ Agency Price) = FINAL TOTAL ?
      // Standard Net: Receivable - (Cost - Held).
      // Let's stick to the requested footer format:
      // (Total Cost) - (Total Held) + (Agency Price) ... wait, Agency Price (Receivable) opposes Cost (Payable).
      // Usually: Net Payment TO Supplier = Cost - Held - Agency Price.
      // If formula requested is: Cost - Held + Agency Price -> That adds debt?
      // Let's assume the user wants the standard Net Settlement logic but presented with these fields.
      // Net Balance (We Pay Them) = Cost - Held - AgencyPrice.
      
      // Wait, looking at SupplierReports: 
      // Net Balance = TotalReceivable - (TotalPayable - TotalHeld)
      //             = AgencyPrice - Cost + Held
      // If Positive: They pay us.
      // If Negative: We pay them.
      
      // The user asked for: (Total Cost)	(- Total Held)	(+ Agency Price) = FINAL TOTAL
      // Let's evaluate: 100 (Cost) - 20 (Held) + 50 (Agency Price) = 130? No, Agency Price is what THEY owe US. Cost is what WE owe THEM.
      // Maybe the user means: (Total Cost) - (Total Held) - (Agency Price) = Final Payment to Supplier?
      // Or maybe: (+ Agency Price) - (Cost - Held) = Net?
      
      // I will implement the logic that results in the correct Net Settlement but display the fields as requested labels.
      // I'll use the visual structure:
      // Column 1: Cost (Payable)
      // Column 2: - Held
      // Column 3: - Agency Price (Receivable) OR + Agency Price (if view is from Agency perspective?)
      
      // Let's follow the previous implementation in SupplierReports which was accepted:
      // Row: (- Total Payable) (+ Total Held) (+ Total Receivable) = Net
      
      // Here in InvoiceManagement (Payable View), we focus on "Bills to Pay".
      // So Base is Cost.
      // Deduct Held.
      // Deduct Agency Price (Credit).
      // Final = Amount to Pay.
      
      const netToPay = totalCost - totalHeld - agencyPrice; 

      return { totalCost, totalHeld, agencyPrice, netToPay };
  }, [filteredData, mode, selectedEntity, services, selectedMonth, suppliers]);


  const handlePrint = () => {
      const title = mode === 'RECEIVABLE' ? t('invoice_list_receivable') : t('supplier_bills_payable');
      const entityName = selectedEntity ? `Filtered for: ${mode === 'RECEIVABLE' ? selectedEntity : suppliers.find(s => s.id === selectedEntity)?.name}` : 'All Accounts';
      const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
      const locale = localeMap[settings.language] || 'en-US';
      const monthName = new Date(selectedMonth + '-01').toLocaleString(locale, { month: 'long', year: 'numeric' });

      const metrics = [
          { label: 'Period', value: monthName },
          { label: t('total_amount'), value: `$${totals.totalAmount.toFixed(2)}` },
          { label: t('total_due'), value: `$${totals.totalDue.toFixed(2)}` }
      ];

      const headers = [
          t('date'), 
          'Service ID', 
          t('reference'), 
          mode === 'RECEIVABLE' ? t('share_client') : t('share_supplier'),
          t('payment_method'), 
          'Amount', 
          t('status')
      ];

      const rows = filteredData.map(s => [
          new Date(s.startTime).toLocaleDateString(locale),
          s.id.slice(-6),
          s.title,
          mode === 'RECEIVABLE' ? s.clientName : (suppliers.find(sup => sup.id === s.supplierId)?.name || 'Unknown'),
          s.paymentMethod || '-',
          `$${(mode === 'RECEIVABLE' ? s.clientPrice : s.supplierCost)?.toFixed(2) || '0.00'}`,
          (mode === 'RECEIVABLE' ? s.clientPaymentStatus : s.supplierPaymentStatus) || 'PENDING'
      ]);
      
      // Append Settlement Footer if Payable and Supplier Selected
      if (settlementData) {
          rows.push(["", "", "", "", "", "", ""]); // spacer
          
          rows.push([
              "", 
              "", 
              `<i>${t('report_total_cost')}</i>`, 
              `<i>${t('report_total_held')}</i>`, 
              `<i>${t('report_agency_price')}</i>`, 
              `<b>${t('report_final_total')}</b>`, 
              ""
          ]);
          
          rows.push([
              "", 
              "", 
              `$${settlementData.totalCost.toFixed(2)}`, 
              `-$${settlementData.totalHeld.toFixed(2)}`, 
              `-$${settlementData.agencyPrice.toFixed(2)}`, 
              `<b>$${Math.abs(settlementData.netToPay).toFixed(2)}</b>`, 
              ""
          ]);
          
          const direction = settlementData.netToPay >= 0 ? t('report_agency_pays_supplier') : t('report_supplier_pays_agency');
          
          rows.push([
              "", "", "", "", "", 
              `<i>${direction}</i>`, 
              ""
          ]);
      }

      printReport(title, `${entityName} - ${monthName}`, metrics, headers, rows);
  };

  const handleExport = () => {
      const filename = `invoices_${mode.toLowerCase()}_${selectedMonth}`;
       const headers = [
          t('date'), 
          'Service ID', 
          t('reference'), 
          mode === 'RECEIVABLE' ? t('share_client') : t('share_supplier'),
          t('payment_method'), 
          t('total_amount'),
          'Deposit/Partial',
          t('balance_due'), 
          t('status')
      ];

      const rows = filteredData.map(s => {
          const amount = (mode === 'RECEIVABLE' ? s.clientPrice : s.supplierCost) || 0;
          const deposit = mode === 'RECEIVABLE' ? (s.deposit || 0) : 0;
          const isPaid = (mode === 'RECEIVABLE' ? s.clientPaymentStatus : s.supplierPaymentStatus) === PaymentStatus.PAID;
          const balance = isPaid ? 0 : Math.max(0, amount - deposit);
          const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
          const locale = localeMap[settings.language] || 'en-US';

          return [
            new Date(s.startTime).toLocaleDateString(locale),
            s.id,
            s.title,
            mode === 'RECEIVABLE' ? s.clientName : (suppliers.find(sup => sup.id === s.supplierId)?.name || 'Unknown'),
            s.paymentMethod || '',
            amount.toFixed(2),
            deposit.toFixed(2),
            balance.toFixed(2),
            (mode === 'RECEIVABLE' ? s.clientPaymentStatus : s.supplierPaymentStatus) || 'PENDING'
          ];
      });
      
      // Append Settlement Footer if Payable and Supplier Selected
      if (settlementData) {
          rows.push(["", "", "", "", "", "", "", "", ""]); // Spacer
          rows.push(["", "", t('calculation'), 
               `${t('report_total_cost')} ${settlementData.totalCost.toFixed(2)}`, 
               `${t('report_total_held')} -${settlementData.totalHeld.toFixed(2)}`, 
               `${t('report_agency_price')} -${settlementData.agencyPrice.toFixed(2)}`, 
               `= ${t('report_final_total')} ${Math.abs(settlementData.netToPay).toFixed(2)}`, 
               "", ""
          ]);
          
          const direction = settlementData.netToPay >= 0 ? t('report_agency_pays_supplier') : t('report_supplier_pays_agency');
          rows.push(["", "", t('report_final_settlement'), "", "", "", direction, "", ""]);
      }

      downloadCSV(filename, headers, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in-down h-full flex flex-col">
        {/* Header & Controls */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button 
                    onClick={() => { setMode('RECEIVABLE'); setSelectedEntity(''); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'RECEIVABLE' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    {t('client_invoices')}
                </button>
                <button 
                     onClick={() => { setMode('PAYABLE'); setSelectedEntity(''); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'PAYABLE' ? 'bg-white dark:bg-slate-600 text-orange-600 dark:text-orange-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    {t('supplier_bills')}
                </button>
            </div>

            <div className="flex items-center space-x-2">
                 <button 
                    onClick={handleExport}
                    className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    CSV
                </button>
                 <button 
                    onClick={handlePrint}
                    className="flex items-center px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Print
                </button>
            </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{t('month')}</label>
                <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    {mode === 'RECEIVABLE' ? t('filter_by_client') : t('filter_by_supplier')}
                </label>
                <select
                    value={selectedEntity}
                    onChange={e => setSelectedEntity(e.target.value)}
                    className="block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                    <option value="">-- All --</option>
                    {mode === 'RECEIVABLE' 
                        ? clientNames.map(name => <option key={name} value={name}>{name}</option>)
                        : suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    }
                </select>
            </div>

             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{t('search_placeholder')}</label>
                 <input
                    type="text"
                    placeholder="Service ID, Ref..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
            </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">{t('invoices_found')}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totals.count}</p>
                    {mode === 'RECEIVABLE' && <p className="text-xs text-slate-400 mt-1">({t('future_invoice_only')})</p>}
                </div>
                 <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                </div>
            </div>
             <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">{t('past_paid')}</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totals.totalPaid.toFixed(2)}</p>
                </div>
                 <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
            </div>
             <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">{t('future_to_be_paid')}</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">${totals.totalDue.toFixed(2)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-full">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
            </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Service ID</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('reference')}</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{mode === 'RECEIVABLE' ? t('share_client') : t('share_supplier')}</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('payment_method')}</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('total_amount')}</th>
                             <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('status')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredData.length > 0 ? filteredData.map(s => {
                             const amount = mode === 'RECEIVABLE' ? s.clientPrice : s.supplierCost;
                             const status = mode === 'RECEIVABLE' ? s.clientPaymentStatus : s.supplierPaymentStatus;
                             const entityName = mode === 'RECEIVABLE' ? s.clientName : (suppliers.find(sup => sup.id === s.supplierId)?.name || 'Unknown');
                             const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
                             const locale = localeMap[settings.language] || 'en-US';

                             return (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(s.startTime).toLocaleDateString(locale)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400 dark:text-slate-500 text-xs">{s.id.slice(-6)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{s.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{entityName}</td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{s.paymentMethod || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900 dark:text-slate-100">${amount?.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                         <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            status === PaymentStatus.PAID ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                                            status === PaymentStatus.PARTIAL ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                            'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                         }`}>
                                            {status || 'PENDING'}
                                        </span>
                                    </td>
                                </tr>
                             );
                        }) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    No invoices found for this selection.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* Footer Hint for Net Settlement */}
        {mode === 'PAYABLE' && selectedEntity && settlementData && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-xs text-yellow-800 dark:text-yellow-200 text-center">
                <p><strong>Note:</strong> Print or Export CSV to see the full Net Settlement calculation including held cash and cross-services for this supplier.</p>
            </div>
        )}
    </div>
  );
};
