import { supabase } from "@/integrations/supabase/client";

export const uploadAcroFormTemplate = async () => {
  try {
    // Fetch the PDF from the public folder
    const response = await fetch('/manifests/templates/Michigan_Manifest_AcroForm.pdf');
    if (!response.ok) {
      throw new Error('Failed to fetch template PDF');
    }
    
    const pdfBlob = await response.blob();
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('manifests')
      .upload('templates/Michigan_Manifest_AcroForm.pdf', pdfBlob, {
        contentType: 'application/pdf',
        upsert: true, // Allow overwriting if exists
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    console.log('Template uploaded successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Failed to upload template:', error);
    throw error;
  }
};