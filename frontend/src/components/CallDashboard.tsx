/**
 * CallDashboard Component
 * 
 * Real-time call monitoring dashboard with WebSocket updates.
 * 
 * Structure:
 * - CallDashboard.tsx: Main component with table, WebSocket, state
 * - TranscriptModal.tsx: View call transcripts
 * - ListenModal.tsx: Live audio streaming
 * - RecordingModal.tsx: Playback recordings
 * 
 * Features:
 * - Real-time call list via WebSocket
 * - Live audio streaming (Listen button)
 * - Live transcript updates
 * - Call recording playback
 * - Force transfer to licensed agent
 */

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  getSortedRowModel,
  getFacetedUniqueValues,
  getFacetedRowModel,
  type FilterFn
} from "@tanstack/react-table";
import {
  RefreshCw,
  Download,
  Activity,
  AlertCircle,
  Smile,
  List,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ChevronDown,
  Loader2,
} from "lucide-react";

// NEW IMPORTS
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DataTableColumnHeader } from "./table/DataTableColumnHeader";
import { DataTableFacetedFilter } from "./table/DataTableFacetedFilter";
import { DataTableDateFilter } from "./table/DataTableDateFilter";
import { DataTableNumberFilter } from "./table/DataTableNumberFilter";
import { DateRangePicker } from "./DateRangePicker";
import type { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";
import { DataTableTextFilter } from "./table/DataTableTextFilter";
import { supabase } from "../lib/supabase"; // Import Supabase client

// ... existing imports ...
import { CallDetailSidebar } from "./CallDetailSidebar";
import { CopyButton } from "./CopyButton";
import { TranscriptModal } from "./TranscriptModal";
import { ListenModal } from "./ListenModal";
import { RecordingModal } from "./RecordingModal";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const formatPhoneNumber = (str: string | null | undefined) => {
  if (!str) return "-";
  const cleaned = str.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return str;
};

export type Call = {
  id: string;
  client_id?: string;
  phone_number?: string | null;
  status: string | null;
  started_at: string | null;
  created_at: string; // mandatory fallback
  ended_at: string | null;
  has_listen_url: boolean;
  user_id: string | null;
  username: string | null;
  duration?: number | null; // in seconds
  hasTranscript?: boolean;
  hasLiveTranscript?: boolean;
  hasFinalTranscript?: boolean;
  hasRecording?: boolean;
  recording_url?: string | null;

  // NEW: transcript fields
  live_transcript?: string | null;   // incremental transcript (for active calls)
  final_transcript?: string | null;  // final transcript from end-of-call-report
  summary?: { summary: string } | null;
  detailsLoaded?: boolean; // flag to indicate if heavy fields are loaded
  sentiment?: string | null; // Changed to string to allow normalized values
  disposition?: string | null; // NEW: Disposition field
  notes?: string | null;
  feedback_rating?: number | null;
  feedback_text?: string | null;
  signed_recording_url?: string | null;
};

// CUSTOM FILTER FUNCTIONS
const dateRangeFilter: FilterFn<Call> = (row, columnId, value) => {
  const dateStr = row.getValue(columnId) as string;
  if (!dateStr) return false;
  const date = new Date(dateStr).getTime();
  const { start, end } = value || {}; // value is { start?: string, end?: string }

  if (start) {
    const startDate = new Date(start).getTime();
    if (date < startDate) return false;
  }
  if (end) {
    const endDate = new Date(end).getTime();
    if (date > endDate) return false;
  }
  return true;
};

const numberRangeFilter: FilterFn<Call> = (row, columnId, value) => {
  const num = row.getValue(columnId) as number;
  const { min, max } = value || {}; // value is { min?: number, max?: number }

  if (typeof num !== 'number') return false;

  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};


// COLUMN DEFINITIONS
const columnHelper = createColumnHelper<Call>();

// DURATION TIMER COMPONENT
const DurationTimer: React.FC<{ call: Call }> = ({ call }) => {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    // If we have a static duration (ended call), just use it
    if (call.duration !== undefined && call.duration !== null) {
      setElapsed(call.duration);
      return;
    }

    // If call is active and we have started_at, calc live
    const status = (call.status || "").toLowerCase();
    const isActive = ["in-progress", "ringing", "queued"].includes(status);

    if (isActive) {
      // Use started_at if available, otherwise fallback to created_at
      const startTimeStr = call.started_at || call.created_at;
      if (startTimeStr) {
        const start = new Date(startTimeStr).getTime();

        const interval = setInterval(() => {
          const now = Date.now();
          const diffSeconds = Math.floor((now - start) / 1000);
          setElapsed(diffSeconds > 0 ? diffSeconds : 0);
        }, 1000);

        // Initial set
        const now = Date.now();
        const diffSeconds = Math.floor((now - start) / 1000);
        setElapsed(diffSeconds > 0 ? diffSeconds : 0);

        return () => clearInterval(interval);
      }
    }

    // Fallback if ended but no duration yet (e.g. just ended before report)
    if (call.ended_at) {
      // Use started_at or created_at
      const startTimeStr = call.started_at || call.created_at;
      if (startTimeStr) {
        const start = new Date(startTimeStr).getTime();
        const end = new Date(call.ended_at).getTime();
        const diff = Math.floor((end - start) / 1000);
        setElapsed(diff > 0 ? diff : 0);
      }
    } else {
      setElapsed(null);
    }

  }, [call.status, call.started_at, call.created_at, call.ended_at, call.duration]);

  if (elapsed === null) return <span>-</span>;

  // Format HH:MM:SS
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  const fmt = (n: number) => n.toString().padStart(2, "0");

  if (h > 0) {
    return <span>{fmt(h)}:{fmt(m)}:{fmt(s)}</span>;
  }
  return <span>{fmt(m)}:{fmt(s)}</span>;
};

