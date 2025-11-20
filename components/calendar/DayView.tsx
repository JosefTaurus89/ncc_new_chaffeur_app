
import React from 'react';
import { Service, User, AppSettings } from '../../types';
import { getHours, isSameDay } from '../../lib/calendar-utils';
import { TimeSlotItem } from './TimeSlotItem';

interface DayViewProps {
  day: Date;
  services: Service[];
  onSelectService: (service: Service) => void;
  onTimeSlotClick: (startTime: Date) => void;
  onMoveService: (serviceId: string, newDate: Date) => void;
  zoomLevel: number;
  drivers: User[];
  settings: AppSettings;
}

export const DayView: React.FC<DayViewProps> = ({ day, services, onSelectService, onTimeSlotClick, onMoveService, zoomLevel, drivers, settings }) => {
  const timeSlotHeight = settings.compactMode ? 40 : (30 + zoomLevel * 10);
  const startHour = settings.calendarStartHour ?? 0;
  const endHour = settings.calendarEndHour ?? 24;
  const hours = getHours(startHour, endHour);
  const servicesForDay = services.filter(service => isSameDay(service.startTime, day));

  const handleTimeSlotClick = (hour: number) => {
    const newServiceTime = new Date(day);
    newServiceTime.setHours(hour, 0, 0, 0);
    onTimeSlotClick(newServiceTime);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, hour: number) => {
      e.preventDefault();
      const serviceId = e.dataTransfer.getData('serviceId');
      if (serviceId) {
          const newDate = new Date(day);
          newDate.setHours(hour, 0, 0, 0);
          onMoveService(serviceId, newDate);
      }
  };

  return (
    <div className="flex h-full overflow-y-auto">
      {/* Time column */}
      <div className="w-20 text-right pr-3 pt-2 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 select-none sticky left-0 z-20">
        {hours.map(hour => (
          <div key={hour} className="relative" style={{ height: `${timeSlotHeight}px` }}>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 absolute -top-3 right-0">
                {settings.timeFormat === '24h' 
                    ? `${hour}:00` 
                    : (hour === 12 ? '12 PM' : (hour > 12 ? `${hour - 12} PM` : (hour === 0 || hour === 24 ? '12 AM' : `${hour} AM`)))}
              </span>
          </div>
        ))}
      </div>

      {/* Event column */}
      <div className="relative flex-1 min-w-0">
        {/* Background Grid & Interaction Layers */}
        {hours.map(hour => (
          <div 
            key={hour}
            onClick={() => handleTimeSlotClick(hour)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, hour)}
            className="group relative border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-primary-900/20 transition-colors"
            role="button"
            aria-label={`Create a new service at ${hour}:00`}
            style={{ height: `${timeSlotHeight}px` }}
          >
             {/* Visual Hint on Hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div className="flex items-center text-primary-600 dark:text-primary-400 font-semibold text-sm bg-white/80 dark:bg-slate-900/80 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    New Service
                 </div>
            </div>
          </div>
        ))}
        
        {/* Events Layer */}
        <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
             {/* We need a wrapper to handle pointer events for the children items */}
            <div className="relative w-full h-full">
                {servicesForDay.map(service => {
                const driver = drivers.find(d => d.id === service.driverId);
                return (
                    // Enable pointer events on the item itself
                    <div key={service.id} className="pointer-events-auto">
                         <TimeSlotItem 
                            service={service} 
                            onSelect={onSelectService} 
                            timeSlotHeight={timeSlotHeight} 
                            driverAvailability={driver?.availability}
                            startHour={startHour}
                            timeFormat={settings.timeFormat}
                        />
                    </div>
                );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};
