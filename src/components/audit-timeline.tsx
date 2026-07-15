'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { AlertTriangle, File, Lock, User, UserPlus, UploadCloud, Eye, ArrowRight, Search, Maximize, Code, Sparkles, Loader, ArrowUp, ArrowDown, Copy, HelpCircle, Wand2, ChevronDown, List, TableIcon, Info, ListOrdered, AlertCircle, TestTube2, ChevronRight as ChevronRightIcon, Minus, Plus, Download, ClipboardList, Clock, Layers, ShieldCheck, CheckCircle2, XCircle, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import FlowChart from './flow-chart';
import { ThemeToggle } from './theme-toggle';
import { Walkthrough, type Step } from './walkthrough';
import { AuditEvent, SampleEventSchema, type IncidentAnalysisOutput, type ReplicationOutput, type InvestigationContext } from '@/lib/types';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { format } from 'date-fns';
import { analyzeLogIncident } from '@/ai/flows/analyze-log-incident-flow';
import { replicateIncident } from '@/ai/flows/replicate-incident-flow';
import { cn } from '@/lib/utils';
import DataGrid from './data-grid';
import { RawJsonViewer } from './raw-json-viewer';
import { useFirestore } from '@/firebase';
import { createSessionRef, saveAnalysis as saveAnalysisToDb } from '@/firebase/sessions';
import SessionsSidebar, { type RestoreParams } from '@/components/sessions-sidebar';

// Standardize timestamps exactly as received using Regex to avoid JS Date timezone shifts
const formatTimestamp = (ts: string | undefined): string => {
  if (!ts || ts === 'NULL') return '';

  // 1. Try ISO Style: 2026-04-07T02:29:00.584675Z or 2026-04-07 02:29:00
  const isoMatch = ts.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3,}))?/);
  if (isoMatch) {
    const [_, y, m, d, hh, mm, ss = "00", ms = "000"] = isoMatch;
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}.${ms.substring(0, 3)}`;
  }

  // 2. Try DD-MM-YYYY Style: 07-04-2026 02:29:00
  const ddmmyyyyMatch = ts.match(/^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3,}))?/);
  if (ddmmyyyyMatch) {
    const [_, d, m, y, hh, mm, ss = "00", ms = "000"] = ddmmyyyyMatch;
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}.${ms.substring(0, 3)}`;
  }

  return ts; // Fallback to raw string if no regex match
};

// Sortable numeric extraction (YYYYMMDDHHmmssSSS) to maintain chronological order without Date parsing
const getRawTime = (ts: string | undefined): number => {
  if (!ts || ts === 'NULL') return 0;
  const formatted = formatTimestamp(ts);
  // Match our standardized format: YYYY-MM-DD HH:mm:ss.SSS
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (match) {
    const [_, y, m, d, hh, mm, ss, ms] = match;
    return Number(`${y}${m}${d}${hh}${mm}${ss}${ms}`);
  }
  // Generic numeric fallback for unknown formats
  const digits = ts.replace(/\D/g, '');
  return digits ? Number(digits.substring(0, 15)) : 0;
};

// Extend the AuditEvent type to include our pre-processed fields
export type ProcessedAuditEvent = AuditEvent & {
    parsed_payload: any;
    parsed_difference_list: any;
    _searchable_text: string | null; // Lazily computed on first search
    business_timestamp: string;
    raw_business_time: number;
    display_user: string | null;
};

const getIconForEvent = (eventType: string) => {
  if (typeof eventType !== 'string') {
    return <File />;
  }
  const lowerCaseEvent = eventType.toLowerCase();
  if (lowerCaseEvent.includes('login')) {
    return <Lock />;
  }
  if (lowerCaseEvent.includes('upload') || lowerCaseEvent.includes('download')) {
    return <File />;
  }
  if (lowerCaseEvent.includes('deactivated')) {
    return <AlertTriangle />;
  }
  if (lowerCaseEvent.includes('settings change')) {
    return <UserPlus />;
  }
  if (lowerCaseEvent.includes('user')) {
    return <User />;
  }
   if (lowerCaseEvent.includes('update') || lowerCaseEvent.includes('create') || lowerCaseEvent.includes('delete')) {
    return <File />;
  }
  return <File />;
};

