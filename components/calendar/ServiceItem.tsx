
import React from 'react';
import { Service } from '../../types';
import { EVENT_COLORS } from '../../constants';
import { formatTime } from '../../lib/calendar-utils';

interface ServiceItemProps {
  service: Service;
  onSelect: (service: Service) => void;
  zoomLevel: number;
  timeFormat?: '12h' | '24h';
}

export const ServiceItem: React.FC<ServiceItemProps> = ({ service, onSelect, zoomLevel, timeFormat = '12h' }) => {
  // FIX: Use the specific color property (defaulting to 'Default') instead of the ServiceType color.
  // This ensures all created services start with the same color.
  const colorKey = service.color || 'Default';
  const colorClasses = EVENT_COLORS[colorKey] || EVENT_COLORS['Default'];

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData('serviceId', service.id);
      // Calculate duration in minutes
      const duration = service.endTime 
        ? (service.endTime.getTime() - service.startTime.getTime()) / (1000 * 60)
        : 60;
      e.dataTransfer.setData('duration', duration.toString());
      e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button
      onClick={(e) => {
          e.stopPropagation();
          onSelect(service);
      }}
      draggable
      onDragStart={handleDragStart}
      className={`w-full text-left p-1.5 rounded-md text-xs cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4 shadow-sm ${colorClasses} ${zoomLevel > 2 ? 'flex flex-col gap-0.5' : ''}`}
    >
      {/* Title First - Bold */}
      <div className="font-bold truncate leading-tight">
        {service.title}
      </div>
      
      {/* Time Second - Normal weight */}
      <div className="flex items-center justify-between text-[10px] opacity-85 leading-tight">
        <span className="truncate">
            {formatTime(service.startTime, timeFormat)}
        </span>
        {service.googleCalendarEventId && (
            <svg className="w-3 h-3 flex-shrink-0 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 6.5c0-.28-.22-.5-.5-.5h-2v-1.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-5V4.5c0-.28-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5v1.5h-2c-.28 0-.5.22-.5.5v14c0 .28.22.5.5.5h17c.28 0 .5-.22.5-.5v-14zM11.5 11H6V9h5.5v2zm-1 2.5H6v2h4.5v-2zm.5 3.5h-5V19h5v-2zm6-5.5h-4V9h4v2.5z" />
            </svg>
        )}
      </div>

      {zoomLevel > 2 && (
          <span className="font-normal text-[10px] truncate opacity-75 border-t border-current mt-1 pt-0.5">
              {service.clientName}
          </span>
      )}
    </button>
  );
};
