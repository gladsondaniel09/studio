'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import DataGrid, { Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { ProcessedAuditEvent } from './audit-timeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Maximize, Search, Filter, ArrowUpAZ, ArrowDownZA, SortAsc, SortDesc, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, X, GripVertical } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { renderDetails } from './audit-timeline';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
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

let __genericRowCounter = 0;
function rowKeyGetter(row: ProcessedAuditEvent | GenericRow) {
  // _rowId is assigned during processing and is always unique — prevents react-data-grid
  // from collapsing rows that share (or lack) an id/timestamp into blank rows.
  if ((row as any)._rowId !== undefined) return (row as any)._rowId;
  const key = (row as any).id ??
         (row as any).uuid ??
         (row as any).created_timestamp ??
         (row as any).entity_id ??
         (row as any).tradeId ??
         (row as any).TradeId ??
         (row as any).PlannedObligationId;
  if (key !== undefined && key !== null && key !== '') return key;
  // Last-resort fallback for generic rows with no identifying field
  if ((row as any).__k === undefined) (row as any).__k = `__row_${__genericRowCounter++}`;
  return (row as any).__k;
}

const isJsonContent = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
};

export default function ResizableDataGrid({ data, columns: propColumns, dataType }: DataGridProps) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ columnKey: null, direction: null });
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Inspector Panel State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerJson, setDrawerJson] = useState<string | undefined>(undefined);
  const [drawerTitle, setDrawerTitle] = useState('');
  
  // Resizing State
  const [panelWidth, setPanelWidth] = useState(540);
  const [isResizing, setIsResizing] = useState(false);
  const minWidth = 400;
  const maxWidthRatio = 0.8;

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * maxWidthRatio;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const FilterHeader = useCallback(({ column }: { column: Column<any> }) => {
    const columnKey = column.key;
    const [searchTerm, setSearchTerm] = useState('');
    
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
                    onCheckedChange={() => {}}
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
          </PopoverContent>
        </Popover>
      </div>
    );
  }, [data, filters, sortConfig]);

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
        renderCell: ({ row }: { row: any }) => {
          const value = row[col.key];
          const isJson = isJsonContent(value);
          return (
            <div 
              className={cn(
                "truncate whitespace-nowrap px-2 text-xs h-full flex items-center",
                isJson && "cursor-pointer hover:text-primary transition-colors font-medium hover:underline"
              )}
              onClick={(e) => {
                if (isJson) {
                  e.stopPropagation();
                  setDrawerJson(value);
                  setDrawerTitle(col.name);
                  setDrawerOpen(true);
                }
              }}
            >
              {String(value ?? '')}
            </div>
          );
        },
        renderHeaderCell: (props: any) => <FilterHeader column={props.column} />
      }))
    ];
  }, [propColumns, FilterHeader, currentPage, pageSize]);

  const totalPages = Math.ceil(processedRows.length / pageSize);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  const navigateDetails = (direction: 'next' | 'prev') => {
      if (expandedIndex === null) return;
      const newIndex = direction === 'next' ? expandedIndex + 1 : expandedIndex - 1;
      if (newIndex >= 0 && newIndex < processedRows.length) {
          setExpandedIndex(newIndex);
      }
  };

  const currentExpandedRow = expandedIndex !== null ? processedRows[expandedIndex] : null;

  useEffect(() => {
    setCurrentPage(1);
  }, [processedRows.length, pageSize]);

  const handleRowClick = useCallback((row: any) => {
    setSelectedRow(prev => {
      if (!prev || !row) return row;
      const prevKey = rowKeyGetter(prev);
      const currentKey = rowKeyGetter(row);
      return prevKey === currentKey ? null : row;
    });
  }, []);

  const isRowSelected = (row: any) => {
    if (!selectedRow || !row) return false;
    return rowKeyGetter(selectedRow) === rowKeyGetter(row);
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Main Table Content */}
      <div className="flex flex-col flex-1 min-w-0 border rounded-md bg-card shadow-sm h-full relative">
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
                {selectedRow.payload && selectedRow.payload !== 'NULL' ? (
                  <RawJsonViewer jsonString={selectedRow.payload} title="Payload Data" />
                ) : (
                  <div className={cn("h-full", (selectedRow.difference_list && selectedRow.difference_list !== 'NULL') ? "" : "col-span-full")}>
                    <RawJsonViewer jsonString={JSON.stringify(selectedRow, null, 2)} title="Raw Record Metadata" />
                  </div>
                )}
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

          <div className="flex gap-2 text-right">
            <span>• Click JSON cell for Inspector</span>
            <span>• Filter icon to sort & refine</span>
          </div>
        </div>
      </div>

      {/* Resizable JSON Payload Inspector Panel */}
      {drawerOpen && (
        <>
          {/* Draggable Resize Handle */}
          <div 
            className={cn(
              "w-1.5 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-40 shrink-0",
              isResizing && "bg-primary"
            )}
            onMouseDown={startResizing}
          >
            <div className="h-full w-px bg-border mx-auto" />
          </div>

          {/* Forensic Inspector Sidebar */}
          <div 
            className="h-full bg-card border-l shadow-2xl flex flex-col shrink-0 animate-in slide-in-from-right duration-200"
            style={{ width: `${panelWidth}px` }}
          >
            <div className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-primary/10 text-primary">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline leading-none">{drawerTitle} Inspector</h3>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">Source JSON Inspection</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-grow min-h-0">
               <RawJsonViewer jsonString={drawerJson} title={drawerTitle} />
            </div>
          </div>
        </>
      )}

      {/* Forensic Detail Modal */}
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
    </div>
  );
}