const CallDashboard: React.FC<{ userInfo?: any }> = ({ userInfo }) => {
  // STATE: useState creates reactive variables that trigger re-renders when changed
  // Pattern: [value, setValue] = useState(initialValue)
  // STATE
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Filter / Tab State
  const [activeTab, setActiveTab] = useState<"all" | "live" | "transferred" | "followup" | "callback">("all");

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]); // NEW: State for column filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Modals
  const [transcriptModalCallId, setTranscriptModalCallId] = useState<string | null>(null);
  const [listenModalCallId, setListenModalCallId] = useState<string | null>(null);
  const [recordingModalCallId, setRecordingModalCallId] = useState<string | null>(null);
  // Force transfer state removed
  // const [userInfo, setUserInfo] = useState<any>(null); // Lifted to DashboardPage

  // FILTER LOGIC
  // REF: useRef stores a mutable value that persists across renders WITHOUT causing re-renders
  const wsRef = useRef<WebSocket | null>(null);

  const { filteredCalls, counts } = useMemo(() => {
    const counts = {
      all: 0,
      live: 0,
      transferred: 0,
      followup: 0,
      callback: 0
    };

    let filtered = calls;

    // 1. Date Range Filter
    if (dateRange?.from) {
      const start = startOfDay(dateRange.from);
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

      filtered = filtered.filter(c => {
        if (!c.created_at) return false;
        try {
          const d = new Date(c.created_at);
          return d >= start && d <= end;
        } catch (e) { return false; }
      });
    }

    // 2. Compute Counts on Filtered List
    filtered.forEach(c => {
      counts.all++;
      const s = (c.status || "").toLowerCase();
      const d = (c.disposition || "").toLowerCase();

      if (["in-progress", "ringing", "queued"].includes(s)) counts.live++;
      if (d === "transferred") counts.transferred++;
      if (d === "follow_up_needed") counts.followup++;
      if (d === "callback_requested") counts.callback++;
    });

    // 3. Apply Tab Filter
    filtered = filtered.filter(c => {
      const s = (c.status || "").toLowerCase();
      const d = (c.disposition || "").toLowerCase();

      if (activeTab === "all") return true;
      if (activeTab === "live") return ["in-progress", "ringing", "queued"].includes(s);
      if (activeTab === "transferred") return d === "transferred";
      if (activeTab === "followup") return d === "follow_up_needed";
      if (activeTab === "callback") return d === "callback_requested";
      return true;
    });

    return { filteredCalls: filtered, counts };
  }, [calls, activeTab, dateRange]);



  // COLUMNS CONFIGURATION
  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Call ID" filterComponent={<DataTableTextFilter column={column} title="ID" />} />,
      cell: (info) => (
        <div className="group flex items-center gap-2">
          <span className="text-slate-600">#{info.getValue().slice(0, 8).toUpperCase()}...</span>
          <CopyButton
            textToCopy={info.getValue()}
            title="Copy Call ID"
            className="opacity-0 group-hover:opacity-100"
            iconSize={12}
          />
        </div>
      ),
      enableSorting: true,
      enableHiding: false,
    }),
    columnHelper.accessor("phone_number", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Number" filterComponent={<DataTableTextFilter column={column} title="Phone" />} />,
      cell: (info) => (
        <div className="group flex items-center gap-1.5">
          <span className="font-medium text-slate-900">{formatPhoneNumber(info.getValue())}</span>
          {info.getValue() && (
            <CopyButton
              textToCopy={info.getValue() || ""}
              title="Copy Number"
              className="opacity-0 group-hover:opacity-100"
              iconSize={12}
            />
          )}
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.username || row.user_id || "Unknown", {
      id: "customer",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="User Name"
          filterComponent={
            <DataTableFacetedFilter
              column={column}
              title="User"
              options={[
                // Dynamic options would be better, but for now we can rely on facets if we passed all unique values. 
                // Or we can just extract unique users from the current data if we wanted to be explicit, 
                // but DataTableFacetedFilter uses column.getFacetedUniqueValues() internally so it should "just work" 
                // IF we enable faceted unique values in table options.
                // We will pass generic common options or empty for it to auto-discover? 
                // The component code loops `options`, so we DO need to provide them.
                // Let's create a dynamic list from the data inside the `options` prop if possible or pre-calculate.
                // However, inside `useMemo` of columns, `calls` dependency is present.
                ...Array.from(new Set(calls.map(c => c.username || c.user_id || "Unknown"))).map(u => ({ label: u, value: u }))
              ]}
            />
          }
        />
      ),
      cell: (info) => <span className="font-medium text-slate-900">{info.getValue()}</span>,
      filterFn: "arrIncludesSome", // Allow multi-select
      enableColumnFilter: true,
    }),
    columnHelper.accessor("created_at", {
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Call Time"
          filterComponent={<DataTableDateFilter column={column} title="Date" />}
        />
      ),
      cell: (info) => {
        const date = new Date(info.getValue());
        return (
          <span className="text-slate-500">
            {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
      filterFn: dateRangeFilter,
    }),
    columnHelper.accessor("duration", { // CHANGED to accessor for filtering
      id: "duration",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Duration"
          filterComponent={<DataTableNumberFilter column={column} title="Duration (s)" />}
        />
      ),
      cell: (props) => (
        <span className="font-mono text-slate-900 font-medium">
          <DurationTimer call={props.row.original} />
        </span>
      ),
      filterFn: numberRangeFilter,
    }),
    columnHelper.accessor((row) => {
      let val: string | null = row.sentiment ?? null;
      if (!val) return "N/A";

      // Shorten long phrases
      // Check case-insensitively
      const lower = val.toLowerCase();
      if (lower.includes("insufficient")) val = "Insufficient";
      else if (lower.includes("very satisfied")) val = "Very Satisfied";
      else if (lower.includes("very unsatisfied")) val = "V. Unsatisfied";

      return val
        .replace(/\b\w/g, c => c.toUpperCase());
    }, {
      id: "sentiment",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Sentiment"
          filterComponent={
            <DataTableFacetedFilter
              column={column}
              title="Sentiment"
              options={[
                { label: "Very Satisfied", value: "Very Satisfied", icon: Smile },
                { label: "Satisfied", value: "Satisfied", icon: Smile },
                { label: "Neutral", value: "Neutral", icon: Activity },
                { label: "Unsatisfied", value: "Unsatisfied", icon: AlertCircle },
                { label: "V. Unsatisfied", value: "V. Unsatisfied", icon: AlertCircle },
                { label: "Insufficient", value: "Insufficient", icon: AlertCircle }
              ]}
            />
          }
        />
      ),
      cell: (info) => {
        const val = info.getValue();

        if (val === "N/A") {
          return <span className="text-slate-400 italic">N/A</span>;
        }

        const normalizedKey = (val as string).toLowerCase().trim();

        const styles: Record<string, string> = {
          "very satisfied": "bg-emerald-100 text-emerald-800 border-emerald-200",
          "satisfied": "bg-emerald-50 text-emerald-700 border-emerald-100",
          "neutral": "bg-amber-50 text-amber-700 border-amber-100",
          "unsatisfied": "bg-red-50 text-red-700 border-red-100",
          "v. unsatisfied": "bg-red-100 text-red-800 border-red-200",
          "insufficient": "bg-slate-50 text-slate-600 border-slate-200"
        };

        const style = styles[normalizedKey] || styles["insufficient"];

        return (
          <Badge variant="outline" className={cn("border shadow-sm whitespace-nowrap", style)}>
            {val}
          </Badge>
        );
      },
      filterFn: "arrIncludesSome",
      enableColumnFilter: true, // Explicitly enable
    }),

    // MODIFIED: Disposition Column
    columnHelper.accessor((row) => {
      const s = (row.status || "").toLowerCase();
      if (["in-progress", "ringing", "queued"].includes(s)) return "Live";

      const val = row.disposition || row.status || "Unknown";
      if (!val || val === "Unknown") return "N/A";

      // Return raw value for filtering
      return (val as string).toLowerCase();
    }, {
      id: "disposition",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Disposition"
          filterComponent={
            <DataTableFacetedFilter
              column={column}
              title="Disposition"
              options={[
                { label: "Live", value: "Live" },
                { label: "Qualified", value: "qualified" },
                { label: "Disqualified", value: "disqualified" },
                { label: "Incomplete", value: "incomplete call" },
                { label: "Follow Up", value: "follow_up_needed" },
                { label: "Callback", value: "callback_requested" },
                { label: "Transferred", value: "transferred" },
                { label: "Do Not Call", value: "do_not_call" },
              ]}
            />
          }
        />
      ),
      cell: (info) => {
        const val = info.getValue() as string;

        if (val === "Live") {
          return (
            <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live
            </span>
          );
        }

        if (val === "N/A") {
          return <span className="text-slate-400 italic">N/A</span>;
        }

        // Helper to format display text
        const formatDisposition = (str: string) => {
          const lower = str.toLowerCase();
          if (lower === "follow_up_needed") return "Follow Up";
          if (lower === "callback_requested") return "Callback";
          if (lower === "incomplete call") return "Incomplete";

          return str
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
        };

        const displayText = formatDisposition(val);

        // Style mapping uses the raw value (lowercase)
        // We ensure keys match the "value" in options array
        const styleKey = val.toLowerCase().trim();

        const colorStyles: Record<string, string> = {
          "qualified": "bg-emerald-100 text-emerald-800 border-emerald-200",
          "disqualified": "bg-slate-100 text-slate-700 border-slate-200",
          "incomplete call": "bg-orange-50 text-orange-700 border-orange-100",
          "follow_up_needed": "bg-amber-100 text-amber-800 border-amber-200",
          "callback_requested": "bg-blue-50 text-blue-700 border-blue-100",
          "transferred": "bg-violet-50 text-violet-700 border-violet-100",
          "do_not_call": "bg-red-50 text-red-700 border-red-100",
        };

        const styleClass = colorStyles[styleKey] || "bg-slate-50 text-slate-600 border-slate-200";

        return (
          <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold border shadow-sm whitespace-nowrap", styleClass)}>
            {displayText}
          </span>
        );
      },
      filterFn: "arrIncludesSome",
      enableColumnFilter: true,
    }),
    // ACTIONS COLUMN REMOVED AS REQUESTED
  ], [calls]); // Re-create if calls mostly for the renderActions closure if needed, though row.original passes fresh data

  // TANSTACK TABLE INSTANCE
  const table = useReactTable({
    data: filteredCalls,
    columns,
    state: {
      sorting,
      columnFilters, // NEW
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
    enableRowSelection: true, // Enable selection
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters, // NEW
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),       // NEW
    getFacetedUniqueValues: getFacetedUniqueValues(), // NEW
  });

  // PAGINATION HELPER
  const paginationRange = useMemo(() => {
    const currentPage = table.getState().pagination.pageIndex + 1;
    const pageCount = table.getPageCount();
    const siblingCount = 1;

    // 1. Total pages less than 7 -> show all
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    // 2. Complex ranges
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, pageCount);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < pageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = pageCount;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', pageCount];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from({ length: rightItemCount }, (_, i) => pageCount - rightItemCount + i + 1);
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }

    return [];
  }, [table.getState().pagination.pageIndex, table.getPageCount()]);



  // HANDLER: Download CSV
  const [exporting, setExporting] = useState(false);

  const handleDownloadCSV = async () => {
    try {
      setExporting(true);
      // Fetch fresh data including heavy fields
      const heavyCalls = await fetchCalls(true);

      // Apply Client-Side Tab Filters to the heavy data
      // (Replicating the logic from the filteredCalls useMemo)
      const callsToExport = heavyCalls.filter((c: any) => {
        const s = (c.status || "").toLowerCase();
        const d = (c.disposition || "").toLowerCase();

        if (activeTab === "all") return true;
        if (activeTab === "live") return ["in-progress", "ringing", "queued"].includes(s);
        if (activeTab === "transferred") return d === "transferred";
        if (activeTab === "followup") return d === "follow_up_needed";
        if (activeTab === "callback") return d === "callback_requested";

        return true;
      });

      if (!callsToExport.length) {
        setExporting(false);
        return;
      }

      const headers = [
        "ID",
        "Phone",
        "User",
        "Status",
        "Duration",
        "Created At",
        "Sentiment",
        "Disposition",
        "Transcript",
        "Summary",
        "Notes",
        "Feedback Rating",
        "Feedback Text",
        "Recording URL"
      ];

      const csvContent = [
        headers.join(","),
        ...callsToExport.map((c: any) => {
          // Extract summary text if available
          let summaryText = "";
          if (c.summary && typeof c.summary === 'object' && 'summary' in c.summary) {
            summaryText = (c.summary as any).summary;
          } else if (c.summary) {
            summaryText = JSON.stringify(c.summary);
          }

          return [
            c.id,
            c.phone_number,
            c.username || c.user_id,
            c.status,
            c.duration,
            c.created_at,
            c.sentiment,
            c.disposition,
            c.final_transcript,
            summaryText,
            c.notes,
            c.feedback_rating,
            c.feedback_text,
            c.signed_recording_url
          ].map(f => `"${String(f || '').replace(/"/g, '""')}"`).join(",")
        })
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `calls_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed:", e);
      // Optional: show toast error
    } finally {
      setExporting(false);
    }
  };


  const fetchCalls = async (includeContent = false, signal?: AbortSignal) => {
    if (!userInfo) return [];

    const metadata = userInfo.user_metadata || {};
    const tenantId = metadata.tenant_id || "demo-client";
    const role = metadata.role || "admin";

    let url = `${backendUrl}/api/${tenantId}/calls`;
    const params = new URLSearchParams();
    if (role === 'user') {
      params.append('user_id', userInfo.id);
    }
    if (includeContent) {
      params.append('include_content', 'true');
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log("Fetching calls from:", url);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      signal
    });

    if (res.status === 401) {
      throw new Error("Unauthorized - Please log in again");
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    return data.map((c: any) => ({
      id: String(c.id),
      client_id: c.client_id,
      phone_number: c.phone_number ?? c.phoneNumber ?? null,
      status: c.status,
      started_at: c.started_at ?? c.startedAt ?? null,
      created_at: c.created_at ?? new Date().toISOString(),
      ended_at: c.ended_at ?? c.endedAt ?? null,
      has_listen_url: c.hasListenUrl ?? false,

      user_id: c.user_id ?? c.userId ?? null,
      username: c.username ?? null,
      duration: c.duration ?? null,

      hasTranscript: c.hasTranscript ?? false,
      hasLiveTranscript: c.hasLiveTranscript ?? !!c.live_transcript,
      hasFinalTranscript: c.hasFinalTranscript ?? !!c.final_transcript,
      hasRecording: !!c.recording_url,

      recording_url: c.recording_url ?? c.recordingUrl ?? null,

      live_transcript: c.live_transcript ?? null,
      final_transcript: c.final_transcript ?? null,
      summary: c.summary ?? null,

      signed_recording_url: c.signed_recording_url ?? null,

      detailsLoaded: false,
      sentiment: c.sentiment || null,
      disposition: c.disposition || null,
      notes: c.notes || null,
      feedback_rating: c.feedback_rating || null,
      feedback_text: c.feedback_text || null
    }));
  };

  // EFFECT 1: Load initial calls via HTTP depending on user info
  useEffect(() => {
    const controller = new AbortController();

    async function loadCalls() {
      try {
        setLoading(true);
        setError(null);
        const normalized = await fetchCalls(false, controller.signal);
        if (!controller.signal.aborted) {
          setCalls(normalized);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error("Error fetching calls:", e);
          setError(e.message || "Failed to load");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (userInfo) {
      loadCalls();
    }

    return () => controller.abort();
  }, [userInfo]);

  // EFFECT: Load user info
  // EFFECT: Load user info - REMOVED (passed as prop)
  // useEffect(() => {
  //   supabase.auth.getUser().then(({ data: { user } }) => {
  //     if (user) {
  //       setUserInfo(user);
  //     }
  //   });
  // }, []);

  // HELPER FUNCTION: Upsert (update or insert) a call from WebSocket payload
  // This merges new data from the server with existing call data in state
  function handleCallUpsert(payload: any) {
    const c = payload.call;
    if (!c || !c.id) return;

    const newCall: Call = {
      id: String(c.id),
      client_id: payload.clientId,
      phone_number: c.phoneNumber ?? c.phone_number ?? null,
      status: c.status ?? null,
      started_at: c.startedAt ?? c.started_at ?? null,
      created_at: c.created_at ?? c.createdAt, // Allow undefined here, handle fallback in merge
      ended_at: c.endedAt ?? c.ended_at ?? null,
      has_listen_url: c.hasListenUrl ?? Boolean(c.listenUrl) ?? false,
      user_id: c.userId ?? c.user_id ?? undefined,
      username: c.username ?? undefined,
      duration: c.duration ?? undefined,
      hasTranscript:
        c.hasTranscript ?? undefined,      // backend already sends flags
      hasLiveTranscript:
        c.hasLiveTranscript ?? undefined,
      hasRecording:
        c.hasRecording ?? undefined,
      recording_url: c.recordingUrl ?? c.recording_url ?? undefined,
      final_transcript:
        c.finalTranscript ?? c.final_transcript ?? undefined,
      live_transcript:
        c.liveTranscript ?? c.live_transcript ?? undefined,
      sentiment: c.sentiment ?? undefined,
      disposition: c.disposition ?? undefined,
      summary: c.summary ?? undefined,
      notes: c.notes ?? undefined,
      feedback_rating: c.feedback_rating ?? undefined,
      feedback_text: c.feedback_text ?? undefined,
    };

    // STATE UPDATE WITH CALLBACK: Use callback pattern when new state depends on old state
    // prev => prevents race conditions by always working with the latest state
    setCalls((prev) => {
      const idx = prev.findIndex((x) => String(x.id) === newCall.id);
      if (idx === -1) {
        // Call doesn't exist - add it to the beginning of the array
        return [newCall, ...prev];
      } else {
        // Call exists - merge new data with existing data
        const old = prev[idx];
        const merged: Call = {
          ...old,
          ...newCall,
          // Merge flags
          has_listen_url: newCall.has_listen_url ?? old.has_listen_url ?? false,
          username: newCall.username ?? old.username ?? null,
          duration: newCall.duration ?? old.duration ?? null,
          user_id: newCall.user_id ?? old.user_id ?? null,
          // Preserve started_at if missing in update (prevents timer reset on partial updates)
          started_at: newCall.started_at ?? old.started_at ?? null,
          // If newCall.created_at is defined (from backend), use it. 
          // Else keep old created_at. 
          // Fallback to new date ONLY if both are missing.
          created_at: newCall.created_at ?? old.created_at ?? new Date().toISOString(),
          hasTranscript:
            newCall.hasTranscript ?? old.hasTranscript ?? false,
          hasLiveTranscript:
            newCall.hasLiveTranscript ?? old.hasLiveTranscript ?? false,
          hasRecording:
            newCall.hasRecording ?? old.hasRecording ?? false,
          recording_url:
            newCall.recording_url ?? old.recording_url ?? null,
          final_transcript:
            newCall.final_transcript ?? old.final_transcript ?? null,
          live_transcript:
            newCall.live_transcript ?? old.live_transcript ?? null,
        };

        const copy = [...prev];
        copy[idx] = merged;
        return copy;
      }
    });

  }

  // Force transfer logic removed as Actions column is removed
  // ...


  // EFFECT 2: WebSocket connection for real-time dashboard updates
  // This effect runs ONCE on mount and stays open until component unmounts
  // EFFECT 2: WebSocket connection for real-time dashboard updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let active = true;

    const connectWs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      const token = session?.access_token;
      if (!token) {
        console.warn("No auth token for WebSocket");
        return;
      }

      let wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/dashboard";
      wsUrl += `?token=${token}`;

      //console.log("Connecting WebSocket to:", wsUrl);

      // Create WebSocket connection
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Dashboard WS open");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === "call-upsert") {
            console.log("Dashboard WS call-upsert:", msg);
            handleCallUpsert(msg);
          } else if (msg.type === "transcript-update") {
            console.log("Dashboard WS transcript-update:", msg);
            const callId: string = msg.callId;
            const fullTranscript: string | undefined = msg.fullTranscript;
            setCalls((prev) =>
              prev.map((c) =>
                c.id === callId
                  ? { ...c, hasLiveTranscript: true, live_transcript: fullTranscript ?? c.live_transcript ?? null }
                  : c
              )
            );
          } else {
            console.log("Dashboard WS other message:", msg);
          }
        } catch (err) {
          console.warn("Failed to parse WS message as JSON", err);
        }
      };

      ws.onerror = (event) => {
        console.error("Dashboard WS error:", event);
      };

      ws.onclose = () => {
        console.log("Dashboard WS closed");
      };
    };

    connectWs();

    // CLEANUP FUNCTION
    return () => {
      active = false;
      if (ws) ws.close();
    };


  }, [userInfo]); // Re-run when userInfo loads (so we attach user_id to WS)

  // EFFECT 3: Subscribe/unsubscribe to specific call transcripts
  // This runs whenever transcriptModalCallId OR selectedCallId CHANGES
  // We unified the logic to support both the legacy modal and the new sidebar.
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Use either the modal ID or the sidebar ID
    const targetCallId = transcriptModalCallId || selectedCallId;

    // When a call is selected/opened, subscribe to it
    if (targetCallId) {
      console.log(`[Dashboard] Subscribing to call ${targetCallId}`);
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        callId: targetCallId
      }));
    }

    // CLEANUP: Unsubscribe when ID changes or unmounts
    return () => {
      if (targetCallId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log(`[Dashboard] Unsubscribing from call ${targetCallId}`);
        wsRef.current.send(JSON.stringify({
          type: "unsubscribe",
          callId: targetCallId
        }));
      }
    };
  }, [transcriptModalCallId, selectedCallId]); // Dependency: re-run whenever either changes



  // HELPER RENDER FUNCTION: Returns JSX (looks like HTML but it's JavaScript XML) - REMOVED (Actions column removed)
  // const renderActions = (c: Call) => { ... }

  // RENDER FUNCTION: Returns JSX (HTML-like syntax) that React converts to DOM elements
  // React re-renders this when state changes (calls, loading, error, etc.)
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {/* Header - COMMENTED OUT (Moved to Layout)
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Live Monitoring
            </h1>
            <p className="text-sm text-slate-500">
              Client: <span className="font-mono">{userInfo?.user_metadata?.tenant_id || 'connecting...'}</span>
            </p>
            {userInfo && (
              <p className="text-sm text-slate-500">
                Welcome: <span className="font-medium text-slate-700">{userInfo.user_metadata?.display_name || userInfo.user_metadata?.username || userInfo.email}</span>
                <span className="mx-2 text-slate-300">|</span>
                Tenant: <span className="font-medium text-slate-700">{userInfo.user_metadata?.tenant_id}</span>
                <span className="mx-2 text-slate-300">|</span>
                Role: <span className="uppercase text-xs tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-1">{userInfo.user_metadata?.role || 'admin'}</span>
              </p>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Backend:{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">
              {backendUrl}
            </code>
          </div>
        </header>
        */}

      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Call Log</h1>
          <p className="text-slate-500 text-xs">
            Complete history of all customer interactions and conversations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
            className="h-9"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            title="Refresh List"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            title="Download CSV"
            onClick={handleDownloadCSV}
            disabled={exporting}
          >
            {exporting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Main card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">

            {/* Filter / Stats Bar */}
            <div className="border-b border-slate-200 bg-white px-3 py-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant={activeTab === "all" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("all")}
                  className="h-7 px-2 text-xs gap-1.5 font-medium"
                >
                  <List size={14} className="text-slate-500" />
                  All Calls
                  <Badge variant="secondary" className="ml-1 px-1 py-0 min-w-[18px] h-4 text-[10px] justify-center bg-slate-200 text-slate-700">
                    {counts.all}
                  </Badge>
                </Button>

                <Button
                  variant={activeTab === "live" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("live")}
                  className={cn("h-7 px-2 text-xs gap-1.5 font-medium", activeTab === "live" && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}
                >
                  <Activity size={14} className={cn("text-slate-500", activeTab === "live" && "text-emerald-600")} />
                  Live
                  <Badge variant="secondary" className={cn("ml-1 px-1 py-0 min-w-[18px] h-4 text-[10px] justify-center bg-slate-200 text-slate-700", activeTab === 'live' && "bg-emerald-200 text-emerald-800")}>
                    {counts.live}
                  </Badge>
                </Button>

                <Button
                  variant={activeTab === "transferred" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("transferred")}
                  className={cn("h-7 px-2 text-xs gap-1.5 font-medium", activeTab === "transferred" && "bg-violet-50 text-violet-700 hover:bg-violet-100")}
                >
                  <ArrowUpRight size={14} className={cn("text-slate-500", activeTab === "transferred" && "text-violet-600")} />
                  Transferred
                  <Badge variant="secondary" className={cn("ml-1 px-1 py-0 min-w-[18px] h-4 text-[10px] justify-center bg-slate-200 text-slate-700", activeTab === 'transferred' && "bg-violet-200 text-violet-800")}>
                    {counts.transferred}
                  </Badge>
                </Button>

                <Button
                  variant={activeTab === "followup" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("followup")}
                  className={cn("h-7 px-2 text-xs gap-1.5 font-medium", activeTab === "followup" && "bg-amber-50 text-amber-700 hover:bg-amber-100")}
                >
                  <AlertCircle size={14} className={cn("text-slate-500", activeTab === "followup" && "text-amber-600")} />
                  Follow Up
                  <Badge variant="secondary" className={cn("ml-1 px-1 py-0 min-w-[18px] h-4 text-[10px] justify-center bg-slate-200 text-slate-700", activeTab === 'followup' && "bg-amber-200 text-amber-800")}>
                    {counts.followup}
                  </Badge>
                </Button>

                <Button
                  variant={activeTab === "callback" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("callback")}
                  className={cn("h-7 px-2 text-xs gap-1.5 font-medium", activeTab === "callback" && "bg-blue-50 text-blue-700 hover:bg-blue-100")}
                >
                  <RefreshCw size={14} className={cn("text-slate-500", activeTab === "callback" && "text-blue-600")} />
                  Callback
                  <Badge variant="secondary" className={cn("ml-1 px-1 py-0 min-w-[18px] h-4 text-[10px] justify-center bg-slate-200 text-slate-700", activeTab === 'callback' && "bg-blue-200 text-blue-800")}>
                    {counts.callback}
                  </Badge>
                </Button>


              </div>
            </div>

            {/* Content */}
            <div className="p-0"> {/* Remove padding to let table flush */}
              {error && (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Error: {error}
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="animate-spin text-slate-400" size={32} />
                </div>
              )}


              {!loading && !error && calls.length === 0 && (
                <p className="text-sm text-slate-500">
                  No calls yet. Use the debug endpoint{" "}
                  <code className="bg-slate-100 px-1 py-0.5 rounded">
                    POST /api/debug/create-test-call/demo-client
                  </code>{" "}
                  or send real webhooks to populate this table.
                </p>
              )}


              {/* TANSTACK TABLE RENDER */}
              {!loading && !error && filteredCalls.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-100">
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className="px-3 py-1.5 text-left font-bold text-slate-700 text-[11px] uppercase tracking-wider whitespace-nowrap"
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-blue-50/50 transition-colors group cursor-pointer h-10"
                            onClick={() => setSelectedCallId(row.original.id)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-3 py-1.5 whitespace-nowrap">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION CONTROLS */}
                  <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6">
                    {/* Info Text */}
                    <div className="flex items-center gap-4">
                      {/* Rows per page Selector - Moved to Left */}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500 whitespace-nowrap">Rows</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-8 w-[60px] justify-between text-xs font-normal"
                            >
                              {table.getState().pagination.pageSize}
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[60px]">
                            {[10, 20, 25, 50, 100].map((pageSize) => (
                              <DropdownMenuItem
                                key={pageSize}
                                className="text-xs justify-center cursor-pointer"
                                onSelect={() => table.setPageSize(pageSize)}
                              >
                                {pageSize}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="hidden sm:block">
                        <p className="text-sm text-slate-500">
                          Showing <span className="font-medium text-slate-900">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to <span className="font-medium text-slate-900">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}</span> of <span className="font-medium text-slate-900">{table.getFilteredRowModel().rows.length}</span> results
                        </p>
                      </div>
                    </div>

                    {/* Pagination Widget */}
                    <div className="flex flex-1 items-center justify-end gap-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 disabled:opacity-30"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {paginationRange.map((page, idx) => {
                          if (page === '...') {
                            return (
                              <div key={`dots-${idx}`} className="flex h-8 w-8 items-center justify-center text-slate-400">
                                <MoreHorizontal className="h-4 w-4" />
                              </div>
                            );
                          }

                          const isCurrent = (page as number) === (table.getState().pagination.pageIndex + 1);
                          return (
                            <Button
                              key={page}
                              variant={isCurrent ? "secondary" : "ghost"}
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 font-normal transition-all",
                                isCurrent
                                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-medium"
                                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                              )}
                              onClick={() => table.setPageIndex((page as number) - 1)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 disabled:opacity-30"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}


            </div>
          </div>
        </div>

        {/* Transcript Modal */}
        {
          transcriptModalCallId && (
            <TranscriptModal
              call={calls.find((c) => c.id === transcriptModalCallId) || null}
              onClose={() => setTranscriptModalCallId(null)}
              onCallUpdated={(updatedCall) => {
                setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
              }}
            />
          )
        }

        {/* Listen Modal */}
        {
          listenModalCallId && (
            <ListenModal
              call={calls.find((c) => c.id === listenModalCallId) || null}
              onClose={() => setListenModalCallId(null)}
            />
          )
        }

        {/* Recording Modal */}
        {
          recordingModalCallId && (
            <RecordingModal
              call={calls.find((c) => c.id === recordingModalCallId) || null}
              onClose={() => setRecordingModalCallId(null)}
            />
          )
        }

        {/* Call Detail Sidebar */}
        <CallDetailSidebar
          call={calls.find(c => c.id === selectedCallId) || null}
          onClose={() => setSelectedCallId(null)}
          onCallUpdated={(updatedCall) => {
            setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
          }}
        />
      </div>
    </div>
  );
};

export default CallDashboard;
