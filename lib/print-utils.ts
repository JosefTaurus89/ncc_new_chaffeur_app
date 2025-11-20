
import { Service, User, AppSettings } from '../types';
import { translations } from './translations';
import { formatTime } from './calendar-utils';

export const printReport = (title: string, subtitle: string, metrics: {label: string, value: string}[], tableHeaders: string[], tableRows: (string | number)[][]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const metricsHtml = metrics.map(m => `
        <div class="metric">
            <span class="metric-label">${m.label}</span>
            <span class="metric-value">${m.value}</span>
        </div>
    `).join('');

    const tableHeaderHtml = tableHeaders.map(h => `<th>${h}</th>`).join('');
    const tableBodyHtml = tableRows.map(row => `
        <tr>
            ${row.map(cell => `<td>${cell}</td>`).join('')}
        </tr>
    `).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; background: #fff; }
                .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                h1 { margin: 0; font-size: 24px; color: #1e293b; }
                p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
                .metrics { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
                .metric { background: #f8fafc; padding: 15px; border-radius: 8px; min-width: 140px; border: 1px solid #e2e8f0; }
                .metric-label { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
                .metric-value { display: block; font-size: 18px; font-weight: bold; margin-top: 5px; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th { text-align: left; padding: 12px 8px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: 600; color: #334155; text-transform: uppercase; font-size: 11px; }
                td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top; }
                tr:last-child td { border-bottom: none; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                    .metric { border: 1px solid #ccc; }
                    th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
                    tr:nth-child(even) { background-color: #f9f9f9 !important; -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>${title}</h1>
                    <p>${subtitle}</p>
                </div>
                <div style="text-align: right;">
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
            <div class="metrics">
                ${metricsHtml}
            </div>
            <table>
                <thead><tr>${tableHeaderHtml}</tr></thead>
                <tbody>${tableBodyHtml}</tbody>
            </table>
            <div class="footer">
                Use your browser's print function (Ctrl+P / Cmd+P) to save this report as a PDF.
            </div>
            <script>
                // Automatically trigger print when loaded
                window.onload = () => { setTimeout(() => window.print(), 500); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

export const generateVoucherPDF = (service: Service, driver: User | undefined, settings: AppSettings) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const lang = settings.language;
    const t = (key: keyof typeof translations['en']) => {
        const dict = translations[lang] || translations['en'];
        return dict[key] || translations['en'][key] || key;
    };

    const localeMap: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[lang] || 'en-US';

    const dateStr = new Date(service.startTime).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = formatTime(service.startTime, settings.timeFormat);
    
    const paxText = `${service.passengersAdults || (service.numberOfPassengers || 1)} ${t('adults')}, ${service.passengersKids || 0} ${t('kids')}`;
    
    const price = service.clientPrice || 0;
    const deposit = service.deposit || 0;
    const isPrepaidOrInvoice = service.paymentMethod === 'Prepaid' || service.paymentMethod === 'Future Invoice';
    const balanceDue = isPrepaidOrInvoice ? 0 : Math.max(0, price - deposit);

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Voucher - ${service.title}</title>
        <style>
            body { font-family: 'Arial', sans-serif; background: #f0f0f0; padding: 40px; color: #333; }
            .voucher { max-width: 800px; margin: 0 auto; background: #fff; border: 2px solid #333; position: relative; }
            .header { background: #333; color: #fff; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
            .logo-placeholder { font-weight: bold; border: 2px solid #fff; padding: 5px 10px; }
            
            .content { padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            
            .section { margin-bottom: 20px; }
            .section-title { font-size: 12px; text-transform: uppercase; color: #777; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; }
            
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .info-label { font-weight: bold; color: #555; }
            .info-value { text-align: right; }
            
            .large-value { font-size: 18px; font-weight: bold; color: #000; }
            
            .address-box { background: #f9f9f9; padding: 10px; border-left: 4px solid #333; margin-bottom: 15px; }
            .address-label { font-size: 10px; text-transform: uppercase; color: #777; font-weight: bold; margin-bottom: 3px; }
            .address-text { font-size: 14px; line-height: 1.4; font-weight: 600; }

            .driver-box { border: 1px dashed #333; padding: 15px; background: #fffbe6; }
            
            .footer { background: #eee; padding: 15px 40px; text-align: center; font-size: 12px; color: #555; border-top: 1px solid #ccc; }
            
            @media print {
                body { background: none; padding: 0; }
                .voucher { border: 2px solid #000; }
                .header { background: #000 !important; -webkit-print-color-adjust: exact; }
                .address-box { background: #f9f9f9 !important; -webkit-print-color-adjust: exact; border-left: 4px solid #000 !important; }
                .driver-box { background: #fffbe6 !important; -webkit-print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="voucher">
            <div class="header">
                <div class="logo-placeholder">LOGO</div>
                <h1>${t('voucher_header')}</h1>
            </div>
            
            <div class="content">
                <div>
                    <div class="section">
                        <div class="section-title">${t('service_details')}</div>
                        <div class="info-row">
                            <span class="info-label">${t('booking_ref')}:</span>
                            <span class="info-value">#${service.id.slice(-6).toUpperCase()}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">${t('service_date')}:</span>
                            <span class="info-value large-value">${dateStr}</span>
                        </div>
                         <div class="info-row">
                            <span class="info-label">${t('start_time')}:</span>
                            <span class="info-value large-value">${timeStr}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">${t('passengers')}:</span>
                            <span class="info-value">${paxText}</span>
                        </div>
                        ${service.flightNumber ? `
                        <div class="info-row">
                            <span class="info-label">${t('flight_number')}:</span>
                            <span class="info-value"><strong>${service.flightNumber}</strong></span>
                        </div>` : ''}
                    </div>

                    <div class="section">
                        <div class="section-title">${t('client_name')}</div>
                        <div class="large-value">${service.clientName}</div>
                        ${service.clientPhone ? `<div>${service.clientPhone}</div>` : ''}
                    </div>
                    
                    <div class="section">
                        <div class="section-title">${t('payment_method')}</div>
                        <div class="info-row">
                            <span class="info-label">${t('payment_method')}:</span>
                            <span class="info-value">${service.paymentMethod || '-'}</span>
                        </div>
                        <div class="info-row">
                             <span class="info-label">${t('balance_due')}:</span>
                             <span class="info-value large-value" style="${balanceDue > 0 ? 'color: #c0392b;' : ''}">$${balanceDue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div>
                     <div class="section">
                        <div class="section-title">Itinerary</div>
                        <div class="address-box">
                            <div class="address-label">${t('meeting_point')}</div>
                            <div class="address-text">${service.pickupAddress}</div>
                        </div>
                        ${service.stopAddress ? `
                        <div class="address-box" style="border-left-color: #777;">
                            <div class="address-label">Via / Stop</div>
                            <div class="address-text">${service.stopAddress}</div>
                        </div>` : ''}
                        <div class="address-box">
                            <div class="address-label">${t('destination')}</div>
                            <div class="address-text">${service.dropoffAddress}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 0 40px 40px;">
                <div class="section">
                    <div class="section-title">${t('driver_details')}</div>
                    <div class="driver-box">
                        ${driver ? `
                            <div class="large-value">${driver.name}</div>
                            <div class="info-row" style="margin-top: 5px;">
                                <span class="info-label">Phone:</span>
                                <span class="info-value"><strong>${driver.phone || 'N/A'}</strong></span>
                            </div>
                        ` : `<div>${t('unassigned')} - Please contact dispatch.</div>`}
                    </div>
                </div>
                
                ${service.notes ? `
                <div class="section">
                     <div class="section-title">${t('important_info')}</div>
                     <div style="font-style: italic; background: #f4f4f4; padding: 10px; white-space: pre-wrap;">${service.notes}</div>
                </div>
                ` : ''}
            </div>

            <div class="footer">
                ${t('voucher_footer')}
            </div>
        </div>
        <script>
             window.onload = () => { setTimeout(() => window.print(), 500); }
        </script>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
