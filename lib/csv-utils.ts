
export const downloadCSV = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
    const processRow = (row: (string | number | null | undefined)[]) => {
        return row.map(val => {
            if (val === null || val === undefined) return '';
            const stringVal = String(val);
            // Escape quotes and wrap in quotes if it contains comma, quote or newline
            if (stringVal.search(/("|,|\n)/g) >= 0) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        }).join(',');
    };

    const csvContent = [
        headers.join(','),
        ...rows.map(processRow)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
