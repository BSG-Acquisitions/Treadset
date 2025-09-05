// server: overlay onto existing blank PDF
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import crypto from "crypto";
import { supabase } from "@/integrations/supabase/client";
import fs from "node:fs/promises";
import path from "node:path";

type Layout = {
  page: number;
  text: Record<string, { x:number;y:number;fontSize:number;align?:'left'|'right';bold?:boolean }>;
  signatures: Record<"customer"|"driver",{x:number;y:number;w:number;h:number}>;
  images: Record<"logo"|"qr",{x:number;y:number;w:number;h:number}>;
};

export async function renderManifestPdf(input: {
  orgSlug: string;
  manifestNumber: string;
  pdfBucket: string;                                  // e.g., 'manifests'
  templatePath?: string;                              // defaults to /public/templates/STATE_Manifest_v1.pdf
  layoutPath?: string;                                // defaults to /config/manifestLayout.json
  fields: Record<string, string | number>;
  signaturePngs: { customer?: Uint8Array; driver?: Uint8Array };
  logoPng?: Uint8Array;
  qrPng?: Uint8Array;
}) {
  const templateFsPath = input.templatePath ?? path.join(process.cwd(), "public", "templates", "STATE_Manifest_v1.pdf");
  const layoutFsPath   = input.layoutPath   ?? path.join(process.cwd(), "config", "manifestLayout.json");
  
  try {
    const [templateBytes, layoutJson] = await Promise.all([
      fs.readFile(templateFsPath),
      fs.readFile(layoutFsPath, "utf8").then((t)=>JSON.parse(t) as Layout),
    ]);

    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPage(layoutJson.page - 1);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // draw text fields
    for (const [k, v] of Object.entries(layoutJson.text)) {
      const val = input.fields[k];
      if (val === undefined || val === null) continue;
      const text = String(val);
      const fnt  = v.bold ? bold : font;
      const size = v.fontSize ?? 10;
      const width = fnt.widthOfTextAtSize(text, size);
      const x = v.align === "right" ? v.x - width : v.x;
      page.drawText(text, { x, y: v.y, size, font: fnt, color: rgb(0,0,0) });
    }

    // signatures
    if (input.signaturePngs.customer) {
      const img = await pdf.embedPng(input.signaturePngs.customer);
      page.drawImage(img, { 
        x: layoutJson.signatures.customer.x, 
        y: layoutJson.signatures.customer.y, 
        width: layoutJson.signatures.customer.w, 
        height: layoutJson.signatures.customer.h 
      });
    }
    if (input.signaturePngs.driver) {
      const img = await pdf.embedPng(input.signaturePngs.driver);
      page.drawImage(img, { 
        x: layoutJson.signatures.driver.x, 
        y: layoutJson.signatures.driver.y, 
        width: layoutJson.signatures.driver.w, 
        height: layoutJson.signatures.driver.h 
      });
    }

    // optional logo/qr
    if (input.logoPng) {
      const img = await pdf.embedPng(input.logoPng);
      const s = layoutJson.images.logo; 
      page.drawImage(img, { x: s.x, y: s.y, width: s.w, height: s.h });
    }
    if (input.qrPng) {
      const img = await pdf.embedPng(input.qrPng);
      const s = layoutJson.images.qr; 
      page.drawImage(img, { x: s.x, y: s.y, width: s.w, height: s.h });
    }

    // flatten by saving (pdf-lib draws directly on content stream)
    const pdfBytes = await pdf.save();
    const hash = crypto.createHash("sha256").update(pdfBytes).digest("hex");

    // store to Supabase
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth()+1).padStart(2,"0");
    const key = `${input.orgSlug}/${yyyy}/${mm}/${input.manifestNumber}.pdf`;

    const { error } = await supabase.storage.from(input.pdfBucket).upload(key, pdfBytes, { 
      contentType: "application/pdf", 
      upsert: true 
    });
    if (error) throw new Error("Upload failed: " + error.message);

    return { pdfPath: key, pdfHash: hash, sizeBytes: pdfBytes.length };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error("Template PDF not found at /public/templates/STATE_Manifest_v1.pdf. Please upload the blank state PDF template.");
    }
    throw error;
  }
}