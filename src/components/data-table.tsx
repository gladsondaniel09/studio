
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
import { ProcessedAuditEvent, renderDetails } from './audit-timeline';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface DataTableProps {
  data: ProcessedAuditEvent[];
}

type SortableColumn = keyof ProcessedAuditEvent | 'user.name';

const DataTableRow = ({ event }: { event: ProcessedAuditEvent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>{format(new Date(event.created_timestamp), 'PPpp')}</TableCell>
        <TableCell>{event.entity_name}</TableCell>
        <TableCell>{event.action}</TableCell>
        <TableCell>{event.user?.name || 'N/A'}</TableCell>
        <TableCell className="max-w-xs truncate">{event.difference_list}</TableCell>
        <TableCell className="max-w-xs truncate">{event.payload}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="p-0">
             <div className="h-96 bg-muted/50">
                {renderDetails(event)}
             </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export function DataTable({ data }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<SortableColumn>('created_timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortColumn === 'user.name') {
        aValue = a.user?.name || '';
        bValue = b.user?.name || '';
      } else if (sortColumn === 'created_timestamp') {
        aValue = new Date(a.created_timestamp).getTime();
        bValue = new Date(b.created_timestamp).getTime();
      }
      else {
        aValue = a[sortColumn as keyof ProcessedAuditEvent];
        bValue = b[sortColumn as keyof ProcessedAuditEvent];
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  
  const columns: { key: SortableColumn; label: string; }[] = [
      { key: 'created_timestamp', label: 'Timestamp' },
      { key: 'entity_name', label: 'Entity Name' },
      { key: 'action', label: 'Action' },
      { key: 'user.name', label: 'User' },
      { key: 'difference_list', label: 'Difference List' },
      { key: 'payload', label: 'Payload' },
  ];

  return (
    <div className="w-full h-full flex flex-col">
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    {columns.map(col => (
                        <TableHead key={col.key}>
                            <Button variant="ghost" onClick={() => handleSort(col.key)}>
                                {col.label}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                    ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.length > 0 ? (
                    paginatedData.map((event, index) => <DataTableRow key={index} event={event} />)
                    ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                        No results found.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </ScrollArea>
        </div>
        {totalPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-between p-2 border-t">
                <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                    <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
}
