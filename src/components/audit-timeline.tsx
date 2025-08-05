'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, File, Lock, User, UserPlus } from 'lucide-react';

interface AuditEvent {
  TimeStamp: string;
  User: string;
  'Audit Event': string;
  [key: string]: string;
}

const getIconForEvent = (eventType: string) => {
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
    const fetchData = async () => {
      try {
        const response = await fetch('/audit_log.csv');
        if (!response.ok) {
          throw new Error('Failed to fetch audit log: ' + response.statusText);
        }
        const text = await response.text();
        Papa.parse<AuditEvent>(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results.data);
            setLoading(false);
          },
          error: (err: any) => {
            setError('Failed to parse CSV file.');
            setLoading(false);
          }
        });
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center">Loading audit data...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <VerticalTimeline>
      {data.map((event, index) => {
        const { TimeStamp, User, 'Audit Event': auditEvent, ...otherDetails } = event;
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
