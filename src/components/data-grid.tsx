
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import DataGrid, { Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { ProcessedAuditEvent } from './audit-timeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Maximize, Search, X, Filter, ChevronDown } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { renderDetails } from './audit-timeline';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';

type GenericRow = { [key: string]: any };

interface DataGridProps {
  data: (ProcessedAuditEvent | GenericRow)[];
  columns: { key: string; name: string }[];
  dataType: 'audit' | 'generic';
}

function rowKeyGetter(row: ProcessedAuditEvent | GenericRow) {
  return (row as any).id || (row as any).uuid || (row as any).created_timestamp || Math.random().toString();
}

const ExpandedRow = ({ row }: { row: ProcessedAuditEvent | GenericRow }) => {
  const isAuditEvent = 'created_timestamp' in row;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Maximize className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>
                {isAuditEvent ? `${row.action} on ${row.entity_name}` : 'Row Details'}
              </DialogTitle>
            </DialogHeader>
            {isAuditEvent ? renderDetails(row as ProcessedAuditEvent) : renderDetails(row as any)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default function ResizableDataGrid({ data, columns: propColumns, dataType }: DataGridProps) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  
  // Custom Filter Dropdown Header
  const FilterHeader = useCallback(({ column }: { column: Column<any> }) => {
    const columnKey = column.key;
    const [searchTerm, setSearchTerm] = useState('');
    
    // Get unique values for this column
    const uniqueValues = useMemo(() => {
      const values = data.map(row => String(row[columnKey] ?? 'None'));
      return Array.from(new Set(values)).sort();
    }, [columnKey]);

    const filteredOptions = uniqueValues.filter(v => 
      v.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selected = filters[columnKey] || [];

    const handleToggle = (val: string) => {
      setFilters(prev => {
        const current = prev[columnKey] || [];
        const next = current.includes(val) 
          ? current.filter(item => item !== val) 
          : [...current, val];
        
        if (next.length === 0) {
          const newState = { ...prev };
          delete newState[columnKey];
          return newState;
        }
        return { ...prev, [columnKey]: next };
      });
    };

    const handleClear = () => {
      setFilters(prev => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
    };

    return (
      <div className="flex items-center justify-between w-full px-2 py-1 group">
        <span className="font-bold text-xs uppercase tracking-wider truncate mr-1" title={column.name as string}>
          {column.name}
        </span>
        
        <Popover>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                "p-1 rounded hover:bg-muted transition-colors",
                selected.length > 0 ? "text-primary bg-primary/10" : "text-muted-foreground opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Filter className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="flex items-center justify-between p-2 border-b">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-bold hover:bg-transparent" onClick={() => {}}>Apply</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:bg-transparent" onClick={handleClear}>Clear</Button>
            </div>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs focus-visible:ring-1"
                />
              </div>
            </div>
            <ScrollArea className="h-48">
              <div className="p-2 space-y-1">
                {filteredOptions.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No values found</p>
                )}
                {filteredOptions.map((val) => (
                  <div key={val} className="flex items-center space-x-2 px-1 py-1 hover:bg-muted/50 rounded cursor-pointer transition-colors" onClick={() => handleToggle(val)}>
                    <Checkbox 
                      id={`filter-${columnKey}-${val}`} 
                      checked={selected.includes(val)} 
                      className="h-3.5 w-3.5"
                    />
                    <label 
                      htmlFor={`filter-${columnKey}-${val}`}
                      className="text-[11px] font-medium leading-none cursor-pointer truncate"
                    >
                      {val}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    );
  }, [data, filters]);

  // Initial Columns Configuration
  const [columns, setColumns] = useState<readonly Column<any>[]>(() => {
    const baseColumns: Column<any>[] = [
      {
        key: 'expand',
        name: '',
        minWidth: 40,
        width: 40,
        resizable: false,
        frozen: true,
        renderCell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <ExpandedRow row={row} />
          </div>
        ),
      },
      ...propColumns.map(col => ({
        key: col.key,
        name: col.name,
        resizable: true,
        draggable: true,
        renderCell: ({ row }: { row: any }) => (
          <div className="truncate whitespace-nowrap px-2 text-xs">
            {String(row[col.key] ?? '')}
          </div>
        ),
        renderHeaderCell: (props: any) => <FilterHeader column={props.column} />
      }))
    ];
    return baseColumns;
  });

  // Sync columns on prop change
  React.useEffect(() => {
    const nextColumns: Column<any>[] = [
      {
        key: 'expand',
        name: '',
        minWidth: 40,
        width: 40,
        resizable: false,
        frozen: true,
        renderCell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <ExpandedRow row={row} />
          </div>
        ),
      },
      ...propColumns.map(col => ({
        key: col.key,
        name: col.name,
        resizable: true,
        draggable: true,
        renderCell: ({ row }: { row: any }) => (
          <div className="truncate whitespace-nowrap px-2 text-xs">
            {String(row[col.key] ?? '')}
          </div>
        ),
        renderHeaderCell: (props: any) => <FilterHeader column={props.column} />
      }))
    ];
    setColumns(nextColumns);
  }, [propColumns, FilterHeader]);

  // Apply Filters to Data
  const filteredRows = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, allowedValues]) => {
        if (!allowedValues || allowedValues.length === 0) return true;
        const cellValue = String(row[key] ?? 'None');
        return allowedValues.includes(cellValue);
      });
    });
  }, [data, filters]);

  const handleColumnsChange = useCallback((newColumns: readonly Column<any>[]) => {
    setColumns(newColumns);
  }, []);

  return (
    <div className="border rounded-md overflow-hidden bg-card h-full shadow-sm flex flex-col">
      <div className="flex-grow min-h-0">
        <DataGrid
          rowKeyGetter={rowKeyGetter}
          columns={columns}
          rows={filteredRows}
          onColumnsChange={handleColumnsChange}
          headerRowHeight={45}
          className="rdg-light h-full border-none"
          style={{ height: '100%' }}
        />
      </div>
      <div className="p-2 border-t bg-muted/30 text-[10px] text-muted-foreground flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div>Showing {filteredRows.length} of {data.length} records</div>
          {Object.keys(filters).length > 0 && (
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-[10px] text-primary" 
              onClick={() => setFilters({})}
            >
              Clear all filters
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <span>• Drag headers to rearrange</span>
          <span>• Click filter icon to refine</span>
        </div>
      </div>
    </div>
  );
}
