# Manifest PDF Overlay System

## Overview
The manifest finalization system overlays text and signatures onto an existing Michigan state-compliant PDF template stored in Supabase Storage.

## Architecture

### Template Location
- **Storage Path**: `manifests/templates/STATE_Manifest_v1.pdf`
- **Bucket**: `manifests` (private)

### Configuration Files

#### `/config/manifestFields.json`
Maps overlay field IDs to database columns with optional formatting:
```json
{
  "manifestNumber": { "source": "manifest_number" },
  "date": { "source": "created_at", "format": "date" },
  "total": { "source": "total", "format": "currency" }
}
```

**Supported Formats:**
- `int`: Number formatting
- `currency`: USD currency formatting  
- `date`: MM/DD/YYYY date formatting
- `string`: Default string conversion

#### `/config/manifestLayout.json`
Defines exact PDF coordinates (in points) for text and signature placement:
```json
{
  "page": 1,
  "text": {
    "manifestNumber": { "x": 460, "y": 730, "fontSize": 10, "align": "right" }
  },
  "signatures": {
    "customer": { "x": 110, "y": 120, "w": 200, "h": 42 }
  }
}
```

**Text Alignment Options:**
- `left` (default): Text starts at x coordinate
- `right`: Text ends at x coordinate  
- `center`: Text centered on x coordinate

### API Endpoint

**Edge Function**: `supabase/functions/manifest-finalize/index.ts`

**Request:**
```json
{
  "manifestId": "uuid"
}
```

**Process:**
1. Validates user access via RLS
2. Fetches manifest data with related tables
3. Downloads PDF template from Storage
4. Maps fields using `manifestFields.json`
5. Validates all required fields exist
6. Overlays text using `manifestLayout.json` coordinates
7. Embeds PNG signatures if available
8. Uploads final PDF to `manifests/{orgSlug}/{yyyy}/{mm}/{manifestNumber}.pdf`
9. Creates 7-day signed URL
10. Sends email with PDF link (not attachment)

**Response:**
```json
{
  "success": true,
  "pdfPath": "manifests/bsg/2024/01/20240108-00001.pdf",
  "pdfUrl": "https://...signedUrl...",
  "hash": "sha256hash"
}
```

**Error Handling:**
- `500`: Template not found at expected path
- `400`: Missing required fields (returns list)
- `404`: Manifest not found or access denied
- `500`: PDF generation or upload failure

### Calibration Process

1. **Initial Setup**: Use placeholder coordinates in `manifestLayout.json`
2. **Generate Test PDF**: Finalize a manifest with test data
3. **Print & Measure**: Print PDF and measure actual text positions
4. **Adjust Coordinates**: Update `manifestLayout.json` with measured values
5. **Repeat**: Generate new PDF and verify positioning
6. **Deploy**: Updated coordinates apply immediately to new finalizations

### Security & Access Control

- **RLS Policies**: Drivers can only finalize their assigned manifests
- **Admin Access**: Admins/dispatchers can finalize any manifest in their organization
- **Storage Security**: PDF bucket is private, access via signed URLs only
- **Template Protection**: Template PDF accessible only via service role key

### Integration Points

- **Driver Interface**: "Finalize" button calls manifest-finalize function
- **Back Office**: "Download PDF" and "Resend Email" buttons
- **Client Portal**: Documents section lists finalized manifests
- **Email Notifications**: Links sent to client contacts and drivers

### Troubleshooting

**Template Not Found:**
- Verify `manifests/templates/STATE_Manifest_v1.pdf` exists in Storage
- Check Storage bucket permissions and service role access

**Missing Fields:**
- Review `manifestFields.json` mappings against actual database columns
- Check manifest data completeness before finalization

**Positioning Issues:**
- PDF coordinates are in points (72 DPI)
- Y coordinates start from bottom of page
- Use calibration process to fine-tune positioning

**Signature Issues:**
- Verify PNG signature paths exist in Storage
- Check signature image format (must be PNG)
- Ensure signature dimensions fit layout boundaries