import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { renderManifestPdf } from '@/lib/pdf/manifest'

export const runtime = 'nodejs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const supabase = createPagesServerClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const { manifestId } = req.body
  if (!manifestId) {
    return res.status(400).json({ ok: false, error: 'Missing manifestId' })
  }

  try {
    // Fetch manifest with related data through RLS-safe query
    const { data: manifest, error: manifestError } = await supabase
      .from('manifests')
      .select(`
        *,
        clients!inner(*),
        locations(*),
        organizations!inner(*)
      `)
      .eq('id', manifestId)
      .single()

    if (manifestError || !manifest) {
      return res.status(404).json({ ok: false, error: manifestError?.message || 'Manifest not found' })
    }

    // Fetch signature files if they exist
    let customerSig: Uint8Array | undefined
    let driverSig: Uint8Array | undefined

    if (manifest.customer_signature_png_path) {
      const { data } = await supabase.storage
        .from('manifests')
        .download(manifest.customer_signature_png_path)
      if (data) customerSig = new Uint8Array(await data.arrayBuffer())
    }

    if (manifest.driver_signature_png_path) {
      const { data } = await supabase.storage
        .from('manifests')
        .download(manifest.driver_signature_png_path)
      if (data) driverSig = new Uint8Array(await data.arrayBuffer())
    }

    // Generate PDF with overlays
    const { pdfPath, pdfHash } = await renderManifestPdf({
      orgSlug: manifest.organizations.slug,
      manifestNumber: manifest.manifest_number,
      pdfBucket: 'manifests',
      fields: {
        manifestNumber: manifest.manifest_number,
        date: new Date().toLocaleDateString(),
        clientName: manifest.clients.company_name,
        serviceAddress: manifest.locations?.address || 'N/A',
        cityStateZip: 'N/A', // TODO: extract from location
        driverName: 'Driver Name', // TODO: get from user
        vehicle: 'Vehicle', // TODO: get from assignment
        pteOff: manifest.pte_off_rim || 0,
        pteOn: manifest.pte_on_rim || 0,
        c175Off: manifest.commercial_17_5_19_5_off || 0,
        c175On: manifest.commercial_17_5_19_5_on || 0,
        c225Off: manifest.commercial_22_5_off || 0,
        c225On: manifest.commercial_22_5_on || 0,
        subtotal: manifest.subtotal || 0,
        surcharges: manifest.surcharges || 0,
        total: manifest.total || 0
      },
      signaturePngs: { customer: customerSig, driver: driverSig }
    })

    // Update manifest with PDF info
    const { error: updateError } = await supabase
      .from('manifests')
      .update({ 
        pdf_path: pdfPath, 
        pdf_bytes_hash: pdfHash, 
        status: 'COMPLETED',
        signed_at: new Date().toISOString()
      })
      .eq('id', manifestId)

    if (updateError) {
      return res.status(500).json({ ok: false, error: updateError.message })
    }

    // Generate signed URL for email
    const { data: signedUrl } = await supabase.storage
      .from('manifests')
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 7) // 7 days

    // Send email with link (using existing email system)
    if (manifest.clients.email && signedUrl?.signedUrl) {
      // TODO: Integrate with existing useSendManifestEmail system
      console.log('Would send email to:', manifest.clients.email, 'with link:', signedUrl.signedUrl)
    }

    return res.status(200).json({ 
      ok: true, 
      pdfPath, 
      link: signedUrl?.signedUrl 
    })
  } catch (error) {
    console.error('Finalize error:', error)
    return res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}