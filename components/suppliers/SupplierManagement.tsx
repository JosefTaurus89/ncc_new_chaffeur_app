
import React, { useState, useEffect } from 'react';
import { Supplier, Service, AppSettings } from '../../types';
import { SupplierReports } from './SupplierReports';
import { useTranslation } from '../../hooks/useTranslation';

interface SupplierManagementProps {
  suppliers: Supplier[];
  onSave: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
  services: Service[];
  settings: AppSettings;
}

const emptyFormState: Omit<Supplier, 'id'> = { name: '', contactPerson: '', email: '', phone: '' };

type SupplierView = 'list' | 'reports';

const TabButton: React.FC<{tabName: SupplierView, activeTab: SupplierView, label: string, onClick: (tab: SupplierView) => void}> = ({ tabName, activeTab, label, onClick }) => (
    <button 
        onClick={() => onClick(tabName)}
        className={`px-4 py-2 text-sm font-semibold rounded-t-md focus:outline-none ${activeTab === tabName ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
    >
        {label}
    </button>
);


export const SupplierManagement: React.FC<SupplierManagementProps> = ({ suppliers, onSave, onDelete, services, settings }) => {
  const [activeTab, setActiveTab] = useState<SupplierView>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Omit<Supplier, 'id'> & { id?: string }>(emptyFormState);
  const { t } = useTranslation(settings.language);

  useEffect(() => {
    if (editingSupplier) {
      setFormData(editingSupplier);
      setIsFormOpen(true);
    } else {
      setFormData(emptyFormState);
    }
  }, [editingSupplier]);

  useEffect(() => {
    if (activeTab === 'reports') {
        setIsFormOpen(false);
        setEditingSupplier(null);
    }
  }, [activeTab]);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
  };

  const handleAddNew = () => {
    setEditingSupplier(null);
    setFormData(emptyFormState);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setEditingSupplier(null);
    setIsFormOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     if (!formData.name || !formData.contactPerson || !formData.email || !formData.phone) {
        alert("Please fill out all fields. Name, Contact Person, Email, and Phone are required.");
        return;
    }
    onSave({
      ...formData,
      id: editingSupplier?.id || `supplier-${Date.now()}`,
      name: formData.name,
      contactPerson: formData.contactPerson,
      email: formData.email,
      phone: formData.phone,
    });
    handleCancel();
  };

  const inputStyles = "mt-1 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";
  const labelStyles = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900">
       <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
             <nav className="-mb-px flex space-x-4">
                <TabButton tabName="list" activeTab={activeTab} label={t('supplier_list')} onClick={setActiveTab} />
                <TabButton tabName="reports" activeTab={activeTab} label={t('monthly_reports')} onClick={setActiveTab} />
            </nav>
        </div>

      {activeTab === 'list' && (
        <>
            {!isFormOpen && (
                <div className="my-4 flex-shrink-0">
                <button
                    onClick={handleAddNew}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
                >
                    {t('add_supplier')}
                </button>
                </div>
            )}

            {isFormOpen && (
                <div className="my-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0 animate-fade-in-down">
                <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{editingSupplier ? t('edit_supplier') : t('add_supplier')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyles}>{t('supplier_name')}</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputStyles} required />
                        </div>
                        <div>
                            <label className={labelStyles}>{t('contact_person')}</label>
                            <input type="text" name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} className={inputStyles} required />
                        </div>
                        <div>
                            <label className={labelStyles}>{t('contact_email')}</label>
                            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputStyles} required />
                        </div>
                        <div>
                            <label className={labelStyles}>{t('contact_phone')}</label>
                            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className={inputStyles} required />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 transition-colors">{t('cancel')}</button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">{t('save_supplier')}</button>
                    </div>
                </form>
                </div>
            )}

            <div className="flex-1 overflow-auto mt-2">
                <div className="shadow border border-slate-200 dark:border-slate-700 sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('supplier_name')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('contact_person')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('contact_email')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('contact_phone')}</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                    {suppliers.map(supplier => (
                        <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{supplier.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{supplier.contactPerson || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{supplier.email || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{supplier.phone || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                            <button onClick={() => handleEdit(supplier)} className="text-primary-600 hover:text-primary-800 font-semibold">{t('edit')}</button>
                            <button onClick={() => {if(window.confirm(`Delete ${supplier.name}?`)) onDelete(supplier.id)}} className="text-red-600 hover:text-red-800 font-semibold">{t('delete')}</button>
                        </td>
                        </tr>
                    ))}
                     {suppliers.length === 0 && (
                         <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                No suppliers found. Add one to get started.
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
                <SupplierReports suppliers={suppliers} services={services} settings={settings} />
            </div>
      )}
    </div>
  );
};
