'use client';

import 'react-data-grid/lib/styles.css';
import React, { useState, useMemo } from 'react';
import ReactDataGrid from 'react-data-grid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface DataGridProps {
  rows: any[];
  columns: { key: string; name: string; resizable?: boolean }[];
}

const isDate = (s: any) => {
    if (s === null || s === undefined) return false;
    // Attempt to parse the string as a date
    const date = new Date(s);
    return !isNaN(date.getTime());
};

const formatValue = (value: any) => {
    if (isDate(value)) {
        try {
            return format(new Date(value), 'PPpp');
        } catch {
            return String(value);
        }
    }
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    return String(value ?? '');
};

const DataGrid: React.FC<DataGridProps> = ({ rows: initialRows, columns: initialColumns }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formattedColumns = useMemo(() => {
    return initialColumns.map(col => ({
        ...col,
        formatter: ({ row }: { row: any }) => (
            <div className="truncate">{formatValue(row[col.key])}</div>
        ),
    }));
  }, [initialColumns]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return initialRows;
    const lowercasedFilter = searchTerm.toLowerCase();
    return initialRows.filter(row => {
      return Object.values(row).some(value =>
        String(value).toLowerCase().includes(lowercasedFilter)
      );
    });
  }, [initialRows, searchTerm]);

  const handleExport = () => {
    const dataToExport = filteredRows.map(row => {
        const newRow: {[key: string]: any} = {};
        initialColumns.forEach(col => {
            newRow[col.name] = row[col.key];
        });
        return newRow;
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exported_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-none flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>
      <div className="flex-grow min-h-0 border rounded-lg overflow-hidden">
        <ReactDataGrid
            columns={formattedColumns}
            rows={filteredRows}
            className="h-full w-full"
            headerRowHeight={40}
            rowHeight={40}
        />
      </div>
    </div>
  );
};

export default DataGrid;
