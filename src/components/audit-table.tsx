
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProcessedAuditEvent, renderDetails } from './audit-timeline';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Maximize } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface AuditTableProps {
  data: ProcessedAuditEvent[];
}

const getRowColorClass = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('create')) return 'bg-green-100/60 dark:bg-green-900/40 hover:bg-green-100/80 dark:hover:bg-green-900/60';
  if (lowerAction.includes('update')) return 'bg-yellow-100/60 dark:bg-yellow-900/40 hover:bg-yellow-100/80 dark:hover:bg-yellow-900/60';
  if (lowerAction.includes('delete')) return 'bg-red-100/60 dark:bg-red-900/40 hover:bg-red-100/80 dark:hover:bg-red-900/60';
  return 'bg-card';
};

const TruncatedCell = ({ text }: { text: string | undefined }) => {
    const displayText = text || 'NULL';
    return (
        <div className="max-w-[250px] truncate" title={displayText}>
            {displayText}
        </div>
    )
}

export default function AuditTable({ data }: AuditTableProps) {
  return (
    <ScrollArea className="h-full w-full rounded-md border">
        <Table>
        <TableHeader className='sticky top-0 bg-background z-10'>
            <TableRow>
            <TableHead className='w-[150px]'>Timestamp</TableHead>
            <TableHead>Entity Name</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Difference List</TableHead>
            <TableHead>Payload</TableHead>
            <TableHead className="text-right w-[50px]"></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.map((event, index) => (
            <TableRow key={index} className={cn(getRowColorClass(event.action))}>
                <TableCell className="font-medium">
                    {new Date(event.created_timestamp).toLocaleString()}
                </TableCell>
                <TableCell>{event.entity_name}</TableCell>
                <TableCell>{event.action}</TableCell>
                <TableCell>
                    <TruncatedCell text={event.difference_list} />
                </TableCell>
                <TableCell>
                     <TruncatedCell text={event.payload} />
                </TableCell>
                 <TableCell className="text-right">
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Maximize className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl w-full h-auto max-h-[80vh]">
                            <DialogHeader>
                                <DialogTitle>{event.action} on {event.entity_name}</DialogTitle>
                            </DialogHeader>
                            {renderDetails(event)}
                        </DialogContent>
                    </Dialog>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </ScrollArea>
  );
}
