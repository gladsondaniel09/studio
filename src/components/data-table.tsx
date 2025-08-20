
'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ProcessedAuditEvent, renderDetails } from './audit-timeline';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DataTableProps {
  data: ProcessedAuditEvent[];
}

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
  return (
    <div className="w-full h-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Entity Name</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Difference List</TableHead>
              <TableHead>Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((event, index) => <DataTableRow key={index} event={event} />)
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  );
}
