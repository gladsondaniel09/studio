
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import DataGrid, { textEditor, SelectCellFormatter } from 'react-data-grid';
import type { Column, SortColumn } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { ProcessedAuditEvent, renderDetails } from './audit-timeline';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Trash2, Plus, Wand2, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

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
        case 'difference_list':
        case 'payload':
            return (a, b) => {
                const valA = a[sortColumn as keyof ProcessedAuditEvent] || '';
                const valB = b[sortColumn as keyof ProcessedAuditEvent] || '';
                return String(valA).localeCompare(String(valB));
            };
        default:
            return (a, b) => 0;
    }
}

type Condition = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with';

interface ConditionalFormatRule {
    id: string;
    column: string;
    condition: Condition;
    value: string;
    color: string;
    enabled: boolean;
}

const defaultColumns: readonly Column<ProcessedAuditEvent>[] = [
    { key: 'created_timestamp', name: 'Timestamp', resizable: true, sortable: true, width: 200, formatter: ({row}) => new Date(row.created_timestamp).toLocaleString() },
    { key: 'entity_name', name: 'Entity Name', resizable: true, sortable: true },
    { key: 'action', name: 'Action', resizable: true, sortable: true, width: 120 },
    { key: 'difference_list', name: 'Difference List', resizable: true, sortable: true },
    { key: 'payload', name: 'Payload', resizable: true, sortable: true },
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

const ConditionalFormattingManager: React.FC<{
    rules: ConditionalFormatRule[],
    setRules: React.Dispatch<React.SetStateAction<ConditionalFormatRule[]>>,
    columns: readonly Column<ProcessedAuditEvent>[]
}> = ({ rules, setRules, columns }) => {
    
    const addRule = () => {
        setRules(prev => [...prev, { id: crypto.randomUUID(), column: 'action', condition: 'equals', value: '', color: '#ffffff', enabled: true }]);
    };

    const removeRule = (id: string) => {
        setRules(prev => prev.filter(rule => rule.id !== id));
    };

    const updateRule = (id: string, field: keyof ConditionalFormatRule, value: any) => {
        setRules(prev => prev.map(rule => rule.id === id ? { ...rule, [field]: value } : rule));
    };
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline"><Wand2 className="mr-2 h-4 w-4" />Conditional Formatting</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Conditional Formatting Rules</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-96 pr-6">
                    <div className="space-y-4">
                        {rules.map(rule => (
                            <div key={rule.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                                <div className="col-span-3">
                                    <Select value={rule.column} onValueChange={(val) => updateRule(rule.id, 'column', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {columns.filter(c => c.key !== 'details').map(col => (
                                                <SelectItem key={col.key} value={col.key}>{col.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Select value={rule.condition} onValueChange={(val) => updateRule(rule.id, 'condition', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals">Equals</SelectItem>
                                            <SelectItem value="not_equals">Not Equals</SelectItem>
                                            <SelectItem value="contains">Contains</SelectItem>
                                            <SelectItem value="not_contains">Not Contains</SelectItem>
                                            <SelectItem value="starts_with">Starts With</SelectItem>
                                            <SelectItem value="ends_with">Ends With</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Input value={rule.value} onChange={(e) => updateRule(rule.id, 'value', e.target.value)} placeholder="Value..."/>
                                </div>
                                <div className="col-span-1">
                                    <Input type="color" value={rule.color} onChange={(e) => updateRule(rule.id, 'color', e.target.value)} className="p-1 h-10"/>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Button onClick={addRule}><Plus className="mr-2 h-4 w-4" />Add Rule</Button>
            </DialogContent>
        </Dialog>
    )
}

export default function AdvancedDataTable({ data }: AdvancedDataTableProps) {
    const [columns, setColumns] = useState(defaultColumns);
    const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [conditionalFormatRules, setConditionalFormatRules] = useState<ConditionalFormatRule[]>([]);

    const filteredData = useMemo(() => {
        return data.filter(row => {
            return Object.entries(filters).every(([columnKey, filterValue]) => {
                if (!filterValue) return true;
                const rowValue = row[columnKey as keyof ProcessedAuditEvent];
                return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
            });
        });
    }, [data, filters]);

    const sortedData = useMemo((): readonly ProcessedAuditEvent[] => {
        if (sortColumns.length === 0) return filteredData;
        const { columnKey, direction } = sortColumns[0];
        const comparator = getComparator(columnKey);
        const sorted = [...filteredData].sort(comparator);
        return direction === 'ASC' ? sorted : sorted.reverse();
    }, [filteredData, sortColumns]);
    
    const HeaderRenderer = (props: any) => {
        const columnKey = props.column.key;
        return (
            <div className="flex flex-col h-full">
                <div className="font-bold">{props.column.name}</div>
                <Input
                    className="h-8 mt-1"
                    placeholder="Filter..."
                    value={filters[columnKey] || ''}
                    onChange={e => setFilters(prev => ({...prev, [columnKey]: e.target.value}))}
                    onClick={e => e.stopPropagation()} // Prevent sorting when clicking filter
                />
            </div>
        )
    }

    const gridColumns = useMemo((): readonly Column<ProcessedAuditEvent>[] => {
        return columns.map(col => ({
            ...col,
            headerCellClass: 'h-auto',
            renderHeaderCell: col.key === 'details' ? undefined : (p) => <HeaderRenderer {...p} />,
            cellClass: (row) => {
                for (const rule of conditionalFormatRules) {
                    if (!rule.enabled || rule.column !== col.key) continue;
                    
                    const cellValue = String(row[rule.column as keyof ProcessedAuditEvent] ?? '').toLowerCase();
                    const ruleValue = rule.value.toLowerCase();

                    let match = false;
                    switch(rule.condition) {
                        case 'equals': if(cellValue === ruleValue) match = true; break;
                        case 'not_equals': if(cellValue !== ruleValue) match = true; break;
                        case 'contains': if(cellValue.includes(ruleValue)) match = true; break;
                        case 'not_contains': if(!cellValue.includes(ruleValue)) match = true; break;
                        case 'starts_with': if(cellValue.startsWith(ruleValue)) match = true; break;
                        case 'ends_with': if(cellValue.endsWith(ruleValue)) match = true; break;
                    }
                    if(match) return `bg-[${rule.color}]`;
                }
                return '';
            }
        }));
    }, [columns, filters, conditionalFormatRules]);


    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex-none">
                <ConditionalFormattingManager rules={conditionalFormatRules} setRules={setConditionalFormatRules} columns={columns} />
            </div>
            <div className="flex-grow min-h-0">
                <DataGrid
                    className="rdg-light h-full w-full"
                    columns={gridColumns}
                    rows={sortedData}
                    sortColumns={sortColumns}
                    onSortColumnsChange={setSortColumns}
                    onColumnsChange={setColumns}
                    headerRowHeight={65}
                />
            </div>
        </div>
    );
}
