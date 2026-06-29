// Web Worker: all file parsing and row processing happens here, off the main thread.
// The CSV ArrayBuffer is transferred (zero-copy) so postMessage never blocks the main thread.
import Papa from 'papaparse';

const formatTimestamp = (ts: string | undefined): string => {
  if (!ts || ts === 'NULL') return '';
  const isoMatch = ts.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3,}))?/);
  if (isoMatch) {
    const [_, y, m, d, hh, mm, ss = '00', ms = '000'] = isoMatch;
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}.${ms.substring(0, 3)}`;
  }
  const ddmmyyyyMatch = ts.match(/^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3,}))?/);
  if (ddmmyyyyMatch) {
    const [_, d, m, y, hh, mm, ss = '00', ms = '000'] = ddmmyyyyMatch;
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}.${ms.substring(0, 3)}`;
  }
  return ts;
};

const getRawTime = (ts: string | undefined): number => {
  if (!ts || ts === 'NULL') return 0;
  const formatted = formatTimestamp(ts);
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (match) {
    const [_, y, m, d, hh, mm, ss, ms] = match;
    return Number(`${y}${m}${d}${hh}${mm}${ss}${ms}`);
  }
  const digits = ts.replace(/\D/g, '');
  return digits ? Number(digits.substring(0, 15)) : 0;
};

const isAuditFormat = (row: any) =>
  'created_timestamp' in row && 'action' in row && 'entity_name' in row;

const processAuditData = (events: any[]): any[] => {
  const audit = events.length > 0 && isAuditFormat(events[0]);

  return events
    .filter(event => {
      if (!audit) return true;
      // Drop blank/corrupted rows — must have at least entity_name or created_timestamp
      const hasEntity = event.entity_name && String(event.entity_name).trim() !== '';
      const hasTimestamp = event.created_timestamp && String(event.created_timestamp).trim() !== '';
      return hasEntity || hasTimestamp;
    })
    .map(event => {
      let parsed_payload: any = null;
      let parsed_difference_list: any = null;
      let payload_updated_ts: string | null = null;

      if (event.payload && event.payload !== 'NULL') {
        try {
          parsed_payload = JSON.parse(event.payload);
          payload_updated_ts = parsed_payload.updatedTimestamp || parsed_payload.updated_timestamp;
          if (parsed_payload.differences && Array.isArray(parsed_payload.differences)) {
            parsed_difference_list = parsed_payload.differences;
            if (!payload_updated_ts) {
              const uTs = parsed_payload.differences.find((d: any) => d.field === 'updatedTimestamp');
              if (uTs) payload_updated_ts = uTs.newValue;
            }
          }
        } catch (e) {}
      }

      if (event.difference_list && event.difference_list !== 'NULL' && !parsed_difference_list) {
        try {
          parsed_difference_list = JSON.parse(event.difference_list);
          if (Array.isArray(parsed_difference_list) && !payload_updated_ts) {
            const uTs = parsed_difference_list.find((d: any) => d.field === 'updatedTimestamp');
            if (uTs) payload_updated_ts = uTs.newValue;
          }
        } catch (e) {}
      }

      const business_timestamp = formatTimestamp(payload_updated_ts || event.created_timestamp);
      const raw_business_time = getRawTime(payload_updated_ts || event.created_timestamp);

      let display_user: string | null = null;
      const actionLower = (event.action || '').toLowerCase();
      if (actionLower.includes('create')) {
        display_user = parsed_payload?.createdby || parsed_payload?.created_by || null;
      } else if (actionLower.includes('update')) {
        display_user = parsed_payload?.updatedby || parsed_payload?.updated_by || null;
      }

      return {
        ...event,
        parsed_payload,
        parsed_difference_list,
        _searchable_text: null,
        business_timestamp,
        raw_business_time,
        display_user,
      };
    });
};

self.addEventListener('message', (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'PARSE_CSV') {
    // Decode the transferred ArrayBuffer — fast, and entirely off the main thread
    const text = new TextDecoder('utf-8').decode(e.data.buffer as ArrayBuffer);
    const allRows: any[] = [];

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 512, // 512 KB chunks — yields control and reports progress
      chunk: (results: any) => {
        allRows.push(...results.data);
        self.postMessage({ type: 'PROGRESS', count: allRows.length });
      },
      complete: () => {
        try {
          const processed = processAuditData(allRows);
          self.postMessage({ type: 'COMPLETE', data: processed });
        } catch (err: any) {
          self.postMessage({ type: 'ERROR', message: err.message });
        }
      },
      error: (err: any) => {
        self.postMessage({ type: 'ERROR', message: err.message });
      },
    });
  }

  if (type === 'PROCESS_ROWS') {
    try {
      const processed = processAuditData(e.data.rows);
      self.postMessage({ type: 'COMPLETE', data: processed });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', message: err.message });
    }
  }
});
