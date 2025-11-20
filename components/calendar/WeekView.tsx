
import React from 'react';
import { Service, User, AppSettings } from '../../types';
import { getHours, isSameDay, isToday } from '../../lib/calendar-utils';
import { TimeSlotItem } from './TimeSlotItem';

interface WeekViewProps {
  days: Date[];
  services: Service[];
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

const DayColumn: React.FC<{
  day: Date;
  services: Service[];
  isSelected: boolean;
  onSelectService: (service: Service) => void;
  onTimeSlotClick: (startTime: Date) => void;
  onMoveService: (serviceId: string, newDate: Date) => void;
  timeSlotHeight: number;
  drivers: User[];
  startHour: number;
  endHour: number;
  timeFormat: '12h' | '24h';
}> = ({ day, services, isSelected, onSelectService, onTimeSlotClick, onMoveService, timeSlotHeight, drivers, startHour, endHour, timeFormat }) => {
  const servicesForDay = services.filter(service => isSameDay(service.startTime, day));
  const hours = getHours(startHour, endHour);

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
    <div className={`relative border-r border-slate-100 dark:border-slate-800 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-primary-900/10' : ''}`}>
       {/* Background Grid & Interaction */}
      {hours.map(hour => (
        <div 
            key={hour} 
            onClick={() => handleTimeSlotClick(hour)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, hour)}
            className="group relative border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-primary-900/20 transition-colors"
            style={{ height: `${timeSlotHeight}px` }}
            role="button"
            aria-label={`Create a new service on ${day.toDateString()} at ${hour}:00`}
        >
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            </div>
        </div>
      ))}
      
      {/* Events Overlay */}
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
        <div className="relative w-full h-full">
            {servicesForDay.map(service => {
            const driver = drivers.find(d => d.id === service.driverId);
            return (
                <div key={service.id} className="pointer-events-auto">
                    <TimeSlotItem 
                        service={service} 
                        onSelect={onSelectService} 
                        timeSlotHeight={timeSlotHeight} 
                        driverAvailability={driver?.availability}
                        startHour={startHour}
                        timeFormat={timeFormat}
                    />
                </div>
            );
            })}
        </div>
      </div>
    </div>
  );
};


export const WeekView: React.FC<WeekViewProps> = ({ days, services, selectedDate, onSelectService, onDaySelect, onDayDoubleClick, onTimeSlotClick, onMoveService, zoomLevel, drivers, settings }) => {
  const timeSlotHeight = settings.compactMode ? 40 : (30 + zoomLevel * 10);
  const startHour = settings.calendarStartHour ?? 0;
  const endHour = settings.calendarEndHour ?? 24;
  const hours = getHours(startHour, endHour);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] sticky top-0 bg-white dark:bg-slate-900 z-30 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="text-center py-2 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">&nbsp;</div>
        {days.map((day, index) => (
          <div 
            key={index}
            className={`relative group text-center py-3 border-r border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${isSameDay(day, selectedDate) ? 'bg-blue-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            onClick={() => onDaySelect(day)}
            onDoubleClick={() => onDayDoubleClick(day)}
          >
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{weekdays[day.getDay()]}</p>
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold ${isToday(day) ? 'bg-primary-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-200'}`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] flex-1 overflow-y-auto">
        {/* Time column */}
        <div className="border-r border-slate-200 dark:border-slate-700 text-right pr-3 pt-2 bg-slate-50 dark:bg-slate-800/50 sticky left-0 z-20">
          {hours.map(hour => (
            <div key={hour} className="relative" style={{ height: `${timeSlotHeight}px` }}>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 absolute -top-3 right-0">
                    {settings.timeFormat === '24h' 
                        ? `${hour}:00` 
                        : (hour === 12 ? '12 PM' : (hour > 12 ? `${hour-12} PM` : (hour === 0 || hour === 24 ? '12 AM' : `${hour} AM`)))}
                </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, index) => (
          <DayColumn
            key={index}
            day={day}
            services={services}
            isSelected={isSameDay(day, selectedDate)}
            onSelectService={onSelectService}
            onTimeSlotClick={onTimeSlotClick}
            onMoveService={onMoveService}
            timeSlotHeight={timeSlotHeight}
            drivers={drivers}
            startHour={startHour}
            endHour={endHour}
            timeFormat={settings.timeFormat}
          />
        ))}
      </div>
    </div>
  );
};
