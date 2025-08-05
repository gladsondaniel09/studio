'use client';

import { useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Eye, File, Lock, Upload, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from './ui/input';

interface AuditEvent {
  TimeStamp: string;
  User: string;
  'Audit Event': string;
  [key: string]: string;
}

const getIconForEvent = (eventType: string) => {
  if (typeof eventType !== 'string') {
    return <File />;
  }
  if (eventType.toLowerCase().includes('login')) {
    return <Lock />;
  }
  if (eventType.toLowerCase().includes('upload') || eventType.toLowerCase().includes('download')) {
    return <File />;
  }
  if (eventType.toLowerCase().includes('deactivated')) {
    return <AlertTriangle />;
  }
  if (eventType.toLowerCase().includes('user')) {
    return <User />;
  }
  return <UserPlus />;
};


export default function AuditTimeline() {
  const [data, setData] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      setError(null);
      setData([]);
      setShowTimeline(false);
      setFileName(file.name);

      Papa.parse<AuditEvent>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
          setLoading(false);
        },
        error: (err: any) => {
          setError('Failed to parse CSV file: ' + err.message);
          setLoading(false);
        }
      });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setData([]);
    setFileName('');
    setError(null);
    setShowTimeline(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    handleUploadClick();
  }

  if (loading) {
    return <div className="text-center">Parsing CSV file...</div>;
  }

  if (showTimeline) {
      return (
        <div>
            <div className="text-center mb-8">
                <Button onClick={handleReset} variant="outline">
                    <Upload className="mr-2" />
                    Upload another CSV
                </Button>
                <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".csv"
                />
            </div>
            <VerticalTimeline>
              {data.map((event, index) => {
                const { TimeStamp, User, 'Audit Event': auditEvent, ...otherDetails } = event;
                if (!TimeStamp || !auditEvent) {
                  return null;
                }
                const eventDate = new Date(TimeStamp);
                const icon = getIconForEvent(auditEvent);
                const isSuccess = otherDetails.Status?.toLowerCase() === 'success';

                return (
                  <VerticalTimelineElement
                    key={index}
                    className="vertical-timeline-element--work"
                    contentStyle={{  borderTop: `4px solid ${isSuccess ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}` }}
                    date={format(eventDate, "PPpp")}
                    iconStyle={{ background: isSuccess ? 'hsl(var(--accent))' : 'hsl(var(--destructive))', color: '#fff' }}
                    icon={icon}
                  >
                    <h3 className="vertical-timeline-element-title text-lg font-bold">{auditEvent}</h3>
                    <h4 className="vertical-timeline-element-subtitle text-muted-foreground">{User}</h4>
                    <div className="mt-4 flex flex-wrap gap-4">
                      {Object.entries(otherDetails).map(([key, value]) => (
                        <div key={key} className="flex-1 min-w-[120px]">
                          <p className="font-bold text-sm">{key}</p>
                          <p className="text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                  </VerticalTimelineElement>
                );
              })}
            </VerticalTimeline>
        </div>
      );
  }

  return (
    <Card className="max-w-md mx-auto">
        <CardHeader>
            <CardTitle className="text-center">Upload Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
             <p className="mb-4 text-muted-foreground">Select a CSV file to visualize the audit timeline.</p>
            <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".csv"
            />
            {!fileName && (
              <Button onClick={handleUploadClick} disabled={loading}>
                  <Upload className="mr-2" />
                  {loading ? 'Uploading...' : 'Upload CSV'}
              </Button>
            )}

            {fileName && !error && (
              <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground">Selected file: {fileName}</p>
                  <Button onClick={() => setShowTimeline(true)}>
                      <Eye className="mr-2" />
                      View Timeline
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="sm">
                      Choose a different file
                  </Button>
              </div>
            )}
            {error && <div className="text-center text-red-500 mt-4">Error: {error}</div>}
        </CardContent>
    </Card>
)
}