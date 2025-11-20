
import React, { useState } from 'react';
import { Service, ServiceStatus, User, Supplier, PaymentStatus, DriverAvailability, AppSettings } from '../../types';
import { ServiceColors } from '../../constants';
import { deleteCalendarEvent } from '../../services/googleCalendarService';
import { useTranslation } from '../../hooks/useTranslation';
import { formatTime } from '../../lib/calendar-utils';
import { generateVoucherPDF } from '../../lib/print-utils';

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
  drivers: User[];
  suppliers: Supplier[];
  isLoggedIn: boolean;
  settings: AppSettings;
  userRole: 'ADMIN' | 'DRIVER' | 'PARTNER';
}

const availabilityColors: Record<DriverAvailability, string> = {
    Available: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Busy: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'On Leave': 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300',
};

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ isOpen, onClose, service, onEdit, onDelete, drivers, suppliers, isLoggedIn, settings, userRole }) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignType, setAssignType] = useState<'driver' | 'supplier'>('driver');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  
  const { t } = useTranslation(settings.language);
  const isAdmin = userRole === 'ADMIN';

  if (!isOpen) return null;

  const statusColor = service.status === ServiceStatus.CANCELLED ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' : ServiceColors[service.serviceType] || 'bg-blue-100 text-blue-800';
  const driver = drivers.find(d => d.id === service.driverId);
  const supplier = suppliers.find(s => s.id === service.supplierId);
  const isAssigned = driver || supplier;

  // Financial Calculations
  const clientPrice = service.clientPrice || 0;
  const deposit = service.deposit || 0;
  const supplierCost = service.supplierCost || 0;
  const extras = service.extrasAmount || 0;
  
  // If Prepaid or Future Invoice, strictly NO collection on site
  const isPrepaidOrInvoice = service.paymentMethod === 'Prepaid' || service.paymentMethod === 'Future Invoice';
  const balanceDue = isPrepaidOrInvoice ? 0 : Math.max(0, clientPrice - deposit);
  
  // Determine if Supplier/Driver is collecting the payment physically
  const isSupplierCollecting = service.paymentMethod === 'Pay to the driver' || 
                               service.paymentMethod === 'Paid deposit + balance to the driver' ||
                               service.paymentMethod === 'Cash';

  // --- Net Settlement Logic ---
  let netValue = 0;
  let netLabel = '';
  let netColor = '';

  if (supplier) {
      // Amount held by supplier = Balance collected (if any) + Extras collected
      const totalHeldBySupplier = (isSupplierCollecting ? balanceDue : 0) + extras;
      
      // Net Payable To Supplier = Supplier Cost - Money they already hold
      const netPayableToSupplier = supplierCost - totalHeldBySupplier;

      if (netPayableToSupplier >= 0) {
          // Positive means we owe them
          netValue = netPayableToSupplier;
          netLabel = t('net_payable_to_supplier'); // We pay them
          netColor = 'text-red-600 dark:text-red-400'; // Cost
      } else {
          // Negative means they hold surplus, they owe us
          netValue = Math.abs(netPayableToSupplier);
          netLabel = t('net_from_supplier'); // They pay us
          netColor = 'text-green-600 dark:text-green-400'; // Income
      }
  } else {
      // Internal Driver
      // Profit = Price - Cost(0) + Extras
      netValue = clientPrice - supplierCost + extras; 
      netLabel = t('share_agency_comm');
      netColor = 'text-green-600 dark:text-green-400';
  }


  // Helper for Payment Method Translation
  const getPaymentMethodLabel = (method: string | undefined) => {
     if (!method) return '-';
     // Basic mapping for standard keys, fallback to original string if custom
     const map: Record<string, string> = {
         'Prepaid': t('method_Prepaid'),
         'Pay to the driver': t('method_Pay_to_the_driver'),
         'Paid deposit + balance to the driver': t('method_Paid_deposit_balance_to_the_driver'),
         'Future Invoice': t('method_Future_Invoice'),
         'Cash': t('method_Cash')
     };
     return map[method] || method;
  };


  const DetailItem = ({ label, value, icon, fullWidth = false, highlight = false }: { label: string; value: React.ReactNode, icon?: React.ReactNode, fullWidth?: boolean, highlight?: boolean }) => (
    <div className={`py-3 ${fullWidth ? 'col-span-1 sm:col-span-2' : ''}`}>
      <div className="flex items-center mb-1">
         {icon && <span className="mr-2 text-slate-400 dark:text-slate-500">{icon}</span>}
         <p className="text-xs font-bold text-slate-500 uppercase tracking-wide dark:text-slate-400">{label}</p>
      </div>
      <div className={`text-sm text-slate-900 dark:text-slate-100 font-medium break-words ${highlight ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-700/50 dark:border-slate-600'} p-2 rounded-md border`}>
        {value || <span className="text-slate-400 dark:text-slate-500 italic">Not specified</span>}
      </div>
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

  const handleShare = async () => {
    const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[settings.language] || 'en-US';
    const dateStr = new Date(service.startTime).toLocaleString(locale, {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    const lines = [
        `${t('share_service_title')}: ${service.title}`,
        `${t('share_time')}: ${dateStr}`,
        `${t('share_from')}: ${service.pickupAddress}`,
    ];
    
    if (service.stopAddress) lines.push(`${t('share_stop')}: ${service.stopAddress}`);
    
    lines.push(`${t('share_to')}: ${service.dropoffAddress}`);
    lines.push(`${t('share_client')}: ${service.clientName}`);
    
    // Pax breakdown
    const paxText = `${service.passengersAdults || 0} ${t('adults')}, ${service.passengersKids || 0} ${t('kids')}`;
    lines.push(`PAX: ${paxText}`);

    if (service.flightNumber) lines.push(`${t('flight_number')}: ${service.flightNumber}`);
    
    if (service.clientPhone) lines.push(`${t('client_phone')}: ${service.clientPhone}`);

    if (driver) {
        lines.push(`${t('share_driver')}: ${driver.name} ${driver.phone ? `(${driver.phone})` : ''}`);
    } else if (supplier) {
        lines.push(`${t('share_supplier')}: ${supplier.name}`);
        if(isAdmin) {
             lines.push(`${t('share_supplier_cost')}: $${supplierCost.toFixed(2)}`);
        }
    }

    // Clear and compact financial line
    lines.push(`${t('share_collection')}: $${balanceDue.toFixed(2)} (${getPaymentMethodLabel(service.paymentMethod)})`);

    if (service.notes) {
        lines.push(`${t('share_notes')}: ${service.notes}`);
    }

    const shareText = lines.join('\n');

    if (navigator.share) {
        try {
            await navigator.share({ title: service.title, text: shareText });
        } catch (error) {
            // Fallback to clipboard if share is cancelled or fails
            await navigator.clipboard.writeText(shareText);
            alert('Service details copied to clipboard!');
        }
    } else {
        await navigator.clipboard.writeText(shareText);
        alert('Service details copied to clipboard!');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('delete') + '?')) {
        if (isLoggedIn && service.googleCalendarEventId) {
            try {
                await deleteCalendarEvent(service.googleCalendarEventId);
            } catch (error) {
                console.error("Failed to delete Google Calendar event, but deleting service locally.", error);
            }
        }
        onDelete(service.id);
    }
  }
  
  const handleSaveAssignment = () => {
      if (!selectedResourceId) return;
      
      const updatedService = { ...service };
      
      if (assignType === 'driver') {
          updatedService.driverId = selectedResourceId;
          updatedService.supplierId = undefined; // Clear supplier if driver assigned
      } else {
          updatedService.supplierId = selectedResourceId;
          updatedService.driverId = undefined; // Clear driver if supplier assigned
      }
      
      onEdit(updatedService);
      setIsAssigning(false);
  };

  const handleDownloadVoucher = () => {
      generateVoucherPDF(service, driver, settings);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-hidden">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] animate-fade-in-up">
        
        {/* Header */}
        <div className="flex flex-shrink-0 justify-between items-start p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
            <div className="flex-1 mr-4">
                 <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide rounded-full ${statusColor}`}>
                        {t(service.status as any)}
                    </span>
                    {service.googleCalendarEventId && (
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5c0-.28-.22-.5-.5-.5h-2v-1.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-5V4.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-2c-.28 0-.5.22-.5.5v14c0 .28.22.5.5.5h17c.28 0 .5-.22.5-.5v-14zM11.5 11H6V9h5.5v2zm-1 2.5H6v2h4.5v-2zm.5 3.5h-5V19h5v-2zm6-5.5h-4V9h4v2.5z" /></svg>
                            Synced
                        </div>
                    )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{service.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* Assignment Section (Admin Only) */}
            <div className="mb-6">
            {isAssigning ? (
                <div className="p-4 border-2 border-primary-500 rounded-lg bg-primary-50 dark:bg-primary-900/20 animate-fade-in-down">
                    <h3 className="font-bold text-lg text-primary-800 dark:text-primary-200 mb-2">{t('assign_modal_title')}</h3>
                    <p className="text-sm text-primary-600 dark:text-primary-300 mb-4">{t('assign_helper')}</p>
                    
                    <div className="space-y-3">
                         <div className="flex gap-4">
                             <label className="flex items-center cursor-pointer">
                                 <input type="radio" checked={assignType === 'driver'} onChange={() => { setAssignType('driver'); setSelectedResourceId(''); }} className="mr-2 text-primary-600 focus:ring-primary-500" />
                                 <span className="text-sm font-medium text-slate-700 dark:text-white">{t('driver')}</span>
                             </label>
                             <label className="flex items-center cursor-pointer">
                                 <input type="radio" checked={assignType === 'supplier'} onChange={() => { setAssignType('supplier'); setSelectedResourceId(''); }} className="mr-2 text-primary-600 focus:ring-primary-500" />
                                 <span className="text-sm font-medium text-slate-700 dark:text-white">{t('supplier')}</span>
                             </label>
                         </div>
                         
                         <select 
                            value={selectedResourceId} 
                            onChange={(e) => setSelectedResourceId(e.target.value)}
                            className="block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 py-2"
                        >
                            <option value="">-- Select --</option>
                            {assignType === 'driver' 
                                ? drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.availability})</option>)
                                : suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                            }
                        </select>
                        
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setIsAssigning(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300">{t('cancel')}</button>
                            <button onClick={handleSaveAssignment} disabled={!selectedResourceId} className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">{t('save_assignment')}</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`rounded-lg border p-4 flex items-center justify-between ${!isAssigned ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-white border-slate-200 dark:bg-slate-700 dark:border-slate-600'}`}>
                    <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${!isAssigned ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">{isAssigned ? (driver ? t('driver') : t('supplier')) : t('status')}</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {driver ? driver.name : supplier ? supplier.name : t('unassigned')}
                            </p>
                        </div>
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => setIsAssigning(true)}
                            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                        >
                            {isAssigned ? 'Change' : 'Assign Now'}
                        </button>
                    )}
                </div>
            )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <DetailItem 
                    label={t('start_time')} 
                    value={
                        <span>
                            {new Date(service.startTime).toLocaleDateString(undefined, {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}
                            <br/>
                            <span className="text-lg font-bold">{formatTime(service.startTime)}</span>
                        </span>
                    }
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>}
                />

                <DetailItem 
                    label={t('pickup_address')} 
                    value={service.pickupAddress}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                    fullWidth
                />

                {service.stopAddress && (
                     <DetailItem 
                        label={t('stop_waypoint')} 
                        value={service.stopAddress}
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>}
                        fullWidth
                        highlight
                    />
                )}

                 <DetailItem 
                    label={t('dropoff_address')} 
                    value={service.dropoffAddress}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                    fullWidth
                />

                <DetailItem 
                    label={t('client_name')} 
                    value={service.clientName}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>}
                />
                 <DetailItem 
                    label={t('passengers')} 
                    value={
                        <span className="flex items-center gap-3">
                            <span>{service.passengersAdults || (service.numberOfPassengers || 1)} {t('adults')}</span>
                            {service.passengersKids ? <span className="text-slate-500">|</span> : null}
                            {service.passengersKids ? <span>{service.passengersKids} {t('kids')}</span> : null}
                        </span>
                    }
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>}
                />
                
                 {service.flightNumber && (
                     <DetailItem 
                        label={t('flight_number')}
                        value={service.flightNumber}
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>}
                    />
                 )}
                
                {(service.clientEmail || service.clientPhone) && (
                    <>
                        <DetailItem 
                            label={t('client_email')} 
                            value={service.clientEmail}
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>}
                        />
                        <DetailItem 
                            label={t('client_phone')} 
                            value={service.clientPhone}
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>}
                        />
                    </>
                )}

                <DetailItem 
                    label={t('service_type')} 
                    value={t(`type_${service.serviceType}` as any) || service.serviceType.replace(/_/g, ' ')}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>}
                />
                
                {isAdmin && (
                    <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">{t('financials')}</h4>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600">
                                <p className="text-[10px] text-slate-500 uppercase">{t('client_price')}</p>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{clientPrice ? `$${clientPrice.toFixed(2)}` : '-'}</p>
                            </div>
                             <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600">
                                <p className="text-[10px] text-slate-500 uppercase">{t('balance_due')}</p>
                                <p className={`font-bold ${balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    ${balanceDue.toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600">
                                <p className="text-[10px] text-slate-500 uppercase">{t('payment_status_in')}</p>
                                <div className="mt-0.5"><PaymentStatusBadge status={service.clientPaymentStatus} /></div>
                            </div>
                             {deposit > 0 && (
                                 <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600">
                                    <p className="text-[10px] text-slate-500 uppercase">{t('deposit')}</p>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">${deposit.toFixed(2)}</p>
                                </div>
                             )}
                             
                             {/* Show Extras if present */}
                             {extras > 0 && (
                                 <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-100 dark:border-purple-800 col-span-2 sm:col-span-1">
                                    <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase">{t('extras_commission')}</p>
                                    <p className="font-semibold text-purple-900 dark:text-purple-100">${extras.toFixed(2)}</p>
                                    {service.extrasInfo && <p className="text-[10px] text-purple-500 truncate">{service.extrasInfo}</p>}
                                </div>
                             )}

                             <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600 col-span-2 sm:col-span-1">
                                <p className="text-[10px] text-slate-500 uppercase">{t('payment_method')}</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{getPaymentMethodLabel(service.paymentMethod)}</p>
                            </div>
                            
                            {/* Supplier Cost / Commission Display */}
                            {supplier && (
                                 <>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600">
                                        <p className="text-[10px] text-slate-500 uppercase">Supplier Cost</p>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">${supplierCost.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600">
                                        <p className="text-[10px] text-slate-500 uppercase">{netLabel}</p>
                                        <p className={`font-bold ${netColor}`}>
                                            ${netValue.toFixed(2)}
                                        </p>
                                    </div>
                                 </>
                            )}
                         </div>
                    </div>
                )}
                
                {service.notes && (
                     <div className="col-span-1 sm:col-span-2 mt-4">
                         <div className="flex items-center mb-1">
                            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('notes')}</p>
                         </div>
                         <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-100 dark:border-yellow-900/30 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">
                             {service.notes}
                         </div>
                     </div>
                )}

            </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl gap-3">
             <div className="flex gap-3 w-full sm:w-auto">
                 <button
                    onClick={handleShare}
                    className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                    {t('share')}
                </button>
                 <button
                    onClick={handleDownloadVoucher}
                    className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    {t('download_voucher')}
                </button>
            </div>
            
            {isAdmin && (
                <div className="flex space-x-3 w-full sm:w-auto">
                    <button
                        onClick={handleDelete}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                    >
                        {t('delete')}
                    </button>
                    <button
                        onClick={() => onEdit(service)}
                        className="flex-1 sm:flex-none px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 transition-colors flex items-center justify-center"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        {t('edit')}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
