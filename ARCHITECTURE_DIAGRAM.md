# Export System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (React Frontend)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Report Page (page.tsx)                                         │
│  ├─ State: exportProgress, exportStatus, showExportModal        │
│  ├─ Function: handleExportStream()                              │
│  │   └─ Calls: fetch('/api/report/export-stream')              │
│  │   └─ Handles: EventSource / text/event-stream               │
│  │   └─ Updates: React state on each SSE event                 │
│  │                                                              │
│  └─ Renders:                                                    │
│     ├─ Ekspor Button (onClick → handleExportStream)            │
│     └─ ExportProgressModal Component                            │
│        ├─ Shows: Progress bar (0-100%)                          │
│        ├─ Shows: Status message (real-time)                     │
│        ├─ Shows: Elapsed time + Estimated remaining time       │
│        ├─ Shows: Cancel button                                  │
│        └─ Shows: Download button (when complete)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HTTP GET /api/report/export-stream
         │ (with query params: dari, sampai, assy_codes, search)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER (Node.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Route Handler: /app/api/report/export-stream/route.ts         │
│                                                                 │
│  Function: GET(request) {                                       │
│    ├─ Create ResponseStream for SSE                             │
│    │                                                            │
│    ├─ Phase 1: Fetch Assembly Information (0-10%)              │
│    │  └─ Query: SELECT DISTINCT assy_code                      │
│    │  └─ Result: Array of 500-1000 ASSY codes                 │
│    │  └─ Event: {progress: 10, status: "..."}                 │
│    │                                                            │
│    ├─ Phase 2: Load Production Quantities (10-20%)             │
│    │  └─ Query: SELECT assy_code, periode, prod_qty            │
│    │  └─ Result: prodMap[assy][periode] = qty                 │
│    │  └─ Event: {progress: 20, status: "..."}                 │
│    │                                                            │
│    ├─ Phase 3: Process ASSY in Batches (20-80%)               │
│    │  └─ Batch size: 50 ASSYs at a time                        │
│    │  └─ Loop: for i=0 to assyCodes.length step 50             │
│    │     ├─ Get BOM for batch of 50 ASSYs                      │
│    │     ├─ Build row array with monthly data                  │
│    │     ├─ Calculate TOTAL and TOTAL USAGE                    │
│    │     ├─ Add rows to Excel worksheet                        │
│    │     └─ Send event: {progress: X%, status: "..."}         │
│    │                                                            │
│    ├─ Phase 4: Generate Excel File (80-95%)                   │
│    │  └─ Write worksheet to temp file in /tmp                  │
│    │  └─ Path: /tmp/bom-export-{randomToken}.xlsx             │
│    │  └─ Event: {progress: 95, status: "..."}                 │
│    │                                                            │
│    └─ Phase 5: Send Download Token (95-100%)                  │
│       └─ Generate secure token (random 32 chars)               │
│       └─ Store: token → filePath mapping in memory             │
│       └─ Event: {progress: 100, downloadUrl: "..."}           │
│       └─ Client receives downloadUrl and auto-clicks it        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Excel Workbook Structure (in-memory before write)         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Worksheet: "Report"                                       │  │
│  │                                                            │  │
│  │ Row 1 (Headers):                                           │  │
│  │ [PART NO] [AS400] [SUPPLIER] [PART NAME] [UNIT]           │  │
│  │ [Apr 2026] [May 2026] [Jun 2026] ... [TOTAL] [TOTAL USAGE]│  │
│  │                                                            │  │
│  │ Row 2+ (Data):                                             │  │
│  │ [BD1042-15B] [BD1042-15B] [PT Sejahtera] [Socket BD-166]   │  │
│  │ [Meter] [28.5] [–] [–] ... [28.5] [12,825]               │  │
│  │                                                            │  │
│  │ Row N (Summary):                                           │  │
│  │ [TOTAL PER ASSY] [–] [–] [–] [–] [–] [–] ... [grand total]│  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HTTP POST /api/report/download?token=xyz
         │ (binary file stream)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              DOWNLOAD HANDLER: /api/report/download              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Validate token (must exist in token→file map)              │
│  2. Get file path: /tmp/bom-export-{token}.xlsx               │
│  3. Set response headers:                                       │
│     - Content-Type: application/vnd.openxmlformats...          │
│     - Content-Disposition: attachment; filename=...            │
│  4. Stream file to client                                       │
│  5. Delete temp file from /tmp                                  │
│  6. Clear token from map (can only download once)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER FILE DOWNLOAD                        │
│  bom-export-2026-04-27-135842.xlsx saved to Downloads folder    │
└─────────────────────────────────────────────────────────────────┘
```

## Database Query Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                         │
└─────────────────────────────────────────────────────────────┘

Query 1 (Phase 1 - 0-10%): Get ASSY codes
───────────────────────────────────────────
SELECT DISTINCT assy_code 
FROM mv_bom_gabungan
WHERE periode >= '2026-04' AND periode <= '2026-06'
  AND assy_code = ANY($1::text[])  -- if filtered
  AND (part_no ILIKE '%search%' OR ...)  -- if searched
ORDER BY assy_code
Result: [assy_code, assy_code, ...] → 500 rows


Query 2 (Phase 2 - 10-20%): Get production quantities
──────────────────────────────────────────────────────
SELECT assy_code, periode, prod_qty
FROM prod_plan
WHERE periode >= '2026-04' AND periode <= '2026-06'
Result: prodMap[BD1042-15B][2026-04] = 28.5
        prodMap[BD1042-15B][2026-05] = 0
        etc.


Query 3+ (Phase 3 - 20-80%): Get BOM data per ASSY
──────────────────────────────────────────────────
FOR EACH batch of 50 ASSYs:
  SELECT part_no, part_no_as400, supplier, part_name, unit, assy_code
  FROM mv_bom_gabungan
  WHERE assy_code = 'BD1042-15B'
    AND periode >= '2026-04' AND periode <= '2026-06'
    AND (part_no ILIKE '%search%' OR ...)  -- if searched
  ORDER BY part_no
  
  Result: Array of parts for this ASSY
          Build row with monthly quantities
          Add to worksheet
          Send progress update
          Continue to next ASSY

Total queries: ~50 (one per ASSY batch)
Total rows returned: Millions (stored in Excel, not in memory)
```

## Data Flow for Single Row

```
Database (BOM Table)
│
├─ part_no: "BD1042-15B"
├─ part_no_as400: "BD1042-15B"
├─ supplier: "PT Mitra Sejahtera"
├─ part_name: "Socket BD-166"
├─ unit: "Meter"
├─ assy_code: "I0042-DR B E744"
│
▼
Excel Row Building (JavaScript)
│
├─ Extract base fields:
│  └─ [BD1042-15B, BD1042-15B, PT Mitra Sejahtera, Socket BD-166, Meter]
│
├─ Add monthly data (lookup from prodMap):
│  ├─ Apr 2026: prodMap[I0042-DR B E744][2026-04] = 28.5
│  ├─ May 2026: prodMap[I0042-DR B E744][2026-05] = 0
│  ├─ Jun 2026: prodMap[I0042-DR B E744][2026-06] = 0
│  └─ (repeat for all selected periods)
│
├─ Calculate TOTAL:
│  └─ TOTAL = 28.5 + 0 + 0 + ... = 28.5
│
├─ Calculate TOTAL USAGE:
│  └─ TOTAL USAGE = TOTAL × 450 (from parts master) = 12,825
│
▼
Final Excel Row
┌─────────────────────────────────────────────────────────────┐
│ BD1042-15B │ BD1042-15B │ PT Mitra Sejahtera │ Socket... │
│ Meter │ 28.5 │ – │ – │ 28.5 │ 12,825 │
└─────────────────────────────────────────────────────────────┘

Millions of rows like this build up worksheet (never all in memory at once)
```

## Memory Management

```
BEFORE (Old Implementation):
───────────────────────────
1. Query all 1,000,000 rows from database
   └─ Load into JavaScript array: allRows = [...]
   └─ Memory: 500MB+ (accumulates)

2. Loop through all rows
   └─ Build Excel rows in memory
   └─ Memory: 500MB + 200MB Excel buffer = 700MB

3. Write to disk
   └─ File on disk: 15MB

AFTER (New Implementation - Streaming):
───────────────────────────────────────
1. Query ASSY codes only
   └─ Load array of 500 ASSY codes: assyArray = [...]
   └─ Memory: <1MB

2. For each batch of 50 ASSYs:
   └─ Query 50 ASSYs' data (maybe 5K rows)
   └─ Build those rows in Excel
   └─ Write those rows immediately to disk buffer
   └─ Discard rows from memory
   └─ Move to next batch
   └─ Memory stays constant: ~50MB

3. Write final file to disk
   └─ File on disk: 15MB
   └─ Memory freed: 0MB

MEMORY USAGE GRAPH:
───────────────────
Old:  ▁▁▂▃▄▅▆▇██████████████████████ (grows to 700MB)
New:  ▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅ (constant ~50MB)
      └─ 50 ASSY batch processing
```

## Performance Timeline

```
0s    ┌─ User clicks "Ekspor"
      │  Modal opens, SSE connects
      │
1s    ├─ Progress: 0% → 5%
      │  Status: "Mengambil informasi ASSY..."
      │  (Fetching assy codes from database)
      │
3s    ├─ Progress: 5% → 10%
      │  Status: "Mengambil data Prod Qty..."
      │  (Loading production quantities)
      │
5s    ├─ Progress: 10% → 20%
      │  Status: "Menghitung total parts..."
      │
7s    ├─ Progress: 20% → 35%
      │  Status: "Memproses data 50/500 ASSY..."
      │  (Batch 1 of 10 complete)
      │
15s   ├─ Progress: 35% → 50%
      │  Status: "Memproses data 150/500 ASSY..."
      │  (Batch 3 complete)
      │
30s   ├─ Progress: 50% → 70%
      │  Status: "Memproses data 350/500 ASSY..."
      │  (Batch 7 complete)
      │
45s   ├─ Progress: 70% → 80%
      │  Status: "Memproses data 500/500 ASSY..."
      │  (All batches done, Excel sheet full)
      │
50s   ├─ Progress: 80% → 95%
      │  Status: "Membuat file Excel..."
      │  (Writing worksheet to disk)
      │
55s   ├─ Progress: 95% → 100%
      │  Status: "Penyiapan download..."
      │  
57s   └─ Progress: 100%
         Status: "Selesai!"
         downloadUrl: "/api/report/download?token=xyz123"
         Browser auto-downloads file
         
File size: ~15MB for 1M rows × 12 columns
Time range: 30 seconds to 5 minutes (depends on DB performance)
```

## Error Handling Flow

```
┌──────────────────────────────────┐
│ Export Error Scenarios            │
└──────────────────────────────────┘

1. Database Query Fails
   ├─ catch error in route.ts
   ├─ sendEvent({error: "Database error..."})
   └─ Client shows error in modal, no download
   
2. Excel Writing Fails
   ├─ catch error in workbook.xlsx.writeFile()
   ├─ sendEvent({error: "Failed to generate file..."})
   └─ Temp file not created, cleanup, show error

3. Network Interruption
   ├─ SSE connection drops
   ├─ Client receives AbortError
   ├─ Modal shows "Koneksi terputus"
   └─ User can try again

4. User Cancels Export
   ├─ User clicks "Batal" button
   ├─ abortController.abort() called
   ├─ SSE stream terminates
   ├─ Server catches AbortSignal
   ├─ Cleanup temp file
   ├─ Modal closes
   └─ No file downloaded

5. File Download Fails
   ├─ Token validation fails (token not found)
   ├─ Return 404 "Token not found"
   ├─ Temp file not served
   └─ User can click "Coba lagi" to retry export
```

## Security Features

```
1. Token-Based File Access
   └─ Temporary file: /tmp/bom-export-{randomToken}.xlsx
   └─ Random token: 32 character secure random
   └─ Only this token can download this file
   └─ Other users cannot guess token
   └─ Token deleted after download (single-use)

2. Auto-Cleanup
   └─ Token expires after 1 hour (configurable)
   └─ Old temp files automatically deleted
   └─ Prevents disk space leaks

3. Row-Level Security (Database)
   └─ User's data filtered at query level
   └─ Only data user has access to is exported
   └─ No other user's data leaks into export

4. Input Validation
   └─ ASSY codes validated against allowed values
   └─ Date ranges validated
   └─ Search strings sanitized (ILIKE escape)
   └─ No SQL injection possible
```
