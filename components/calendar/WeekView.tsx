import React from 'react';
import { Service, User } from '../../types';
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
  drivers: User[];
  zoomLevel: number;
}

const DayColumn: React.FC<{
  day: Date;
  services: Service[];
  isSelected: boolean;
  onSelectService: (service: Service) => void;
  onTimeSlotClick: (startTime: Date) => void;
  timeSlotHeight: number;
  drivers: User[];
}> = ({ day, services, isSelected, onSelectService, onTimeSlotClick, timeSlotHeight, drivers }) => {
  const servicesForDay = services.filter(service => isSameDay(service.startTime, day));
  
  const handleTimeSlotClick = (hour: number) => {
    const newServiceTime = new Date(day);
    newServiceTime.setHours(hour, 0, 0, 0);
    onTimeSlotClick(newServiceTime);
  };

  return (
    <div className={`relative border-r border-slate-100 dark:border-slate-800 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-primary-900/20' : ''}`}>
      {getHours(0, 24).map(hour => (
        <div 
            key={hour} 
            onClick={() => handleTimeSlotClick(hour)}
            className="group relative border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-primary-900/30 transition-colors"
            style={{ height: `${timeSlotHeight}px` }}
            role="button"
            aria-label={`Create a new service on ${day.toDateString()} at ${hour}:00`}
        >
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            </div>
        </div>
      ))}
      
      <div onClick={(e) => e.stopPropagation()}>
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
  );
};


export const WeekView: React.FC<WeekViewProps> = ({ days, services, selectedDate, onSelectService, onDaySelect, onDayDoubleClick, onTimeSlotClick, zoomLevel, drivers }) => {
  const timeSlotHeight = 30 + zoomLevel * 10; // from 40px to 80px
  const hours = getHours(0, 24);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] sticky top-0 bg-white dark:bg-slate-900 z-20 border-b border-slate-200 dark:border-slate-700">
        <div className="text-center py-2 border-r border-slate-200 dark:border-slate-700">&nbsp;</div>
        {days.map((day, index) => (
          <div 
            key={index}
            className={`relative group text-center py-2 border-r border-slate-200 dark:border-slate-700 transition-colors ${isSameDay(day, selectedDate) ? 'bg-blue-50 dark:bg-primary-900/20' : ''}`}
          >
            <button 
              onClick={() => onDaySelect(day)}
              onDoubleClick={() => onDayDoubleClick(day)}
              className="w-full h-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 z-10 rounded-md"
              aria-label={`Select day ${day.toDateString()}`}
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{weekdays[day.getDay()]}</p>
              <p className={`text-2xl font-bold mt-1 ${isToday(day) ? 'bg-primary-600 text-white rounded-full w-9 h-9 mx-auto flex items-center justify-center' : 'text-slate-700 dark:text-slate-200'}`}>
                {day.getDate()}
              </p>
            </button>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        const newServiceTime = new Date(day);
                        newServiceTime.setHours(9, 0, 0, 0);
                        onTimeSlotClick(newServiceTime);
                    }}
                    className="p-1 rounded-full bg-primary-600 text-white hover:bg-primary-700 shadow"
                    aria-label={`Create new service on ${day.toDateString()}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] flex-1">
        {/* Time column */}
        <div className="border-r border-slate-200 dark:border-slate-700 text-right pr-2">
          {hours.map(hour => (
            <div key={hour} className="relative" style={{ height: `${timeSlotHeight}px` }}>
                {hour > 0 && 
                    <span className="text-xs text-slate-500 dark:text-slate-400 absolute -top-2 right-2">
                        {hour === 12 ? '12pm' : (hour === 0 ? '' : (hour > 12 ? `${hour-12}pm` : `${hour}am`))}
                    </span>
                }
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
            timeSlotHeight={timeSlotHeight}
            drivers={drivers}
          />
        ))}
      </div>
    </div>
  );
};