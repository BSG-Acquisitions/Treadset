# Observability Queries

This document provides copy-paste queries for monitoring the BSG Tire Ops CRM application in production.

## Prerequisites

- Access to application logs (console, server logs)
- All queries expect structured JSON logs with correlation IDs
- Log format: `{"timestamp":"2025-09-23T14:30:00Z","level":"INFO","message":"...","corrId":"abc123","operation":"...","elapsedMs":250}`

## 1. Last 24h PDF Failures by Engine

**Purpose**: Monitor PDF generation success rates and identify engine-specific issues.

```bash
# For JSON logs piped to jq
cat app.log | grep '"operation":".*pdf"' | grep '"result":"error"' | \
jq -r 'select(.timestamp > (now - 86400 | strftime("%Y-%m-%dT%H:%M:%SZ"))) | 
       "\(.timestamp) \(.pdfEngine // "overlay") \(.errorCode // "unknown") \(.message)"' | \
sort | uniq -c | sort -nr

# For grep-based analysis
grep '"operation":".*pdf"' app.log | grep '"result":"error"' | grep -o '"pdfEngine":"[^"]*"' | sort | uniq -c
```

**Expected Output**:
```
   3 "pdfEngine":"acroform" 
   1 "pdfEngine":"overlay"
   2 "pdfEngine":"null"
```

## 2. P95 Latency for PDF Routes

**Purpose**: Track performance of PDF generation endpoints.

```bash
# Extract PDF operation latencies from last 1000 entries
tail -1000 app.log | grep '"operation":".*pdf"' | \
jq -r 'select(.elapsedMs != null) | .elapsedMs' | \
sort -n | awk '
  BEGIN { count = 0 }
  { values[count] = $1; count++ }
  END {
    if (count == 0) print "No data";
    else {
      p95_index = int(count * 0.95);
      p90_index = int(count * 0.90);
      p50_index = int(count * 0.50);
      print "P50: " values[p50_index] "ms";
      print "P90: " values[p90_index] "ms";
      print "P95: " values[p95_index] "ms";
      print "Max: " values[count-1] "ms";
      print "Samples: " count;
    }
  }
'
```

**Expected Output**:
```
P50: 1250ms
P90: 3200ms
P95: 5800ms
Max: 12400ms
Samples: 87
```

## 3. Duplicate Submission Rate (Idempotency Dedupe Count)

**Purpose**: Monitor how often idempotency protection is triggered.

```bash
# Count idempotency deduplication events
grep 'Duplicate detected' app.log | grep '"operation":"' | \
jq -r 'select(.timestamp > (now - 86400 | strftime("%Y-%m-%dT%H:%M:%SZ"))) |
       "\(.operation)"' | \
sort | uniq -c | sort -nr

# Calculate dedupe rate as percentage
total_requests=$(grep '"operation":"create_manifest\|complete_pickup"' app.log | wc -l)
duplicate_requests=$(grep 'Duplicate detected' app.log | wc -l)
if [ $total_requests -gt 0 ]; then
  echo "Deduplication rate: $(( duplicate_requests * 100 / total_requests ))% ($duplicate_requests/$total_requests)"
fi
```

**Expected Output**:
```
   12 create_manifest
    5 complete_pickup
    2 generate_pdf
Deduplication rate: 8% (19/247)
```

## 4. Unauthorized Attempts Blocked

**Purpose**: Security monitoring for role-based access control.

```bash
# Find authorization failures
grep 'ROLE_CHECK.*UNAUTHORIZED\|Unauthorized:' app.log | \
jq -r 'select(.timestamp > (now - 86400 | strftime("%Y-%m-%dT%H:%M:%SZ"))) |
       "\(.timestamp) \(.operation // "unknown") \(.userRoles // []) \(.requiredRoles // [])"' | \
head -20

# Count by operation
grep 'UNAUTHORIZED' app.log | grep '"operation":"' | \
jq -r '.operation' | sort | uniq -c | sort -nr
```

**Expected Output**:
```
2025-09-23T14:15:30Z create_manifest ["client"] ["admin","ops_manager"]
2025-09-23T14:22:45Z generate_pdf ["driver"] ["admin"]
   15 create_manifest
    8 generate_pdf
    3 update_client
```

## 5. Dashboard Data Fetch P95

**Purpose**: Monitor dashboard performance and N+1 query fixes.

