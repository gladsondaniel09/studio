'use client';

import { useState, useMemo } from 'react';
import { Search, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

interface RawJsonViewerProps {
  jsonString: string | undefined;
  title: string;
}

/**
 * A reusable component for viewing raw JSON with search and copy capabilities.
 */
export const RawJsonViewer = ({ jsonString, title }: RawJsonViewerProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  if (!jsonString || jsonString === 'NULL' || jsonString === undefined) {
    return (
      <div className="flex flex-col h-full border rounded-md bg-muted/5 items-center justify-center p-8 text-muted-foreground italic text-xs">
        No {title} available
      </div>
    );
  }

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(jsonString);
  } catch (e) {
    parsedJson = jsonString;
  }
  
  const formattedJson = typeof parsedJson === 'string' ? parsedJson : JSON.stringify(parsedJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    toast({ title: 'Success', description: 'Content copied to clipboard.' });
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
    <div className="flex flex-col h-full min-h-0 border rounded-lg bg-card shadow-sm overflow-hidden border-border/60">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/60 shrink-0">
        <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">{title}</h4>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search keys/values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-[10px] w-40 bg-background/50 border-border/50 focus-visible:ring-1"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleCopy} className="h-7 w-7 border-border/50">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-muted/10 overflow-auto p-4 select-text selection:bg-primary/20">
        <pre className="font-mono text-[11px] leading-relaxed text-foreground/90 whitespace-pre">
          {highlightedJson}
        </pre>
      </div>
    </div>
  );
};
