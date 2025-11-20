
import React, { useState, useMemo } from 'react';
import { Service, User, AppSettings } from '../../types';
import { formatTime } from '../../lib/calendar-utils';
import { useTranslation } from '../../hooks/useTranslation';

interface DriverAgendaProps {
  drivers: User[];
  services: Service[];
  settings: AppSettings;
}

export const DriverAgenda: React.FC<DriverAgendaProps> = ({ drivers, services, settings }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const { t } = useTranslation(settings.language);

  const dailyServices = useMemo(() => {
    if (!selectedDriverId || !selectedDate) return [];
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return services.filter(s => {
        return s.driverId === selectedDriverId && 
               s.startTime >= startOfDay && 
               s.startTime <= endOfDay;
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [selectedDriverId, selectedDate, services]);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  // Helper for Payment Method Translation
  const getPaymentMethodLabel = (method: string | undefined) => {
     if (!method) return '-';
     const map: Record<string, string> = {
         'Prepaid': t('method_Prepaid'),
         'Pay to the driver': t('method_Pay_to_the_driver'),
         'Paid deposit + balance to the driver': t('method_Paid_deposit_balance_to_the_driver'),
         'Future Invoice': t('method_Future_Invoice'),
         'Cash': t('method_Cash')
     };
     return map[method] || method;
  };


  const getPaymentCollectionDetails = (s: Service) => {
    // Scenario 1: Cash Payment - Collect Full Amount
    if (s.paymentMethod === 'Cash' && s.clientPrice) {
        return { amount: s.clientPrice, label: t('share_collection') };
    }
    // Scenario 2: Deposit + Balance - Collect Balance
    if (s.paymentMethod === 'Deposit + Balance') {
        const price = s.clientPrice || 0;
        const deposit = s.deposit || 0;
        const balance = Math.max(0, price - deposit);
        if (balance > 0) {
            return { amount: balance, label: t('balance_due').toUpperCase() };
        }
    }
    // Scenario 3: Explicit unpaid balance due on site
    if (s.clientPaymentStatus === 'UNPAID' && s.clientPrice && s.clientPrice > 0 && s.paymentMethod !== 'Future Invoice') {
         return { amount: s.clientPrice, label: t('share_collection') };
    }

    return null;
  };

  const generateShareableText = () => {
    if (!selectedDriver) return;
    
    const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[settings.language] || 'en-US';
    const dateObj = new Date(selectedDate);
    const dateStr = dateObj.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    let text = `${t('manifest_title')}\n`;
    text += `${t('driver')}: ${selectedDriver.name.toUpperCase()}\n`;
    text += `${t('manifest_date')}:   ${dateStr.toUpperCase()}\n`;
    text += `${t('manifest_jobs')}:   ${dailyServices.length}\n`;
    text += `========================================\n`;

    if (dailyServices.length === 0) {
        text += `${t('manifest_no_jobs')}\n`;
    } else {
        dailyServices.forEach((s, index) => {
            const startTime = formatTime(s.startTime);
            const endTime = s.endTime ? formatTime(s.endTime) : 'TBD';
            const paxText = `${s.passengersAdults || (s.numberOfPassengers || 1)} ${t('adults')}, ${s.passengersKids || 0} ${t('kids')}`;
            
            text += `\n${t('manifest_job')} #${index + 1}  |  ${startTime} - ${endTime}\n`;
            text += `${t('share_service_title')}: ${s.title.toUpperCase()}\n`;
            text += `${t('manifest_pickup')}:  ${s.pickupAddress}\n`;
            if (s.stopAddress) {
                 text += `${t('manifest_stop')}:  ${s.stopAddress}\n`;
            }
            text += `${t('manifest_dropoff')}: ${s.dropoffAddress}\n`;
            text += `${t('share_client')}:  ${s.clientName} (${t('manifest_pax')}: ${paxText})\n`;
            
            if (s.notes) {
                text += `${t('manifest_note')}:    ${s.notes.replace(/\n/g, ' ').trim()}\n`;
            }

            const collection = getPaymentCollectionDetails(s);
            if (collection) {
                 text += `*** ${t('manifest_collect')} $${collection.amount.toFixed(2)} (${collection.label}) ***\n`;
            }
            text += `----------------------------------------`;
        });
    }
    text += `\nEND`;

    navigator.clipboard.writeText(text);
    alert(t('share') + " " + t('completed'));
  };

  const handlePrint = () => {
    if (!selectedDriver) return;
    const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[settings.language] || 'en-US';
    const dateStr = new Date(selectedDate).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const servicesHtml = dailyServices.map((s, index) => {
        const collection = getPaymentCollectionDetails(s);
        const collectionHtml = collection 
            ? `<div class="payment-box">
                 <div class="payment-title">${t('manifest_collect')}</div>
                 <div class="payment-amount">$${collection.amount.toFixed(2)}</div>
                 <div class="payment-label">${collection.label}</div>
               </div>`
            : '';
        
        const paxText = `${s.passengersAdults || (s.numberOfPassengers || 1)} ${t('adults')}, ${s.passengersKids || 0} ${t('kids')}`;

        return `
        <div class="job-card">
            <div class="job-time-col">
                <div class="time-display">${formatTime(s.startTime)}</div>
                ${s.endTime ? `<div class="time-end">- ${formatTime(s.endTime)}</div>` : ''}
                <div class="job-badge">${t('manifest_job')} ${index + 1}</div>
            </div>
            <div class="job-info-col">
                <div class="job-header">
                    <span class="job-title">${s.title}</span>
                    <span class="pax-info">${t('manifest_pax')}: ${paxText}</span>
                </div>
                
                <div class="route-section">
                    <div class="route-row">
                        <span class="label">${t('manifest_pickup')}:</span>
                        <span class="value">${s.pickupAddress}</span>
                    </div>
                    ${s.stopAddress ? `
                    <div class="route-row">
                        <span class="label">${t('manifest_stop')}:</span>
                        <span class="value" style="font-style: italic;">${s.stopAddress}</span>
                    </div>` : ''}
                    <div class="route-row">
                        <span class="label">${t('manifest_dropoff')}:</span>
                        <span class="value">${s.dropoffAddress}</span>
                    </div>
                </div>

                <div class="client-section">
                    <span class="label">${t('share_client')}:</span> <span class="value">${s.clientName}</span>
                    ${s.paymentMethod ? `<span class="separator">|</span> <span class="label">${t('payment_method')}:</span> <span class="value">${getPaymentMethodLabel(s.paymentMethod)}</span>` : ''}
                </div>

                ${s.notes ? `<div class="notes-box"><span class="label">${t('manifest_note')}:</span> ${s.notes}</div>` : ''}
            </div>
            <div class="job-action-col">
                ${collectionHtml}
            </div>
        </div>
    `}).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${t('manifest_title')}: ${selectedDriver.name} - ${dateStr}</title>
            <style>
                body { font-family: 'Arial', sans-serif; color: #000; max-width: 1000px; margin: 0 auto; padding: 20px; font-size: 12px; -webkit-print-color-adjust: exact; }
                
                .header { border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
                .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; }
                .header-meta { text-align: right; }
                .header-meta h2 { margin: 0; font-size: 16px; font-weight: 700; }
                .header-meta p { margin: 5px 0 0; font-size: 14px; }

                .job-card { display: flex; border: 2px solid #333; margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid; }
                
                .job-time-col { width: 100px; background: #eee; border-right: 2px solid #333; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px; text-align: center; flex-shrink: 0; }
                .time-display { font-size: 20px; font-weight: 900; }
                .time-end { font-size: 12px; margin-top: 5px; color: #444; font-weight: 600; }
                .job-badge { margin-top: 10px; background: #000; color: #fff; padding: 4px 8px; font-weight: bold; font-size: 10px; border-radius: 4px; }

                .job-info-col { flex: 1; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
                
                .job-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
                .job-title { font-size: 16px; font-weight: 800; text-transform: uppercase; }
                .pax-info { font-weight: 700; border: 1px solid #000; padding: 2px 6px; font-size: 11px; }

                .route-section { display: flex; flex-direction: column; gap: 4px; }
                .route-row { display: flex; }
                .label { font-weight: 800; width: 70px; flex-shrink: 0; color: #444; font-size: 11px; text-transform: uppercase; }
                .value { font-size: 13px; font-weight: 500; }
                
                .client-section { font-size: 12px; border-top: 1px dotted #ccc; padding-top: 8px; }
                .separator { margin: 0 10px; color: #ccc; }

                .notes-box { background: #f4f4f4; border: 1px solid #ddd; padding: 8px; font-style: italic; color: #333; margin-top: auto; }

                .job-action-col { width: 160px; padding: 10px; border-left: 1px solid #ccc; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fff; }
                
                .payment-box { border: 3px solid #000; padding: 10px; text-align: center; width: 100%; }
                .payment-title { font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; line-height: 1.2; }
                .payment-amount { font-size: 18px; font-weight: 900; margin-bottom: 5px; }
                .payment-label { font-size: 10px; font-weight: 700; background: #000; color: #fff; padding: 2px; }

                @media print {
                    body { padding: 0; margin: 0; }
                    .job-time-col { background-color: #eee !important; -webkit-print-color-adjust: exact; }
                    .payment-label { background-color: #000 !important; color: #fff !important; -webkit-print-color-adjust: exact; }
                    .notes-box { background-color: #f4f4f4 !important; -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>${t('manifest_title')}</h1>
                    <p>${t('driver')}: <strong>${selectedDriver.name.toUpperCase()}</strong></p>
                </div>
                <div class="header-meta">
                    <h2>${dateStr.toUpperCase()}</h2>
                    <p>${t('manifest_jobs')}: <strong>${dailyServices.length}</strong></p>
                </div>
            </div>
            
            ${dailyServices.length > 0 ? servicesHtml : `<div style="text-align:center; padding: 50px; border: 2px dashed #ccc; font-size: 16px; font-weight: bold; color: #777;">${t('manifest_no_jobs')}</div>`}
            
            <script>
                window.onload = () => { setTimeout(() => window.print(), 500); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in-down">
        {/* Control Bar */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6 items-end shadow-sm">
            <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t('driver')}</label>
                <select
                    value={selectedDriverId}
                    onChange={e => setSelectedDriverId(e.target.value)}
                    className="block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-slate-500 focus:border-slate-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 py-2.5 pl-3"
                >
                    <option value="">-- Select --</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
            <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t('date')}</label>
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-slate-500 focus:border-slate-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 py-2.5"
                />
            </div>
            <div className="flex-1 flex justify-end space-x-3 pb-0.5">
                <button 
                    onClick={generateShareableText}
                    disabled={!selectedDriverId}
                    className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                >
                    <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    Copy Text
                </button>
                <button 
                    onClick={handlePrint}
                    disabled={!selectedDriverId}
                    className="flex items-center px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-black transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Print
                </button>
            </div>
        </div>

        {selectedDriverId && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {/* Manifest Header */}
                <div className="bg-slate-100 dark:bg-slate-900 p-5 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <div>
                         <h3 className="text-lg font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">
                            {new Date(selectedDate).toLocaleDateString(settings.language === 'it' ? 'it-IT' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">
                            {t('driver')}: {selectedDriver?.name}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="block text-2xl font-black text-slate-800 dark:text-slate-100">{dailyServices.length}</span>
                        <span className="text-xs text-slate-400 font-bold uppercase">{t('manifest_jobs')}</span>
                    </div>
                </div>
                
                {/* List View */}
                <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50 min-h-[400px]">
                    {dailyServices.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                            <p className="text-slate-500 font-bold uppercase tracking-wide">{t('manifest_no_jobs')}</p>
                         </div>
                    ) : (
                        dailyServices.map((service, index) => {
                            const collection = getPaymentCollectionDetails(service);
                            return (
                                <div key={service.id} className="flex flex-col md:flex-row bg-white dark:bg-slate-800 border-l-4 border-slate-800 dark:border-slate-500 shadow-sm rounded-r-lg overflow-hidden">
                                    
                                    {/* Time Block */}
                                    <div className="md:w-24 p-4 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                                            {formatTime(service.startTime)}
                                        </span>
                                        {service.endTime && (
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                                {formatTime(service.endTime)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info Block */}
                                    <div className="flex-1 p-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-md font-bold text-slate-800 dark:text-slate-100 uppercase">
                                                {service.title}
                                            </h4>
                                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded uppercase">
                                                {t('manifest_job')} #{index + 1}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <div className="flex">
                                                    <span className="w-20 font-bold text-slate-500 text-xs uppercase pt-0.5">{t('manifest_pickup')}:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{service.pickupAddress}</span>
                                                </div>
                                                {service.stopAddress && (
                                                     <div className="flex">
                                                        <span className="w-20 font-bold text-slate-500 text-xs uppercase pt-0.5">{t('manifest_stop')}:</span>
                                                        <span className="font-medium text-slate-900 dark:text-slate-100 italic">{service.stopAddress}</span>
                                                    </div>
                                                )}
                                                <div className="flex">
                                                    <span className="w-20 font-bold text-slate-500 text-xs uppercase pt-0.5">{t('manifest_dropoff')}:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{service.dropoffAddress}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                 <div className="flex">
                                                    <span className="w-20 font-bold text-slate-500 text-xs uppercase pt-0.5">{t('share_client')}:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{service.clientName}</span>
                                                </div>
                                                 <div className="flex">
                                                    <span className="w-20 font-bold text-slate-500 text-xs uppercase pt-0.5">{t('manifest_pax')}:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                                        {service.passengersAdults || (service.numberOfPassengers || 1)} {t('adults')}, {service.passengersKids || 0} {t('kids')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {service.notes && (
                                            <div className="mt-1 bg-slate-100 dark:bg-slate-700/50 p-2 text-xs font-medium text-slate-700 dark:text-slate-300 border-l-2 border-slate-400">
                                                <span className="font-bold uppercase mr-1">{t('manifest_note')}:</span> {service.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action/Payment Block */}
                                    {collection ? (
                                        <div className="md:w-40 bg-slate-100 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-center items-center text-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t('manifest_collect').replace('ACTION: ', '')}</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-slate-100">${collection.amount.toFixed(2)}</span>
                                            <span className="text-[10px] font-bold bg-slate-800 text-white px-1.5 py-0.5 mt-1 uppercase">{collection.label}</span>
                                        </div>
                                    ) : (
                                         <div className="hidden md:flex md:w-16 items-center justify-center border-l border-slate-100 dark:border-slate-700">
                                            <span className="text-slate-300 dark:text-slate-600 font-bold text-xl">✓</span>
                                         </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
