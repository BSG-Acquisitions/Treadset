# AcroForm PDF Engine Pilot Runbook
## 7-Day Production Pilot (3 Drivers)

### Pre-Flight Checklist

**Environment Setup**
- [ ] `PDF_ENGINE=acroform` set in production
- [ ] `USE_REAL_DATA=true` confirmed
- [ ] `PILOT_MODE=true` for enhanced logging
- [ ] AcroForm template uploaded to production storage
- [ ] Rollback procedure tested in staging

**Driver Selection**
- [ ] 3 experienced drivers identified
- [ ] Driver training completed on new PDF workflow
- [ ] Backup drivers identified for coverage
- [ ] Driver contact information confirmed

**Monitoring Setup**  
- [ ] Dashboard alerts configured
- [ ] Log aggregation confirmed working
- [ ] Performance baseline established
- [ ] Error notification channels tested

### Daily Operations (Days 1-7)

#### Morning Checklist (9:00 AM)
1. **System Health**
   ```bash
   # Check overnight PDF generation success rate
   grep "pdf_generation_success" /var/log/prod/ | grep "$(date -d yesterday +%Y-%m-%d)" | wc -l
   
   # Verify no critical errors
   grep "pdf_generation_error" /var/log/prod/ | grep "$(date -d yesterday +%Y-%m-%d)" | head -5
   ```

2. **Performance Check**
   ```bash
   # Check p95 latency is < 3s
   grep "elapsedMs" /var/log/prod/ | grep "$(date -d yesterday +%Y-%m-%d)" | \
   jq -r '.elapsedMs' | sort -n | tail -5
   ```

3. **Driver Feedback Collection**
   - Contact each pilot driver
   - Document any issues or concerns  
   - Check for PDF quality complaints

#### Midday Check (1:00 PM)
1. **Real-time Monitoring**
   ```bash
   # Current day PDF success rate
   tail -f /var/log/prod/pdf.log | grep "pdf_generation" | head -10
   ```

2. **Error Pattern Analysis**
   ```bash
   # Look for recurring error patterns
   grep "errorCode" /var/log/prod/ | grep "$(date +%Y-%m-%d)" | \
   cut -d'"' -f4 | sort | uniq -c | sort -nr
   ```

#### End of Day (6:00 PM)
1. **Daily Summary Report**
   - PDF generation count
   - Success rate percentage
   - Average generation time
   - Error breakdown
   - Driver feedback summary

2. **Escalation Check**
   - Any errors requiring immediate attention?
   - Performance degradation trends?
   - Driver satisfaction concerns?

### Success Thresholds

**Must Meet (Go/No-Go)**
- PDF generation success rate ≥ 99%
- p95 latency ≤ 3000ms  
- Zero data corruption incidents
- Zero critical system errors

**Target Goals**
- PDF generation success rate ≥ 99.5%
- p95 latency ≤ 2000ms
- Driver satisfaction ≥ 4/5
- Client complaint rate ≤ 0.1%

**Automatic Rollback Triggers**
- Success rate drops below 95% for 2+ hours
- p95 latency exceeds 5000ms for 1+ hour  
- Any data corruption detected
- 3+ critical system errors in 24 hours

### Rollback Procedure

**Immediate Rollback (< 10 minutes)**
```bash
# 1. Switch PDF engine back to AcroForm-only mode
export PDF_ENGINE=acroform

# 2. Deploy config change
kubectl set env deployment/app PDF_ENGINE=acroform

# 3. Restart affected services
kubectl rollout restart deployment/app
kubectl rollout restart deployment/edge-functions

# 4. Verify rollback success
curl -s https://api.example.com/health | jq '.pdf_engine'

# 5. Notify stakeholders
echo "PDF engine rolled back at $(date)" | slack-notify #ops-alerts
```

**Post-Rollback Tasks**
- [ ] Verify all in-flight PDF requests complete successfully
- [ ] Check no manifests are stuck in processing state
- [ ] Confirm drivers can continue normal operations
- [ ] Document rollback reason and timeline
- [ ] Schedule post-incident review meeting

### Monitoring Queries

**1. Last 24h PDF Failures by Engine**
```bash
grep "pdf_generation_error" /var/log/prod/ | \
grep "$(date -d '24 hours ago' +%Y-%m-%d)" | \
jq -r '"\(.timestamp) \(.pdfEngine // "unknown") \(.errorCode // "unknown") \(.message)"' | \
sort | uniq -c
```

**2. P95 Latency for PDF Routes**  
```bash
grep "elapsedMs" /var/log/prod/ | grep "$(date +%Y-%m-%d)" | \
jq -r '.elapsedMs' | sort -n | \
awk '{all[NR] = $0} END{print all[int(NR*0.95)]}'
```

**3. Duplicate Submission Prevention Count**
```bash
grep "idempotency_deduped" /var/log/prod/ | \
grep "$(date +%Y-%m-%d)" | wc -l
```

**4. Unauthorized Attempts Blocked**
```bash
grep "access_denied" /var/log/prod/ | \
grep "$(date +%Y-%m-%d)" | \
jq -r '"\(.timestamp) \(.userRole) \(.resource)"' | head -10
```

**5. Dashboard Data Fetch P95**
```bash
grep "dashboard_data_fetch" /var/log/prod/ | \
grep "$(date +%Y-%m-%d)" | \
jq -r '.responseTimeMs' | sort -n | \
awk '{all[NR] = $0} END{print all[int(NR*0.95)]}'
```

### Driver Communication Plan

**Pre-Pilot (Day -1)**
- Send pilot announcement email
- Provide quick reference card for new PDF workflow
- Share support contact information
- Confirm pilot participation

**Daily During Pilot**  
- Morning: Brief status update via Slack
- Issues: Immediate response via phone/text
- Evening: Quick feedback collection

**Post-Pilot (Day 8)**
- Comprehensive feedback survey
- Results presentation to drivers
- Decision communication (continue/rollback/modify)

### Escalation Contacts

**Level 1: Operations Team**
- On-call engineer: +1-555-0123
- Slack channel: #ops-alerts
- Response time: 15 minutes

**Level 2: Engineering Lead**  
- Lead engineer: +1-555-0456
- Response time: 30 minutes
- Authority: Rollback decision

**Level 3: Management**
- Engineering manager: +1-555-0789  
- Response time: 1 hour
- Authority: Pilot termination

### Documentation Requirements

**Daily Logs**
- System metrics and performance data
- Driver feedback and issues
- Error analysis and resolutions
- Operational decisions made

**Final Report (Day 8)**
- Pilot success metrics vs thresholds
- Driver satisfaction survey results  
- Technical issues encountered and resolved
- Recommendation for full rollout
- Lessons learned and improvements needed

### Success Criteria Met

**Proceed to Full Rollout If:**
- All "Must Meet" thresholds achieved for 7 consecutive days
- ≥80% of "Target Goals" achieved
- Positive driver feedback (≥4/5 satisfaction)
- No unresolved technical issues
- Operations team confidence in system stability

**Partial Success (Extended Pilot):**
- "Must Meet" thresholds achieved
- 1-2 "Target Goals" missed by <10%
- Minor issues identified with clear resolution path

**Pilot Failure (Rollback Required):**
- Any "Must Meet" threshold missed
- Multiple "Target Goals" significantly missed  
- Consistent driver dissatisfaction
- Unresolved technical issues
- Operations team lacks confidence

---
**Duration**: 7 days  
**Participants**: 3 pilot drivers + ops team  
**Decision Point**: Day 8 (go/no-go for full rollout)  
**Rollback Time**: <10 minutes (automated)