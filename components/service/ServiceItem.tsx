import React from 'react';
import { Service } from '../../types';
import { ServiceBorderColors, ServiceColors } from '../../constants';
import { formatTime } from '../../lib/calendar-utils';

interface ServiceItemProps {
  service: Service;
  onSelect: (service: Service) => void;
  zoomLevel: number;
}

export const ServiceItem: React.FC<ServiceItemProps> = ({ service, onSelect, zoomLevel }) => {
  const borderColor = ServiceBorderColors[service.serviceType] || 'border-slate-500';
  const serviceColor = ServiceColors[service.serviceType] || 'bg-slate-100 text-slate-700';

  return (
    <button
      onClick={() => onSelect(service)}
      className={`w-full text-left p-1.5 rounded-md text-xs font-semibold cursor-pointer hover:shadow-md transition-all border-l-4 shadow-sm ${serviceColor} ${borderColor} ${zoomLevel > 2 ? 'flex flex-col' : ''}`}
    >
      <div className="truncate flex items-center justify-between">
        <span className="truncate">
            <span className="font-bold">{formatTime(service.startTime)}</span> {service.title}
        </span>
        {service.googleCalendarEventId && (
            <svg className="w-3.5 h-3.5 flex-shrink-0 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 6.5c0-.28-.22-.5-.5-.5h-2v-1.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-5V4.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-2c-.28 0-.5.22-.5.5v14c0 .28.22.5.5.5h17c.28 0 .5-.22.5-.5v-14zM11.5 11H6V9h5.5v2zm-1 2.5H6v2h4.5v-2zm.5 3.5h-5V19h5v-2zm6-5.5h-4V9h4v2.5z" />
            </svg>
        )}
      </div>
      {zoomLevel > 2 && <span className="font-normal text-slate-600 dark:text-slate-400 truncate">{service.clientName}</span>}
    </button>
  );
};
