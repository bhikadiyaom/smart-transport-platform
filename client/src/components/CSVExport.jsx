import { Download } from 'lucide-react';

export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

export function CSVExportButton({ data, filename, label = 'Export CSV' }) {
  return (
    <button
      className="btn-secondary text-xs px-3 py-1.5"
      onClick={() => exportToCSV(data, filename)}
      title="Download as CSV"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
