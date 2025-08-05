'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import { format } from 'date-fns';
import { AlertTriangle, File, Lock, User, UserPlus } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Papa.parse('/audit_log.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data as AuditEvent[]);
        setLoading(false);
      },
      error: (err: any) => {
        setError('Failed to load or parse CSV file: ' + err.message);
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return <div className="text-center">Loading and parsing audit log...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
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
  );
}
