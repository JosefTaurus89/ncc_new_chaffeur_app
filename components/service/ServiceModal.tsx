
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Service, ServiceStatus, ServiceType, ExtractedReservation, User, Supplier, PaymentStatus } from '../../types';
import { ReservationExtractor } from '../ai/ReservationExtractor';
import { createCalendarEvent, updateCalendarEvent } from '../../services/googleCalendarService';
import { useTranslation } from '../../hooks/useTranslation';
import { EVENT_COLORS } from '../../constants';


interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Service) => void;
  service?: Partial<Service>;
  drivers: User[];
  suppliers: Supplier[];
  isLoggedIn: boolean;
}

// Helpers for the new Date/Time UI
const getLocalDateString = (date: Date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLocalTimeString = (date: Date) => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

export const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, onSave, service, drivers, suppliers, isLoggedIn }) => {
  const [formData, setFormData] = useState<Partial<Service>>({});
  const [error, setError] = useState<string | null>(null);
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<'INTERNAL' | 'OUTSOURCED'>('INTERNAL');
  
  const savedSettings = localStorage.getItem('tour-management-settings-v4');
  const language = savedSettings ? JSON.parse(savedSettings).language || 'en' : 'en';
  const { t } = useTranslation(language);
  
  // We show all drivers, but maybe sort or indicate availability
  const sortedDrivers = useMemo(() => {
      return [...drivers].sort((a, b) => a.availability === 'Available' ? -1 : 1);
  }, [drivers]);

  const validSuppliers = useMemo(() => suppliers.filter(s => s.name), [suppliers]);
  
  const balanceDue = useMemo(() => {
    const price = formData.clientPrice || 0;
    const deposit = formData.deposit || 0;
    
    // If Prepaid or Future Invoice, strictly NO collection on site
    if (formData.paymentMethod === 'Prepaid' || formData.paymentMethod === 'Future Invoice') {
        return 0;
    }
    
    return Math.max(0, price - deposit);
  }, [formData.clientPrice, formData.deposit, formData.paymentMethod]);

  const isDriverCollecting = useMemo(() => 
    formData.paymentMethod === 'Pay to the driver' || 
    formData.paymentMethod === 'Paid deposit + balance to the driver' ||
    formData.paymentMethod === 'Cash',
  [formData.paymentMethod]);

  // Calculate Agency Profit
  const margin = useMemo(() => {
      const price = formData.clientPrice || 0;
      const cost = formData.supplierCost || 0;
      const extras = formData.extrasAmount || 0; 

      // Profit is always Revenue - Cost + Extras (assuming extras are commission TO agency)
      // regardless of who collected the cash, the P&L remains the same.
      // The cash flow settlement changes, but the profit number is constant.
      return price - cost + extras;
  }, [formData.clientPrice, formData.supplierCost, formData.extrasAmount]);

  // Calculate Settlement with Supplier
  const supplierSettlement = useMemo(() => {
      if (fulfillmentType !== 'OUTSOURCED') return null;

      const cost = formData.supplierCost || 0;
      const extras = formData.extrasAmount || 0;
      const collectedBySupplier = isDriverCollecting ? balanceDue : 0; // If driver collecting, supplier gets balance
      
      // Logic: Supplier is owed 'Cost'. 
      // Supplier already holds 'Collected' + 'Extras' (assuming extras are collected on site).
      // Net Payment To Supplier = Cost - (Collected + Extras)
      const netPayableToSupplier = cost - (collectedBySupplier + extras);

      return {
          netPayableToSupplier,
          collectedBySupplier,
          extras,
          cost
      };
  }, [fulfillmentType, formData.supplierCost, formData.extrasAmount, isDriverCollecting, balanceDue]);


  const financialLabel = useMemo(() => {
      if (fulfillmentType === 'OUTSOURCED') return t('agency_net_profit');
      if (isDriverCollecting) return t('total_remittance');
      return t('estimated_profit');
  }, [fulfillmentType, isDriverCollecting, t]);

  useEffect(() => {
    const defaultService: Partial<Service> = {
      id: `service-${Date.now()}`,
      status: ServiceStatus.CONFIRMED, // Always Confirmed
      serviceType: ServiceType.TRANSFER,
      startTime: new Date(),
      createdById: 'admin1', // Mock creator
      clientPaymentStatus: PaymentStatus.PAID, // Default PAID
      color: 'Default',
      passengersAdults: 1,
      passengersKids: 0
    };
    
    if (service) { 
      // Backfill adults if missing from old data
      const initialData = { ...defaultService, ...service };
      if (initialData.numberOfPassengers && (initialData.passengersAdults === undefined)) {
          initialData.passengersAdults = initialData.numberOfPassengers;
          initialData.passengersKids = 0;
      }

      setFormData(initialData);
      setSyncToGoogleCalendar(!!service.googleCalendarEventId);
      // Determine fulfillment type
      if (service.supplierId) {
          setFulfillmentType('OUTSOURCED');
      } else {
          setFulfillmentType('INTERNAL');
      }
    } else {
      // Round up to next hour for new services
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      defaultService.startTime = now;

      setFormData(defaultService);
      setSyncToGoogleCalendar(isLoggedIn);
      setFulfillmentType('INTERNAL');
    }
    setError(null);
  }, [service, isOpen, isLoggedIn]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setError(null);
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
  };

  // New Date/Time Handlers
  const handleDatePartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateStr = e.target.value; // YYYY-MM-DD
      if (!dateStr) return;
      
      const current = new Date(formData.startTime || new Date());
      const [y, m, d] = dateStr.split('-').map(Number);
      
      // Create new date preserving current time
      const newDate = new Date(current);
      newDate.setFullYear(y, m - 1, d);
      
      setFormData(prev => ({ ...prev, startTime: newDate }));
  };

  const handleTimePartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const timeStr = e.target.value; // HH:MM
      if (!timeStr) return;
      
      const current = new Date(formData.startTime || new Date());
      const [h, m] = timeStr.split(':').map(Number);
      
      const newDate = new Date(current);
      newDate.setHours(h, m);
      
      setFormData(prev => ({ ...prev, startTime: newDate }));
  };

  const handleQuickDate = (type: 'today' | 'tomorrow' | 'next') => {
      const current = new Date(formData.startTime || new Date());
      const newDate = new Date(current);
      
      if (type === 'today') {
          const now = new Date();
          newDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (type === 'tomorrow') {
          const now = new Date();
          newDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (type === 'next') {
          newDate.setDate(newDate.getDate() + 1);
      }
      setFormData(prev => ({ ...prev, startTime: newDate }));
  };

  const handleQuickTime = (timeStr: string) => {
      const current = new Date(formData.startTime || new Date());
      const [h, m] = timeStr.split(':').map(Number);
      const newDate = new Date(current);
      newDate.setHours(h, m);
      setFormData(prev => ({ ...prev, startTime: newDate }));
  };

  const handleFulfillmentChange = (type: 'INTERNAL' | 'OUTSOURCED') => {
      setFulfillmentType(type);
      if (type === 'INTERNAL') {
          setFormData(prev => ({ ...prev, supplierId: undefined, supplierCost: undefined, supplierPaymentStatus: undefined }));
      } else {
          setFormData(prev => ({ ...prev, driverId: undefined }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.clientName || !formData.pickupAddress || !formData.dropoffAddress || !formData.startTime) {
      setError("Please fill all required fields.");
      return;
    }
    
    if (fulfillmentType === 'OUTSOURCED') {
        if (!formData.supplierId) {
             setError("Please select a supplier for outsourced service.");
             return;
        }
    } else {
         if (formData.supplierId) formData.supplierId = undefined;
    }

    if (formData.deposit && formData.clientPrice && formData.deposit > formData.clientPrice) {
        setError("Deposit cannot be greater than the total client price.");
        return;
    }

    // Calculate total passengers
    const totalPax = (formData.passengersAdults || 0) + (formData.passengersKids || 0);
    
    let finalServiceData = { 
        ...formData,
        numberOfPassengers: totalPax > 0 ? totalPax : 1 // Fallback
    } as Service;

    try {
        if (isLoggedIn && syncToGoogleCalendar) {
            if (finalServiceData.googleCalendarEventId) {
                await updateCalendarEvent(finalServiceData.googleCalendarEventId, finalServiceData);
            } else {
                const eventId = await createCalendarEvent(finalServiceData);
                finalServiceData.googleCalendarEventId = eventId;
            }
        } else if (finalServiceData.googleCalendarEventId) {
            delete finalServiceData.googleCalendarEventId;
        }

        onSave(finalServiceData);

    } catch (error) {
        console.error("Failed to sync with Google Calendar", error);
        setError("Could not sync with Google Calendar. Please try again.");
    }
  };

  const onExtraction = useCallback((data: ExtractedReservation) => {
    setError(null);
    setFormData(prev => {
        const existingNotes = prev.notes || '';
        let finalNotes = existingNotes;
        const newAiNotes = data.specialRequests;

        if (newAiNotes) {
            const aiHeader = 'AI Extracted Notes:';
            if (existingNotes) {
                finalNotes = `${existingNotes}\n\n---\n\n${aiHeader}\n${newAiNotes}`;
            } else {
                finalNotes = `${aiHeader}\n${newAiNotes}`;
            }
        }
        
        return {
            ...prev,
            // Use AI title if present, otherwise fallback to existing or generic
            title: data.title || prev.title || 'New Service',
            clientName: data.clientName || prev.clientName,
            clientEmail: data.clientEmail || prev.clientEmail,
            clientPhone: data.clientPhone || prev.clientPhone,
            pickupAddress: data.pickupAddress || prev.pickupAddress,
            stopAddress: data.stopAddress || prev.stopAddress,
            dropoffAddress: data.dropoffAddress || prev.dropoffAddress,
            passengersAdults: data.passengersAdults ?? data.numberOfPassengers ?? prev.passengersAdults ?? 1,
            passengersKids: data.passengersKids ?? prev.passengersKids ?? 0,
            clientPrice: data.clientPrice ?? prev.clientPrice,
            startTime: data.pickupTime ? new Date(data.pickupTime) : prev.startTime,
            serviceType: data.serviceType || prev.serviceType,
            notes: finalNotes,
            flightNumber: data.flightNumber || prev.flightNumber,
            paymentMethod: data.paymentMethod || prev.paymentMethod,
        };
    });
  }, []);

  const inputStyles = "mt-1 block w-full bg-slate-50 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400";
  const labelStyles = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  const quickTimes = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{service?.id ? t('edit_service') : t('create_service')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            
            <div className="md:col-span-2">
              <label className={labelStyles}>{t('title')}</label>
              <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className={inputStyles} required placeholder="e.g. Transfer: JFK -> Hotel" />
            </div>
            
            <div className="md:col-span-1">
              <label className={labelStyles}>{t('client_name')}</label>
              <input type="text" name="clientName" value={formData.clientName || ''} onChange={handleChange} className={inputStyles} required />
            </div>

            {/* Passengers Grid */}
            <div className="md:col-span-1 flex gap-3">
                 <div className="flex-1">
                    <label className={labelStyles}>{t('adults')}</label>
                    <input type="number" name="passengersAdults" value={formData.passengersAdults ?? ''} onChange={handleNumberChange} className={inputStyles} placeholder="1" min="0" />
                </div>
                 <div className="flex-1">
                    <label className={labelStyles}>{t('kids')}</label>
                    <input type="number" name="passengersKids" value={formData.passengersKids ?? ''} onChange={handleNumberChange} className={inputStyles} placeholder="0" min="0" />
                </div>
            </div>

             <div>
              <label className={labelStyles}>{t('client_email')}</label>
              <input type="email" name="clientEmail" value={formData.clientEmail || ''} onChange={handleChange} className={inputStyles} />
            </div>

             <div>
              <label className={labelStyles}>{t('client_phone')}</label>
              <input type="tel" name="clientPhone" value={formData.clientPhone || ''} onChange={handleChange} className={inputStyles} />
            </div>

            {/* IMPROVED DATE & TIME SELECTION */}
             <div className="md:col-span-2 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{t('service_date')} & Time</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date Column */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                             <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</label>
                             <div className="flex space-x-1">
                                <button type="button" onClick={() => handleQuickDate('today')} className="text-[10px] bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 px-2 py-0.5 rounded hover:bg-primary-50 dark:hover:bg-slate-500 transition-colors">{t('today')}</button>
                                <button type="button" onClick={() => handleQuickDate('tomorrow')} className="text-[10px] bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 px-2 py-0.5 rounded hover:bg-primary-50 dark:hover:bg-slate-500 transition-colors">Tom</button>
                                <button type="button" onClick={() => handleQuickDate('next')} className="text-[10px] bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 px-2 py-0.5 rounded hover:bg-primary-50 dark:hover:bg-slate-500 transition-colors">+1D</button>
                             </div>
                        </div>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </div>
                            <input 
                                type="date" 
                                value={getLocalDateString(formData.startTime || new Date())}
                                onChange={handleDatePartChange}
                                className={`${inputStyles} pl-10`} 
                                required 
                            />
                        </div>
                    </div>

                    {/* Time Column */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Time</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <input 
                                type="time" 
                                value={getLocalTimeString(formData.startTime || new Date())}
                                onChange={handleTimePartChange}
                                className={`${inputStyles} pl-10 font-bold`} 
                                required 
                            />
                        </div>
                        {/* Quick Time Chips */}
                        <div className="mt-2 flex overflow-x-auto pb-2 gap-1 no-scrollbar mask-fade-right">
                            {quickTimes.map(time => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => handleQuickTime(time)}
                                    className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-md hover:bg-primary-50 hover:border-primary-300 dark:hover:bg-primary-900/30 dark:hover:border-primary-700 transition-colors"
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>


            {/* Flight Number Field */}
             <div>
              <label className={labelStyles}>{t('flight_number')}</label>
              <input type="text" name="flightNumber" value={formData.flightNumber || ''} onChange={handleChange} className={inputStyles} placeholder="e.g. AA123" />
            </div>

             <div className="md:col-span-2">
                <label className={labelStyles}>{t('service_type')}</label>
                <select name="serviceType" value={formData.serviceType || ''} onChange={handleChange} className={inputStyles}>
                    {Object.values(ServiceType).map(type => (
                        <option key={type} value={type}>
                             {t(`type_${type}` as any) || type.replace(/_/g, ' ')}
                        </option>
                    ))}
                </select>
            </div>
             
             <div className="md:col-span-2">
              <label className={labelStyles}>{t('pickup_address')}</label>
              <input type="text" name="pickupAddress" value={formData.pickupAddress || ''} onChange={handleChange} className={inputStyles} required />
            </div>

            {/* NEW: Stop/Waypoint Field */}
            <div className="md:col-span-2 relative">
               <label className={labelStyles}>{t('stop_waypoint')}</label>
               <input 
                 type="text" 
                 name="stopAddress" 
                 value={formData.stopAddress || ''} 
                 onChange={handleChange} 
                 className={`${inputStyles} border-dashed bg-slate-50/50`} 
                 placeholder="Optional stop or via..."
               />
               <div className="absolute right-3 top-9 text-slate-400 pointer-events-none">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
               </div>
            </div>

             <div className="md:col-span-2">
              <label className={labelStyles}>{t('dropoff_address')}</label>
              <input type="text" name="dropoffAddress" value={formData.dropoffAddress || ''} onChange={handleChange} className={inputStyles} required />
            </div>
            
            <div className="md:col-span-2">
                <label className={labelStyles}>Calendar Color</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    {Object.keys(EVENT_COLORS).map(colorKey => (
                        <button
                            key={colorKey}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, color: colorKey }))}
                            className={`px-3 py-1 text-xs rounded-full border transition-all ${formData.color === colorKey ? 'ring-2 ring-offset-1 ring-slate-400 border-transparent font-bold' : 'border-slate-200'}`}
                            style={{
                                backgroundColor: colorKey === 'Default' ? '#EFF6FF' : colorKey === 'Gray' ? '#F1F5F9' : `${colorKey.toLowerCase()}`,
                                color: 'inherit' // Let text color inherit or override via classes if needed
                            }}
                        >
                             <div className={`flex items-center gap-1`}>
                                <div className={`w-3 h-3 rounded-full ${EVENT_COLORS[colorKey].split(' ')[0]}`}></div>
                                <span>{colorKey}</span>
                             </div>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Fulfillment Selection */}
            <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                 <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Fulfillment Method</label>
                 <div className="flex space-x-6 mb-4">
                    <label className="inline-flex items-center cursor-pointer">
                        <input 
                            type="radio" 
                            name="fulfillment" 
                            checked={fulfillmentType === 'INTERNAL'} 
                            onChange={() => handleFulfillmentChange('INTERNAL')}
                            className="form-radio h-4 w-4 text-primary-600 transition duration-150 ease-in-out focus:ring-primary-500" 
                        />
                        <span className="ml-2 text-sm text-slate-700 dark:text-slate-300 font-medium">{t('in_house')} (Driver)</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                        <input 
                            type="radio" 
                            name="fulfillment" 
                            checked={fulfillmentType === 'OUTSOURCED'} 
                            onChange={() => handleFulfillmentChange('OUTSOURCED')}
                            className="form-radio h-4 w-4 text-primary-600 transition duration-150 ease-in-out focus:ring-primary-500" 
                        />
                        <span className="ml-2 text-sm text-slate-700 dark:text-slate-300 font-medium">Outsourced (Supplier)</span>
                    </label>
                 </div>

                 <div className={`p-4 rounded-lg transition-colors ${fulfillmentType === 'INTERNAL' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800'}`}>
                    {fulfillmentType === 'INTERNAL' ? (
                        <div>
                            <label className={labelStyles}>{t('driver')}</label>
                            <select name="driverId" value={formData.driverId || ''} onChange={handleChange} className={inputStyles}>
                                <option value="">{t('unassigned')}</option>
                                {sortedDrivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name} {driver.availability !== 'Available' ? `(${driver.availability})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className={labelStyles}>{t('supplier')}</label>
                            <select name="supplierId" value={formData.supplierId || ''} onChange={handleChange} className={inputStyles}>
                                <option value="">-- Select Supplier --</option>
                                {validSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                 </div>
            </div>

            <div className="md:col-span-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">{t('financials')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyles}>{t('client_price')} ($)</label>
                        <input type="number" step="0.01" name="clientPrice" value={formData.clientPrice || ''} onChange={handleNumberChange} className={inputStyles} />
                    </div>
                    <div>
                        <label className={labelStyles}>{t('payment_method')}</label>
                        <select name="paymentMethod" value={formData.paymentMethod || ''} onChange={handleChange} className={inputStyles}>
                            <option value="">Not specified</option>
                            <option value="Prepaid">{t('method_Prepaid')}</option>
                            <option value="Pay to the driver">{t('method_Pay_to_the_driver')}</option>
                            <option value="Paid deposit + balance to the driver">{t('method_Paid_deposit_balance_to_the_driver')}</option>
                            <option value="Future Invoice">{t('method_Future_Invoice')}</option>
                            <option value="Cash">{t('method_Cash')}</option>
                        </select>
                    </div>
                    
                    {formData.paymentMethod === 'Paid deposit + balance to the driver' && (
                         <div>
                            <label className={labelStyles}>{t('deposit')} ($)</label>
                            <input type="number" step="0.01" name="deposit" value={formData.deposit || ''} onChange={handleNumberChange} className={inputStyles} placeholder="0.00" />
                        </div>
                    )}

                    <div>
                        <label className={labelStyles}>{t('balance_due')} (Collect on Site) ($)</label>
                         <div className="mt-1 block w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 sm:text-sm font-semibold">
                            ${balanceDue.toFixed(2)}
                         </div>
                    </div>
                    <div>
                        <label className={labelStyles}>{t('payment_status_in')}</label>
                        <select name="clientPaymentStatus" value={formData.clientPaymentStatus || ''} onChange={handleChange} className={inputStyles}>
                            {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* Cost Section */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                {fulfillmentType === 'OUTSOURCED' && (
                    <>
                        <div>
                            <label className={labelStyles}>
                                Supplier Cost ($)
                            </label>
                            <input 
                                type="number" 
                                step="0.01" 
                                name="supplierCost" 
                                value={formData.supplierCost || ''} 
                                onChange={handleNumberChange} 
                                className={inputStyles} 
                                placeholder="Cost to company"
                            />
                        </div>
                        <div>
                            <label className={labelStyles}>{t('payment_status_out')}</label>
                            <select name="supplierPaymentStatus" value={formData.supplierPaymentStatus || ''} onChange={handleChange} className={inputStyles}>
                                <option value="">N/A</option>
                                {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </>
                )}
                
                {/* Extras / Cross-Selling Commissions */}
                 <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                    <div className="md:col-span-2">
                        <h5 className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase mb-1">{t('extras_cross_selling')}</h5>
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 mb-2">{t('extras_helper')}</p>
                    </div>
                    <div>
                        <label className={labelStyles}>{t('extras_commission')} ($)</label>
                         <input 
                            type="number" 
                            step="0.01" 
                            name="extrasAmount" 
                            value={formData.extrasAmount || ''} 
                            onChange={handleNumberChange} 
                            className={inputStyles} 
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className={labelStyles}>{t('extras_info')}</label>
                         <input 
                            type="text" 
                            name="extrasInfo" 
                            value={formData.extrasInfo || ''} 
                            onChange={handleChange} 
                            className={inputStyles} 
                            placeholder="e.g. Guide commission"
                        />
                    </div>
                 </div>

                {/* Dynamic Financial Summary */}
                {(formData.clientPrice || 0) > 0 && (
                    <div className={`col-span-1 md:col-span-2 mt-2 p-3 rounded border ${fulfillmentType === 'INTERNAL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                        <div className="flex justify-between items-center">
                            <span className={`text-sm font-bold ${fulfillmentType === 'INTERNAL' ? 'text-blue-800 dark:text-blue-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                                {financialLabel}
                            </span>
                            <span className={`text-lg font-bold ${margin >= 0 ? (fulfillmentType === 'INTERNAL' ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400') : 'text-red-600 dark:text-red-400'}`}>
                                ${margin.toFixed(2)}
                            </span>
                        </div>
                        
                        {/* Explanation Text */}
                        {fulfillmentType === 'OUTSOURCED' && supplierSettlement ? (
                            // Net Settlement Calculation: Cost - (Balance + Extras)
                            <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                                <p>{t('supplier_holds')}: <strong>${(supplierSettlement.collectedBySupplier + supplierSettlement.extras).toFixed(2)}</strong> ({t('balance')} ${supplierSettlement.collectedBySupplier} + {t('extras')} ${supplierSettlement.extras}).</p>
                                <p>{t('cost_is')} <strong>${supplierSettlement.cost.toFixed(2)}</strong>.</p>
                                <div className="mt-1 pt-1 border-t border-emerald-200 dark:border-emerald-800 font-semibold">
                                    {supplierSettlement.netPayableToSupplier >= 0 
                                        ? <>{t('net_payable_to_supplier')}: <span className="text-red-600 dark:text-red-400">-${supplierSettlement.netPayableToSupplier.toFixed(2)}</span> ({t('you_pay_them')})</>
                                        : <>{t('net_from_supplier')}: <span className="text-green-600 dark:text-green-400">+${Math.abs(supplierSettlement.netPayableToSupplier).toFixed(2)}</span> ({t('they_pay_you')})</>
                                    }
                                </div>
                            </div>
                        ) : (
                            // Internal Driver
                             <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                 Internal Driver collects <strong>${balanceDue.toFixed(2)}</strong>
                                 {(formData.extrasAmount || 0) > 0 ? ` + ${t('extras')} ($${formData.extrasAmount})` : ''}. 
                                 Total Remittance: <strong>${margin.toFixed(2)}</strong>.
                             </p>
                        )}
                    </div>
                )}
            </div>

            <div className="md:col-span-2">
              <label className={labelStyles}>{t('notes')}</label>
              <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className={inputStyles}></textarea>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <ReservationExtractor onExtraction={onExtraction} />
            </div>
            
            <div className="md:col-span-2 flex justify-between items-center pt-4">
              <div>
                {isLoggedIn && (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={syncToGoogleCalendar} onChange={(e) => setSyncToGoogleCalendar(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                    <span className={labelStyles}>{t('sync_gcal')}</span>
                  </label>
                )}
              </div>
              <div className="flex items-center">
                {error && <p className="text-red-600 dark:text-red-400 text-sm font-medium mr-4">{error}</p>}
                <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 transition-colors">{t('cancel')}</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-lg shadow-sm hover:bg-primary-700 transition-colors">{t('save')}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
