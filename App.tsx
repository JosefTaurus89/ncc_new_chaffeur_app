

import React, { useState, useCallback, useEffect } from 'react';
import { Calendar } from './components/calendar/Calendar';
import { ServiceModal } from './components/service/ServiceModal';
import { ServiceDetailModal } from './components/service/ServiceDetailModal';
import { Service, View, UserProfile } from './types';
import { useServiceManager } from './hooks/useServiceManager';
import { Sidebar } from './components/layout/Sidebar';
import { DriverManagement } from './components/drivers/DriverManagement';
import { SupplierManagement } from './components/suppliers/SupplierManagement';
import { FinancialsManagement } from './components/financials/FinancialsManagement';
import { SettingsManagement } from './components/settings/SettingsManagement';
import { THEME_COLORS } from './constants';

const App: React.FC = () => {
  const { 
    services, saveService, deleteService,
    drivers, saveDriver, deleteDriver,
    suppliers, saveSupplier, deleteSupplier,
    savedFilters, saveFilter, deleteFilter,
    settings, saveSettings, importData,
  } = useServiceManager();
  
  const [view, setView] = useState<View>('calendar');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Mock Authentication State ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const isLoggedIn = !!user;

  const handleSignIn = () => {
    // In a real app, this would trigger the Google OAuth flow.
    setUser({
      name: 'Demo User',
      email: 'demo.user@example.com',
      picture: 'https://randomuser.me/api/portraits/lego/1.jpg',
    });
  };

  const handleSignOut = () => {
    setUser(null);
  };
  // --- End Mock Auth ---

  useEffect(() => {
    // Apply theme and color variables to the root element
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // This is a simplified way to handle color theming with Tailwind CSS variables.
    // In index.html, we've configured Tailwind to use these CSS variables.
    // FIX: Separated the color palette definition to avoid using `colors` in its own initializer,
    // which caused a ReferenceError and incorrect type inference.
    const colorMap = {
      blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
      indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
      purple: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
      green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
    };
    const colors = colorMap[settings.primaryColor as keyof typeof colorMap] || colorMap.blue;

    Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-primary-${key}`, value);
    });

  }, [settings]);

  const handleAddServiceClick = () => {
    setEditingService(undefined);
    setIsServiceModalOpen(true);
  };

  const handleEditService = useCallback((service: Service) => {
    setEditingService(service);
    setIsDetailModalOpen(false);
    setIsServiceModalOpen(true);
  }, []);

  const handleSelectService = useCallback((service: Service) => {
    setSelectedService(service);
    setIsDetailModalOpen(true);
  }, []);

  const handleSaveService = useCallback((service: Service) => {
    saveService(service);
    setIsServiceModalOpen(false);
    setEditingService(undefined);
  }, [saveService]);

  const handleDeleteService = useCallback((serviceId: string) => {
    deleteService(serviceId);
    setIsDetailModalOpen(false);
    setSelectedService(null);
  }, [deleteService]);

  const handleTimeSlotClick = useCallback((startTime: Date) => {
    setEditingService({ startTime });
    setIsServiceModalOpen(true);
  }, []);
  
  const handleImportData = useCallback((data: any) => {
    if (window.confirm("This will overwrite all current data. Are you sure you want to continue?")) {
        if (importData(data)) {
            alert("Data imported successfully!");
            setView('calendar'); // Go back to a safe view
        } else {
            alert("Import failed. The backup file might be corrupted or in the wrong format.");
        }
    }
  }, [importData]);

  const renderView = () => {
    switch(view) {
      case 'drivers':
        return <DriverManagement drivers={drivers} onSave={saveDriver} onDelete={deleteDriver} services={services} />;
      case 'suppliers':
        return <SupplierManagement suppliers={suppliers} onSave={saveSupplier} onDelete={deleteSupplier} services={services} />;
      case 'financials':
        return <FinancialsManagement services={services} drivers={drivers} suppliers={suppliers} />;
      case 'settings':
        return <SettingsManagement 
                  settings={settings} 
                  onSaveSettings={saveSettings}
                  onImportData={handleImportData}
                  appData={{services, drivers, suppliers, savedFilters, settings}}
                />;
      case 'calendar':
      default:
        return (
          <Calendar 
            services={services} 
            onSelectService={handleSelectService}
            onTimeSlotClick={handleTimeSlotClick}
            drivers={drivers}
            suppliers={suppliers}
            savedFilters={savedFilters}
            onSaveFilter={saveFilter}
            onDeleteFilter={deleteFilter}
          />
        );
    }
  }

  const getHeaderTitle = () => {
    switch(view) {
      case 'drivers': return "Driver Management";
      case 'suppliers': return "Supplier Management";
      case 'financials': return "Financials";
      case 'settings': return "Application Settings";
      case 'calendar': 
      default: 
        return "NCC Dashboard";
    }
  }

  const theme = THEME_COLORS[settings.primaryColor] || THEME_COLORS.blue;

  const handleSetView = (newView: View) => {
    setView(newView);
    setIsSidebarOpen(false); // Close sidebar on navigation
  };


  return (
    <div className={`flex h-screen font-sans ${settings.theme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile overlay */}
      {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-20" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Sidebar container */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          currentView={view} 
          setView={handleSetView} 
          isLoggedIn={isLoggedIn}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
             <button
                className="p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
            <svg className={`hidden sm:block w-8 h-8 text-primary-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{getHeaderTitle()}</h1>
          </div>
          {view === 'calendar' && (
            <button
              onClick={handleAddServiceClick}
              className={`flex items-center px-3 sm:px-4 py-2 text-sm font-semibold text-white ${theme.main} rounded-lg ${theme.hover} shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.ring}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              <span className="hidden sm:inline ml-2">Create Service</span>
            </button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          {renderView()}
        </main>
      </div>
      
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={handleSaveService}
        service={editingService}
        drivers={drivers}
        suppliers={suppliers}
        isLoggedIn={isLoggedIn}
      />
      
      {selectedService && (
        <ServiceDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          service={selectedService}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
          drivers={drivers}
          suppliers={suppliers}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
};

export default App;