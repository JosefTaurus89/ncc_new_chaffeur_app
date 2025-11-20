
import React, { useRef, useState } from 'react';
import { AppSettings, View } from '../../types';
import { THEME_COLORS } from '../../constants';
import { useTranslation } from '../../hooks/useTranslation';

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

export const SettingsManagement: React.FC<SettingsManagementProps> = ({ settings: globalSettings, onSaveSettings, onImportData, appData }) => {
    // Maintain local state for settings form to allow manual "Save"
    const [localSettings, setLocalSettings] = useState<AppSettings>(globalSettings);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation(localSettings.language);

    const handleThemeChange = (theme: 'light' | 'dark') => {
        setLocalSettings(prev => ({ ...prev, theme }));
    };

    const handleColorChange = (color: string) => {
        setLocalSettings(prev => ({ ...prev, primaryColor: color }));
    };
    
    const handleRadiusChange = (radius: 'none' | 'sm' | 'md' | 'lg' | 'full') => {
        setLocalSettings(prev => ({ ...prev, borderRadius: radius }));
    };
    
    const handleFontChange = (font: 'inter' | 'roboto' | 'serif') => {
        setLocalSettings(prev => ({ ...prev, fontStyle: font }));
    };
    
    const handleDensityChange = (isCompact: boolean) => {
        setLocalSettings(prev => ({ ...prev, compactMode: isCompact }));
    };

    const handleViewChange = (view: View) => {
        setLocalSettings(prev => ({ ...prev, defaultView: view }));
    };

    const handleSettingChange = (key: keyof AppSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSaveSettings(localSettings);
        alert(t('save') + ' ' + t('completed'));
    };
    
    const handleBackup = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(appData, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `NCC_Backup_${new Date().toISOString().slice(0,10)}.json`;
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
    
    const handleReset = () => {
        if (window.confirm("DANGER: This will delete ALL your data and reset the app. Are you sure?")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('settings')}</h1>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition-colors"
                    >
                        {t('save')}
                    </button>
                </div>
                
                <SettingsCard title={t('language')} description="Set the system language.">
                    <div className="max-w-xs">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('app_language')}</label>
                         <select 
                            value={localSettings.language || 'en'} 
                            onChange={(e) => handleSettingChange('language', e.target.value)}
                            className="mt-2 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                            <option value="it">Italiano</option>
                        </select>
                    </div>
                </SettingsCard>

                <SettingsCard title="General & Regional" description="Configure currency and time formats.">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
                            <select 
                                value={localSettings.currency || 'USD'} 
                                onChange={(e) => handleSettingChange('currency', e.target.value)}
                                className="mt-2 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="AUD">AUD ($)</option>
                                <option value="CAD">CAD ($)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Time Format</label>
                            <select 
                                value={localSettings.timeFormat || '12h'} 
                                onChange={(e) => handleSettingChange('timeFormat', e.target.value)}
                                className="mt-2 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value="12h">12 Hour (1:00 PM)</option>
                                <option value="24h">24 Hour (13:00)</option>
                            </select>
                        </div>
                     </div>
                </SettingsCard>

                <SettingsCard title={t('calendar_preferences')} description="Customize how the calendar grid looks and behaves.">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Day Start Hour</label>
                             <select 
                                value={localSettings.calendarStartHour ?? 0} 
                                onChange={(e) => handleSettingChange('calendarStartHour', parseInt(e.target.value))}
                                className="mt-2 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                {[...Array(24)].map((_, i) => (
                                    <option key={i} value={i}>{i}:00</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Day End Hour</label>
                             <select 
                                value={localSettings.calendarEndHour ?? 24} 
                                onChange={(e) => handleSettingChange('calendarEndHour', parseInt(e.target.value))}
                                className="mt-2 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                {[...Array(25)].map((_, i) => (
                                    <option key={i} value={i} disabled={i <= (localSettings.calendarStartHour ?? 0)}>{i}:00</option>
                                ))}
                            </select>
                        </div>
                     </div>
                </SettingsCard>

                <SettingsCard title={t('app_behavior')} description="Customize how the application functions.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Default Starting View</label>
                            <select 
                                value={localSettings.defaultView || 'calendar'} 
                                onChange={(e) => handleViewChange(e.target.value as View)}
                                className="mt-2 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value="calendar">Calendar</option>
                                <option value="drivers">Drivers</option>
                                <option value="suppliers">Suppliers</option>
                                <option value="financials">Financials</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Default Service Duration (Minutes)</label>
                            <input 
                                type="number"
                                value={localSettings.defaultServiceDuration || 60}
                                onChange={(e) => handleSettingChange('defaultServiceDuration', parseInt(e.target.value))}
                                className="mt-2 block w-full bg-slate-50 text-slate-900 border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            />
                        </div>
                         <div className="md:col-span-2">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.autoSyncGoogleCalendar || false} 
                                    onChange={(e) => handleSettingChange('autoSyncGoogleCalendar', e.target.checked)}
                                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                                />
                                <span className="text-slate-700 dark:text-slate-300 font-medium">Auto-sync new services to Google Calendar (requires sign-in)</span>
                            </label>
                        </div>
                    </div>
                </SettingsCard>

                <SettingsCard title={t('theme_mode')} description="Customize the look and feel of the application.">
                    <div className="space-y-8">
                        
                        {/* Theme Mode */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('theme_mode')}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                    <input type="radio" name="theme" value="light" checked={localSettings.theme === 'light'} onChange={() => handleThemeChange('light')} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-slate-700 dark:text-slate-200">{t('light_mode')}</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                    <input type="radio" name="theme" value="dark" checked={localSettings.theme === 'dark'} onChange={() => handleThemeChange('dark')} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-slate-700 dark:text-slate-200">{t('dark_mode')}</span>
                                </label>
                            </div>
                        </div>

                         {/* Layout Density */}
                         <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('layout_density')}</label>
                             <div className="flex gap-4">
                                <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                    <input type="radio" name="density" checked={!localSettings.compactMode} onChange={() => handleDensityChange(false)} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-slate-700 dark:text-slate-200">{t('comfortable')}</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                    <input type="radio" name="density" checked={!!localSettings.compactMode} onChange={() => handleDensityChange(true)} className="h-4 w-4 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-slate-700 dark:text-slate-200">{t('compact')}</span>
                                </label>
                             </div>
                        </div>

                         {/* Font Style */}
                         <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('font_style')}</label>
                             <div className="flex gap-2">
                                <button onClick={() => handleFontChange('inter')} className={`px-4 py-2 rounded-md text-sm border font-sans ${localSettings.fontStyle === 'inter' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>Inter (Sans)</button>
                                <button onClick={() => handleFontChange('roboto')} className={`px-4 py-2 rounded-md text-sm border ${localSettings.fontStyle === 'roboto' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`} style={{fontFamily: 'Roboto, sans-serif'}}>Roboto</button>
                                <button onClick={() => handleFontChange('serif')} className={`px-4 py-2 rounded-md text-sm border font-serif ${localSettings.fontStyle === 'serif' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>Serif</button>
                             </div>
                        </div>

                         {/* Border Radius */}
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('border_radius')}</label>
                             <div className="flex flex-wrap gap-2">
                                 {['none', 'sm', 'md', 'lg', 'full'].map((radius) => (
                                     <button
                                         key={radius}
                                         onClick={() => handleRadiusChange(radius as any)}
                                         className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors
                                            ${localSettings.borderRadius === radius 
                                                ? 'bg-primary-600 text-white border-primary-600' 
                                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                            }`}
                                     >
                                         {radius === 'none' ? 'Square' : radius === 'full' ? 'Round' : radius.toUpperCase()}
                                     </button>
                                 ))}
                             </div>
                        </div>

                         {/* Primary Color */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('color_theme')}</label>
                            <div className="flex flex-wrap gap-3">
                                {Object.keys(THEME_COLORS).map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => handleColorChange(color)}
                                        className={`w-8 h-8 rounded-full capitalize focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-800 shadow-sm transition-transform hover:scale-110 ${THEME_COLORS[color].main} ${THEME_COLORS[color].ring}`}
                                        title={color}
                                        aria-label={`Set primary color to ${color}`}
                                    >
                                        {localSettings.primaryColor === color && (
                                            <svg className="w-5 h-5 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </SettingsCard>

                 <SettingsCard title={t('data_backup')} description="Save your data permanently or restore from a file.">
                    <div className="space-y-6">
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800 flex items-start">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <div>
                                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Permanent Storage</h3>
                                <p className="text-sm text-blue-600 dark:text-blue-300">
                                    Your data is currently saved in this browser. To prevent data loss or to move data between devices, use the <strong>Backup</strong> button below to download a file containing all your services, drivers, suppliers, and settings.
                                </p>
                            </div>
                         </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleBackup}
                                className="flex-1 flex flex-col justify-center items-center p-6 border-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all group"
                            >
                                <svg className="w-8 h-8 mb-2 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                <span className="font-bold text-primary-800 dark:text-primary-300">Backup Data</span>
                                <span className="text-xs text-primary-600 dark:text-primary-400 mt-1">Download JSON File</span>
                            </button>
                            <button
                                onClick={handleImportClick}
                                className="flex-1 flex flex-col justify-center items-center p-6 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                            >
                               <svg className="w-8 h-8 mb-2 text-slate-500 dark:text-slate-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                               <span className="font-bold text-slate-700 dark:text-slate-300">Import Data</span>
                               <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Restore from JSON</span>
                            </button>
                             <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".json"
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                             <button
                                onClick={handleReset}
                                className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-md transition-colors"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Reset App to Defaults
                            </button>
                        </div>
                    </div>
                 </SettingsCard>
            </div>
        </div>
    );
};