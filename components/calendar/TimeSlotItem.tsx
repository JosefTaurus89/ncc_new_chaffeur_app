import React from 'react';
import { Service, DriverAvailability } from '../../types';
import { ServiceBorderColors, ServiceColors } from '../../constants';
import { formatTime } from '../../lib/calendar-utils';

interface TimeSlotItemProps {
  service: Service;
  onSelect: (service: Service) => void;
  timeSlotHeight: number;
  driverAvailability?: DriverAvailability;
}

export const TimeSlotItem: React.FC<TimeSlotItemProps> = ({ service, onSelect, timeSlotHeight, driverAvailability }) => {
  const borderColor = ServiceBorderColors[service.serviceType] || 'border-slate-500';
  const serviceColor = ServiceColors[service.serviceType] || 'bg-slate-100 text-slate-700';
  const isDriverUnavailable = driverAvailability === 'Busy' || driverAvailability === 'On Leave';
  const isUnassigned = !service.driverId && !service.supplierId;

  const start = service.startTime;
  const end = service.endTime || new Date(start.getTime() + 60 * 60 * 1000); // Default to 1 hour if no end time

  const startInHours = start.getHours() + start.getMinutes() / 60;
  const top = startInHours * timeSlotHeight;
  
  const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const height = (durationInMinutes / 60) * timeSlotHeight;

  // Ensure minimum height for visibility but don't add padding if it's too small
  const minHeight = 20;
  const displayHeight = Math.max(height - 2, 0); 
  const finalHeight = Math.max(height, minHeight);

  return (
    <button
      onClick={() => onSelect(service)}
      className={`absolute w-[95%] left-[2.5%] text-left p-2 rounded-lg cursor-pointer hover:scale-[1.02] transition-all z-10 flex flex-col overflow-hidden shadow-md border-l-4 ${serviceColor} ${borderColor} ${isUnassigned ? 'border-dashed' : ''}`}
      style={{
        top: `${top}px`,
        height: `${finalHeight}px`,
      }}
      aria-label={`Service: ${service.title} from ${formatTime(start)} to ${formatTime(end)}`}
    >
      <div className="font-bold truncate flex items-center">
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
        <span className="truncate">{service.title}</span>
      </div>
      {displayHeight > 15 && <p className="truncate text-slate-600 dark:text-slate-400">{formatTime(start)} - {formatTime(end)}</p>}
      {displayHeight > 35 && <p className="truncate whitespace-normal text-slate-600 dark:text-slate-400 font-normal">{service.clientName}</p>}
    </button>
  );
};