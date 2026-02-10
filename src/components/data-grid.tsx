
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import DataGrid, { Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { ProcessedAuditEvent } from './audit-timeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Maximize, Search, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { renderDetails } from './audit-timeline';
import { Input } from './ui/input';

type GenericRow = { [key: string]: any };

interface DataGridProps {
  data: (ProcessedAuditEvent | GenericRow)[];
  columns: { key: string; name: string }[];
  dataType: 'audit' | 'generic';
}

function rowKeyGetter(row: ProcessedAuditEvent | GenericRow) {
  // Use a unique identifier if available, otherwise fallback to an index-based key (not ideal for state but works for static-ish lists)
  return (row as any).id || (row as any).uuid || (row as any).created_timestamp || Math.random();
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
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  // Custom Header Cell with Filter Input
  const FilterHeader = useCallback(({ column }: { column: Column<any> }) => {
    return (
      <div className="flex flex-col gap-1 py-2 w-full">
        <div className="font-bold text-xs uppercase tracking-wider truncate" title={column.name as string}>
          {column.name}
        </div>
        <div className="relative group">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            className="h-7 text-[10px] pl-7 pr-6 bg-background/50 border-muted focus-visible:ring-primary focus-visible:ring-1"
            placeholder="Filter..."
            value={filters[column.key] || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, [column.key]: e.target.value }))}
            onClick={(e) => e.stopPropagation()} // Prevent sorting/dragging when clicking input
          />
          {filters[column.key] && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setFilters(prev => {
                  const next = { ...prev };
                  delete next[column.key];
                  return next;
                });
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  }, [filters]);

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
        draggable: true, // Enable drag to reorder
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

  // Effect to re-sync columns if propColumns change (e.g. on new file upload)
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
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = String(row[key] ?? '').toLowerCase();
        return cellValue.includes(value.toLowerCase());
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
          headerRowHeight={70}
          className="rdg-light h-full"
          style={{ height: '100%' }}
        />
      </div>
      <div className="p-2 border-t bg-muted/30 text-[10px] text-muted-foreground flex justify-between items-center">
        <div>Showing {filteredRows.length} of {data.length} records</div>
        <div className="flex gap-2">
          <span>• Drag headers to reorder</span>
          <span>• Use header inputs to filter</span>
        </div>
      </div>
    </div>
  );
}
