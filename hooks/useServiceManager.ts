import React, { useState, useEffect, useCallback } from 'react';
import { Service, User, Supplier, SavedFilter, AppSettings } from '../types';
import { MOCK_SERVICES, MOCK_DRIVERS, MOCK_SUPPLIERS } from '../constants';

const reviveDates = (key: string, value: any) => {
    if ((key === 'startTime' || key === 'endTime') && typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date;
    }
    return value;
};

const usePersistentState = <T,>(key: string, defaultValue: T, reviver?: (key: string, value: any) => any): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = window.localStorage.getItem(key);
            if (storedValue) {
                return JSON.parse(storedValue, reviver);
            }
        } catch (error) {
            console.error(`Error reading ${key} from localStorage`, error);
        }
        return defaultValue;
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error(`Error saving ${key} to localStorage`, error);
        }
    }, [state, key]);

    return [state, setState];
};

export const useServiceManager = () => {
    const [services, setServices] = usePersistentState<Service[]>('tour-management-services', MOCK_SERVICES, reviveDates);
    const [drivers, setDrivers] = usePersistentState<User[]>('tour-management-drivers', MOCK_DRIVERS);
    const [suppliers, setSuppliers] = usePersistentState<Supplier[]>('tour-management-suppliers', MOCK_SUPPLIERS);
    const [savedFilters, setSavedFilters] = usePersistentState<SavedFilter[]>('tour-management-saved-filters', []);
    const [settings, setSettings] = usePersistentState<AppSettings>('tour-management-settings', {
        theme: 'dark',
        primaryColor: 'blue',
    });


    const saveService = useCallback((service: Service) => {
        setServices(prev => prev.some(s => s.id === service.id) ? prev.map(s => s.id === service.id ? service : s) : [...prev, service]);
    }, [setServices]);

    const deleteService = useCallback((serviceId: string) => {
        setServices(prev => prev.filter(s => s.id !== serviceId));
    }, [setServices]);

    const saveDriver = useCallback((driver: User) => {
        setDrivers(prev => prev.some(d => d.id === driver.id) ? prev.map(d => d.id === driver.id ? driver : d) : [...prev, driver]);
    }, [setDrivers]);
    
    const deleteDriver = useCallback((driverId: string) => {
        setDrivers(prev => prev.filter(d => d.id !== driverId));
    }, [setDrivers]);

    const saveSupplier = useCallback((supplier: Supplier) => {
        setSuppliers(prev => prev.some(s => s.id === supplier.id) ? prev.map(s => s.id === supplier.id ? supplier : s) : [...prev, supplier]);
    }, [setSuppliers]);

    const deleteSupplier = useCallback((supplierId: string) => {
        setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    }, [setSuppliers]);

    const saveFilter = useCallback((filter: SavedFilter) => {
        setSavedFilters(prev => {
            const existing = prev.find(f => f.id === filter.id);
            if (existing) {
                return prev.map(f => f.id === filter.id ? filter : f);
            }
            return [...prev, filter];
        });
    }, [setSavedFilters]);

    const deleteFilter = useCallback((filterId: string) => {
        setSavedFilters(prev => prev.filter(f => f.id !== filterId));
    }, [setSavedFilters]);

    const saveSettings = useCallback((newSettings: AppSettings) => {
        setSettings(newSettings);
    }, [setSettings]);

    const importData = useCallback((data: any): boolean => {
        try {
            if (data && data.services && data.drivers && data.suppliers && data.savedFilters && data.settings) {
                 const revivedServices = data.services.map((s: any) => ({
                    ...s,
                    startTime: new Date(s.startTime),
                    endTime: s.endTime ? new Date(s.endTime) : undefined,
                }));

                setServices(revivedServices);
                setDrivers(data.drivers);
                setSuppliers(data.suppliers);
                setSavedFilters(data.savedFilters);
                setSettings(data.settings);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to import data:", error);
            return false;
        }
    }, [setServices, setDrivers, setSuppliers, setSavedFilters, setSettings]);


    return { 
        services, saveService, deleteService,
        drivers, saveDriver, deleteDriver,
        suppliers, saveSupplier, deleteSupplier,
        savedFilters, saveFilter, deleteFilter,
        settings, saveSettings,
        importData,
    };
};