'use client';

import { useState, useMemo } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

interface RawJsonViewerProps {
  jsonString: string | undefined;
  title: string;
}

/**
 * A reusable component for viewing raw JSON with search and copy capabilities.
 * Enhanced for high-fidelity forensic inspection.
 */
export const RawJsonViewer = ({ jsonString, title }: RawJsonViewerProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!jsonString || jsonString === 'NULL' || jsonString === undefined) {
    return (
      <div className="flex flex-col h-full border rounded-md bg-muted/5 items-center justify-center p-8 text-muted-foreground italic text-xs">
        No {title} available
      </div>
    );
  }

  const formattedJson = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonString;
    }
  }, [jsonString]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setIsCopied(true);
    toast({ title: 'Success', description: 'Content copied to clipboard.' });
    setTimeout(() => setIsCopied(false), 2000);
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
    <div className="flex flex-col h-full min-h-0 border-0 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b shrink-0">
        <h4 className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground">{title} Source</h4>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-[11px] w-48 bg-background focus-visible:ring-1"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy} 
            className="h-8 gap-1.5 text-[11px] font-medium"
          >
            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {isCopied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 bg-[#F8F9FB] dark:bg-[#0D1117]">
        <div className="p-6 select-text selection:bg-primary/20">
          <pre className="font-mono text-[12px] leading-relaxed text-foreground/90 whitespace-pre">
            {highlightedJson}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
};
