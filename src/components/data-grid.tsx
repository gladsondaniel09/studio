'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import DataGrid, { Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { ProcessedAuditEvent } from './audit-timeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Maximize, Search, Filter, ArrowUpAZ, ArrowDownZA, SortAsc, SortDesc, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { renderDetails } from './audit-timeline';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RawJsonViewer } from './raw-json-viewer';

type GenericRow = { [key: string]: any };

interface DataGridProps {
  data: (ProcessedAuditEvent | GenericRow)[];
  columns: { key: string; name: string }[];
  dataType: 'audit' | 'generic';
}

interface SortConfig {
  columnKey: string | null;
  direction: 'ASC' | 'DESC' | null;
}

/**
 * Returns a stable unique identifier for a row.
 */
function rowKeyGetter(row: ProcessedAuditEvent | GenericRow) {
  return (row as any).id || 
         (row as any).uuid || 
         (row as any).created_timestamp || 
         (row as any).entity_id || 
         (row as any).tradeId || 
         (row as any).TradeId || 
         (row as any).PlannedObligationId;
}

export default function ResizableDataGrid({ data, columns: propColumns, dataType }: DataGridProps) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ columnKey: null, direction: null });
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal Navigation State
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    const isSorted = sortConfig.columnKey === columnKey;

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

    const handleSort = (direction: 'ASC' | 'DESC') => {
      setSortConfig({ columnKey, direction });
    };

    return (
      <div className="flex items-center justify-between w-full px-2 py-1 group">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="font-bold text-xs uppercase tracking-wider truncate" title={column.name as string}>
            {column.name}
          </span>
          {isSorted && (
            sortConfig.direction === 'ASC' ? <SortAsc className="h-3 w-3 text-primary shrink-0" /> : <SortDesc className="h-3 w-3 text-primary shrink-0" />
          )}
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                "p-1 rounded hover:bg-muted transition-colors",
                (selected.length > 0 || isSorted) ? "text-primary bg-primary/10" : "text-muted-foreground opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-2 space-y-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start h-8 text-xs font-medium"
                onClick={() => handleSort('ASC')}
              >
                <ArrowUpAZ className="mr-2 h-4 w-4 text-muted-foreground" />
                Sort A to Z
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start h-8 text-xs font-medium"
                onClick={() => handleSort('DESC')}
              >
                <ArrowDownZA className="mr-2 h-4 w-4 text-muted-foreground" />
                Sort Z to A
              </Button>
            </div>
            
            <Separator />

            <div className="flex items-center justify-between p-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Text Filters</span>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:bg-transparent" onClick={handleClear}>Clear</Button>
            </div>
            
            <div className="px-2 pb-2">
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
            
            <ScrollArea className="h-48 border-t">
              <div className="p-2 space-y-1">
                {filteredOptions.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No values found</p>
                )}
                <div className="flex items-center space-x-2 px-1 py-1 hover:bg-muted/50 rounded cursor-pointer transition-colors" onClick={() => {
                  if (selected.length === uniqueValues.length) {
                    handleClear();
                  } else {
                    setFilters(prev => ({ ...prev, [columnKey]: uniqueValues }));
                  }
                }}>
                  <Checkbox 
                    checked={selected.length === uniqueValues.length} 
                    className="h-3.5 w-3.5"
                    onCheckedChange={() => {}} // Controlled manually via div click
                  />
                  <label className="text-[11px] font-medium leading-none cursor-pointer truncate">
                    (Select All)
                  </label>
                </div>
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
            <div className="p-2 bg-muted/30 flex justify-end gap-2 border-t">
               <Button size="sm" className="h-7 text-[10px]" onClick={() => {}}>Done</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }, [data, filters, sortConfig]);

  // Apply Filters and Sorting to Data
  const processedRows = useMemo(() => {
    let filtered = data.filter(row => {
      return Object.entries(filters).every(([key, allowedValues]) => {
        if (!allowedValues || allowedValues.length === 0) return true;
        const cellValue = String(row[key] ?? 'None');
        return allowedValues.includes(cellValue);
      });
    });

    if (sortConfig.columnKey && sortConfig.direction) {
      filtered = [...filtered].sort((a, b) => {
        const valA = a[sortConfig.columnKey!];
        const valB = b[sortConfig.columnKey!];
        
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'ASC' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, filters, sortConfig]);

  // Sync columns on prop change
  const columns = useMemo((): Column<any>[] => {
    return [
      {
        key: 'expand',
        name: '',
        minWidth: 40,
        width: 40,
        resizable: false,
        frozen: true,
        renderCell: ({ row, rowIdx }) => (
          <div className="flex items-center justify-center h-full">
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={(e) => {
                    e.stopPropagation();
                    const globalIdx = (currentPage - 1) * pageSize + rowIdx;
                    setExpandedIndex(globalIdx);
                    setIsDetailsOpen(true);
                }}
             >
                <Maximize className="h-3 w-3" />
            </Button>
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
  }, [propColumns, FilterHeader, currentPage, pageSize]);

  // Pagination Logic
  const totalPages = Math.ceil(processedRows.length / pageSize);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  // Modal Navigation
  const navigateDetails = (direction: 'next' | 'prev') => {
      if (expandedIndex === null) return;
      const newIndex = direction === 'next' ? expandedIndex + 1 : expandedIndex - 1;
      if (newIndex >= 0 && newIndex < processedRows.length) {
          setExpandedIndex(newIndex);
      }
  };

  const currentExpandedRow = expandedIndex !== null ? processedRows[expandedIndex] : null;

  // Reset to first page when data/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [processedRows.length, pageSize]);

  const handleRowClick = useCallback((row: any) => {
    setSelectedRow(prev => {
      if (!prev || !row) return row;
      const prevKey = rowKeyGetter(prev);
      const currentKey = rowKeyGetter(row);
      // Toggle if clicking the same row
      return prevKey === currentKey ? null : row;
    });
  }, []);

  const isRowSelected = (row: any) => {
    if (!selectedRow || !row) return false;
    return rowKeyGetter(selectedRow) === rowKeyGetter(row);
  };

  return (
    <div className="border rounded-md overflow-hidden bg-card h-full shadow-sm flex flex-col relative">
      <div className="flex-grow min-h-0">
        <DataGrid
          rowKeyGetter={rowKeyGetter}
          columns={columns}
          rows={pagedRows}
          headerRowHeight={45}
          onRowClick={handleRowClick}
          rowClass={(row) => cn(
            "cursor-pointer transition-colors",
            isRowSelected(row) ? "bg-primary/10 font-medium" : "hover:bg-muted/30"
          )}
          className="rdg-light h-full border-none"
          style={{ height: '100%' }}
        />
      </div>

      {/* Forensic Detail Modal with Navigation */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="p-6 pb-4 shrink-0 flex flex-row items-center justify-between border-b">
                <div>
                    <DialogTitle className="text-xl font-headline">
                        {currentExpandedRow && 'action' in currentExpandedRow 
                            ? `${currentExpandedRow.action} on ${currentExpandedRow.entity_name}` 
                            : 'Row Details'}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                        {expandedIndex !== null ? `Record ${expandedIndex + 1} of ${processedRows.length}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2 pr-8">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1" 
                        disabled={expandedIndex === 0}
                        onClick={() => navigateDetails('prev')}
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1" 
                        disabled={expandedIndex === processedRows.length - 1}
                        onClick={() => navigateDetails('next')}
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="flex-grow min-h-0">
                <div className="px-6 pb-6 pt-4">
                    {currentExpandedRow && renderDetails(currentExpandedRow as any)}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
      </Dialog>

      {/* Bottom Inspection Pane */}
      {selectedRow && (
        <div className="border-t bg-card h-[350px] shrink-0 flex flex-col animate-in slide-in-from-bottom duration-300 z-10">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-primary/10">
                <Info className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                Inspection Pane
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setSelectedRow(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-4 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Show Payload if it exists */}
              {selectedRow.payload && selectedRow.payload !== 'NULL' ? (
                <RawJsonViewer jsonString={selectedRow.payload} title="Payload Data" />
              ) : (
                <div className={cn("h-full", (selectedRow.difference_list && selectedRow.difference_list !== 'NULL') ? "" : "col-span-full")}>
                  <RawJsonViewer jsonString={JSON.stringify(selectedRow, null, 2)} title="Raw Record Metadata" />
                </div>
              )}

              {/* Show Difference List if it exists */}
              {selectedRow.difference_list && selectedRow.difference_list !== 'NULL' && (
                <RawJsonViewer jsonString={selectedRow.difference_list} title="Difference List" />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-2 border-t bg-muted/30 text-[10px] text-muted-foreground flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div>
            Showing {processedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
            {Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length} records
          </div>
          {(Object.keys(filters).length > 0 || sortConfig.columnKey) && (
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-[10px] text-primary" 
              onClick={() => {
                setFilters({});
                setSortConfig({ columnKey: null, direction: null });
              }}
            >
              Clear all filters & sorts
            </Button>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">Rows per page:</span>
            <Select 
              value={String(pageSize)} 
              onValueChange={(val) => setPageSize(Number(val))}
            >
              <SelectTrigger className="h-6 w-16 text-[10px] px-1">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100, 200].map(size => (
                  <SelectItem key={size} value={String(size)} className="text-[10px]">{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            
            <span className="mx-2 whitespace-nowrap">Page {currentPage} of {totalPages || 1}</span>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 text-right">
          <span>• Click row for details</span>
          <span>• Drag headers to rearrange</span>
          <span>• Filter icon to sort & refine</span>
        </div>
      </div>
    </div>
  );
}
