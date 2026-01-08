'use client';

import React, { useState, useMemo, Key } from 'react';
import DataGrid, { textEditor, Row, Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { ProcessedAuditEvent } from './audit-timeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Maximize, Minus, Plus } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { renderDetails } from './audit-timeline';

type GenericRow = { [key: string]: any };

interface DataGridProps {
  data: (ProcessedAuditEvent | GenericRow)[];
  columns: { key: string; name: string }[];
  dataType: 'audit' | 'generic';
}

function rowKeyGetter(row: ProcessedAuditEvent | GenericRow) {
  // Use a unique identifier if available, otherwise use index.
  return row.id || Math.random();
}

const ExpandedRow = ({ row }: { row: ProcessedAuditEvent | GenericRow }) => {
  const isAuditEvent = 'created_timestamp' in row;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Maximize className="h-4 w-4" />
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
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<Key>>(new Set());

  const gridColumns: readonly Column<any>[] = useMemo(() => {
    const baseColumns: Column<any>[] = [
      {
        key: 'expand',
        name: '',
        minWidth: 40,
        width: 40,
        resizable: false,
        renderCell: ({ row }) => {
          const isExpanded = expandedRows.has(row.id);
          return (
            <div className="flex items-center justify-center">
               <ExpandedRow row={row} />
            </div>
          );
        },
      },
      ...propColumns.map(col => ({
        ...col,
        resizable: true,
        renderCell: ({ row }: { row: any }) => (
            <div className="truncate whitespace-nowrap">
                {row[col.key]}
            </div>
        )
      }))
    ];
    return baseColumns;
  }, [propColumns, expandedRows]);


  return (
      <DataGrid
        rowKeyGetter={rowKeyGetter}
        columns={gridColumns}
        rows={data}
        className="rdg-light"
        style={{ height: '100%' }}
      />
  );
}