import React from 'react';
import { Service, DriverAvailability } from '../../types';
import { ServiceBorderColors, ServiceColors } from '../../constants';
import { formatTime } from '../../lib/calendar-utils';

interface ServiceItemProps {
  service: Service;
  onSelect: (service: Service) => void;
  zoomLevel: number;
  driverAvailability?: DriverAvailability;
}

export const ServiceItem: React.FC<ServiceItemProps> = ({ service, onSelect, zoomLevel, driverAvailability }) => {
  const borderColor = ServiceBorderColors[service.serviceType] || 'border-slate-500';
  const serviceColor = ServiceColors[service.serviceType] || 'bg-slate-100 text-slate-700';
  const isDriverUnavailable = driverAvailability === 'Busy' || driverAvailability === 'On Leave';
  const isUnassigned = !service.driverId && !service.supplierId;

  return (
    <button
      onClick={() => onSelect(service)}
      className={`w-full text-left p-1.5 rounded-md text-xs font-semibold cursor-pointer hover:shadow-md transition-all border-l-4 shadow-sm ${serviceColor} ${borderColor} ${isUnassigned ? 'border-dashed' : ''} ${zoomLevel > 2 ? 'flex flex-col' : ''}`}
    >
      <div className="truncate flex items-center justify-between">
        <span className="truncate flex items-center">
            {isUnassigned && (
                 <div className="group relative flex-shrink-0 mr-1.5" title="This service is unassigned">
                    <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        Unassigned
                    </span>
                </div>
            )}
            {isDriverUnavailable && (
                <div className="group relative flex-shrink-0 mr-1.5" title={`Driver is ${driverAvailability}`}>
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        Driver is {driverAvailability}
                    </span>
                </div>
            )}
            <span className="font-bold">{formatTime(service.startTime)}</span>
            <span className="ml-1 truncate">{service.title}</span>
        </span>
        {service.googleCalendarEventId && (
            <svg className="w-3.5 h-3.5 flex-shrink-0 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 6.5c0-.28-.22-.5-.5-.5h-2v-1.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-5V4.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-2c-.28 0-.5.22-.5.5v14c0 .28.22.5.5.5h17c.28 0 .5-.22.5-.5v-14zM11.5 11H6V9h5.5v2zm-1 2.5H6v2h4.5v-2zm.5 3.5h-5V19h5v-2zm6-5.5h-4V9h4v2.5z" />
            </svg>
        )}
      </div>
      {zoomLevel > 2 && <span className="font-normal text-slate-600 dark:text-slate-400 truncate mt-0.5">{service.clientName}</span>}
    </button>
  );
};