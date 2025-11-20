
import React, { useState, useEffect } from 'react';
import { User, DriverAvailability, Service, AppSettings, DriverLeave } from '../../types';
import { DriverReports } from './DriverReports';
import { DriverAgenda } from './DriverAgenda';
import { DriverAvailability as DriverAvailabilityComponent } from './DriverAvailability';
import { useTranslation } from '../../hooks/useTranslation';

interface DriverManagementProps {
  drivers: User[];
  onSave: (driver: User) => void;
  onDelete: (driverId: string) => void;
  services: Service[];
  settings: AppSettings;
  driverLeaves: DriverLeave[];
  onToggleLeave: (driverId: string, date: Date) => void;
  currentUser?: User;
}

const emptyFormState: Omit<User, 'id'> = { name: '', email: '', phone: '', role: 'DRIVER', availability: 'Available', photoUrl: '' };

type DriverView = 'list' | 'reports' | 'agenda' | 'availability';

const TabButton: React.FC<{tabName: DriverView, activeTab: DriverView, label: string, onClick: (tab: DriverView) => void}> = ({ tabName, activeTab, label, onClick }) => (
    <button 
        onClick={() => onClick(tabName)}
        className={`px-4 py-2 text-sm font-semibold rounded-t-md focus:outline-none ${activeTab === tabName ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
    >
        {label}
    </button>
);


export const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, onSave, onDelete, services, settings, driverLeaves, onToggleLeave, currentUser }) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<DriverView>(isAdmin ? 'list' : 'agenda');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [formData, setFormData] = useState<Omit<User, 'id'> & { id?: string }>(emptyFormState);
  const { t } = useTranslation(settings.language);

  useEffect(() => {
    if (editingDriver) {
      setFormData(editingDriver);
      setIsFormOpen(true);
    } else {
      setFormData(emptyFormState);
    }
  }, [editingDriver]);

  useEffect(() => {
    // Close form if switching to reports tab
    if (activeTab !== 'list') {
        setIsFormOpen(false);
        setEditingDriver(null);
    }
  }, [activeTab]);


  const handleEdit = (driver: User) => {
    setEditingDriver(driver);
  };

  const handleAddNew = () => {
    setEditingDriver(null);
    setFormData(emptyFormState);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingDriver(null);
    setIsFormOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
        alert("Name and email are required.");
        return;
    }
    onSave({
      ...formData,
      id: editingDriver?.id || `driver-${Date.now()}`,
      role: (formData.role as 'ADMIN' | 'DRIVER' | 'PARTNER') || 'DRIVER',
      availability: formData.availability || 'Available',
    });
    handleCancel();
  };
  
  const handleShareDriver = async (driver: User) => {
    const template = t('share_driver_msg');
    const text = template
        .replace('{name}', driver.name)
        .replace('{phone}', driver.phone || 'N/A');
    
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Driver Contact', text: text });
        } catch (error) {
            // Fallback if share was cancelled or failed
             try {
                await navigator.clipboard.writeText(text);
                alert('Driver info copied to clipboard!');
             } catch (err) {
                 console.error("Share failed", err);
             }
        }
    } else {
        try {
            await navigator.clipboard.writeText(text);
            alert('Driver info copied to clipboard!');
        } catch (err) {
            console.error("Clipboard failed", err);
            alert("Could not copy text automatically. Please copy manually.");
        }
    }
  };

  const inputStyles = "mt-1 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";
  const labelStyles = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  // Filter drivers list for non-admins to only show themselves if needed (though tab is hidden)
  const displayDrivers = isAdmin ? drivers : (currentUser ? [currentUser] : []);

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900">
        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
             <nav className="-mb-px flex space-x-4 overflow-x-auto">
                {isAdmin && (
                    <>
                        <TabButton tabName="list" activeTab={activeTab} label="Driver List" onClick={setActiveTab} />
                        <TabButton tabName="availability" activeTab={activeTab} label="Availability" onClick={setActiveTab} />
                    </>
                )}
                <TabButton tabName="agenda" activeTab={activeTab} label="Daily Agenda" onClick={setActiveTab} />
                <TabButton tabName="reports" activeTab={activeTab} label="Reports" onClick={setActiveTab} />
            </nav>
        </div>
        
        {activeTab === 'list' && isAdmin && (
            <>
                {!isFormOpen && (
                    <div className="my-4 flex-shrink-0">
                    <button
                        onClick={handleAddNew}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
                    >
                        Add New Driver
                    </button>
                    </div>
                )}

                {isFormOpen && (
                    <div className="my-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0 animate-fade-in-down">
                    <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{editingDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelStyles}>Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputStyles} required />
                            </div>
                            <div>
                                <label className={labelStyles}>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputStyles} required />
                            </div>
                            <div>
                                <label className={labelStyles}>Phone</label>
                                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className={inputStyles} />
                            </div>
                            <div>
                                <label className={labelStyles}>Role</label>
                                <select name="role" value={formData.role} onChange={handleChange} className={inputStyles}>
                                    <option value="DRIVER">Driver</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelStyles}>Photo URL</label>
                                <input type="text" name="photoUrl" value={formData.photoUrl || ''} onChange={handleChange} className={inputStyles} placeholder="https://..." />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 transition-colors">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">{t('save')}</button>
                        </div>
                    </form>
                    </div>
                )}

                <div className="flex-1 overflow-auto mt-2">
                    <div className="shadow border border-slate-200 dark:border-slate-700 sm:rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Role</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Contact</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                        {drivers.map(driver => (
                            <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        <img className="h-10 w-10 rounded-full object-cover bg-slate-200" src={driver.photoUrl || `https://ui-avatars.com/api/?name=${driver.name.replace(' ', '+')}&background=random`} alt={driver.name} />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{driver.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{driver.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-medium">
                                    {driver.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{driver.phone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                <button onClick={() => handleShareDriver(driver)} className="text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-md transition-colors">{t('share')}</button>
                                <button onClick={() => handleEdit(driver)} className="text-primary-600 hover:text-primary-800 font-semibold">{t('edit')}</button>
                                <button onClick={() => {if(window.confirm(`Delete ${driver.name}?`)) onDelete(driver.id)}} className="text-red-600 hover:text-red-800 font-semibold">{t('delete')}</button>
                            </td>
                            </tr>
                        ))}
                        {drivers.length === 0 && (
                             <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                    No drivers found. Add one to get started.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                    </div>
                </div>
            </>
        )}
        {activeTab === 'reports' && (
            <div className="flex-1 overflow-auto pt-4">
                {/* If non-admin, we restrict the report to only show the current user's data */}
                <DriverReports drivers={displayDrivers} services={services} />
            </div>
        )}
        {activeTab === 'agenda' && (
             <div className="flex-1 overflow-auto pt-4">
                <DriverAgenda drivers={displayDrivers} services={services} settings={settings} />
            </div>
        )}
        {activeTab === 'availability' && isAdmin && (
            <div className="flex-1 overflow-auto pt-4">
                <DriverAvailabilityComponent drivers={drivers} driverLeaves={driverLeaves} onToggleLeave={onToggleLeave} />
            </div>
        )}

    </div>
  );
};
