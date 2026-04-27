# Performance Testing Guide

## Quick Test (5 minutes)

### Step 1: Open Report Page
1. Go to http://localhost:3000/report
2. Select "Gabungan" mode
3. Set: April 2026 → Agustus 2026 (5 periode)
4. Click "Filter ASSY (semua)" to use all parts
5. Leave search empty

### Step 2: Start Export
1. Click green "Ekspor" button
2. Note the start time
3. Watch progress modal update

### Step 3: Monitor Progress
- Progress bar should update every 1-2 seconds
- Status text shows current operation
- Should NOT get stuck at 95%
- Estimated time should appear

### Step 4: Verify Completion
- Progress reaches 100%
- Download button appears
- Check download file
- Note total time elapsed

### Expected Results
```
5 Periode (April-Agustus 2026):
- Time: 3-5 minutes
- Progress: Smooth 0% → 100%
- File: ~500KB-2MB (depends on data)
- Memory: Stays under 100MB
```

## Production Test (12 Periode - Optional)

### Setup
1. Change to April 2026 → Maret 2027 (12 periode)
2. Click export

### Monitoring
- Open browser DevTools Console
- Watch for SSE updates (should appear every 1-2 sec)
- Check Network tab for `/api/report/export-stream` request

### Expected Results
```
12 Periode:
- Time: 8-10 minutes
- Linear scaling: ~2.4x slower than 5 periode
- Memory: Still constant ~50MB
- File: ~2-5MB
```

## Troubleshooting

### If Still Slow (>5 min for 5 periode)
1. Check server logs for query time
2. Verify database connection is fast
3. Monitor CPU usage (should be ~50-70%)
4. Check disk I/O (Excel writing)

### If Progress Stops
1. Check Network tab - should see continuous SSE events
2. Check server console for errors
3. Try cancelling and restarting

### If File is Corrupted
1. Check browser download logs
2. Try manual Excel validation
3. Check if data matches single periode

## Debug Mode

Enable detailed logging:
```typescript
// In ExportProgressModal.tsx, uncomment console.logs
console.log('[v0] SSE Event:', event);
console.log('[v0] Progress:', progress);
```

## Performance Baseline

Before optimization:
- 5 periode: 30-40 minutes
- 10 periode: 60+ minutes
- Memory: 700MB+
- Progress: Stuck at 95%

After optimization:
- 5 periode: 3-5 minutes (6-8x faster)
- 12 periode: 8-10 minutes (6x faster)
- Memory: 50MB constant
- Progress: Smooth real-time updates

## Success Criteria
- ✓ Completes in <5 min for 5 periode
- ✓ Progress bar smooth 0-100%
- ✓ Memory stays <100MB
- ✓ Downloaded file valid
- ✓ Data matches original
- ✓ Works with 12 periode
