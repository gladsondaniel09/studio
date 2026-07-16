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

// Some DB→CSV exports don't escape quotes/newlines inside the payload JSON blob properly.
// That makes PapaParse (and Excel) lose track of column boundaries partway through a row,
// so the rest of that record spills out as one or more garbled "fragment" rows — each
// missing entity_name/action and holding a few stray characters in the wrong column.
// Rather than dropping that data (losing evidence) or letting it fragment the grid across
// many broken-looking rows, we glue every fragment following a real row back into a single
// synthetic row so the whole mess lands in exactly one cell.
const isFragmentRow = (event: any): boolean => {
  const hasEntity = event.entity_name && String(event.entity_name).trim() !== '';
  const hasAction = event.action && String(event.action).trim() !== '';
  return !hasEntity || !hasAction;
};

const MAX_MERGED_FRAGMENT_CHARS = 200_000;

const reassembleBrokenRows = (events: any[]): any[] => {
  const result: any[] = [];
  let fragmentBuffer: any[] = [];

  const flushFragments = () => {
    if (fragmentBuffer.length === 0) return;
    const lastGood = result[result.length - 1];
    let mergedText = fragmentBuffer
      .map(row => Object.values(row).filter(v => v !== undefined && v !== null && v !== '').join(','))
      .join('\n');
    if (mergedText.length > MAX_MERGED_FRAGMENT_CHARS) {
      mergedText = mergedText.slice(0, MAX_MERGED_FRAGMENT_CHARS) + '\n[TRUNCATED — fragment too large to display in full]';
    }
    result.push({
      created_timestamp: lastGood?.created_timestamp ?? '',
      action: 'PARSE_ERROR',
      entity_name: 'UnparsedFragment',
      entity_id: null,
      parent_id: lastGood?.entity_id ?? null,
      table_name: lastGood?.table_name ?? null,
      payload: mergedText,
      difference_list: null,
      updated_by: null,
      created_by: null,
      tenant_id: lastGood?.tenant_id ?? null,
    });
    fragmentBuffer = [];
  };

  for (const event of events) {
    if (isFragmentRow(event)) {
      fragmentBuffer.push(event);
    } else {
      flushFragments();
      result.push(event);
    }
  }
  flushFragments();

  return result;
};

// Some entities (e.g. PostHistoryEntity, which embeds a full downstream system's response/input
// payload as an escaped string inside its differences array) can carry a legitimate — not broken —
// payload of several megabytes. JSON.parse/stringify on every such row, and duplicating the parsed
// object graph into the postMessage sent back to the main thread, is enough to stall the UI. Past
// this size we skip structural parsing and pull just the one field (updatedTimestamp) we need via a
// cheap regex instead; the full raw string is still kept and remains viewable via Raw Details.
const MAX_PARSE_CHARS = 200_000;

const extractUpdatedTimestamp = (raw: string): string | null => {
  const match = raw.match(/"updated[_]?[Tt]imestamp"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
};

const processAuditData = (events: any[]): any[] => {
  const audit = events.length > 0 && isAuditFormat(events[0]);

  const cleaned = audit ? reassembleBrokenRows(events) : events;

  return cleaned
    .map((event, index) => {
      let parsed_payload: any = null;
      let parsed_difference_list: any = null;
      let payload_updated_ts: string | null = null;
      let payload_oversized = false;

      if (event.payload && event.payload !== 'NULL') {
        if (event.payload.length > MAX_PARSE_CHARS) {
          payload_oversized = true;
          payload_updated_ts = extractUpdatedTimestamp(event.payload);
        } else {
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
      }

      if (event.difference_list && event.difference_list !== 'NULL' && !parsed_difference_list) {
        if (event.difference_list.length > MAX_PARSE_CHARS) {
          payload_oversized = true;
          if (!payload_updated_ts) payload_updated_ts = extractUpdatedTimestamp(event.difference_list);
        } else {
          try {
            parsed_difference_list = JSON.parse(event.difference_list);
            if (Array.isArray(parsed_difference_list) && !payload_updated_ts) {
              const uTs = parsed_difference_list.find((d: any) => d.field === 'updatedTimestamp');
              if (uTs) payload_updated_ts = uTs.newValue;
            }
          } catch (e) {}
        }
      }

      const business_timestamp = formatTimestamp(payload_updated_ts || event.created_timestamp);
      const raw_business_time = getRawTime(payload_updated_ts || event.created_timestamp);

      // Prefer the row-level created_by/updated_by columns (always present, regardless of payload
      // size or casing) over digging into the parsed payload, which uses inconsistent key casing
      // (createdBy/createdby/created_by depending on export) across entity types.
      let display_user: string | null = null;
      const actionLower = (event.action || '').toLowerCase();
      if (actionLower.includes('create')) {
        display_user = event.created_by || parsed_payload?.createdBy || parsed_payload?.createdby || parsed_payload?.created_by || null;
      } else if (actionLower.includes('update')) {
        display_user = event.updated_by || parsed_payload?.updatedBy || parsed_payload?.updatedby || parsed_payload?.updated_by || null;
      }

      return {
        ...event,
        // Guaranteed-unique key so react-data-grid never collapses rows that share
        // (or lack) an id/timestamp. Without this, fragment rows render blank.
        _rowId: index,
        parsed_payload,
        parsed_difference_list,
        payload_oversized,
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

  if (type === 'UNPARSE_CSV') {
    // CSV export (Download CSV) can involve the full dataset, including any large payload
    // fields — running Papa.unparse here instead of on the main thread keeps the button click
    // from freezing the tab while it serializes potentially tens of megabytes of text.
    try {
      const csv = Papa.unparse(e.data.rows);
      self.postMessage({ type: 'UNPARSE_COMPLETE', csv });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', message: err.message });
    }
  }
});
