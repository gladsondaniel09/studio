'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { format } from 'date-fns';
import { AlertTriangle, File, Lock, User, UserPlus, UploadCloud, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface AuditEvent {
  TimeStamp: string;
  User: string;
  'Audit Event': string;
  Payload?: string;
  Difference?: string;
  [key: string]: any;
}

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
  return <File />;
};

const renderDetails = (event: AuditEvent) => {
  const { 'Audit Event': auditEvent, Payload, Difference, TimeStamp, User, ...otherDetails } = event;
  const lowerCaseEvent = auditEvent.toLowerCase();

  if (lowerCaseEvent.includes('create') && Payload) {
    return <p className="text-sm">{Payload}</p>;
  }

  if ((lowerCaseEvent.includes('update') || lowerCaseEvent.includes('delete')) && Difference) {
    return <p className="text-sm">{Difference}</p>;
  }

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
      {Object.entries(otherDetails).map(([key, value]) => {
        if (!value) return null;
        return (
          <div key={key}>
            <p className="font-bold text-sm">{key}</p>
            <p className="text-sm">{value}</p>
          </div>
        );
      })}
    </div>
  );
}


export default function AuditTimeline() {
  const [data, setData] = useState<AuditEvent[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'timeline'>('upload');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setData([]);
    const targetFile = e.target.files?.[0];
    if (targetFile) {
        if (targetFile.type !== 'text/csv') {
            setError('Please upload a valid CSV file.');
            setFile(null);
            setFileName(null);
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
              const parsedData = results.data as AuditEvent[];
              const validData = parsedData.filter(row => row.TimeStamp && row['Audit Event']);
              if (validData.length === 0) {
                  setError('CSV file is empty, invalid, or does not contain required "TimeStamp" and "Audit Event" columns.');
                  setView('upload');
              } else {
                  setData(validData);
                  setView('timeline');
              }
          },
          error: (err: any) => {
              setError('Failed to parse CSV file: ' + err.message);
              setView('upload');
          }
      });
  };

  const handleUploadNew = () => {
    setView('upload');
    setData([]);
    setFileName(null);
    setFile(null);
    setError(null);
  }

  if (view === 'timeline') {
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                 <h1 className="text-2xl font-bold font-headline text-foreground flex items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary"><path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 7.82566 4.41707 4.33857 7.99933 2.99961M12 2V12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2C6.47715 2 2 6.47715 2 12C2 16.1743 4.41707 19.6614 7.99933 21.0004" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"/></svg>
                    Audit Log Timeline
                </h1>
                <Button onClick={handleUploadNew}>Upload New File</Button>
            </div>
            <VerticalTimeline lineColor={'hsl(var(--border))'}>
            {data.map((event, index) => {
                const { TimeStamp, User, 'Audit Event': auditEvent } = event;
                 if (!TimeStamp || !auditEvent) {
                    return null;
                }
                const eventDate = new Date(TimeStamp);
                const icon = getIconForEvent(auditEvent);
                const isSuccess = event.Status?.toLowerCase() === 'success';

                return (
                <VerticalTimelineElement
                    key={index}
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
                        boxShadow: '0 0 0 4px hsl(var(--background)), 0 0 0 8px hsl(var(--primary))'
                    }}
                    icon={icon}
                >
                    <h3 className="vertical-timeline-element-title text-lg font-bold text-left">{auditEvent}</h3>
                    <h4 className="vertical-timeline-element-subtitle text-muted-foreground text-left">{User}</h4>
                    {renderDetails(event)}
                </VerticalTimelineElement>
                );
            })}
            </VerticalTimeline>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[60vh]">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Upload Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 p-8">
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

            {fileName && <p className="text-sm font-medium">Selected file: {fileName}</p>}
            
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            <Button onClick={handleViewTimeline} disabled={!file} className="w-full">
                <Eye className="mr-2"/>
                View Timeline
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