const TruncatedValue = ({ value }: { value: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const text = String(value ?? 'none');
    const TRUNCATE_LENGTH = 100;

    if (text.length <= TRUNCATE_LENGTH) {
        return <p className="text-sm break-words">{text}</p>;
    }

    return (
        <div>
            <p className="text-sm break-words">
                {isExpanded ? text : `${text.substring(0, TRUNCATE_LENGTH)}...`}
            </p>
            <Button variant="link" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto text-xs">
                {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
        </div>
    );
};

const DetailView = ({items, type}: {items: any, type: 'key-value' | 'diff'}) => {
    const [showAll, setShowAll] = useState(false);
    const limit = 4;
    
    const visibleItems = showAll ? items : items.slice(0, limit);

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 text-left">
                {visibleItems.map((item: any, index: number) => {
                    if(type === 'diff') {
                        const isTime = item.field?.toLowerCase().includes('timestamp');
                        return (
                             <div key={index} className="min-w-0">
                                <p className="font-bold text-sm capitalize">{(item.label || item.field).replace(/_/g, ' ')}</p>
                                <div className="flex flex-col text-sm">
                                    <div className="text-muted-foreground line-through"><TruncatedValue value={isTime ? formatTimestamp(item.oldValue) : item.oldValue} /></div>
                                    <div className="flex items-start gap-2">
                                        <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-1" />
                                        <div className='flex-1 min-w-0'><TruncatedValue value={isTime ? formatTimestamp(item.newValue) : item.newValue} /></div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    const [key, value] = item;
                    const isTime = key.toLowerCase().includes('timestamp');
                     return (
                        <div key={key} className="min-w-0">
                            <p className="font-bold text-sm capitalize">{key.replace(/_/g, ' ')}</p>
                            <div className="min-w-0"><TruncatedValue value={isTime ? formatTimestamp(value) : value} /></div>
                        </div>
                    )
                })}
            </div>
            {items.length > limit && (
                 <div className="text-right mt-4">
                    <Button variant="link" onClick={() => setShowAll(!showAll)}>
                        {showAll ? 'Show Less' : `Show ${items.length - limit} More`}
                    </Button>
                </div>
            )}
        </div>
    )
}

export const renderDetails = (event: ProcessedAuditEvent) => {
    const { action, payload, difference_list, parsed_payload, parsed_difference_list } = event;

    // Handle generic data
    if (!action) {
        return (
             <div className="p-4">
                <RawJsonViewer jsonString={JSON.stringify(event, null, 2)} title="Row Details" />
             </div>
        )
    }

    const lowerCaseAction = action.toLowerCase();
    
    let formattedView = null;
    
    if ((lowerCaseAction.includes('create') || lowerCaseAction.includes('insert')) && parsed_payload) {
        const entries = Object.entries(parsed_payload);
        if (entries.length > 0) {
            formattedView = <DetailView items={entries} type="key-value" />;
        } else {
             formattedView = <p className="text-sm">{payload}</p>;
        }
    }

    else if ((lowerCaseAction.includes('update')) && parsed_difference_list) {
        if (Array.isArray(parsed_difference_list) && parsed_difference_list.length > 0) {
            formattedView = <DetailView items={parsed_difference_list} type="diff" />;
        } else {
             formattedView = <p className="text-sm mt-4">{difference_list}</p>;
        }
    }

    else if (lowerCaseAction.includes('delete') && parsed_payload) {
         const entries = Object.entries(parsed_payload);
        if (entries.length > 0) {
            formattedView = <DetailView items={entries} type="key-value" />;
        } else {
            formattedView = <p className="text-sm mt-4">{payload}</p>;
        }
    } else {
        const { created_timestamp, entity_name, action: evtAction, user, _searchable_text, parsed_payload, parsed_difference_list, business_timestamp, raw_business_time, display_user, ...otherDetails } = event;
        const detailsToShow = Object.entries(otherDetails).filter(([key, value]) => value && value !== 'NULL');

        if (detailsToShow.length > 0) {
            formattedView = <DetailView items={detailsToShow} type="key-value" />;
        }
    }

    const hasRawDetails = (payload && payload !== "NULL") || (difference_list && difference_list !== "NULL");

    return (
        <div className="p-4 space-y-6">
            {formattedView || <p className="text-sm text-muted-foreground">No details to display.</p>}
            
            {hasRawDetails && (
                <Accordion type="single" collapsible className="w-full pt-4">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" /> Raw Details
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
                                <RawJsonViewer jsonString={payload ?? undefined} title="payload (JSON)" />
                                <RawJsonViewer jsonString={difference_list ?? undefined} title="difference_list (JSON)" />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </div>
    );
}

const renderPreview = (event: ProcessedAuditEvent) => {
    const { action, parsed_payload, parsed_difference_list } = event;
    const lowerCaseAction = action.toLowerCase();
    const PREVIEW_LIMIT = 2;

    try {
        if ((lowerCaseAction.includes('create') || lowerCaseAction.includes('insert') || lowerCaseAction.includes('delete')) && parsed_payload) {
            const entries = Object.entries(parsed_payload);
            if (entries.length > 0) {
                return (
                    <div className="text-xs mt-2 space-y-1 text-left">
                        {entries.slice(0, PREVIEW_LIMIT).map(([key, value]) => (
                             <p key={key} className="truncate">
                                <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}: </span>
                                <span className="text-muted-foreground">
                                    {key.toLowerCase().includes('timestamp') ? formatTimestamp(String(value)) : String(value)}
                                </span>
                            </p>
                        ))}
                        {entries.length > PREVIEW_LIMIT && (
                            <p className="text-muted-foreground">...and {entries.length - PREVIEW_LIMIT} more fields.</p>
                        )}
                    </div>
                );
            }
        }

        if (lowerCaseAction.includes('update') && parsed_difference_list) {
            if (Array.isArray(parsed_difference_list) && parsed_difference_list.length > 0) {
                 return (
                    <div className="text-xs mt-2 space-y-1 text-left">
                        {parsed_difference_list.slice(0, PREVIEW_LIMIT).map((diff: any, index: number) => {
                             const isTime = diff.field?.toLowerCase().includes('timestamp');
                             return (
                                <p key={index} className="truncate min-w-0">
                                    <span className="font-semibold capitalize">{(diff.label || diff.field).replace(/_/g, ' ')}: </span>
                                    <span className="text-muted-foreground line-through">{isTime ? formatTimestamp(String(diff.oldValue ?? 'none')) : String(diff.oldValue ?? 'none')}</span>
                                    <ArrowRight className="w-3 h-3 text-primary inline mx-1" />
                                    <span className='text-foreground'>{isTime ? formatTimestamp(String(diff.newValue ?? 'none')) : String(diff.newValue ?? 'none')}</span>
                                </p>
                             );
                        })}
                        {parsed_difference_list.length > PREVIEW_LIMIT && (
                            <p className="text-muted-foreground">...and {parsed_difference_list.length - PREVIEW_LIMIT} more changes.</p>
                        )}
                    </div>
                );
            }
        }
        
    } catch(e) {
        // Fallback for parsing errors
        return <p className="text-sm mt-2 text-muted-foreground">Click the expand icon for full details.</p>;
    }


    return <p className="text-sm mt-2 text-muted-foreground">Click the expand icon for full details.</p>;
}

const MultiSelectFilter = ({
  options,
  selectedValues,
  onSelectionChange,
  title,
  pluralTitle,
  className,
}: {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (newSelection: string[]) => void;
  title: string;
  pluralTitle: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedValues, setTempSelectedValues] = useState(selectedValues);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTempSelectedValues(selectedValues);
  }, [selectedValues]);
  
  useEffect(() => {
    if(!isOpen) {
        setSearchTerm('');
    }
  }, [isOpen])

  const filteredOptions = useMemo(() => 
    options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    ), [options, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    setTempSelectedValues(checked ? options : []);
  };

  const handleSelect = (value: string, checked: boolean) => {
    if (checked) {
        setTempSelectedValues(prev => [...prev, value]);
    } else {
        setTempSelectedValues(prev => prev.filter((v) => v !== value));
    }
  };

  const handleApply = () => {
    onSelectionChange(tempSelectedValues);
    setIsOpen(false);
  }

  const handleCancel = () => {
    setTempSelectedValues(selectedValues);
    setIsOpen(false);
  }

  const getButtonText = () => {
    if (selectedValues.length === 0 || selectedValues.length === options.length) {
        return `All ${pluralTitle}`;
    }
    if (selectedValues.length === 1) {
        return selectedValues[0];
    }
    return `${selectedValues.length} ${pluralTitle} Selected`;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          {getButtonText()}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="p-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={tempSelectedValues.length === options.length}
          onCheckedChange={(checked) => handleSelectAll(!!checked)}
          onSelect={(e) => e.preventDefault()}
        >
          Select All
        </DropdownMenuCheckboxItem>
         <ScrollArea className="h-48">
            {filteredOptions.map((option) => (
            <DropdownMenuCheckboxItem
                key={option}
                checked={tempSelectedValues.includes(option)}
                onCheckedChange={(checked) => handleSelect(option, !!checked)}
                onSelect={(e) => e.preventDefault()}
            >
                {option}
            </DropdownMenuCheckboxItem>
            ))}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="flex justify-end gap-2 p-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleApply}>Apply</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


// Helper to recursively get all string values from an object
const getObjectValues = (obj: any): string => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj + ' ';

  let values = '';
  if (Array.isArray(obj)) {
    for (const item of obj) {
      values += getObjectValues(item);
    }
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      values += getObjectValues(obj[key]);
    }
  } else {
    values = String(obj) + ' ';
  }
  return values;
};


// NOTE: row pre-processing (JSON parsing, timestamp normalization, blank-row filtering)
// now happens entirely inside src/workers/audit-processor.worker.ts so the main thread
// is never blocked on large files. getObjectValues (above) is still used for lazy search.

const confidenceBadge = (level: string | undefined) => {
    if (!level) return null;
    return (
        <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide",
            level === 'High' ? "bg-green-50 text-green-700 border-green-200" :
            level === 'Medium' ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-red-50 text-red-700 border-red-200"
        )}>{level} confidence</span>
    );
};

