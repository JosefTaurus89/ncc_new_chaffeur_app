import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Service, ServiceStatus, ServiceType, ExtractedReservation, User, Supplier, PaymentStatus } from '../../types';
import { ReservationExtractor } from '../ai/ReservationExtractor';
import { createCalendarEvent, updateCalendarEvent } from '../../services/googleCalendarService';


interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Service) => void;
  service?: Partial<Service>;
  drivers: User[];
  suppliers: Supplier[];
  isLoggedIn: boolean;
}

const getLocalDateTimeValue = (date: Date) => {
    if (!date) return '';
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    return localISOTime;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, onSave, service, drivers, suppliers, isLoggedIn }) => {
  const [formData, setFormData] = useState<Partial<Service>>({});
  const [error, setError] = useState<string | null>(null);
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState(false);
  
  const availableDrivers = useMemo(() => drivers.filter(d => d.availability === 'Available'), [drivers]);
  const validSuppliers = useMemo(() => suppliers.filter(s => s.contactPerson && s.email && s.phone), [suppliers]);
  
  const isAssigningMode = useMemo(() => {
    // True if we are editing an existing, unassigned service
    return !!(service && service.id && !service.driverId && !service.supplierId);
  }, [service]);

  useEffect(() => {
    const defaultService: Partial<Service> = {
      id: `service-${Date.now()}`,
      status: ServiceStatus.PENDING,
      serviceType: ServiceType.CUSTOM,
      startTime: new Date(),
      createdById: 'admin1', // Mock creator
      clientPaymentStatus: PaymentStatus.UNPAID,
    };
    
    if (service) { // Handles both full service for edit and partial for quick-add
      setFormData({ ...defaultService, ...service });
      setSyncToGoogleCalendar(!!service.googleCalendarEventId);
    } else { // Handles new service from header button
      setFormData(defaultService);
      setSyncToGoogleCalendar(isLoggedIn); // Default to on for new services if logged in
    }
    setError(null); // Clear error when modal opens or service changes
  }, [service, isOpen, isLoggedIn]);

  useEffect(() => {
    if (!formData.supplierId) {
        setFormData(prev => {
            const { supplierCost, supplierPaymentStatus, ...rest } = prev;
            return rest;
        });
    } else {
        if (!formData.supplierPaymentStatus) {
            setFormData(prev => ({...prev, supplierPaymentStatus: PaymentStatus.UNPAID}));
        }
    }
  }, [formData.supplierId]);


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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value ? new Date(value) : undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.clientName || !formData.pickupAddress || !formData.dropoffAddress || !formData.startTime) {
      setError("Please fill all required fields.");
      return;
    }
    
    // Past date validation
    const now = new Date();
    // Allow a 5-minute grace period for services starting very close to the current time
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (formData.startTime && new Date(formData.startTime) < fiveMinutesAgo) {
      setError("Start time cannot be in the past.");
      return;
    }

    if (formData.supplierId && (!formData.supplierCost || formData.supplierCost <= 0)) {
      setError("A positive supplier cost is required for outsourced services.");
      return;
    }

    if (formData.supplierCost && formData.clientPrice && formData.supplierCost > formData.clientPrice) {
      setError("Supplier cost cannot be greater than the client price.");
      return;
    }

    let finalServiceData = { ...formData } as Service;

    try {
        if (isLoggedIn && syncToGoogleCalendar) {
            if (finalServiceData.googleCalendarEventId) {
                // Update existing event
                await updateCalendarEvent(finalServiceData.googleCalendarEventId, finalServiceData);
            } else {
                // Create new event
                const eventId = await createCalendarEvent(finalServiceData);
                finalServiceData.googleCalendarEventId = eventId;
            }
        } else if (finalServiceData.googleCalendarEventId) {
            // If sync is turned off for an existing event, we can choose to delete it or just de-link it.
            // For this implementation, we'll just de-link by removing the ID.
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
            title: prev.title || data.title,
            clientName: prev.clientName || data.clientName,
            pickupAddress: prev.pickupAddress || data.pickupAddress,
            dropoffAddress: prev.dropoffAddress || data.dropoffAddress,
            numberOfPassengers: prev.numberOfPassengers ?? data.numberOfPassengers,
            clientPrice: prev.clientPrice ?? data.clientPrice,
            startTime: data.pickupTime ? new Date(data.pickupTime) : prev.startTime,
            serviceType: data.serviceType || prev.serviceType,
            notes: finalNotes,
        };
    });
  }, []);

  const inputStyles = "mt-1 block w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400";
  const labelStyles = "block text-sm font-medium text-slate-700 dark:text-slate-300";


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{service?.id ? 'Edit Service' : 'Create New Service'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            
            <div className="md:col-span-2">
              <label className={labelStyles}>Title</label>
              <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className={inputStyles} required />
            </div>
             <div>
              <label className={labelStyles}>Client Name</label>
              <input type="text" name="clientName" value={formData.clientName || ''} onChange={handleChange} className={inputStyles} required />
            </div>
             <div>
              <label className={labelStyles}>Start Time</label>
              <input type="datetime-local" name="startTime" value={formData.startTime ? getLocalDateTimeValue(formData.startTime) : ''} onChange={handleDateChange} className={inputStyles} required />
            </div>
             <div className="md:col-span-2">
              <label className={labelStyles}>Pickup Address</label>
              <input type="text" name="pickupAddress" value={formData.pickupAddress || ''} onChange={handleChange} className={inputStyles} required />
            </div>
             <div className="md:col-span-2">
              <label className={labelStyles}>Dropoff Address</label>
              <input type="text" name="dropoffAddress" value={formData.dropoffAddress || ''} onChange={handleChange} className={inputStyles} required />
            </div>
            
            <div>
                <label className={labelStyles}>Service Type</label>
                <select name="serviceType" value={formData.serviceType || ''} onChange={handleChange} className={inputStyles}>
                    {Object.values(ServiceType).map(type => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
                </select>
            </div>
            <div>
                <label className={labelStyles}>Status</label>
                <select name="status" value={formData.status || ''} onChange={handleChange} className={inputStyles}>
                    {Object.values(ServiceStatus).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
            </div>
            
            <div className={`md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 rounded-lg ${isAssigningMode ? 'bg-primary-50 dark:bg-primary-900/20 p-4 ring-2 ring-primary-500' : ''}`}>
                <div>
                  <label className={labelStyles}>Driver</label>
                  <select name="driverId" value={formData.driverId || ''} onChange={handleChange} className={inputStyles}>
                    <option value="">Unassigned</option>
                    {availableDrivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyles}>Supplier</label>
                  <select name="supplierId" value={formData.supplierId || ''} onChange={handleChange} className={inputStyles}>
                    <option value="">In-house</option>
                    {validSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
            </div>

            <div>
                <label className={labelStyles}>Client Price ($)</label>
                <input type="number" step="0.01" name="clientPrice" value={formData.clientPrice || ''} onChange={handleNumberChange} className={inputStyles} />
            </div>
            <div>
                <label className={labelStyles}>Payment Method</label>
                <select name="paymentMethod" value={formData.paymentMethod || ''} onChange={handleChange} className={inputStyles}>
                    <option value="">Not specified</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>
            </div>
            <div>
                <label className={labelStyles}>Client Payment Status</label>
                <select name="clientPaymentStatus" value={formData.clientPaymentStatus || ''} onChange={handleChange} className={inputStyles}>
                    {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
             <div>
                <label className={labelStyles}>Passengers</label>
                <input type="number" name="numberOfPassengers" value={formData.numberOfPassengers || ''} onChange={handleNumberChange} className={inputStyles} />
            </div>
             <div>
                <label className={labelStyles}>Supplier Cost ($)</label>
                <input type="number" step="0.01" name="supplierCost" value={formData.supplierCost || ''} onChange={handleNumberChange} className={inputStyles} disabled={!formData.supplierId}/>
            </div>
             <div>
                <label className={labelStyles}>Supplier Payment</label>
                <select name="supplierPaymentStatus" value={formData.supplierPaymentStatus || ''} onChange={handleChange} className={inputStyles} disabled={!formData.supplierId}>
                    <option value="">N/A</option>
                    {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelStyles}>Notes</label>
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
                    <span className={labelStyles}>Sync to Google Calendar</span>
                  </label>
                )}
              </div>
              <div className="flex items-center">
                {error && <p className="text-red-600 dark:text-red-400 text-sm font-medium mr-4">{error}</p>}
                <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-lg shadow-sm hover:bg-primary-700 transition-colors">Save Service</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};