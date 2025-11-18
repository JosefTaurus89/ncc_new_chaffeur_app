import React from 'react';
import { Service, ServiceStatus, User, Supplier, PaymentStatus } from '../../types';
import { ServiceColors } from '../../constants';
import { deleteCalendarEvent } from '../../services/googleCalendarService';

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
  drivers: User[];
  suppliers: Supplier[];
  isLoggedIn: boolean;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ isOpen, onClose, service, onEdit, onDelete, drivers, suppliers, isLoggedIn }) => {
  if (!isOpen) return null;

  const statusColor = service.status === ServiceStatus.CANCELLED ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' : ServiceColors[service.serviceType] || 'bg-blue-100 text-blue-800';
  const driver = drivers.find(d => d.id === service.driverId);
  const supplier = suppliers.find(s => s.id === service.supplierId);
  const isAssigned = driver || supplier;

  const profit = (service.clientPrice && service.supplierCost) ? service.clientPrice - service.supplierCost : null;

  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="py-2.5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1 text-md text-slate-900 dark:text-slate-100">{value || <span className="text-slate-400 dark:text-slate-500">-</span>}</div>
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
    const header = (text: string) => `*${text.toUpperCase()}*`;
    const line = `--------------------`;
    const profitValue = service.clientPrice && service.supplierCost ? service.clientPrice - service.supplierCost : null;

    const details = [
        header(`Service Confirmation: ${service.title}`),
        `*Booking ID:* ${service.id}`,
        `*Status:* ${service.status.replace(/_/g, ' ')}\n`,

        `👤 ${header('Client Information')}`,
        line,
        `*Name:* ${service.clientName}`,
        service.numberOfPassengers ? `*Passengers:* ${service.numberOfPassengers}\n` : ``,
        
        `🗓️ ${header('Logistics')}`,
        line,
        `*Type:* ${service.serviceType.replace(/_/g, ' ')}`,
        `*Pickup Time:* ${service.startTime.toLocaleString()}`,
        `*Pickup Address:* ${service.pickupAddress}`,
        `*Dropoff Address:* ${service.dropoffAddress}\n`,
        
        `🚗 ${header('Assignment')}`,
        line,
    ];

    if (driver) {
        details.push(`*Driver:* ${driver.name}`);
        if(driver.phone) details.push(`*Phone:* ${driver.phone}`);
    } else if (supplier) {
        details.push(`*Supplier:* ${supplier.name}`);
        if(supplier.contactPerson) details.push(`*Contact:* ${supplier.contactPerson}`);
        if(supplier.phone) details.push(`*Phone:* ${supplier.phone}`);
    } else {
        details.push(`Unassigned`);
    }

    // Add Financials Section
    details.push(`\n💰 ${header('Financials')}\n${line}`);
    details.push(`*Client Price:* ${service.clientPrice ? `$${service.clientPrice.toFixed(2)}` : 'N/A'}`);
    details.push(`*Payment Method:* ${service.paymentMethod || 'N/A'}`);
    details.push(`*Client Payment Status:* ${service.clientPaymentStatus || 'N/A'}`);

    if(supplier) {
        details.push(`*Supplier Cost:* ${service.supplierCost ? `$${service.supplierCost.toFixed(2)}` : 'N/A'}`);
        details.push(`*Supplier Payment Status:* ${service.supplierPaymentStatus || 'N/A'}`);
        if (profitValue !== null) {
            details.push(`*Profit:* $${profitValue.toFixed(2)}`);
        }
    }


    if (service.notes) {
        details.push(`\n📝 ${header('Notes')}\n${line}\n${service.notes}`);
    }
    
    const shareText = details.filter(Boolean).join('\n').trim();

    if (navigator.share) {
        await navigator.share({ title: `Service: ${service.title}`, text: shareText });
    } else {
        await navigator.clipboard.writeText(shareText);
        alert('Service details copied to clipboard!');
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this service?')) {
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


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{service.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
             <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-6 space-y-2 max-h-[70vh] overflow-y-auto">
            {!isAssigned && (
                <div className="p-3 mb-4 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded-lg flex items-center">
                    <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.636-1.1 2.153-1.1 2.79 0l5.38 9.32a1.75 1.75 0 01-1.395 2.581H3.272a1.75 1.75 0 01-1.395-2.581l5.38-9.32zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                    <span className="text-sm font-semibold">This service is unassigned.</span>
                </div>
            )}
            <div className="mb-4 flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColor}`}>{service.status.replace(/_/g, ' ')}</span>
                {service.googleCalendarEventId && (
                     <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                         <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5c0-.28-.22-.5-.5-.5h-2v-1.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-5V4.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-2c-.28 0-.5.22-.5.5v14c0 .28.22.5.5.5h17c.28 0 .5-.22-.5-.5v-14zM11.5 11H6V9h5.5v2zm-1 2.5H6v2h4.5v-2zm.5 3.5h-5V19h5v-2zm6-5.5h-4V9h4v2.5z" /></svg>
                        Synced to Google Calendar
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 sm:border-t-0 border-t border-slate-100 dark:border-slate-700">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    <DetailItem label="Client" value={service.clientName} />
                    <DetailItem label="Passengers" value={service.numberOfPassengers} />
                    <DetailItem label="Start Time" value={service.startTime.toLocaleString()} />
                    <DetailItem label="End Time" value={service.endTime?.toLocaleString()} />
                    <DetailItem label="Pickup Address" value={service.pickupAddress} />
                    <DetailItem label="Dropoff Address" value={service.dropoffAddress} />
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    <DetailItem label="Client Price" value={service.clientPrice ? `$${service.clientPrice.toFixed(2)}` : 'Not set'} />
                    <DetailItem label="Payment Method" value={service.paymentMethod} />
                    <DetailItem label="Payment Status" value={<PaymentStatusBadge status={service.clientPaymentStatus} />} />
                    <DetailItem label="Driver" value={driver?.name || "Unassigned"} />
                    <DetailItem label="Supplier" value={supplier?.name || "In-house"} />
                    {profit !== null && <DetailItem label="Profit" value={<span className={profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{`$${profit.toFixed(2)}`}</span>} />}
                </div>

                 <div className="sm:col-span-2 pt-2">
                    <DetailItem label="Notes" value={<pre className="whitespace-pre-wrap font-sans text-sm">{service.notes}</pre>} />
                 </div>
            </div>
        </div>
        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
            >
              Delete
            </button>
            <div className="flex items-center space-x-2">
               {(navigator.share || navigator.clipboard) && (
                <button
                  onClick={handleShare}
                  className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                >
                  <svg className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg>
                  Share
                </button>
               )}
                <button
                  onClick={() => onEdit(service)}
                  className={`px-4 py-2 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors ${!isAssigned ? 'animate-pulse' : ''}`}
                >
                  {isAssigned ? 'Edit Service' : 'Assign Driver/Supplier'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};