
import React, { useMemo, useState } from 'react';
import { Service, FilterCriteria, SavedFilter, User, Supplier, ServiceType, ServiceStatus, AppSettings, DriverLeave } from '../../types';
import { useCalendar, CalendarView } from '../../hooks/useCalendar';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { useTranslation } from '../../hooks/useTranslation';

interface CalendarProps {
  services: Service[];
  onSelectService: (service: Service) => void;
  onTimeSlotClick: (startTime: Date) => void;
  drivers: User[];
  suppliers: Supplier[];
  savedFilters: SavedFilter[];
  onSaveFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (filterId: string) => void;
  settings: AppSettings;
  driverLeaves?: DriverLeave[];
  userRole: 'ADMIN' | 'DRIVER' | 'PARTNER';
  onUpdateService: (service: Service) => void;
}

const FilterCheckbox: React.FC<{id: string, label: string, isChecked: boolean, onChange: () => void}> = ({id, label, isChecked, onChange}) => (
    <label htmlFor={id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-md">
        <input id={id} type="checkbox" checked={isChecked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
);

export const Calendar: React.FC<CalendarProps> = ({ 
    services, 
    onSelectService,
    onTimeSlotClick,
    drivers,
    suppliers,
    savedFilters,
    onSaveFilter,
    onDeleteFilter,
    settings,
    driverLeaves = [],
    userRole,
    onUpdateService
}) => {
  const { 
    currentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    weeks, 
    weekDays,
    headerTitle,
    goToNext, 
    goToPrevious, 
    goToToday,
    view,
    setView
  } = useCalendar();

  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterCriteria>({});
  const [newFilterName, setNewFilterName] = useState('');
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(settings.compactMode ? 2 : 3); 
  const { t } = useTranslation(settings.language);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const isAdmin = userRole === 'ADMIN';

  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).reduce((count, arr) => count + (arr?.length || 0), 0);
  }, [activeFilters]);
  
  // Inject driver leaves as pseudo-services
  const servicesWithLeaves = useMemo(() => {
    const leavesAsServices = driverLeaves.map(leave => {
        const driver = drivers.find(d => d.id === leave.driverId);
        // Create an "All Day" event structure
        const start = new Date(leave.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(leave.date);
        end.setHours(23, 59, 59, 999);

        return {
            id: `leave-${leave.id}`,
            title: `🚫 ${driver?.name || 'Driver'}`, // Explicit icon for unavailability
            clientName: 'OFF / ON LEAVE',
            pickupAddress: '',
            dropoffAddress: '',
            startTime: start,
            endTime: end,
            status: ServiceStatus.CONFIRMED,
            serviceType: ServiceType.CUSTOM, // Just a placeholder type
            createdById: 'system',
            color: 'Black', // Explicit black styling
            driverId: leave.driverId,
            // Flag to identify it's not a real service
            isLeave: true
        } as any as Service; 
    });

    return [...services, ...leavesAsServices];
  }, [services, driverLeaves, drivers]);

  const filteredServices = useMemo(() => {
    const searchFiltered = servicesWithLeaves.filter(service => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            service.title.toLowerCase().includes(query) ||
            service.clientName.toLowerCase().includes(query) ||
            service.pickupAddress.toLowerCase().includes(query) ||
            service.dropoffAddress.toLowerCase().includes(query)
        );
    });

    if (Object.values(activeFilters).every(val => !val || val.length === 0)) {
        return searchFiltered;
    }
    return searchFiltered.filter(service => {
        const { serviceType, status, driverId } = activeFilters;
        // Allow Leaves to bypass service type/status filters unless filtered by driver
        // If filtering by driver, only show leaves for that driver
        if ((service as any).isLeave) {
             if (driverId?.length && (!service.driverId || !driverId.includes(service.driverId))) return false;
             return true;
        }

        if (serviceType?.length && !serviceType.includes(service.serviceType)) return false;
        // Although status filter UI is removed, we keep logic just in case saved filters use it
        if (status?.length && !status.includes(service.status)) return false;
        if (driverId?.length && (!service.driverId || !driverId.includes(service.driverId))) return false;
        return true;
      });
  }, [servicesWithLeaves, activeFilters, searchQuery]);

  const handleFilterChange = (category: keyof FilterCriteria, value: string) => {
    setActiveFilters(prev => {
      const currentValues = prev[category] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      const updatedFilters = { ...prev, [category]: newValues };
      // cleanup empty arrays
      if (newValues.length === 0) {
        delete updatedFilters[category];
      }
      return updatedFilters;
    });
  };

  const handleLoadFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filterId = e.target.value;
    setSelectedSavedFilterId(filterId);
    if (filterId) {
        const filterToLoad = savedFilters.find(f => f.id === filterId);
        if (filterToLoad) {
            setActiveFilters(filterToLoad.criteria);
        }
    } else {
        setActiveFilters({});
    }
  };

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) {
        alert('Please enter a name for the filter.');
        return;
    }
    if (Object.keys(activeFilters).length === 0) {
        alert('Cannot save an empty filter. Please select some criteria first.');
        return;
    }
    const newFilter = {
        id: `filter-${Date.now()}`,
        name: newFilterName,
        criteria: activeFilters,
    };
    onSaveFilter(newFilter);
    setNewFilterName('');
    setSelectedSavedFilterId(newFilter.id);
    alert(`Filter "${newFilterName}" saved.`);
  };

  const handleDeleteFilter = () => {
      if (!selectedSavedFilterId) {
          alert('Please select a saved filter to delete.');
          return;
      }
      const filterToDelete = savedFilters.find(f => f.id === selectedSavedFilterId);
      if (window.confirm(`Are you sure you want to delete the "${filterToDelete?.name}" filter?`)) {
          onDeleteFilter(selectedSavedFilterId);
          setSelectedSavedFilterId('');
          setActiveFilters({});
      }
  };
  
  const handleDayDoubleClick = (date: Date) => {
    setView('day');
    setCurrentDate(date);
    setSelectedDate(date);
  };
  
  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleServiceClick = (service: Service) => {
      if ((service as any).isLeave) {
          return;
      }
      onSelectService(service);
  }

  const handleMoveService = (serviceId: string, newDate: Date) => {
      const service = services.find(s => s.id === serviceId);
      if (service && isAdmin) {
          const originalStart = new Date(service.startTime);
          let newStart = new Date(newDate);
          
          // If dropped on Month View (which passes 00:00:00), preserve original time
          if (newStart.getHours() === 0 && newStart.getMinutes() === 0 && view === 'month') {
              newStart.setHours(originalStart.getHours(), originalStart.getMinutes());
          }
          
          // Calculate new end time to preserve duration
          const duration = service.endTime 
             ? service.endTime.getTime() - originalStart.getTime() 
             : 60 * 60 * 1000; // default 1h
          
          const newEnd = new Date(newStart.getTime() + duration);
          
          onUpdateService({
              ...service,
              startTime: newStart,
              endTime: newEnd
          });
      }
  };


  const handleZoomIn = () => setZoomLevel(z => Math.min(z + 1, 5));
  const handleZoomOut = () => setZoomLevel(z => Math.max(z - 1, 1));


  const ViewSwitcherButton = ({ buttonView, text }: { buttonView: CalendarView, text: string }) => (
      <button 
        onClick={() => setView(buttonView)}
        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === buttonView ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
      >
        {text}
      </button>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700 flex-wrap gap-2">
        <div className="flex items-center">
          <button onClick={goToToday} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            {t('today')}
          </button>
          <div className="flex items-center ml-2">
            <button onClick={goToPrevious} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <button onClick={goToNext} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
          <h2 className="ml-2 text-xl font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            {headerTitle}
          </h2>
        </div>
        <div className="flex items-center flex-grow min-w-[200px] max-w-sm">
            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                    type="text"
                    placeholder={t('search_placeholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg leading-5 bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
            </div>
        </div>
        <div className="flex items-center space-x-2">
            {/* Quick Driver Filter */}
            <select
                className="block w-40 pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={activeFilters.driverId?.[0] || ''}
                onChange={(e) => {
                    const val = e.target.value;
                    setActiveFilters(prev => {
                        const newFilters = { ...prev };
                        if (val) newFilters.driverId = [val];
                        else delete newFilters.driverId;
                        return newFilters;
                    });
                }}
            >
                <option value="">{t('all_drivers')}</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-md p-0.5 space-x-1">
                <button onClick={handleZoomOut} disabled={zoomLevel === 1} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                     <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path></svg>
                </button>
                 <button onClick={handleZoomIn} disabled={zoomLevel === 5} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                     <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3h-6"></path></svg>
                </button>
            </div>
           <button 
                onClick={() => setShowFilters(prev => !prev)}
                className={`relative flex items-center px-3 py-2 text-sm font-semibold border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${showFilters ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}
                >
                <svg className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 01 1v2a1 1 0 01-.293.707L12 14.414V19a1 1 0 01-1.447.894L7 17v-2.586L3.293 6.707A1 1 0 013 6V4z"></path></svg>
                {t('filters')}
                {activeFilterCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-semibold">
                    {activeFilterCount}
                    </span>
                )}
            </button>
          <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg p-1 space-x-1">
            <ViewSwitcherButton buttonView="month" text={t('month')} />
            <ViewSwitcherButton buttonView="week" text={t('week')} />
            <ViewSwitcherButton buttonView="day" text={t('day')} />
          </div>
        </div>
      </div>
      
      {showFilters && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 animate-fade-in-down">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filter Services</h3>
                <button onClick={() => setActiveFilters({})} className="text-sm font-medium text-primary-600 hover:underline">{t('clear_filters')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold mb-2 text-slate-600 dark:text-slate-300">{t('by_service_type')}</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Object.values(ServiceType).map(type => (
                            <FilterCheckbox 
                                key={type} 
                                id={`type-${type}`} 
                                label={t(`type_${type}` as any) || type.replace(/_/g, ' ')} 
                                isChecked={activeFilters.serviceType?.includes(type) || false} 
                                onChange={() => handleFilterChange('serviceType', type)} 
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-slate-600 dark:text-slate-300">{t('by_driver')}</h4>
                     <div className="space-y-1 max-h-32 overflow-y-auto">
                        {drivers.map(driver => (
                            <FilterCheckbox key={driver.id} id={`driver-${driver.id}`} label={driver.name} isChecked={activeFilters.driverId?.includes(driver.id) || false} onChange={() => handleFilterChange('driverId', driver.id)} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('saved_filters')}</h3>
                 <div className="flex items-center gap-2 flex-wrap">
                    <select value={selectedSavedFilterId} onChange={handleLoadFilter} className="bg-slate-50 text-slate-900 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500">
                        <option value="">{t('load_filter')}</option>
                        {savedFilters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {isAdmin && (
                        <>
                            <input type="text" value={newFilterName} onChange={e => setNewFilterName(e.target.value)} placeholder={t('new_filter_name')} className="bg-slate-50 text-slate-900 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500" />
                            <button onClick={handleSaveFilter} className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">{t('save_current')}</button>
                            <button onClick={handleDeleteFilter} disabled={!selectedSavedFilterId} className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">{t('delete_selected')}</button>
                        </>
                    )}
                 </div>
            </div>
        </div>
      )}

      {view === 'month' && (
        <>
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 text-center font-semibold text-slate-500 dark:text-slate-400 text-sm sticky top-0 bg-white dark:bg-slate-900 z-10">
                {weekdays.map(day => (
                <div key={day} className="py-3">{day}</div>
                ))}
            </div>
            <div className="flex-1 overflow-auto">
                <MonthView 
                weeks={weeks} 
                services={filteredServices} 
                currentMonth={currentDate.getMonth()}
                selectedDate={selectedDate}
                onSelectService={handleServiceClick} 
                onDaySelect={handleDaySelect}
                onDayDoubleClick={handleDayDoubleClick}
                zoomLevel={zoomLevel}
                drivers={drivers}
                onTimeSlotClick={isAdmin ? onTimeSlotClick : () => {}}
                onMoveService={handleMoveService}
                settings={settings}
                />
            </div>
        </>
      )}
      {view === 'week' && (
        <div className="flex-1 overflow-auto">
            <WeekView
                days={weekDays}
                services={filteredServices}
                selectedDate={selectedDate}
                onSelectService={handleServiceClick}
                onDaySelect={handleDaySelect}
                onDayDoubleClick={handleDayDoubleClick}
                onTimeSlotClick={isAdmin ? onTimeSlotClick : () => {}}
                onMoveService={handleMoveService}
                zoomLevel={zoomLevel}
                drivers={drivers}
                settings={settings}
            />
        </div>
      )}
      {view === 'day' && (
        <div className="flex-1 overflow-auto">
            <DayView
                day={currentDate}
                services={filteredServices}
                onSelectService={handleServiceClick}
                onTimeSlotClick={isAdmin ? onTimeSlotClick : () => {}}
                onMoveService={handleMoveService}
                drivers={drivers}
                zoomLevel={zoomLevel}
                settings={settings}
            />
        </div>
      )}
    </div>
  );
};
