
import React from 'react';
import { Service, User, AppSettings } from '../../types';
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
  onMoveService: (serviceId: string, newDate: Date) => void;
  drivers: User[];
  zoomLevel: number;
  settings: AppSettings;
}

const zoomHeightMap: Record<number, string> = {
  1: 'min-h-24',
  2: 'min-h-28',
  3: 'min-h-36',
  4: 'min-h-44',
  5: 'min-h-52',
};

export const MonthView: React.FC<MonthViewProps> = ({ weeks, services, currentMonth, selectedDate, onSelectService, onDaySelect, onDayDoubleClick, onTimeSlotClick, onMoveService, drivers, zoomLevel, settings }) => {
  const dayCellHeight = settings.compactMode ? 'min-h-24' : (zoomHeightMap[zoomLevel] || 'min-h-36');

  const handleCellClick = (day: Date) => {
    onDaySelect(day);
    // Quick Create: Set time to 9:00 AM on the clicked day
    const newServiceTime = new Date(day);
    newServiceTime.setHours(9, 0, 0, 0);
    onTimeSlotClick(newServiceTime);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
      e.preventDefault();
      const serviceId = e.dataTransfer.getData('serviceId');
      if (serviceId) {
          // When dropping on month view, we keep the original time but change the date
          // We pass 'day' which is at 00:00:00. The handler in Calendar.tsx will adjust logic.
          onMoveService(serviceId, day);
      }
  };

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
                onClick={() => handleCellClick(day)}
                onDoubleClick={(e) => { e.stopPropagation(); onDayDoubleClick(day); }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
                className={`relative group border-r border-b border-slate-200 dark:border-slate-700 p-1 flex flex-col cursor-pointer transition-all ${dayCellHeight} ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900'} hover:bg-blue-50 dark:hover:bg-primary-900/10`}
                role="button"
                aria-label={`Create service on ${day.toDateString()}`}
              >
                <div className="flex justify-end items-center px-1 py-0.5 pointer-events-none">
                  <span
                    className={`text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center ${
                      today
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'text-slate-700 dark:text-slate-300'
                    } ${isSelected && !today ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : ''}`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                
                {/* Hover "Add" Hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="bg-primary-600/10 p-2 rounded-full">
                        <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </div>
                </div>

                <div className="flex-1 mt-1 space-y-1 overflow-y-auto z-10 relative" onClick={(e) => e.stopPropagation()}>
                  {servicesForDay.map(service => {
                    const driver = drivers.find(d => d.id === service.driverId);
                    return (
                        <ServiceItem 
                            key={service.id} 
                            service={service} 
                            onSelect={onSelectService} 
                            zoomLevel={zoomLevel} 
                            timeFormat={settings.timeFormat}
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
