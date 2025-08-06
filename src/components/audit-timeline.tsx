

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { format } from 'date-fns';
import { AlertTriangle, File, Lock, User, UserPlus, UploadCloud, Eye, ArrowRight, Search, Maximize, Code, Sparkles, Loader, ArrowUp, ArrowDown, Copy, HelpCircle, Wand2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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


const RawJsonViewer = ({ jsonString, title }: { jsonString: string | undefined, title: string }) => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    if (!jsonString) return null;

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

const renderDetails = (event: AuditEvent) => {
    const { action, payload, difference_list } = event;
    const lowerCaseAction = action.toLowerCase();
    
    let formattedView = null;
    let rawPayload = null;
    let rawDiffList = null;

    try {
        if (payload) rawPayload = JSON.parse(payload);
    } catch (e) {
        rawPayload = payload;
    }

    try {
        if (difference_list) rawDiffList = JSON.parse(difference_list);
    } catch(e) {
        rawDiffList = difference_list;
    }
    
    if ((lowerCaseAction.includes('create') || lowerCaseAction.includes('insert')) && rawPayload) {
        const entries = Object.entries(rawPayload);
        if (entries.length > 0) {
            formattedView = <DetailView items={entries} type="key-value" />;
        } else {
             formattedView = <p className="text-sm">{payload}</p>;
        }
    }

    else if ((lowerCaseAction.includes('update')) && rawDiffList) {
        if (Array.isArray(rawDiffList) && rawDiffList.length > 0) {
            formattedView = <DetailView items={rawDiffList} type="diff" />;
        } else {
             formattedView = <p className="text-sm mt-4">{difference_list}</p>;
        }
    }

    else if (lowerCaseAction.includes('delete') && rawPayload) {
         const entries = Object.entries(rawPayload);
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
                
                {(payload || difference_list) && (
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

const renderPreview = (event: AuditEvent) => {
    const { action, payload, difference_list } = event;
    const lowerCaseAction = action.toLowerCase();
    const PREVIEW_LIMIT = 2;

    try {
        if ((lowerCaseAction.includes('create') || lowerCaseAction.includes('insert') || lowerCaseAction.includes('delete')) && payload) {
            const parsedPayload = JSON.parse(payload);
            const entries = Object.entries(parsedPayload);
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

        if (lowerCaseAction.includes('update') && difference_list) {
            const differences = JSON.parse(difference_list);
            if (differences.length > 0) {
                 return (
                    <div className="text-xs mt-2 space-y-1 text-left">
                        {differences.slice(0, PREVIEW_LIMIT).map((diff: any, index: number) => (
                             <p key={index} className="truncate min-w-0">
                                <span className="font-semibold capitalize">{(diff.label || diff.field).replace(/_/g, ' ')}: </span>
                                <span className="text-muted-foreground line-through">{String(diff.oldValue ?? 'none')}</span>
                                <ArrowRight className="w-3 h-3 text-primary inline mx-1" />
                                <span className='text-foreground'>{String(diff.newValue ?? 'none')}</span>
                            </p>
                        ))}
                        {differences.length > PREVIEW_LIMIT && (
                            <p className="text-muted-foreground">...and {differences.length - PREVIEW_LIMIT} more changes.</p>
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


const logicalSortOrder = [
    'trade',
    'plannedobligation',
    'tradecost',
    'cost',
    'shipment',
    'container',
    'stock',
    'movement',
    'actualization',
    'actualizedquantityobligation',
    'pricing',
    'price',
    'cashflow',
    'invoice',
];

const getEntitySortKey = (entityName: string): number => {
    const lowerEntityName = entityName.toLowerCase();

    // Handle specific cases first to avoid broad matches
    if (lowerEntityName.includes('plannedobligation')) return 1;
    if (lowerEntityName.includes('tradecost')) return 2;
    if (lowerEntityName.includes('cost')) return 3;
    if (lowerEntityName.includes('trade')) return 0;

    // Handle the rest of the order
    const index = logicalSortOrder.findIndex(key => lowerEntityName.includes(key));
    return index === -1 ? logicalSortOrder.length : index;
};

const getTradeId = (event: AuditEvent): string | null => {
    if (event.payload) {
        try {
            const parsed = JSON.parse(event.payload);
            return parsed.tradeId || parsed.uuid || null;
        } catch {
            // Check for tradeId in the root object for non-payload events
            const anyEvent = event as any;
            return anyEvent.tradeId || null;
        }
    }
     const anyEvent = event as any;
     return anyEvent.tradeId || null;
}


export default function AuditTimeline() {
  const [data, setData] = useState<AuditEvent[]>([]);
  const [logicallySortedData, setLogicallySortedData] = useState<AuditEvent[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'timeline'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortType, setSortType] = useState<'timestamp' | 'logical'>('timestamp');
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [selectedFlowEntities, setSelectedFlowEntities] = useState<string[] | null>(null);
  const { toast } = useToast();
  const [showUploadWalkthrough, setShowUploadWalkthrough] = useState(false);
  const [showTimelineWalkthrough, setShowTimelineWalkthrough] = useState(false);

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
      
      Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
              const parsedData = results.data as any[];
              const validData = parsedData.filter(row => row.created_timestamp && row.action);
              if (validData.length === 0) {
                  setError('CSV file is empty, invalid, or does not contain required "created_timestamp" and "action" columns.');
                  setView('upload');
              } else {
                  const validatedData = z.array(SampleEventSchema).safeParse(validData);
                  if (validatedData.success) {
                    setData(validatedData.data);
                  } else {
                    console.error(validatedData.error);
                    setError('CSV data does not match the expected format.');
                    setData(validData as AuditEvent[]); // Fallback to raw data for display
                  }
                  setView('timeline');
              }
          },
          error: (err: any) => {
              setError('Failed to parse CSV file: ' + err.message);
              setView('upload');
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
        setData(validatedData.data);
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

  const handleLogicalSort = () => {
    if (sortType === 'logical') {
        setSortType('timestamp');
        return;
    }

    if (logicallySortedData) {
        setSortType('logical');
        return;
    }

    const sorted = [...data].sort((a, b) => {
        const aKey = getEntitySortKey(a.entity_name);
        const bKey = getEntitySortKey(b.entity_name);
        if (aKey !== bKey) {
            return aKey - bKey;
        }

        // Secondary sort by tradeId to group related events
        const aTradeId = getTradeId(a);
        const bTradeId = getTradeId(b);

        if (aTradeId && bTradeId && aTradeId !== bTradeId) {
            return aTradeId.localeCompare(bTradeId);
        }
        
        // Tertiary sort by original timestamp
        return new Date(a.created_timestamp).getTime() - new Date(b.created_timestamp).getTime();
    });
    
    setLogicallySortedData(sorted);
    setSortType('logical');
  }

  const handleUploadNew = () => {
    setView('upload');
    setData([]);
    setLogicallySortedData(null);
    setFileName(null);
    setFile(null);
    setError(null);
    setSearchTerm('');
    setSelectedEntity('all');
    setSelectedAction('all');
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
    return ['all', ...uniqueEntities];
  }, [data]);

  const actions = useMemo(() => {
    const uniqueActions = [...new Set(data.map(event => event.action).filter(Boolean))];
    return ['all', ...uniqueActions];
  }, [data]);

  const filteredData = useMemo(() => {
    const sourceData = sortType === 'logical' && logicallySortedData ? logicallySortedData : data;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const deepSearch = (obj: any): boolean => {
        if (obj === null || obj === undefined) return false;
        if (typeof obj !== 'object') {
            return String(obj).toLowerCase().includes(lowerCaseSearchTerm);
        }
        return Object.values(obj).some(value => deepSearch(value));
    };
    
    const dataToFilter = sourceData.filter(event => {
        const entityName = event.entity_name.toLowerCase();
        let flowMatch = !selectedFlowEntities;

        if (selectedFlowEntities) {
            if (selectedFlowEntities.includes('trade')) {
                // Special handling for the "trade" stage to exclude costs
                flowMatch = selectedFlowEntities.some(e => entityName.includes(e) && !entityName.includes('cost') && !entityName.includes('cashflow'));
            } else {
                flowMatch = selectedFlowEntities.some(e => entityName.includes(e));
            }
        }
        
        const entityMatch = selectedEntity === 'all' || event.entity_name === selectedEntity;
        const actionMatch = selectedAction === 'all' || event.action === selectedAction;
        
        if (!flowMatch || !entityMatch || !actionMatch) return false;
        
        if (searchTerm === '') {
            return true;
        }

        // Create a copy of the event to search, without the original payload/diff list to avoid double searching
        const eventToSearch: any = { ...event };
        delete eventToSearch.payload;
        delete eventToSearch.difference_list;
        
        let searchMatch = deepSearch(eventToSearch);

        if (!searchMatch) {
            try {
                if (event.payload) {
                    const parsedPayload = JSON.parse(event.payload);
                    searchMatch = deepSearch(parsedPayload);
                }
                if (!searchMatch && event.difference_list) {
                    const parsedDiff = JSON.parse(event.difference_list);
                    searchMatch = deepSearch(parsedDiff);
                }
            } catch(e) {
                // Fallback to searching the raw string if JSON parsing fails
                if (event.payload?.toLowerCase().includes(lowerCaseSearchTerm)) searchMatch = true;
                if (event.difference_list?.toLowerCase().includes(lowerCaseSearchTerm)) searchMatch = true;
            }
        }

        return searchMatch;
    });

    if (sortType === 'timestamp') {
        return [...dataToFilter].sort((a, b) => {
            const dateA = new Date(a.created_timestamp).getTime();
            const dateB = new Date(b.created_timestamp).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }

    return dataToFilter;

  }, [data, logicallySortedData, searchTerm, selectedEntity, selectedAction, sortOrder, sortType, selectedFlowEntities]);


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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary"><path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 7.82566 4.41707 4.33857 7.99933 2.99961M12 2V12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2C6.47715 2 2 6.47715 2 12C2 16.1743 4.41707 19.6614 7.99933 21.0004" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"/></svg>
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
                    <Select value={selectedAction} onValueChange={setSelectedAction}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by action" />
                        </SelectTrigger>
                        <SelectContent>
                            {actions.map(action => (
                                <SelectItem key={action} value={action}>
                                    {action === 'all' ? 'All Actions' : action}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by entity" />
                        </SelectTrigger>
                        <SelectContent>
                            {entities.map(entity => (
                                <SelectItem key={entity} value={entity}>
                                    {entity === 'all' ? 'All Entities' : entity}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="w-full sm:w-auto" disabled={sortType === 'logical'}>
                        {sortOrder === 'desc' ? <ArrowDown className="mr-2 h-4 w-4" /> : <ArrowUp className="mr-2 h-4 w-4" />}
                        Sort {sortOrder === 'desc' ? 'Desc' : 'Asc'}
                    </Button>
                    <Button variant={sortType === 'logical' ? 'default' : 'outline'} onClick={handleLogicalSort} className="w-full sm:w-auto">
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
                    date={sortType === 'timestamp' ? format(eventDate, "PPpp") : 'Logically Sorted'}
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

                    {fileName && <p className="text-sm font-medium mt-4">Selected file: {fileName}</p>}
                    
                    <Button onClick={handleViewTimeline} disabled={!file || !!error} className="w-full mt-4">
                        <Eye className="mr-2"/>
                        View Timeline
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
