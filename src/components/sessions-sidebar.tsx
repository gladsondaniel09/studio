'use client';

import { useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  deleteSession,
  downloadSessionFile,
  getSessionAnalyses,
  type SessionDocWithId,
  type AnalysisDocWithId,
} from '@/firebase/sessions';
import type { InvestigationContext } from '@/lib/types';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Trash2, ChevronDown, ChevronRight, Loader, Clock, FlaskConical, ListOrdered, CheckCircle2, Ban, Eye, PanelLeftClose } from 'lucide-react';

export type RestoreParams = {
  buffer: ArrayBuffer;
  fileName: string;
  storageRef: string;
  sessionId: string;
  // Present when restoring a saved analysis (re-run with its context); absent when just
  // viewing the session's raw data with no analysis to resume.
  context?: InvestigationContext;
  pendingAction?: 'analyse' | 'replicate';
};

type Props = {
  currentSessionId: string | null;
  onRestoreAnalysis: (params: RestoreParams) => void;
  onClose: () => void;
};

export default function SessionsSidebar({ currentSessionId, onRestoreAnalysis, onClose }: Props) {
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(
    () => query(collection(firestore, 'sessions'), orderBy('uploadedAt', 'desc')),
    [firestore],
  );
  const { data: sessions, isLoading } = useCollection<SessionDocWithId>(sessionsQuery);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisDocWithId[]>>({});
  const [loadingAnalysesId, setLoadingAnalysesId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const handleToggle = async (session: SessionDocWithId) => {
    if (expandedId === session.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(session.id);
    if (!analyses[session.id]) {
      setLoadingAnalysesId(session.id);
      try {
        const items = await getSessionAnalyses(firestore, session.id);
        setAnalyses(prev => ({ ...prev, [session.id]: items }));
      } finally {
        setLoadingAnalysesId(null);
      }
    }
  };

  const handleRestore = async (session: SessionDocWithId, analysis: AnalysisDocWithId) => {
    setRestoringId(analysis.id);
    try {
      const buffer = await downloadSessionFile(session.storageRef);
      onRestoreAnalysis({
        buffer,
        fileName: session.fileName,
        storageRef: session.storageRef,
        sessionId: session.id,
        context: analysis.context,
        pendingAction: analysis.type === 'forensic' ? 'analyse' : 'replicate',
      });
    } catch (e) {
      console.error('[RESTORE_ERROR]', e);
    } finally {
      setRestoringId(null);
    }
  };

  const handleView = async (session: SessionDocWithId) => {
    setViewingId(session.id);
    try {
      const buffer = await downloadSessionFile(session.storageRef);
      onRestoreAnalysis({
        buffer,
        fileName: session.fileName,
        storageRef: session.storageRef,
        sessionId: session.id,
      });
    } catch (e) {
      console.error('[VIEW_SESSION_ERROR]', e);
    } finally {
      setViewingId(null);
    }
  };

  const handleDelete = async (session: SessionDocWithId) => {
    if (!window.confirm(`Delete session "${session.fileName}"?\n\nThis will permanently remove the file and all saved analyses.`)) return;
    setDeletingId(session.id);
    try {
      await deleteSession(firestore, session.id, session.storageRef);
      if (expandedId === session.id) setExpandedId(null);
      // Remove from local analyses cache
      setAnalyses(prev => { const next = { ...prev }; delete next[session.id]; return next; });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-72 shrink-0 border-r bg-card flex flex-col h-full overflow-hidden">
      <div className="px-3 py-3 border-b shrink-0 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm">Session History</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Click the eye icon to view data, or an analysis to re-run it</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground"
          onClick={onClose}
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
            <Loader className="h-3 w-3 animate-spin" /> Loading sessions…
          </div>
        )}
        {!isLoading && (!sessions || sessions.length === 0) && (
          <p className="p-4 text-xs text-muted-foreground leading-relaxed">
            No saved sessions yet. Upload a file to get started.
          </p>
        )}

        <div className="p-2 space-y-1.5">
          {sessions?.map(session => {
            const isCurrent = session.id === currentSessionId;
            const isExpanded = expandedId === session.id;
            const isDeleting = deletingId === session.id;
            const isViewing = viewingId === session.id;
            const sessionAnalyses = analyses[session.id];

            return (
              <div
                key={session.id}
                className={cn(
                  'rounded-lg border transition-colors',
                  isCurrent
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/60 bg-background',
                )}
              >
                {/* Session header */}
                <div className="flex items-center gap-1 p-2">
                  <button
                    className="flex-1 min-w-0 flex items-start gap-1.5 text-left"
                    onClick={() => handleToggle(session)}
                  >
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    }
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate leading-tight">{session.fileName}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground">
                          {format(session.uploadedAt.toDate(), 'MMM d, HH:mm')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · {session.rowCount.toLocaleString()} rows
                        </span>
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => handleView(session)}
                    disabled={isViewing}
                    title="View data"
                  >
                    {isViewing
                      ? <Loader className="h-3 w-3 animate-spin" />
                      : <Eye className="h-3 w-3" />
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(session)}
                    disabled={isDeleting}
                    title="Delete session"
                  >
                    {isDeleting
                      ? <Loader className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />
                    }
                  </Button>
                </div>

                {/* Analyses list */}
                {isExpanded && (
                  <div className="border-t mx-1 mb-1 pt-0.5">
                    {loadingAnalysesId === session.id && (
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground">
                        <Loader className="h-3 w-3 animate-spin" /> Loading…
                      </div>
                    )}
                    {sessionAnalyses?.length === 0 && (
                      <p className="px-3 py-2 text-[10px] text-muted-foreground">
                        No analyses saved for this session yet.
                      </p>
                    )}
                    {sessionAnalyses?.map(analysis => {
                      const isRestoring = restoringId === analysis.id;
                      return (
                        <button
                          key={analysis.id}
                          disabled={isRestoring}
                          onClick={() => handleRestore(session, analysis)}
                          className="w-full text-left p-2 rounded hover:bg-muted/60 transition-colors disabled:opacity-60 mt-0.5 group"
                        >
                          <div className="flex items-start gap-1.5">
                            {analysis.type === 'forensic'
                              ? <FlaskConical className="h-3 w-3 shrink-0 mt-0.5 text-blue-500" />
                              : <ListOrdered className="h-3 w-3 shrink-0 mt-0.5 text-purple-500" />
                            }
                            <span className="text-[10px] font-medium text-foreground/80 line-clamp-2 leading-tight">
                              {analysis.resultTitle}
                            </span>
                            {analysis.outcome === 'fixed' && <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />}
                            {analysis.outcome === 'not_applicable' && <Ban className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5 truncate pl-4">
                            {format(analysis.createdAt.toDate(), 'MMM d, HH:mm')}
                            {analysis.context?.customer ? ` · ${analysis.context.customer}` : ''}
                            {analysis.context?.ticketId ? ` · ${analysis.context.ticketId}` : ''}
                          </p>
                          {isRestoring && (
                            <div className="flex items-center gap-1 mt-0.5 pl-4">
                              <Loader className="h-2.5 w-2.5 animate-spin text-primary" />
                              <span className="text-[9px] text-primary">Downloading & restoring…</span>
                            </div>
                          )}
                          {!isRestoring && (
                            <p className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 pl-4">
                              Click to re-run →
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
