import React, { useRef } from 'react';
import { AppSettings } from '../../types';
import { THEME_COLORS } from '../../constants';

interface SettingsManagementProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onImportData: (data: any) => void;
  appData: any;
}

const SettingsCard: React.FC<React.PropsWithChildren<{title: string, description: string}>> = ({ title, description, children }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-b-lg">
            {children}
        </div>
    </div>
);

export const SettingsManagement: React.FC<SettingsManagementProps> = ({ settings, onSaveSettings, onImportData, appData }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleThemeChange = (theme: 'light' | 'dark') => {
        onSaveSettings({ ...settings, theme });
    };

    const handleColorChange = (color: string) => {
        onSaveSettings({ ...settings, primaryColor: color });
    };
    
    const handleBackup = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(appData, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `ncc-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
        } catch (error) {
            console.error("Failed to create backup:", error);
            alert("An error occurred while creating the backup file.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    const data = JSON.parse(text);
                    onImportData(data);
                }
            } catch (error) {
                console.error("Failed to parse backup file:", error);
                alert("The selected file is not a valid backup file. Please choose a valid JSON backup.");
            }
        };
        reader.readAsText(file);
        
        // Reset file input so the same file can be loaded again
        event.target.value = '';
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <div className="max-w-4xl mx-auto space-y-8">
                <SettingsCard title="Appearance" description="Customize the look and feel of the application.">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Theme</label>
                            <div className="mt-2 flex gap-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="theme" value="light" checked={settings.theme === 'light'} onChange={() => handleThemeChange('light')} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                                    <span>Light</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="theme" value="dark" checked={settings.theme === 'dark'} onChange={() => handleThemeChange('dark')} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                                    <span>Dark</span>
                                </label>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Primary Color</label>
                            <div className="mt-2 flex gap-3">
                                {Object.keys(THEME_COLORS).map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => handleColorChange(color)}
                                        className={`w-8 h-8 rounded-full capitalize focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-800 ${THEME_COLORS[color].main} ${THEME_COLORS[color].ring}`}
                                        aria-label={`Set primary color to ${color}`}
                                    >
                                        {settings.primaryColor === color && (
                                            <svg className="w-5 h-5 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SettingsCard>

                 <SettingsCard title="Data Management" description="Save all your application data or restore it from a backup file.">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleBackup}
                            className="w-full flex justify-center items-center px-4 py-2 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        >
                            Backup All Data
                        </button>
                        <button
                            onClick={handleImportClick}
                            className="w-full flex justify-center items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                        >
                           Import from Backup
                        </button>
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".json"
                        />
                    </div>
                 </SettingsCard>
            </div>
        </div>
    );
};
