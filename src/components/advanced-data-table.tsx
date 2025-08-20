
'use client';

import React, { useState, useMemo } from 'react';
import DataGrid from 'react-data-grid';
import type { Column, SortColumn } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { ProcessedAuditEvent, renderDetails } from './audit-timeline';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface AdvancedDataTableProps {
  data: ProcessedAuditEvent[];
}

type Comparator = (a: ProcessedAuditEvent, b: ProcessedAuditEvent) => number;

function getComparator(sortColumn: string): Comparator {
    switch (sortColumn) {
        case 'created_timestamp':
            return (a, b) => new Date(a.created_timestamp).getTime() - new Date(b.created_timestamp).getTime();
        case 'entity_name':
        case 'action':
            return (a, b) => {
                const valA = a[sortColumn as keyof ProcessedAuditEvent] || '';
                const valB = b[sortColumn as keyof ProcessedAuditEvent] || '';
                return String(valA).localeCompare(String(valB));
            };
        case 'user':
             return (a, b) => {
                const valA = a.user?.name || '';
                const valB = b.user?.name || '';
                return String(valA).localeCompare(String(valB));
            };
        default:
             return (a, b) => {
                const valA = a[sortColumn as keyof ProcessedAuditEvent] ?? '';
                const valB = b[sortColumn as keyof ProcessedAuditEvent] ?? '';
                return String(valA).localeCompare(String(valB));
            };
    }
}

const columns: readonly Column<ProcessedAuditEvent>[] = [
    { key: 'created_timestamp', name: 'Timestamp', resizable: true, sortable: true, width: 200, formatter: ({row}) => new Date(row.created_timestamp).toLocaleString() },
    { key: 'entity_name', name: 'Entity Name', resizable: true, sortable: true, width: 150 },
    { key: 'action', name: 'Action', resizable: true, sortable: true, width: 120 },
    { key: 'user', name: 'User', resizable: true, sortable: true, width: 200, formatter: ({row}) => row.user?.name || 'N/A' },
    { key: 'difference_list', name: 'Difference List', resizable: true, sortable: false, width: 300, cellClass: 'whitespace-pre-wrap break-words', formatter: ({row}) => <div className="line-clamp-2">{row.difference_list}</div> },
    { key: 'payload', name: 'Payload', resizable: true, sortable: false, width: 300, cellClass: 'whitespace-pre-wrap break-words', formatter: ({row}) => <div className="line-clamp-2">{row.payload}</div> },
    { key: 'details', name: 'Details', width: 80, resizable: false, formatter: ({row}) => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">View</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-full h-auto max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{row.action} on {row.entity_name}</DialogTitle>
                </DialogHeader>
                {renderDetails(row)}
            </DialogContent>
        </Dialog>
    )}
];

export default function AdvancedDataTable({ data }: AdvancedDataTableProps) {
    const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

    const sortedData = useMemo((): readonly ProcessedAuditEvent[] => {
        if (sortColumns.length === 0) return data;
        const { columnKey, direction } = sortColumns[0];
        const comparator = getComparator(columnKey);
        const sorted = [...data].sort(comparator);
        return direction === 'ASC' ? sorted : sorted.reverse();
    }, [data, sortColumns]);

    return (
        <div className="flex-grow min-h-0 border rounded-md overflow-hidden">
            <DataGrid
                className="rdg-light h-full w-full"
                columns={columns}
                rows={sortedData}
                sortColumns={sortColumns}
                onSortColumnsChange={setSortColumns}
                headerRowHeight={45}
                rowHeight={55}
            />
        </div>
    );
}
