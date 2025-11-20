
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar } from './components/calendar/Calendar';
import { ServiceModal } from './components/service/ServiceModal';
import { ServiceDetailModal } from './components/service/ServiceDetailModal';
import { Service, View, UserProfile, User } from './types';
import { useServiceManager } from './hooks/useServiceManager';
import { Sidebar } from './components/layout/Sidebar';
import { DriverManagement } from './components/drivers/DriverManagement';
import { SupplierManagement } from './components/suppliers/SupplierManagement';
import { FinancialsManagement } from './components/financials/FinancialsManagement';
import { SettingsManagement } from './components/settings/SettingsManagement';
import { THEME_COLORS } from './constants';
import { signInWithGoogle, signOutGoogle, getStoredSession } from './services/googleAuthService';
import { useTranslation } from './hooks/useTranslation';

const App: React.FC = () => {
  const { 
    services, saveService, deleteService,
    drivers, saveDriver, deleteDriver,
    suppliers, saveSupplier, deleteSupplier,
    savedFilters, saveFilter, deleteFilter,
    settings, saveSettings, importData,
    driverLeaves, toggleDriverLeave,
  } = useServiceManager();
  
  const [view, setView] = useState<View>('calendar');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useTranslation(settings.language);

  // --- Authentication State ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Determine the current app user role based on the logged-in email or default to ADMIN for the main user
  // In a real app, this would come from the backend/db based on the authenticated UID.
  const currentUser: User | undefined = useMemo(() => {
      // For demonstration, we assume the first user in MOCK_DRIVERS is the admin ("Me") 
      // and if logged in, we try to match. If not logged in, we default to Admin for usability of the demo.
      if (user) {
          return drivers.find(d => d.email === user.email) || drivers.find(d => d.role === 'ADMIN');
      }
      return drivers.find(d => d.role === 'ADMIN');
  }, [user, drivers]);

  const userRole = currentUser?.role || 'DRIVER';

  useEffect(() => {
      // Check for existing session on mount
      const storedUser = getStoredSession();
      if (storedUser) {
          setUser(storedUser);
      }
      setIsAuthLoading(false);
      
      // Apply default view preference on load if set
      if (settings.defaultView) {
          setView(settings.defaultView);
      }
  }, []); // Run once on mount

  const isLoggedIn = !!user;

  const handleSignIn = async () => {
    try {
        setIsAuthLoading(true);
        const loggedInUser = await signInWithGoogle();
        setUser(loggedInUser);
    } catch (error) {
        console.error("Login failed", error);
        alert("Login failed. Please try again.");
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogle();
    setUser(null);
  };
  // --- End Auth ---

  useEffect(() => {
    // Apply theme and color variables to the root element
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const colorMap = {
      blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
      indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
      purple: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
      green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
      red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a' },
      orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
      amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
      teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e' },
      cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
      rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
      slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
    };
    
    // Fallback to blue if the stored color is somehow invalid
    const colors = colorMap[settings.primaryColor as keyof typeof colorMap] || colorMap.blue;

    Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-primary-${key}`, value as string);
    });

    // Apply Border Radius
    const radiusMap: Record<string, string> = {
      none: '0px',
      sm: '0.25rem',
      md: '0.5rem', // Default
      lg: '0.75rem',
      full: '1.5rem',
    };
    const radius = radiusMap[settings.borderRadius || 'md'];
    root.style.setProperty('--radius', radius);

    // Apply Font Style
    const fontMap: Record<string, string> = {
      inter: "'Inter', sans-serif",
      roboto: "'Roboto', sans-serif",
      serif: "'Playfair Display', serif",
    };
    const font = fontMap[settings.fontStyle || 'inter'];
    root.style.setProperty('--font-main', font);


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
    if (userRole === 'ADMIN') {
      setEditingService({ startTime });
      setIsServiceModalOpen(true);
    }
  }, [userRole]);
  
  const handleImportData = useCallback((data: any) => {
    if (window.confirm("This will overwrite all current data. Are you sure you want to continue?")) {
        if (importData(data)) {
            alert("Data imported successfully!");
            setView(settings.defaultView || 'calendar'); 
        } else {
            alert("Import failed. The backup file might be corrupted or in the wrong format.");
        }
    }
  }, [importData, settings.defaultView]);

  const renderView = () => {
    // Security check: Redirect unauthorized users back to calendar
    if (userRole !== 'ADMIN' && (view === 'financials' || view === 'suppliers' || view === 'settings')) {
        // Using setTimeout to avoid state update loops during render
        setTimeout(() => setView('calendar'), 0);
        return null;
    }

    switch(view) {
      case 'drivers':
        return <DriverManagement 
                  drivers={drivers} 
                  onSave={saveDriver} 
                  onDelete={deleteDriver} 
                  services={services} 
                  settings={settings} 
                  driverLeaves={driverLeaves}
                  onToggleLeave={toggleDriverLeave}
                  currentUser={currentUser}
                />;
      case 'suppliers':
        return <SupplierManagement suppliers={suppliers} onSave={saveSupplier} onDelete={deleteSupplier} services={services} settings={settings} />;
      case 'financials':
        return <FinancialsManagement services={services} drivers={drivers} suppliers={suppliers} settings={settings} />;
      case 'settings':
        return <SettingsManagement 
                  settings={settings} 
                  onSaveSettings={saveSettings}
                  onImportData={handleImportData}
                  appData={{services, drivers, suppliers, savedFilters, settings, driverLeaves}}
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
            settings={settings}
            driverLeaves={driverLeaves}
            userRole={userRole}
            onUpdateService={saveService}
          />
        );
    }
  }

  const getHeaderTitle = () => {
    switch(view) {
      case 'drivers': return userRole === 'DRIVER' ? 'My Agenda & Reports' : t('drivers');
      case 'suppliers': return t('suppliers');
      case 'financials': return t('financials');
      case 'settings': return t('settings');
      case 'calendar': 
      default: 
        return t('dashboard');
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
          language={settings.language}
          userRole={userRole}
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
          <div className="flex items-center gap-3">
              {isLoggedIn && (
                  <div className="hidden md:flex items-center px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full border border-green-200 dark:border-green-800">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Google Sync Active
                  </div>
              )}
              {view === 'calendar' && userRole === 'ADMIN' && (
                <button
                  onClick={handleAddServiceClick}
                  className={`flex items-center px-3 sm:px-4 py-2 text-sm font-semibold text-white ${theme.main} rounded-lg ${theme.hover} shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.ring}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  <span className="hidden sm:inline ml-2">{t('create_service')}</span>
                </button>
              )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          {renderView()}
        </main>
      </div>
      
      {userRole === 'ADMIN' && (
        <ServiceModal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          onSave={handleSaveService}
          service={editingService}
          drivers={drivers}
          suppliers={suppliers}
          isLoggedIn={isLoggedIn}
        />
      )}
      
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
          settings={settings}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default App;