```bash
# Dashboard performance metrics
grep '"operation":"getDashboardData\|dashboard_load"' app.log | \
jq -r 'select(.elapsedMs != null and .timestamp > (now - 86400 | strftime("%Y-%m-%dT%H:%M:%SZ"))) |
       "\(.elapsedMs)"' | \
sort -n | awk '
  BEGIN { count = 0; sum = 0 }
  { values[count] = $1; sum += $1; count++ }
  END {
    if (count == 0) print "No dashboard data";
    else {
      avg = sum / count;
      p95_index = int(count * 0.95);
      print "Average: " int(avg) "ms";
      print "P95: " values[p95_index] "ms";
      print "Target: <2000ms";
      if (values[p95_index] > 2000) print "⚠️  ABOVE TARGET";
      else print "✅ WITHIN TARGET";
    }
  }
'
```

**Expected Output**:
```
Average: 1247ms
P95: 1850ms
Target: <2000ms
✅ WITHIN TARGET
```

## 6. Correlation ID Trace

**Purpose**: Follow a specific request/operation through the entire system.

```bash
# Trace specific correlation ID
CORR_ID="abc123def456"
grep "\"corrId\":\"$CORR_ID\"" app.log | \
jq -r '"\(.timestamp) [\(.level)] \(.operation // "unknown"): \(.message) (\(.elapsedMs // 0)ms)"' | \
sort

# Extract all correlation IDs from failed operations
grep '"result":"error"' app.log | jq -r '.corrId // "no-correlation-id"' | sort | uniq
```

**Expected Output**:
```
2025-09-23T14:30:15Z [INFO] create_manifest: Manifest creation started (0ms)
2025-09-23T14:30:15Z [INFO] ROLE_CHECK: Checking for roles [admin,ops_manager] (45ms)
2025-09-23T14:30:16Z [INFO] create_manifest: Manifest created successfully (1200ms)
2025-09-23T14:30:16Z [INFO] generate_pdf: PDF generation started (0ms)
2025-09-23T14:30:18Z [INFO] generate_pdf: AcroForm PDF generated successfully (2100ms)
```

## 7. Feature Flag Usage

**Purpose**: Monitor feature flag adoption and engine selection.

```bash
# PDF engine selection distribution
grep '"pdfEngine":"' app.log | \
jq -r '.pdfEngine' | sort | uniq -c | sort -nr

# Real data vs mock usage
grep '"USE_REAL_DATA"' app.log | \
jq -r 'select(.timestamp > (now - 3600 | strftime("%Y-%m-%dT%H:%M:%SZ"))) | 
       "\(.level) \(.message)"' | sort | uniq -c
```

**Expected Output**:
```
   45 "acroform"
   12 "overlay"
    3 null
   
    5 INFO Real data source active
    0 WARN Mock data detected in production
```

## 8. Error Rate by Operation

**Purpose**: Overall system health monitoring.

```bash
# Calculate error rates by operation type
for operation in "create_manifest" "generate_pdf" "complete_pickup" "update_client"; do
  total=$(grep "\"operation\":\"$operation\"" app.log | wc -l)
  errors=$(grep "\"operation\":\"$operation\"" app.log | grep '"result":"error"' | wc -l)
  if [ $total -gt 0 ]; then
    rate=$(( errors * 100 / total ))
    echo "$operation: $rate% error rate ($errors/$total)"
  fi
done
```

**Expected Output**:
```
create_manifest: 2% error rate (3/150)
generate_pdf: 5% error rate (8/160)
complete_pickup: 1% error rate (1/100)  
update_client: 0% error rate (0/75)
```

## Performance Targets

- **PDF Generation P95**: < 6 seconds
- **Dashboard Load P95**: < 2 seconds  
- **Error Rate**: < 5% per operation
- **Deduplication Rate**: 5-15% (indicates healthy retry behavior)
- **Authorization Failures**: Monitor for anomalies, not absolute count

## Alerting Thresholds

Set up monitoring alerts for:
- PDF Generation P95 > 8 seconds
- Dashboard Load P95 > 3 seconds
- Error Rate > 10% for any operation
- Authorization failures > 50/hour
- No correlation IDs present in logs

## Log Retention

- **Development**: 7 days
- **Staging**: 30 days  
- **Production**: 90 days + archive to cold storage