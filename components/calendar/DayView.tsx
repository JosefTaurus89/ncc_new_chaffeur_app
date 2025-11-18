import React from 'react';
import { Service, User } from '../../types';
import { getHours, isSameDay } from '../../lib/calendar-utils';
import { TimeSlotItem } from './TimeSlotItem';

interface DayViewProps {
  day: Date;
  services: Service[];
  onSelectService: (service: Service) => void;
  onTimeSlotClick: (startTime: Date) => void;
  zoomLevel: number;
  drivers: User[];
}

export const DayView: React.FC<DayViewProps> = ({ day, services, onSelectService, onTimeSlotClick, zoomLevel, drivers }) => {
  const timeSlotHeight = 30 + zoomLevel * 10; // from 40px to 80px
  const hours = getHours(0, 24);
  const servicesForDay = services.filter(service => isSameDay(service.startTime, day));

  const handleTimeSlotClick = (hour: number) => {
    const newServiceTime = new Date(day);
    newServiceTime.setHours(hour, 0, 0, 0);
    onTimeSlotClick(newServiceTime);
  };

  return (
    <div className="flex h-full">
      {/* Time column */}
      <div className="w-20 text-right pr-2 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        {hours.map(hour => (
          <div key={hour} className="relative" style={{ height: `${timeSlotHeight}px` }}>
            {hour > 0 && 
              <span className="text-xs text-slate-500 dark:text-slate-400 absolute -top-2 right-2">
                {hour === 12 ? '12 PM' : (hour > 12 ? `${hour - 12} PM` : `${hour} AM`)}
              </span>
            }
          </div>
        ))}
      </div>

      {/* Event column */}
      <div className="relative flex-1">
        {hours.map(hour => (
          <div 
            key={hour}
            onClick={() => handleTimeSlotClick(hour)}
            className="group relative border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-primary-900/20 transition-colors"
            role="button"
            aria-label={`Create a new service at ${hour}:00`}
            style={{ height: `${timeSlotHeight}px` }}
          >
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            </div>
          </div>
        ))}
        
        <div onClick={e => e.stopPropagation()}>
            {servicesForDay.map(service => {
              const driver = drivers.find(d => d.id === service.driverId);
              return (
                <TimeSlotItem 
                    key={service.id} 
                    service={service} 
                    onSelect={onSelectService} 
                    timeSlotHeight={timeSlotHeight} 
                    driverAvailability={driver?.availability}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
};