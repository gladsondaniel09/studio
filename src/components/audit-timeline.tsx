
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { format } from 'date-fns';
import { AlertTriangle, File, Lock, User, UserPlus, UploadCloud, Eye, ArrowRight, Search, Maximize, Code, Sparkles, Loader, ArrowUp, ArrowDown, Copy, HelpCircle, Wand2, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
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
import { generateDemoData } from '@/ai/flows/demo-data-flow';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import FlowChart from './flow-chart';
import { ThemeToggle } from './theme-toggle';
import { Walkthrough, type Step } from './walkthrough';
import { AuditEvent, SampleEventSchema } from '@/lib/types';


// Extend the AuditEvent type to include our pre-processed fields
type ProcessedAuditEvent = AuditEvent & {
    parsed_payload: any;
    parsed_difference_list: any;
    searchable_text: string;
};


const RawJsonViewer = ({ jsonString, title }: { jsonString: string | undefined, title: string }) => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    if (!jsonString || jsonString === 'NULL') return null;

    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonString);
    } catch (e) {
        parsedJson = jsonString;
    }
    const formattedJson = JSON.stringify(parsedJson, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(formattedJson);
        toast({ title: 'Success', description: 'Raw JSON copied to clipboard.' });
    };

    const highlightedJson = useMemo(() => {
        if (!searchTerm) return formattedJson;
        const parts = formattedJson.split(new RegExp(`(${searchTerm})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === searchTerm.toLowerCase() ? (
                        <mark key={i} className="bg-primary text-primary-foreground p-0 rounded">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    }, [searchTerm, formattedJson]);
    
    return (
        <div className="space-y-2">
            <h4 className="font-semibold">{title}</h4>
            <div className="flex gap-2">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search in JSON..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                    />
                </div>
                <Button variant="outline" size="icon" onClick={handleCopy} className='shrink-0'>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            <div className="bg-muted rounded-md p-4 max-h-96 overflow-auto">
                <pre className="text-xs">{highlightedJson}</pre>
            </div>
        </div>
    );
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
                        return (
                             <div key={index} className="min-w-0">
                                <p className="font-bold text-sm capitalize">{(item.label || item.field).replace(/_/g, ' ')}</p>
                                <div className="flex flex-col text-sm">
                                    <div className="text-muted-foreground line-through"><TruncatedValue value={item.oldValue} /></div>
                                    <div className="flex items-start gap-2">
                                        <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-1" />
                                        <div className='flex-1 min-w-0'><TruncatedValue value={item.newValue} /></div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    const [key, value] = item;
                     return (
                        <div key={key} className="min-w-0">
                            <p className="font-bold text-sm capitalize">{key.replace(/_/g, ' ')}</p>
                            <div className="min-w-0"><TruncatedValue value={value} /></div>
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

const renderDetails = (event: ProcessedAuditEvent) => {
    const { action, payload, difference_list, parsed_payload, parsed_difference_list } = event;
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
        const { created_timestamp, entity_name, action: evtAction, ...otherDetails } = event;
        const detailsToShow = Object.entries(otherDetails).filter(([key, value]) => value && value !== 'NULL');

        if (detailsToShow.length > 0) {
            formattedView = <DetailView items={detailsToShow} type="key-value" />;
        }
    }

    return (
        <ScrollArea className="h-[60vh] w-full p-1">
            <div className="space-y-4">
                {formattedView || <p className="text-sm text-muted-foreground">No details to display.</p>}
                
                {(payload !== "NULL" || difference_list !== "NULL") && (
                    <Accordion type="single" collapsible className="w-full pt-4">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4" /> Raw Details
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <RawJsonViewer jsonString={difference_list} title="difference_list (JSON)" />
                                    <RawJsonViewer jsonString={payload} title="payload (JSON)" />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </div>
        </ScrollArea>
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
                                <span className="text-muted-foreground">{String(value)}</span>
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
                        {parsed_difference_list.slice(0, PREVIEW_LIMIT).map((diff: any, index: number) => (
                             <p key={index} className="truncate min-w-0">
                                <span className="font-semibold capitalize">{(diff.label || diff.field).replace(/_/g, ' ')}: </span>
                                <span className="text-muted-foreground line-through">{String(diff.oldValue ?? 'none')}</span>
                                <ArrowRight className="w-3 h-3 text-primary inline mx-1" />
                                <span className='text-foreground'>{String(diff.newValue ?? 'none')}</span>
                            </p>
                        ))}
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


// Extracts all key-value pairs from a nested object
const extractAllIds = (obj: any, prefix = ''): Record<string, any> => {
    if (obj === null || typeof obj !== 'object') {
        return {};
    }
    return Object.entries(obj).reduce((acc, [key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && value !== '' && (typeof value === 'string' || typeof value === 'number')) {
            // Normalize ID keys to 'uuid' for consistent matching
            const normalizedKey = key.toLowerCase().endsWith('id') ? 'uuid' : key;
            acc[newKey] = value;
        } else if (typeof value === 'object') {
            Object.assign(acc, extractAllIds(value, newKey));
        }
        return acc;
    }, {} as Record<string, any>);
};

const logicalSortOrder = [
    ['plannedobligation', 'physicalobligationeodrawdata'], // Stage 0
    ['trade'], // Stage 1
    ['tradecost', 'cost', 'cashflow'], // Stage 2
    ['shipment', 'container'], // Stage 3
    ['stock', 'movement'], // Stage 4
    ['actualization', 'actualizedquantityobligation'], // Stage 5
    ['pricing', 'price'], // Stage 6
    ['invoice'], // Stage 7
];

const getEntitySortKey = (entityName: string): number => {
    if (!entityName) return logicalSortOrder.length;
    const lowerEntityName = entityName.toLowerCase();
    
    for (let i = 0; i < logicalSortOrder.length; i++) {
        if (logicalSortOrder[i].some(keyword => lowerEntityName.includes(keyword))) {
            return i;
        }
    }
    return logicalSortOrder.length; // Default for unmatched entities
};

const performTopologicalSort = (events: ProcessedAuditEvent[]): ProcessedAuditEvent[] => {
    if (events.length <= 1) return events;

    const indexedEvents = events.map((event, index) => ({ ...event, originalIndex: index }));
    const idToCreatorIndex: Record<string, number> = {};
    const adj: number[][] = Array(events.length).fill(0).map(() => []);
    const inDegree: number[] = Array(events.length).fill(0);

    // First pass: identify creators of all IDs
    indexedEvents.forEach((event, index) => {
        if (event.action.toLowerCase() === 'create' && event.parsed_payload) {
            const allIds = extractAllIds(event.parsed_payload);
            for (const key in allIds) {
                if (key.endsWith('uuid') || key.endsWith('Id') || key === 'tradeId') {
                     const idValue = `${key}=${allIds[key]}`;
                     if (!idToCreatorIndex.hasOwnProperty(idValue)) {
                        idToCreatorIndex[idValue] = index;
                    }
                }
            }
        }
    });

    // Second pass: build dependency graph
    indexedEvents.forEach((event, index) => {
        const allData = { ...event.parsed_payload, ...event.parsed_difference_list };
        const allIds = extractAllIds(allData);

        for (const key in allIds) {
            if (key.endsWith('uuid') || key.endsWith('Id') || key === 'tradeId') {
                const idValue = `${key}=${allIds[key]}`;
                const creatorIndex = idToCreatorIndex[idValue];

                if (creatorIndex !== undefined && creatorIndex !== index) {
                    adj[creatorIndex].push(index);
                    inDegree[index]++;
                }
            }
        }
    });

    // Perform topological sort
    const queue: number[] = [];
    for (let i = 0; i < events.length; i++) {
        if (inDegree[i] === 0) {
            queue.push(i);
        }
    }

    const sortedIndices: number[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        sortedIndices.push(u);

        for (const v of adj[u]) {
            inDegree[v]--;
            if (inDegree[v] === 0) {
                queue.push(v);
            }
        }
    }
    
    // If there's a cycle, the sort won't include all events.
    // In that case, append the remaining ones, sorted by timestamp.
    if (sortedIndices.length < events.length) {
        const remainingIndices = events
            .map((_, i) => i)
            .filter(i => !sortedIndices.includes(i));
        
        remainingIndices.sort((a,b) => new Date(events[a].created_timestamp).getTime() - new Date(events[b].created_timestamp).getTime());

        return [...sortedIndices, ...remainingIndices].map(i => indexedEvents.find(e => e.originalIndex === i)!);
    }

    return sortedIndices.map(i => indexedEvents.find(e => e.originalIndex === i)!);
};


// New Hybrid Sort Function
const performHybridSort = (events: ProcessedAuditEvent[]): ProcessedAuditEvent[] => {
    // 1. Group events by high-level business stage
    const groupedByStage: { [key: number]: ProcessedAuditEvent[] } = {};
    events.forEach(event => {
        const key = getEntitySortKey(event.entity_name);
        if (!groupedByStage[key]) {
            groupedByStage[key] = [];
        }
        groupedByStage[key].push(event);
    });

    // 2. Sort the stage keys
    const sortedStageKeys = Object.keys(groupedByStage).map(Number).sort((a, b) => a - b);

    // 3. Apply topological sort within each stage and flatten
    const finalSortedEvents: ProcessedAuditEvent[] = [];
    sortedStageKeys.forEach(key => {
        const stageEvents = groupedByStage[key];
        const sortedStageEvents = performTopologicalSort(stageEvents);
        finalSortedEvents.push(...sortedStageEvents);
    });
    
    return finalSortedEvents;
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

  useEffect(() => {
    setTempSelectedValues(selectedValues);
  }, [selectedValues]);

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
      <DropdownMenuContent className="w-56" align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>{pluralTitle}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={tempSelectedValues.length === options.length}
          onCheckedChange={(checked) => handleSelectAll(!!checked)}
          onSelect={(e) => e.preventDefault()}
        >
          Select All
        </DropdownMenuCheckboxItem>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={tempSelectedValues.includes(option)}
            onCheckedChange={(checked) => handleSelect(option, !!checked)}
            onSelect={(e) => e.preventDefault()}
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
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


// Function to pre-process the raw data from the CSV
const processAuditData = (events: AuditEvent[]): ProcessedAuditEvent[] => {
  return events.map(event => {
    let parsed_payload: any = null;
    let parsed_difference_list: any = null;

    try {
      if (event.payload && event.payload !== 'NULL') {
        parsed_payload = JSON.parse(event.payload);
      }
    } catch (e) {
      // Ignore parsing errors, leave as null
    }

    try {
      if (event.difference_list && event.difference_list !== 'NULL') {
        parsed_difference_list = JSON.parse(event.difference_list);
      }
    } catch (e) {
      // Ignore parsing errors, leave as null
    }

    // Create a single string for fast searching
    const eventValues = Object.values(event).join(' ');
    const payloadValues = getObjectValues(parsed_payload);
    const diffValues = getObjectValues(parsed_difference_list);
    const searchable_text = (eventValues + ' ' + payloadValues + ' ' + diffValues).toLowerCase();

    return {
      ...event,
      parsed_payload,
      parsed_difference_list,
      searchable_text,
    };
  });
};


export default function AuditTimeline() {
  const [data, setData] = useState<ProcessedAuditEvent[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'timeline'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortType, setSortType] = useState<'timestamp' | 'logical'>('timestamp');
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [selectedFlowEntities, setSelectedFlowEntities] = useState<string[] | null>(null);
  const { toast } = useToast();
  const [showUploadWalkthrough, setShowUploadWalkthrough] = useState(false);
  const [showTimelineWalkthrough, setShowTimelineWalkthrough] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Show upload walkthrough on initial load
    const hasSeenUpload = localStorage.getItem('hasSeenUploadWalkthrough');
    if (!hasSeenUpload) {
        setShowUploadWalkthrough(true);
        localStorage.setItem('hasSeenUploadWalkthrough', 'true');
    }
  }, []);

  useEffect(() => {
    if (view === 'timeline') {
      const hasSeenTimeline = localStorage.getItem('hasSeenTimelineWalkthrough');
      if (!hasSeenTimeline) {
        setShowTimelineWalkthrough(true);
        localStorage.setItem('hasSeenTimelineWalkthrough', 'true');
      }
    }
  }, [view]);

  const uploadWalkthroughSteps: Step[] = [
    {
      element: '#upload-card',
      title: 'Upload Your Data',
      content: 'Start by uploading a CSV file of your audit logs. You can drag and drop a file or click here to select one.',
    },
    {
      element: '#demo-button',
      title: 'Or View a Demo',
      content: 'Don\'t have a file? Click here to generate some sample data and see how the timeline works.',
    },
  ];

  const timelineWalkthroughSteps: Step[] = [
    {
      element: '#flow-chart-card',
      title: 'Business Process Flow',
      content: 'This chart shows the stages of your process. It highlights stages that are present in your data. Click a stage to filter the timeline below.',
      placement: 'bottom',
    },
    {
        element: '#search-bar',
        title: 'Search Logs',
        content: 'You can perform a deep search on all event details, including the raw JSON payloads.',
        placement: 'bottom',
    },
    {
        element: '#filter-controls',
        title: 'Filter & Sort',
        content: 'Refine the timeline by filtering on specific actions or entities, and sort the events by date or with our magic sort.',
        placement: 'bottom',
    },
    {
        element: '#timeline-event-card',
        title: 'Timeline Events',
        content: 'Each card represents an audit event. You can see a quick preview of the changes here. For full details, click the expand icon.',
        placement: 'bottom',
    },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFileName(null);
    setFile(null);
    const targetFile = e.target.files?.[0];
    if (targetFile) {
        if (targetFile.type !== 'text/csv') {
            setError('Please upload a valid CSV file.');
        } else {
            setFile(targetFile);
            setFileName(targetFile.name);
        }
    }
  };

  const handleViewTimeline = () => {
      if (!file) {
          setError('Please select a file first.');
          return;
      }
      setIsProcessingFile(true);
      setUploadProgress(0);

      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => {
            if (prev >= 95) {
                if(progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                return 95;
            }
            return prev + 5;
        })
      }, 100);
      
      Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
              if(progressIntervalRef.current) clearInterval(progressIntervalRef.current);
              setUploadProgress(100);

              const parsedData = results.data as any[];
              const validData = parsedData.filter(row => row.created_timestamp && row.action);
              if (validData.length === 0) {
                  setError('CSV file is empty, invalid, or does not contain required "created_timestamp" and "action" columns.');
                  setView('upload');
              } else {
                  const validatedData = z.array(SampleEventSchema).safeParse(validData);
                  if (validatedData.success) {
                    setData(processAuditData(validatedData.data));
                  } else {
                    console.error(validatedData.error);
                    setError('CSV data does not match the expected format.');
                    setData(processAuditData(validData as AuditEvent[])); // Fallback to raw data for display
                  }
                  setView('timeline');
              }
              setTimeout(() => setIsProcessingFile(false), 500);
          },
          error: (err: any) => {
              if(progressIntervalRef.current) clearInterval(progressIntervalRef.current);
              setError('Failed to parse CSV file: ' + err.message);
              setView('upload');
              setIsProcessingFile(false);
          }
      });
  };

  const handleDemo = async () => {
    setIsDemoLoading(true);
    setError(null);
    try {
      const demoData = await generateDemoData();
      const validatedData = z.array(SampleEventSchema).safeParse(demoData.events);
      if (validatedData.success) {
        setData(processAuditData(validatedData.data));
        setView('timeline');
      } else {
        console.error(validatedData.error);
        setError('AI-generated data does not match the expected format. Please try again.');
        toast({
            variant: 'destructive',
            title: 'Error Parsing Demo Data',
            description: 'The format of the AI-generated data was invalid.',
        });
      }
    } catch (e: any) {
        console.error(e);
        setError('Failed to generate demo data. Please try again.');
        toast({
            variant: 'destructive',
            title: 'Error Generating Demo',
            description: e.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsDemoLoading(false);
    }
  }

  const handleUploadNew = () => {
    setView('upload');
    setData([]);
    setFileName(null);
    setFile(null);
    setError(null);
    setSearchTerm('');
    setSelectedEntities([]);
    setSelectedActions([]);
    setSortOrder('desc');
    setSortType('timestamp');
    setSelectedFlowEntities(null);
  }
  
  const handleStageClick = (entities: string[]) => {
      setSelectedFlowEntities(current => 
          JSON.stringify(current) === JSON.stringify(entities) ? null : entities
      );
  }

  const entities = useMemo(() => {
    const uniqueEntities = [...new Set(data.map(event => event.entity_name).filter(Boolean))];
    return uniqueEntities.sort();
  }, [data]);

  const actions = useMemo(() => {
    const uniqueActions = [...new Set(data.map(event => event.action).filter(Boolean))];
    return uniqueActions.sort();
  }, [data]);

  useEffect(() => {
    if (data.length > 0) {
        setSelectedEntities(entities);
        setSelectedActions(actions);
    }
  }, [data, entities, actions]);
  
  // Perform the expensive logical sort only when the base data changes
  const logicallySortedData = useMemo(() => {
    if (data.length === 0) return [];
    return performHybridSort(data);
  }, [data]);


  const filteredData = useMemo(() => {
    let sourceData = sortType === 'logical' ? logicallySortedData : data;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    let dataToFilter = sourceData.filter(event => {
      if (!event.entity_name) return false;
      const entityName = event.entity_name.toLowerCase();
      let flowMatch = !selectedFlowEntities;

      if (selectedFlowEntities) {
          if (selectedFlowEntities.includes('trade')) {
              // Special handling for the "trade" stage to exclude costs
              flowMatch = selectedFlowEntities.some(e => entityName.includes(e) && !entityName.includes('cost'));
          } else {
              flowMatch = selectedFlowEntities.some(e => entityName.includes(e));
          }
      }

      const entityMatch = selectedEntities.length === 0 || selectedEntities.includes(event.entity_name);
      const actionMatch = selectedActions.length === 0 || selectedActions.includes(event.action);

      if (!flowMatch || !entityMatch || !actionMatch) return false;

      if (!searchTerm) {
        return true;
      }
      
      return event.searchable_text.includes(lowerCaseSearchTerm);
    });

    if (sortType === 'timestamp') {
      return [...dataToFilter].sort((a, b) => {
        const dateA = new Date(a.created_timestamp).getTime();
        const dateB = new Date(b.created_timestamp).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }
    
    return dataToFilter;

  }, [logicallySortedData, data, searchTerm, selectedEntities, selectedActions, sortOrder, sortType, selectedFlowEntities]);


  if (view === 'timeline') {
    return (
      <div className='flex flex-col'>
          <Walkthrough
            steps={timelineWalkthroughSteps}
            isOpen={showTimelineWalkthrough}
            onClose={() => setShowTimelineWalkthrough(false)}
          />
          <header className="flex-none flex justify-between items-start mb-8">
              <div className="w-full" id="flow-chart-card">
                  <FlowChart data={filteredData} onStageClick={handleStageClick} selectedEntities={selectedFlowEntities} />
              </div>
              <div className="flex-shrink-0 ml-4">
                  <ThemeToggle />
              </div>
          </header>
          
          <div className="flex-none flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
               <h1 className="text-2xl font-bold font-headline text-foreground flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Audit Log Timeline
              </h1>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto" id="search-bar">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="Search logs..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full sm:w-64"
                      />
                  </div>
                  <div id="filter-controls" className="contents sm:flex sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto">
                    <MultiSelectFilter 
                        title="Action"
                        pluralTitle="Actions"
                        options={actions}
                        selectedValues={selectedActions}
                        onSelectionChange={setSelectedActions}
                        className="w-full sm:w-[180px]"
                    />
                    <MultiSelectFilter 
                        title="Entity"
                        pluralTitle="Entities"
                        options={entities}
                        selectedValues={selectedEntities}
                        onSelectionChange={setSelectedEntities}
                        className="w-full sm:w-[180px]"
                    />
                    <Button variant="outline" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="w-full sm:w-auto" disabled={sortType === 'logical'}>
                        {sortOrder === 'desc' ? <ArrowDown className="mr-2 h-4 w-4" /> : <ArrowUp className="mr-2 h-4 w-4" />}
                        Sort {sortOrder === 'desc' ? 'Desc' : 'Asc'}
                    </Button>
                    <Button variant={sortType === 'logical' ? 'default' : 'outline'} onClick={() => setSortType(type => type === 'logical' ? 'timestamp' : 'logical')} className="w-full sm:w-auto">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Magic Sort
                    </Button>
                  </div>
                  <Button onClick={handleUploadNew} className="w-full sm:w-auto">Upload New File</Button>
              </div>
          </div>
          <div className='flex-grow'>
            <VerticalTimeline lineColor={'hsl(var(--border))'}>
            {filteredData.map((event, index) => {
                const { created_timestamp, entity_name, action } = event;
                 if (!created_timestamp || !action) {
                    return null;
                }
                const eventDate = new Date(created_timestamp);
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
                    date={format(eventDate, "PPpp")}
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
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Maximize className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl w-full h-auto max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle>{action} on {entity_name}</DialogTitle>
                                </DialogHeader>
                                {renderDetails(event)}
                            </DialogContent>
                        </Dialog>
                    </div>
                    {renderPreview(event)}
                </VerticalTimelineElement>
                );
            })}
            </VerticalTimeline>
          </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[80vh]">
        <Walkthrough
            steps={uploadWalkthroughSteps}
            isOpen={showUploadWalkthrough}
            onClose={() => setShowUploadWalkthrough(false)}
        />
        <div className="w-full max-w-lg text-right mb-4 flex justify-end items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowUploadWalkthrough(true)}>
                <HelpCircle className="w-5 h-5" />
            </Button>
            <ThemeToggle />
        </div>
        <Card className="w-full max-w-lg text-center" id="upload-card">
            <CardHeader>
            <CardTitle className="text-2xl font-headline">Upload Audit Log</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 p-8">
                <div className="flex flex-col items-center justify-center w-full">
                    <label htmlFor="csv-upload" className="w-full">
                        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">CSV file</p>
                            </div>
                            <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                        </div>
                    </label>

                    <div className="w-full mt-4 space-y-2">
                        {fileName && !isProcessingFile && <p className="text-sm font-medium text-center">Selected file: {fileName}</p>}
                        {isProcessingFile && (
                            <>
                                <p className="text-sm font-medium text-muted-foreground">Processing: {fileName}</p>
                                <Progress value={uploadProgress} className="w-full" />
                            </>
                        )}
                    </div>

                    <Button onClick={handleViewTimeline} disabled={!file || !!error || isProcessingFile} className="w-full mt-4">
                        {isProcessingFile ? (
                            <Loader className="mr-2 animate-spin" />
                        ) : (
                            <Eye className="mr-2" />
                        )}
                        {isProcessingFile ? 'Processing...' : 'View Timeline'}
                    </Button>
                </div>
                
                <div className="w-full flex items-center gap-2">
                    <hr className="w-full border-border"/>
                    <span className="text-xs text-muted-foreground">OR</span>
                    <hr className="w-full border-border"/>
                </div>

                <Button id="demo-button" onClick={handleDemo} disabled={isDemoLoading} className="w-full">
                    {isDemoLoading ? (
                        <Loader className="mr-2 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2" />
                    )}
                    View Demo
                </Button>
                
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </CardContent>
        </Card>
    </div>
  );
}

    