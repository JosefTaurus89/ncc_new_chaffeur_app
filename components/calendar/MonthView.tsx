import React from 'react';
import { Service, User } from '../../types';
import { isSameDay, isToday } from '../../lib/calendar-utils';
import { ServiceItem } from './ServiceItem';

interface MonthViewProps {
  weeks: Date[][];
  services: Service[];
  currentMonth: number;
  selectedDate: Date;
  onSelectService: (service: Service) => void;
  onDaySelect: (date: Date) => void;
  onDayDoubleClick: (date: Date) => void;
  onTimeSlotClick: (startTime: Date) => void;
  drivers: User[];
  zoomLevel: number;
}

const zoomHeightMap: Record<number, string> = {
  1: 'min-h-24',
  2: 'min-h-28',
  3: 'min-h-36',
  4: 'min-h-44',
  5: 'min-h-52',
};

export const MonthView: React.FC<MonthViewProps> = ({ weeks, services, currentMonth, selectedDate, onSelectService, onDaySelect, onDayDoubleClick, onTimeSlotClick, drivers, zoomLevel }) => {
  const dayCellHeight = zoomHeightMap[zoomLevel] || 'min-h-36';

  return (
    <div className="grid grid-cols-7 grid-rows-[repeat(6,min-content)] min-h-full border-t border-l border-slate-200 dark:border-slate-700">
      {weeks.map((week, i) => (
        <React.Fragment key={i}>
          {week.map((day, j) => {
            const servicesForDay = services.filter(service => isSameDay(service.startTime, day));
            const isCurrentMonth = day.getMonth() === currentMonth;
            const today = isToday(day);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={j}
                onClick={() => onDaySelect(day)}
                onDoubleClick={() => onDayDoubleClick(day)}
                className={`relative group border-r border-b border-slate-200 dark:border-slate-700 p-1 flex flex-col cursor-pointer transition-colors ${dayCellHeight} ${!isCurrentMonth ? 'bg-slate-50 dark:bg-slate-800/30' : isSelected ? 'bg-blue-100 dark:bg-primary-900/40' : 'hover:bg-blue-50 dark:hover:bg-primary-900/20'}`}
                role="button"
                aria-label={`View details for ${day.toDateString()}`}
              >
                <div className="flex justify-end items-center">
                   <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const newServiceTime = new Date(day);
                            newServiceTime.setHours(9, 0, 0, 0); // Default to 9 AM for quick add
                            onTimeSlotClick(newServiceTime);
                        }}
                        className="p-1 rounded-full bg-primary-600 text-white hover:bg-primary-700 shadow"
                        aria-label={`Create new service on ${day.toDateString()}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </button>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      today
                        ? 'bg-primary-600 text-white rounded-full h-7 w-7 flex items-center justify-center'
                        : 'text-slate-600 dark:text-slate-300'
                    } ${isSelected && !today ? 'text-primary-700 dark:text-primary-300' : ''}`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex-1 mt-1 space-y-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  {servicesForDay.map(service => {
                    const driver = drivers.find(d => d.id === service.driverId);
                    return (
                        <ServiceItem 
                            key={service.id} 
                            service={service} 
                            onSelect={onSelectService} 
                            zoomLevel={zoomLevel} 
                            driverAvailability={driver?.availability}
                        />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};