import { useState, useMemo, useCallback } from 'react';
import { getMonthDays, getWeekDays } from '../lib/calendar-utils';

export type CalendarView = 'month' | 'week' | 'day';

export const useCalendar = (initialDate = new Date()) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [view, setView] = useState<CalendarView>('month');

  // Month view data
  const weeks = useMemo(() => getMonthDays(currentDate), [currentDate]);
  
  // Week view data
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      const startMonth = start.toLocaleString('default', { month: 'short' });
      const endMonth = end.toLocaleString('default', { month: 'short' });
      if (start.getFullYear() !== end.getFullYear()) {
          return `${start.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
    }
    if (view === 'day') {
      return currentDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return '';
  }, [currentDate, view, weekDays]);

  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else if (view === 'day') {
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate); // Keep selected date in sync
      }
      return newDate;
    });
  }, [view]);

  const goToPrevious = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else if (view === 'day') {
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate); // Keep selected date in sync
      }
      return newDate;
    });
  }, [view]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  return {
    currentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    view,
    setView,
    weeks,
    weekDays,
    headerTitle,
    goToNext,
    goToPrevious,
    goToToday,
  };
};