import React, { useState, useEffect } from 'react';
import { User, DriverAvailability, Service } from '../../types';
import { DriverReports } from './DriverReports';

interface DriverManagementProps {
  drivers: User[];
  onSave: (driver: User) => void;
  onDelete: (driverId: string) => void;
  services: Service[];
}

const emptyFormState: Omit<User, 'id'> = { name: '', email: '', phone: '', role: 'DRIVER', availability: 'Available', photoUrl: '' };

const availabilityColors: Record<DriverAvailability, string> = {
    Available: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    Busy: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    'On Leave': 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
};

type DriverView = 'list' | 'reports';

const TabButton: React.FC<{tabName: DriverView, activeTab: DriverView, label: string, onClick: (tab: DriverView) => void}> = ({ tabName, activeTab, label, onClick }) => (
    <button 
        onClick={() => onClick(tabName)}
        className={`px-4 py-2 text-sm font-semibold rounded-t-md focus:outline-none ${activeTab === tabName ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
    >
        {label}
    </button>
);


export const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, onSave, onDelete, services }) => {
  const [activeTab, setActiveTab] = useState<DriverView>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [formData, setFormData] = useState<Omit<User, 'id'> & { id?: string }>(emptyFormState);

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
    if (activeTab === 'reports') {
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
      role: 'DRIVER',
      availability: formData.availability || 'Available',
    });
    handleCancel();
  };
  
  const inputStyles = "mt-1 block w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600";
  const labelStyles = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900">
        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
             <nav className="-mb-px flex space-x-4">
                <TabButton tabName="list" activeTab={activeTab} label="Driver List" onClick={setActiveTab} />
                <TabButton tabName="reports" activeTab={activeTab} label="Reports" onClick={setActiveTab} />
            </nav>
        </div>
        
        {activeTab === 'list' && (
            <>
                {!isFormOpen && (
                    <div className="my-4 flex-shrink-0">
                    <button
                        onClick={handleAddNew}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm"
                    >
                        Add New Driver
                    </button>
                    </div>
                )}

                {isFormOpen && (
                    <div className="my-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
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
                                <label className={labelStyles}>Availability</label>
                                <select name="availability" value={formData.availability} onChange={handleChange} className={inputStyles}>
                                    <option value="Available">Available</option>
                                    <option value="Busy">Busy</option>
                                    <option value="On Leave">On Leave</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelStyles}>Photo URL</label>
                                <input type="text" name="photoUrl" value={formData.photoUrl || ''} onChange={handleChange} className={inputStyles} />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Save Driver</button>
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
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Phone</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                        {drivers.map(driver => (
                            <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        <img className="h-10 w-10 rounded-full object-cover" src={driver.photoUrl || `https://ui-avatars.com/api/?name=${driver.name.replace(' ', '+')}&background=random`} alt={driver.name} />
                                    </div>
                                    <div className="ml-4">{driver.name}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{driver.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{driver.phone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${availabilityColors[driver.availability]} dark:bg-opacity-80`}>
                                    {driver.availability}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                <button onClick={() => handleEdit(driver)} className="text-primary-600 hover:text-primary-800 font-semibold">Edit</button>
                                <button onClick={() => {if(window.confirm(`Delete ${driver.name}?`)) onDelete(driver.id)}} className="text-red-600 hover:text-red-800 font-semibold">Delete</button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </>
        )}
        {activeTab === 'reports' && (
            <div className="flex-1 overflow-auto pt-4">
                <DriverReports drivers={drivers} services={services} />
            </div>
        )}

    </div>
  );
};