
import React, { useState, useMemo } from 'react';
import { User, DriverLeave } from '../../types';
import { useCalendar } from '../../hooks/useCalendar';
import { isSameDay, isToday } from '../../lib/calendar-utils';

interface DriverAvailabilityProps {
    drivers: User[];
    driverLeaves: DriverLeave[];
    onToggleLeave: (driverId: string, date: Date) => void;
}

export const DriverAvailability: React.FC<DriverAvailabilityProps> = ({ drivers, driverLeaves, onToggleLeave }) => {
    const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
    const { 
        currentDate,
        weeks, 
        goToNext, 
        goToPrevious, 
        goToToday,
        headerTitle
    } = useCalendar();
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get leaves for the selected driver
    const currentDriverLeaves = useMemo(() => {
        if (!selectedDriverId) return [];
        return driverLeaves.filter(leave => leave.driverId === selectedDriverId);
    }, [selectedDriverId, driverLeaves]);

    const handleDayClick = (day: Date) => {
        if (!selectedDriverId) return;
        onToggleLeave(selectedDriverId, day);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Driver</label>
                     <select
                        value={selectedDriverId}
                        onChange={e => setSelectedDriverId(e.target.value)}
                        className="block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center bg-slate-50 dark:bg-slate-700 p-1 rounded-lg">
                     <button onClick={goToPrevious} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors">
                        <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <span className="px-4 font-semibold text-slate-800 dark:text-slate-100 w-40 text-center">{headerTitle}</span>
                    <button onClick={goToNext} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors">
                        <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
                
                 <div className="w-full md:w-1/3 text-right">
                    <button onClick={goToToday} className="text-sm font-medium text-primary-600 hover:text-primary-700">Jump to Today</button>
                 </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-7 mb-2 text-center">
                    {weekdays.map(day => (
                        <div key={day} className="text-xs font-bold text-slate-500 uppercase tracking-wider py-2">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
                     {weeks.map((week, i) => (
                        <React.Fragment key={i}>
                        {week.map((day, j) => {
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isLeave = currentDriverLeaves.some(leave => isSameDay(leave.date, day));
                            const isTodayDate = isToday(day);

                            return (
                                <button
                                    key={j}
                                    onClick={() => handleDayClick(day)}
                                    disabled={!selectedDriverId}
                                    className={`
                                        aspect-square flex flex-col items-center justify-center rounded-lg border transition-all relative
                                        ${!isCurrentMonth ? 'opacity-40' : ''}
                                        ${isLeave 
                                            ? 'bg-black text-white border-black dark:border-slate-600 shadow-md' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 text-slate-700 dark:text-slate-200'}
                                        ${isTodayDate && !isLeave ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
                                    `}
                                >
                                    <span className={`text-sm font-medium ${isTodayDate && !isLeave ? 'text-primary-600 font-bold' : ''}`}>{day.getDate()}</span>
                                    
                                    {isLeave && (
                                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-90">
                                            On Leave
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        </React.Fragment>
                    ))}
                </div>
                
                <div className="mt-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                    Click on a date to mark the driver as <strong>"On Leave"</strong> (Unavailable). <br/>
                    These days will appear with a black background on the main dashboard.
                </div>
            </div>
        </div>
    );
};