const evidenceTypeBadge = (type: string | undefined) => {
    if (!type) return null;
    return (
        <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide",
            type === 'FACT' ? "bg-green-50 text-green-700 border-green-200" :
            type === 'INFERRED' ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-red-50 text-red-700 border-red-200"
        )}>{type}</span>
    );
};

const AnalysisResultDisplay = ({ result }: { result: IncidentAnalysisOutput }) => {
    return (
        <Card className="mt-4 border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 rounded-t-lg border-b">
                <CardTitle className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </span>
                    <div className="space-y-1 flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl font-headline">{result.title}</span>
                            {result.root_cause_confidence && confidenceBadge(result.root_cause_confidence)}
                        </div>
                        <CardDescription className="text-sm font-medium text-foreground/70">
                            {result.summary}
                        </CardDescription>
                        {result.root_cause_evidence && (
                            <p className="text-xs text-muted-foreground bg-background/60 border rounded px-2 py-1 mt-1 font-mono">
                                <span className="font-bold text-foreground">Evidence: </span>{result.root_cause_evidence}
                            </p>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
                {/* Lifecycle Breakdown Section */}
                {result.lifecycle_breakdown && (
                  <div>
                    <h4 className="font-bold text-lg flex items-center gap-2 mb-6">
                        <Layers className="w-5 h-5 text-primary" />
                        Forensic Lifecycle Reconstruction
                    </h4>
                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                        {result.lifecycle_breakdown.map((step, i) => (
                            <div key={i} className="relative pl-8">
                                <div className={cn(
                                    "absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10",
                                    step.evidence_type === 'MISSING' ? "bg-red-50 border-red-400" :
                                    step.evidence_type === 'INFERRED' ? "bg-amber-50 border-amber-400" :
                                    "bg-background border-primary"
                                )}>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        step.evidence_type === 'MISSING' ? "bg-red-400" :
                                        step.evidence_type === 'INFERRED' ? "bg-amber-400" :
                                        "bg-primary"
                                    )} />
                                </div>
                                <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-[10px] bg-background border px-2 py-0.5 rounded shadow-sm text-muted-foreground">{formatTimestamp(step.timestamp)}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-primary font-black bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">{step.lifecycle_phase}</span>
                                        <span className="font-bold text-foreground text-sm">{step.entity_name}</span>
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                            step.action.toLowerCase().includes('create') ? "bg-green-50 text-green-700 border-green-200" :
                                            step.action.toLowerCase().includes('update') ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            "bg-red-50 text-red-700 border-red-200"
                                        )}>
                                            {step.action}
                                        </span>
                                        {evidenceTypeBadge(step.evidence_type)}
                                        {confidenceBadge(step.confidence)}
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">{step.description}</p>
                                    <div className="flex flex-col gap-1">
                                        {step.changed_fields && (
                                            <div className="text-[11px] text-muted-foreground bg-background/50 p-1.5 rounded border border-dashed">
                                                <span className="font-bold">Technical Deltas:</span> {typeof step.changed_fields === 'string' ? step.changed_fields : JSON.stringify(step.changed_fields)}
                                            </div>
                                        )}
                                        <div className="text-[11px] flex items-start gap-1 text-primary">
                                            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            <span className="font-bold uppercase tracking-tight">Business Impact:</span>
                                            <span className="font-medium italic">{step.business_impact}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="bg-card p-4 rounded-lg border shadow-sm h-full">
                            <h4 className="font-bold flex items-center gap-2 mb-3 text-primary uppercase text-xs tracking-widest">
                                <ListOrdered className="w-4 h-4" />
                                Replication Protocol
                            </h4>
                            <ol className="list-decimal list-outside pl-5 space-y-2 marker:text-primary marker:font-bold text-sm">
                                {result.steps_to_replicate.map((step, i) => <li key={i} className="pl-1">{step}</li>)}
                            </ol>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg h-full">
                            <h4 className="font-bold flex items-center gap-2 mb-2 text-destructive uppercase text-xs tracking-widest">
                                <AlertCircle className="w-4 h-4" />
                                Observed Anomaly
                            </h4>
                            <p className="text-sm leading-relaxed">{result.observed_behavior}</p>
                            
                            <h4 className="font-bold flex items-center gap-2 mt-4 mb-2 text-green-600 uppercase text-xs tracking-widest">
                                <CheckCircle2 className="w-4 h-4" />
                                Expected Behavior
                            </h4>
                            <p className="text-sm leading-relaxed">{result.expected_behavior}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/50 p-4 rounded-lg border">
                         <h4 className="font-bold flex items-center gap-2 mb-2 text-foreground uppercase text-xs tracking-widest">
                            <TestTube2 className="w-4 h-4" />
                            Root Cause Hypothesis
                        </h4>
                        <p className="text-sm font-mono bg-background p-3 rounded border shadow-inner leading-relaxed whitespace-pre-wrap">{result.potential_cause}</p>
                    </div>
                    
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                         <h4 className="font-bold flex items-center gap-2 mb-2 text-primary uppercase text-xs tracking-widest">
                            <Sparkles className="w-4 h-4" />
                            Recommended Remediation
                        </h4>
                        <p className="text-sm leading-relaxed">{result.recommended_fix}</p>
                        
                        <div className="mt-4 pt-4 border-t border-primary/20">
                            <h4 className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest mb-1">Final Trade State</h4>
                            <span className="text-xs font-mono font-bold bg-primary/10 px-2 py-1 rounded text-primary border border-primary/20">{result.final_trade_state}</span>
                        </div>
                    </div>
                </div>

                {/* Evidence Gaps Section */}
                {result.evidence_gaps && result.evidence_gaps.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                        <h4 className="font-bold flex items-center gap-2 text-amber-700 uppercase text-xs tracking-widest">
                            <HelpCircle className="w-4 h-4" />
                            Evidence Gaps — Additional Collection Required
                        </h4>
                        <div className="space-y-3">
                            {result.evidence_gaps.map((gap, i) => (
                                <div key={i} className="bg-white border border-amber-100 rounded-md p-3 space-y-1">
                                    <p className="text-sm font-bold text-amber-800">{gap.missing_evidence}</p>
                                    <p className="text-xs text-muted-foreground"><span className="font-semibold">Why needed:</span> {gap.why_needed}</p>
                                    <p className="text-xs text-muted-foreground"><span className="font-semibold">How to collect:</span> {gap.how_to_collect}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Accordion type="single" collapsible className="w-full pt-4">
                    <AccordionItem value="raw-json" className="border-none">
                        <AccordionTrigger className="hover:no-underline bg-muted/30 px-4 py-2 rounded-t-lg">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-bold">
                                <Code className="h-3.5 w-3.5" /> Full AI Metadata Trace
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-muted/30 px-4 pb-4 rounded-b-lg h-[500px]">
                           <RawJsonViewer jsonString={JSON.stringify(result, null, 2)} title="AI Reconstruction Data" />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
};

const ReplicationResultDisplay = ({ result }: { result: ReplicationOutput }) => {
    return (
        <Card className="mt-4 border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-primary" />
                    </span>
                    <span className="flex-grow">Business Process Replication Script</span>
                </CardTitle>
                <CardDescription className="pl-11 font-medium text-foreground/80">
                    {result.context_summary}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm pl-11">
                <div className="bg-card p-4 rounded-lg border shadow-sm">
                    <h4 className="font-bold flex items-center gap-2 mb-4 text-primary">
                        <ListOrdered className="w-5 h-5" />
                        Execution Steps
                    </h4>
                    <ol className="list-decimal list-outside pl-5 space-y-3 marker:text-primary marker:font-bold">
                        {result.replication_script.map((step, i) => (
                            <li key={i} className="pl-2 text-base leading-relaxed">{step}</li>
                        ))}
                    </ol>
                </div>
                
                {result.expected_vs_actual && (
                    <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg">
                        <h4 className="font-semibold flex items-center gap-2 mb-2 text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            Observation Summary
                        </h4>
                        <p className="font-medium">{result.expected_vs_actual}</p>
                    </div>
                )}

                <Accordion type="single" collapsible className="w-full pt-2">
                    <AccordionItem value="raw-json" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                                <Code className="h-3 w-3" /> Technical Trace
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='h-[400px]'>
                           <RawJsonViewer jsonString={JSON.stringify(result, null, 2)} title="AI Replicate Data" />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
};

const AUDIT_LOG_COLUMNS = [
    { key: 'business_timestamp', name: 'TIMESTAMP' },
    { key: 'entity_name', name: 'ENTITY' },
    { key: 'entity_id', name: 'ENTITY ID' },
    { key: 'action', name: 'ACTION' },
    { key: 'display_user', name: 'USER' },
    { key: 'payload', name: 'PAYLOAD' },
];

export default function AuditTimeline() {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<{key: string, name: string}[]>(AUDIT_LOG_COLUMNS);
  const [dataType, setDataType] = useState<'audit' | 'generic' | null>(null);
  
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'timeline'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFlowEntities, setSelectedFlowEntities] = useState<string[] | null>(null);
  const { toast } = useToast();
  const [showUploadWalkthrough, setShowUploadWalkthrough] = useState(false);
  const [showTimelineWalkthrough, setShowTimelineWalkthrough] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [activeView, setActiveView] = useState<'timeline' | 'table'>('timeline');

  // Timeline view renders incrementally to avoid freezing on large datasets
  const TIMELINE_PAGE_SIZE = 50;
  const [timelineLimit, setTimelineLimit] = useState(TIMELINE_PAGE_SIZE);

  // Show a centered loader while switching views (heavy DataGrid/timeline mount)
  const [isSwitchingView, setIsSwitchingView] = useState(false);
  const switchView = (view: 'timeline' | 'table') => {
    if (view === activeView) return;
    setIsSwitchingView(true);
    // Let the spinner paint one frame before the heavy synchronous render
    requestAnimationFrame(() => {
      setActiveView(view);
      requestAnimationFrame(() => setIsSwitchingView(false));
    });
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<IncidentAnalysisOutput | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  const [isReplicating, setIsReplicating] = useState(false);
  const [replicationResult, setReplicationResult] = useState<ReplicationOutput | null>(null);
  const [showReplicateDialog, setShowReplicateDialog] = useState(false);

  // Investigation context form
  const [showContextForm, setShowContextForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'analyse' | 'replicate' | null>(null);
  const [kbSelection, setKbSelection] = useState<'none' | 'pil' | 'apical'>('none');
  const [investigationContext, setInvestigationContext] = useState<InvestigationContext>({
    customer: '', symptom: '', affectedEntityIds: '', dateRange: '',
  });

  // Session persistence
  const firestore = useFirestore();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // For controlled event expansion with navigation
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

  useEffect(() => {
    const hasSeenUpload = localStorage.getItem('hasSeenUploadWalkthrough');
    if (!hasSeenUpload) {
        setShowUploadWalkthrough(true);
        localStorage.setItem('hasSeenUploadWalkthrough', 'true');
    }
  }, []);

  useEffect(() => {
    if (view === 'timeline') {
      const hasSeenTimeline = localStorage.getItem('hasSeenTimelineWalkthrough');
      if (!hasSeenTimeline && dataType === 'audit') {
        setShowTimelineWalkthrough(true);
        localStorage.setItem('hasSeenTimelineWalkthrough', 'true');
      }
    }
  }, [view, dataType]);

  const uploadWalkthroughSteps: Step[] = [
    { element: '#upload-card', title: 'Upload Your Data', content: 'Upload a CSV, XLSX, or JSON file. The app will dynamically adapt to its structure.' },
  ];

  const timelineWalkthroughSteps: Step[] = [
    { element: '#flow-chart-card', title: 'Business Process Flow', content: 'This chart shows the stages of your process. Click a stage to filter the timeline.', placement: 'bottom' },
    { element: '#search-bar', title: 'Search Logs', content: 'Perform a deep search on all event details, including raw JSON payloads.', placement: 'bottom' },
    { element: '#filter-controls', title: 'Filter & Sort', content: 'Refine the timeline by filtering on specific actions or entities and sorting by date.', placement: 'bottom' },
    { element: '#timeline-event-card', title: 'Timeline Events', content: 'Each card represents an audit event. Click the expand icon for full details.', placement: 'bottom' },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFileName(null);
    setFile(null);
    const targetFile = e.target.files?.[0];
    if (targetFile) {
        const allowedTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json'];
        if (!allowedTypes.includes(targetFile.type)) {
            setError('Please upload a valid CSV, XLSX, or JSON file.');
        } else {
            setFile(targetFile);
            setFileName(targetFile.name);
        }
    }
  };

  const processFile = (targetFile: File, afterProcess?: () => void) => {
      setIsProcessingFile(true);
      setUploadProgress(0);
      setProcessedCount(0);

      const isXlsx = targetFile.type.includes('spreadsheetml') || targetFile.name.endsWith('.xlsx');
      const isJson = targetFile.type === 'application/json' || targetFile.name.endsWith('.json');

      const onProcessed = (processedData: any[]) => {
          if (processedData.length === 0) {
              setError('File is empty or could not be parsed.');
              setView('upload');
              setIsProcessingFile(false);
              return;
          }
          const firstRow = processedData[0];
          const headers = Object.keys(firstRow).filter(k => !k.startsWith('_') && k !== 'parsed_payload' && k !== 'parsed_difference_list' && k !== 'business_timestamp' && k !== 'raw_business_time' && k !== 'display_user');
          const isAuditLog = ['created_timestamp', 'action', 'entity_name'].every(h => headers.includes(h));
          setData(processedData);
          if (isAuditLog) {
              setDataType('audit');
              setActiveView('timeline');
              setColumns(AUDIT_LOG_COLUMNS.map(c => ({...c, resizable: true})));
          } else {
              const fileColumns = headers.map(header => ({ key: header, name: header.toUpperCase(), resizable: true }));
              setColumns(fileColumns);
              setDataType('generic');
              setActiveView('table');
          }
          setView('timeline');
          setFile(targetFile);
          setFileName(targetFile.name);
          setIsProcessingFile(false);

          // Save session to Firestore + Storage in background (fire-and-forget)
          const snippet = JSON.stringify(processedData.slice(0, 3)).slice(0, 200);
          const { sessionId, saveAsync } = createSessionRef(firestore);
          setCurrentSessionId(sessionId);
          saveAsync(targetFile, processedData.length, snippet)
              .catch(e => console.error('[SESSION_SAVE_ERROR]', e));

          afterProcess?.();
      };

      const onError = (msg: string) => {
          setError(msg);
          setView('upload');
          setIsProcessingFile(false);
      };

      if (isXlsx || isJson) {
          // For XLSX/JSON: read on main thread (unavoidable), then offload processing to worker
          const reader = new FileReader();
          reader.onprogress = (event) => {
              if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 50);
          };
          reader.onload = (event) => {
              try {
                  const fileContent = event.target?.result;
                  if (!fileContent) { onError('File content is empty.'); return; }
                  let rawRows: any[] = [];
                  if (isJson) {
                      const jsonData = JSON.parse(fileContent as string);
                      if (!Array.isArray(jsonData)) { onError('JSON file must contain an array of objects.'); return; }
                      rawRows = jsonData;
                  } else {
                      const workbook = XLSX.read(new Uint8Array(fileContent as ArrayBuffer), { type: 'array' });
                      const sheet = workbook.Sheets[workbook.SheetNames[0]];
                      rawRows = XLSX.utils.sheet_to_json(sheet);
                  }
                  setUploadProgress(60);
                  const worker = new Worker(new URL('../workers/audit-processor.worker.ts', import.meta.url));
                  worker.onmessage = (e) => {
                      if (e.data.type === 'COMPLETE') { worker.terminate(); setUploadProgress(100); onProcessed(e.data.data); }
                      if (e.data.type === 'ERROR') { worker.terminate(); onError(e.data.message); }
                  };
                  worker.onerror = (e) => { worker.terminate(); onError('Worker error: ' + e.message); };
                  worker.postMessage({ type: 'PROCESS_ROWS', rows: rawRows });
              } catch (e: any) { onError('Failed to read file: ' + e.message); }
          };
          reader.onerror = () => onError('Failed to read file.');
          isXlsx ? reader.readAsArrayBuffer(targetFile) : reader.readAsText(targetFile);
      } else {
          // CSV: read as ArrayBuffer, then TRANSFER (zero-copy) to worker.
          // Using readAsText + postMessage(string) blocks the main thread during serialization of large files.
          // ArrayBuffer transfer avoids serialization entirely — the buffer moves to the worker with no copy.
          const reader = new FileReader();
          reader.onprogress = (event) => {
              if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 40);
          };
          reader.onload = (event) => {
              const buffer = event.target?.result as ArrayBuffer;
              if (!buffer) { onError('File content is empty.'); return; }
              setUploadProgress(45);
              const worker = new Worker(new URL('../workers/audit-processor.worker.ts', import.meta.url));
              worker.onmessage = (e) => {
                  if (e.data.type === 'PROGRESS') {
                      setProcessedCount(e.data.count);
                      setUploadProgress(45 + Math.min(45, (e.data.count / 5000) * 45));
                  }
                  if (e.data.type === 'COMPLETE') { worker.terminate(); setUploadProgress(100); onProcessed(e.data.data); }
                  if (e.data.type === 'ERROR') { worker.terminate(); onError(e.data.message); }
              };
              worker.onerror = (e) => { worker.terminate(); onError('Worker error: ' + e.message); };
              // Transfer the buffer — zero-copy, main thread is NOT blocked
              worker.postMessage({ type: 'PARSE_CSV', buffer }, [buffer]);
          };
          reader.onerror = () => onError('Failed to read file.');
          reader.readAsArrayBuffer(targetFile);
      }
  };

  const handleViewTimeline = () => {
      if (!file) { setError('Please select a file first.'); return; }
      processFile(file);
  };

  const handleRestoreAnalysis = ({ buffer, fileName: restoredName, context, pendingAction: action }: RestoreParams) => {
      const isXlsx = restoredName.endsWith('.xlsx');
      const isJson = restoredName.endsWith('.json');
      const mimeType = isXlsx
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : isJson ? 'application/json' : 'text/csv';
      const restoredFile = new File([buffer], restoredName, { type: mimeType });
      processFile(restoredFile, () => {
          setInvestigationContext(context);
          setPendingAction(action);
          setShowContextForm(true);
      });
  };

  const handleUploadNew = () => {
    setView('upload');
    setData([]);
    setColumns([]);
    setDataType(null);
    setFileName(null);
    setFile(null);
    setError(null);
    setSearchTerm('');
    setSelectedEntities([]);
    setSelectedActions([]);
    setSortOrder('desc');
    setSelectedFlowEntities(null);
    setAnalysisResult(null);
    setReplicationResult(null);
    setExpandedIndex(null);
    setIsEventDetailsOpen(false);
    setCurrentSessionId(null);
  }
  
  const handleStageClick = (entities: string[]) => {
      setSelectedFlowEntities(current => 
          JSON.stringify(current) === JSON.stringify(entities) ? null : entities
      );
  }

    const handleAnalyze = () => {
        if (filteredData.length === 0) {
            toast({ variant: 'destructive', title: 'No Data to Analyze', description: 'There are no logs in the current view to analyze.' });
            return;
        }
        setPendingAction('analyse');
        setShowContextForm(true);
    };

    const handleReplicate = () => {
        if (filteredData.length === 0) {
            toast({ variant: 'destructive', title: 'No Data for Replication', description: 'There are no logs in the current view to process.' });
            return;
        }
        setPendingAction('replicate');
        setShowContextForm(true);
    };

    const handleRunWithContext = async () => {
        setShowContextForm(false);
        const ctx = investigationContext;

        if (pendingAction === 'analyse') {
            setIsAnalyzing(true);
            setAnalysisResult(null);
            setShowAnalysisDialog(true);
            try {
                const dataForAnalysis = filteredData.slice(0, 100);
                const logString = dataForAnalysis.map(e => JSON.stringify({
                    timestamp: e.business_timestamp || e.created_timestamp,
                    action: e.action,
                    entity: e.entity_name,
                    entity_id: e.entity_id,
                    parent_id: e.parent_id,
                    table_name: e.table_name,
                    user: e.display_user,
                    payload: e.payload !== 'NULL' ? e.payload : undefined,
                    differences: e.difference_list !== 'NULL' ? e.difference_list : undefined
                }, (key, value) => value === undefined ? undefined : value)).join('\n');
                const trimmedLogs = logString.length > 8000 ? logString.slice(0, 8000) : logString;
                const result = await analyzeLogIncident({ logs: trimmedLogs, context: ctx, kbSelection });
                if (!result || 'error' in result) {
                    toast({ variant: 'destructive', title: 'Analysis Failed', description: (result as any)?.error || 'An unexpected error occurred.' });
                    setShowAnalysisDialog(false);
                } else {
                    setAnalysisResult(result);
                    if (currentSessionId) {
                        saveAnalysisToDb(firestore, currentSessionId, 'forensic', ctx, result)
                            .catch(e => console.error('[ANALYSIS_PERSIST_ERROR]', e));
                    }
                }
            } catch (e: any) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message || 'An unexpected error occurred during analysis.' });
                setShowAnalysisDialog(false);
            } finally {
                setIsAnalyzing(false);
            }
        }

        if (pendingAction === 'replicate') {
            setIsReplicating(true);
            setReplicationResult(null);
            setShowReplicateDialog(true);
            try {
                const dataForReplication = filteredData.slice(0, 100);
                const logString = dataForReplication.map(e => JSON.stringify({
                    timestamp: e.business_timestamp || e.created_timestamp,
                    action: e.action,
                    entity: e.entity_name,
                    details: e.payload && e.payload !== 'NULL' ? e.payload : e.difference_list
                })).join('\n');
                const trimmedLogs = logString.length > 8000 ? logString.slice(0, 8000) : logString;
                const result = await replicateIncident({ logs: trimmedLogs, context: ctx, kbSelection });
                if (!result || 'error' in result) {
                    toast({ variant: 'destructive', title: 'Replication Failed', description: (result as any)?.error || 'An unexpected error occurred.' });
                    setShowReplicateDialog(false);
                } else {
                    setReplicationResult(result);
                    if (currentSessionId) {
                        saveAnalysisToDb(firestore, currentSessionId, 'replication', ctx, result)
                            .catch(e => console.error('[REPLICATION_PERSIST_ERROR]', e));
                    }
                }
            } catch (e: any) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Replication Failed', description: e.message || 'Failed to generate replication steps.' });
                setShowReplicateDialog(false);
            } finally {
                setIsReplicating(false);
            }
        }
    };


  const allEntities = useMemo(() => {
    if (dataType !== 'audit') return [];
    const uniqueEntities = [...new Set(data.map(event => event.entity_name).filter(Boolean))];
    return uniqueEntities.sort();
  }, [data, dataType]);

  const allActions = useMemo(() => {
    if (dataType !== 'audit') return [];
    const uniqueActions = [...new Set(data.map(event => event.action).filter(Boolean))];
    return uniqueActions.sort();
  }, [data, dataType]);

  useEffect(() => {
    if (dataType === 'audit' && data.length > 0) {
        setSelectedEntities(allEntities);
        setSelectedActions(allActions);
    }
  }, [data, dataType, allEntities, allActions]);

  const filteredData = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    let dataToFilter = data.filter(event => {
      if (dataType === 'audit') {
          if (!event.entity_name) return false;
          const entityName = event.entity_name.toLowerCase();
          let flowMatch = !selectedFlowEntities;

          if (selectedFlowEntities) {
              if (selectedFlowEntities.includes('trade')) {
                  flowMatch = selectedFlowEntities.some(e => entityName.includes(e) && !entityName.includes('cost'));
              } else {
                  flowMatch = selectedFlowEntities.some(e => entityName.includes(e));
              }
          }

          const entityMatch = selectedEntities.length === 0 || selectedEntities.includes(event.entity_name);
          const actionMatch = selectedActions.length === 0 || selectedActions.includes(event.action);

          if (!flowMatch || !entityMatch || !actionMatch) return false;
      }
      
      if (!searchTerm) return true;

      // Compute _searchable_text lazily on first search to avoid blocking the main thread at load time
      if (!event._searchable_text) {
        event._searchable_text = getObjectValues(event).toLowerCase();
      }
      return event._searchable_text.includes(lowerCaseSearchTerm);
    });

    if (dataType === 'audit') {
        return [...dataToFilter].sort((a, b) => {
            const diff = a.raw_business_time - b.raw_business_time;
            return sortOrder === 'asc' ? diff : -diff;
        });
    }
    return dataToFilter;

  }, [data, searchTerm, selectedEntities, selectedActions, sortOrder, selectedFlowEntities, dataType]);

  // Reset incremental timeline rendering whenever the filtered set changes
  useEffect(() => {
    setTimelineLimit(TIMELINE_PAGE_SIZE);
  }, [searchTerm, selectedEntities, selectedActions, sortOrder, selectedFlowEntities, dataType, data]);

  // Only the visible slice is rendered as timeline DOM nodes (prevents freeze on big files)
  const visibleTimelineData = useMemo(
    () => filteredData.slice(0, timelineLimit),
    [filteredData, timelineLimit]
  );


   const handleExport = () => {
    if (filteredData.length === 0) {
        toast({ title: "No data to export.", variant: "destructive" });
        return;
    }

    const dataToExport: any[] = [];
    
    if (dataType === 'audit') {
        const headers = ['TIMESTAMP', 'ENTITY', 'ENTITY ID', 'ACTION', 'USER', 'PAYLOAD', 'DIFFERENCE'];
        
        filteredData.forEach(event => {
            const row: {[key: string]: any} = {};
            row['TIMESTAMP'] = event.business_timestamp;
            row['ENTITY'] = event.entity_name;
            row['ENTITY ID'] = event.entity_id || '';
            row['ACTION'] = event.action;
            row['USER'] = event.display_user || '';
            row['PAYLOAD'] = event.payload === 'NULL' ? '' : event.payload;
            row['DIFFERENCE'] = event.difference_list === 'NULL' ? '' : event.difference_list;
            dataToExport.push(row);
        });
    } else { // Generic Data
        filteredData.forEach(row => {
            const newRow: {[key: string]: any} = {};
            columns.forEach(col => {
                newRow[col.name] = row[col.key];
            });
            dataToExport.push(newRow);
        });
    }

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = `export_${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const navigateDetails = (direction: 'next' | 'prev') => {
      if (expandedIndex === null) return;
      const newIndex = direction === 'next' ? expandedIndex + 1 : expandedIndex - 1;
      if (newIndex >= 0 && newIndex < filteredData.length) {
          setExpandedIndex(newIndex);
      }
  };

  if (view === 'timeline') {
    const currentExpandedEvent = expandedIndex !== null ? filteredData[expandedIndex] : null;

    return (
      <div className='flex h-screen w-full overflow-hidden'>
          {sidebarOpen && (
            <SessionsSidebar
              currentSessionId={currentSessionId}
              onRestoreAnalysis={handleRestoreAnalysis}
            />
          )}
          <div className='flex flex-col flex-1 min-w-0 overflow-hidden'>
          {dataType === 'audit' && <Walkthrough
            steps={timelineWalkthroughSteps}
            isOpen={showTimelineWalkthrough}
            onClose={() => setShowTimelineWalkthrough(false)}
          />}
           {/* Investigation Context Form */}
           <Dialog open={showContextForm} onOpenChange={setShowContextForm}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Start Investigation
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">Provide context about the customer issue. This helps the AI anchor its analysis to the reported symptom rather than summarizing logs generically. All fields are optional.</p>
                        <div className="space-y-2">
                            <Label htmlFor="ctx-customer">Customer / Tenant</Label>
                            <Input id="ctx-customer" placeholder="e.g. Acme Trading Ltd" value={investigationContext.customer ?? ''} onChange={e => setInvestigationContext(c => ({ ...c, customer: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ctx-symptom">Reported Symptom <span className="text-primary font-bold">*</span></Label>
                            <Textarea id="ctx-symptom" placeholder="e.g. Invoice posted at wrong quantity — shows 20,000 MT but should be 19,847 MT after BL split" rows={3} value={investigationContext.symptom ?? ''} onChange={e => setInvestigationContext(c => ({ ...c, symptom: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ctx-ids">Affected Entity IDs</Label>
                            <Input id="ctx-ids" placeholder="e.g. T-1042, OBL-887-A, BL-2024-0321" value={investigationContext.affectedEntityIds ?? ''} onChange={e => setInvestigationContext(c => ({ ...c, affectedEntityIds: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ctx-date">Incident Date / Time Range</Label>
                            <Input id="ctx-date" placeholder="e.g. 2026-06-20 14:00 to 15:30 UTC" value={investigationContext.dateRange ?? ''} onChange={e => setInvestigationContext(c => ({ ...c, dateRange: e.target.value }))} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Knowledge Base</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['none', 'pil', 'apical'] as const).map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setKbSelection(opt)}
                                    className={cn(
                                        'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                                        kbSelection === opt
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/70'
                                    )}
                                >
                                    {opt === 'none' ? 'None' : opt === 'pil' ? 'PIL' : 'APICAL'}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {kbSelection === 'none' && 'No customer KB — uses base Xceler knowledge only'}
                            {kbSelection === 'pil' && 'PIL KB active — 43 PIL scenarios embedded in system prompt'}
                            {kbSelection === 'apical' && 'APICAL KB active — ATS v7.2.0 rules and navigation injected'}
                        </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowContextForm(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleRunWithContext}>
                            {pendingAction === 'analyse' ? <><Sparkles className="mr-2 h-4 w-4" />Run Forensic Analyse</> : <><TestTube2 className="mr-2 h-4 w-4" />Run Replicate</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

           <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
                <DialogContent className="max-w-5xl h-[90vh]">
                    <DialogHeader><DialogTitle>Forensic Trade Lifecycle Analysis</DialogTitle></DialogHeader>
                    <div className="relative flex-1 min-h-0">
                         <ScrollArea className="h-full w-full">
                            <div className="py-4 pr-4">
                                {isAnalyzing && (
                                    <div className="flex flex-col items-center justify-center gap-4 p-12">
                                        <Loader className="w-12 h-12 animate-spin text-primary" />
                                        <div className="text-center space-y-2">
                                            <p className="font-bold text-lg">Forensic Reconstruction in Progress...</p>
                                            <p className="text-muted-foreground text-sm max-w-md">Scanning audit logs, mapping entity relationships, and calculating field-level business impacts.</p>
                                        </div>
                                    </div>
                                )}
                                {analysisResult && <AnalysisResultDisplay result={analysisResult} />}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showReplicateDialog} onOpenChange={setShowReplicateDialog}>
                <DialogContent className="max-w-3xl h-[80vh]">
                    <DialogHeader><DialogTitle>High-Fidelity Replication Script</DialogTitle></DialogHeader>
                    <div className="relative flex-1 min-h-0">
                         <ScrollArea className="h-full w-full">
                            <div className="py-4 pr-4">
                                {isReplicating && (
                                    <div className="flex flex-col items-center justify-center gap-4 p-12">
                                        <Loader className="w-12 h-12 animate-spin text-primary" />
                                        <div className="text-center space-y-2">
                                            <p className="font-bold text-lg text-primary">Building Reproduction Guide...</p>
                                            <p className="text-muted-foreground text-sm">Synthesizing log sequences into Xceler business workflows.</p>
                                        </div>
                                    </div>
                                )}
                                {replicationResult && <ReplicationResultDisplay result={replicationResult} />}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Global Forensic Detail Modal with Navigation */}
            <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
                 <DialogContent className="max-w-4xl p-0">
                    <div className="max-h-[90vh] overflow-hidden flex flex-col">
                      <DialogHeader className="p-6 pb-4 shrink-0 flex flex-row items-center justify-between border-b">
                        <div>
                            <DialogTitle className="text-xl font-headline">
                                {currentExpandedEvent ? `${currentExpandedEvent.action} on ${currentExpandedEvent.entity_name}` : 'Event Details'}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                                {expandedIndex !== null ? `Record ${expandedIndex + 1} of ${filteredData.length}` : ''}
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
                                disabled={expandedIndex === filteredData.length - 1}
                                onClick={() => navigateDetails('next')}
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                      </DialogHeader>
                      <ScrollArea className="flex-grow min-h-0">
                        <div className="px-6 pb-6 pt-4">
                            {currentExpandedEvent && renderDetails(currentExpandedEvent)}
                        </div>
                      </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

          <header className="flex-none flex justify-between items-start pt-4 px-4 md:pt-8 md:px-8">
              <div className='flex items-center gap-3'>
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <h1 className="text-2xl font-bold font-headline text-foreground">
                    {dataType === 'audit' ? 'Audit Log Explorer' : 'Data Explorer'}
                  </h1>
              </div>
               <div className="flex-shrink-0 flex items-center gap-2">
                  {dataType === 'audit' && (
                    <div className="flex items-center gap-2">
                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="shadow-lg shadow-primary/20">
                            {isAnalyzing ? <Loader className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            Forensic Analyse
                        </Button>
                        <Button variant="outline" onClick={handleReplicate} disabled={isReplicating}>
                            {isReplicating ? <Loader className="mr-2 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                            Replicate
                        </Button>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" title="Session History" onClick={() => setSidebarOpen(v => !v)}>
                      <History className="w-5 h-5" />
                  </Button>
                  <ThemeToggle />
              </div>
          </header>
            {dataType === 'audit' && <div id="flow-chart-card" className='px-4 md:px-8 mt-4'>
                 <FlowChart data={data} onStageClick={handleStageClick} selectedEntities={selectedFlowEntities} />
            </div>}
          
          <div id="filter-controls" className="flex-none flex flex-wrap items-center gap-2 mb-4 mt-8 px-4 md:px-8">
                {dataType === 'audit' && (
                    <div className='flex items-center gap-2 p-1 rounded-lg bg-muted'>
                        <Button variant={activeView === 'timeline' ? 'secondary' : 'ghost'} size="sm" onClick={() => switchView('timeline')}><List className="mr-2 h-4 w-4" />Timeline</Button>
                        <Button variant={activeView === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => switchView('table')}><TableIcon className="mr-2 h-4 w-4" />Table</Button>
                    </div>
                )}
                <div className="relative flex-grow sm:flex-grow-0" id="search-bar">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full sm:w-64" />
                </div>
                {dataType === 'audit' && (
                    <>
                        <MultiSelectFilter title="Action" pluralTitle="Actions" options={allActions} selectedValues={selectedActions} onSelectionChange={setSelectedActions} className="w-full sm:w-[180px]" />
                        <MultiSelectFilter title="Entity" pluralTitle="Entities" options={allEntities} selectedValues={selectedEntities} onSelectionChange={setSelectedEntities} className="w-full sm:w-[180px]" />
                        <Button variant="outline" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="w-full sm:w-auto">
                            {sortOrder === 'desc' ? <ArrowDown className="mr-2 h-4 w-4" /> : <ArrowUp className="mr-2 h-4 w-4" />}
                            Sort {sortOrder === 'desc' ? 'Desc' : 'Asc'}
                        </Button>
                    </>
                )}
                <div className="flex-grow"></div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground whitespace-nowrap">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {filteredData.length.toLocaleString()}
                    {filteredData.length !== data.length && ` / ${data.length.toLocaleString()}`} records
                </div>
                <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                </Button>
                <Button onClick={handleUploadNew} className="w-full sm:w-auto">Upload New File</Button>
          </div>

          <div className='flex-grow min-h-0 flex flex-col gap-4 px-4 md:px-8 pb-4 relative'>
            {isSwitchingView && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Loading {activeView} view…</p>
                </div>
            )}
            {activeView === 'timeline' && dataType === 'audit' ? (
                <ScrollArea className="h-full">
                    <VerticalTimeline lineColor={'hsl(var(--border))'}>
                    {visibleTimelineData.map((event, index) => {
                        const { business_timestamp, action, entity_name } = event;
                        if (!action) return null;
                        
                        const icon = getIconForEvent(action);

                        return (
                        <VerticalTimelineElement
                            key={index}
                            id={index === 0 ? 'timeline-event-card' : undefined}
                            className="vertical-timeline-element--work"
                            contentStyle={{ 
                                background: 'hsl(var(--card))', 
                                color: 'hsl(var(--card-foreground))',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                                borderTop: `4px solid hsl(var(--primary))`
                            }}
                            contentArrowStyle={{ borderRight: '7px solid hsl(var(--card))' }}
                            dateClassName="!text-muted-foreground !font-sans"
                            date={business_timestamp}
                            iconStyle={{ 
                                background: 'hsl(var(--primary))', 
                                color: 'hsl(var(--primary-foreground))',
                                boxShadow: '0 0 0 4px hsl(var(--background)), 0 0 0 6px hsl(var(--primary))'
                            }}
                            icon={icon}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="vertical-timeline-element-title text-lg font-bold text-left font-headline">{action}</h3>
                                    <h4 className="vertical-timeline-element-subtitle text-muted-foreground text-left">{entity_name}</h4>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                        setExpandedIndex(index);
                                        setIsEventDetailsOpen(true);
                                    }}
                                >
                                    <Maximize className="h-4 w-4" />
                                </Button>
                            </div>
                            {renderPreview(event)}
                        </VerticalTimelineElement>
                        );
                    })}
                    </VerticalTimeline>
                    {timelineLimit < filteredData.length && (
                        <div className="flex flex-col items-center gap-2 py-6">
                            <p className="text-xs text-muted-foreground">
                                Showing {visibleTimelineData.length} of {filteredData.length} events
                            </p>
                            <Button
                                variant="secondary"
                                onClick={() => setTimelineLimit(prev => prev + TIMELINE_PAGE_SIZE)}
                            >
                                Load More
                            </Button>
                        </div>
                    )}
                </ScrollArea>
            ) : (
                <DataGrid data={filteredData} columns={columns} dataType={dataType!} />
            )}
          </div>
          </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
        {sidebarOpen && (
          <SessionsSidebar
            currentSessionId={currentSessionId}
            onRestoreAnalysis={handleRestoreAnalysis}
          />
        )}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0">
        <Walkthrough steps={uploadWalkthroughSteps} isOpen={showUploadWalkthrough} onClose={() => setShowUploadWalkthrough(false)} />
        <div className="w-full max-w-lg text-right mb-4 flex justify-end items-center gap-2">
            <Button variant="ghost" size="icon" title="Session History" onClick={() => setSidebarOpen(v => !v)}><History className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setShowUploadWalkthrough(true)}><HelpCircle className="w-5 h-5" /></Button>
            <ThemeToggle />
        </div>
        <Card className="w-full max-w-lg text-center" id="upload-card">
            <CardHeader><CardTitle className="text-2xl font-headline">Upload Data File</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-6 p-8">
                <div className="flex flex-col items-center justify-center w-full">
                    <label htmlFor="file-upload" className="w-full">
                        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">CSV, XLSX, or JSON</p>
                            </div>
                            <input id="file-upload" type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json" onChange={handleFileChange} />
                        </div>
                    </label>

                    <div className="w-full mt-4 space-y-2">
                        {fileName && !isProcessingFile && <p className="text-sm font-medium text-center">Selected file: {fileName}</p>}
                        {isProcessingFile && (
                            <div className='space-y-2'>
                                <p className="text-sm font-medium text-muted-foreground text-center">Processing: {fileName}</p>
                                <Progress value={uploadProgress} className="w-full" />
                                <p className="text-xs text-muted-foreground text-center">
                                    {processedCount > 0
                                        ? `${processedCount.toLocaleString()} rows loaded…`
                                        : 'Reading file…'}
                                </p>
                            </div>
                        )}
                    </div>

                    <Button onClick={handleViewTimeline} disabled={!file || !!error || isProcessingFile} className="w-full mt-4">
                        {isProcessingFile ? <Loader className="mr-2 animate-spin" /> : <Eye className="mr-2" />}
                        {isProcessingFile ? 'Processing...' : 'View Data'}
                    </Button>
                </div>
                
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </CardContent>
        </Card>
        </div>
    </div>
  );
}
