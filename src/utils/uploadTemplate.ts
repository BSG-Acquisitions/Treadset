import { supabase } from "@/integrations/supabase/client";

export const uploadAcroFormTemplate = async (version: '3' | '4' = '4') => {
  try {
    const fileName = version === '4' 
      ? 'Michigan_Manifest_AcroForm_V4.pdf'
      : 'Michigan_Manifest_AcroForm.pdf';
      
    // Fetch the PDF from the public folder
    const response = await fetch(`/manifests/templates/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch template PDF: ${fileName}`);
    }
    
    const pdfBlob = await response.blob();
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('manifests')
      .upload(`templates/${fileName}`, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true, // Allow overwriting if exists
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    console.log(`Template v${version} uploaded successfully:`, data);
    return data;
    
  } catch (error) {
    console.error('Failed to upload template:', error);
    throw error;
  }
};

export const uploadAllTemplates = async () => {
  console.log('Uploading all templates...');
  const results = {
    v3: null as any,
    v4: null as any,
    errors: [] as string[]
  };
  
  try {
    results.v3 = await uploadAcroFormTemplate('3');
  } catch (error: any) {
    console.error('Failed to upload v3:', error);
    results.errors.push(`v3: ${error.message}`);
  }
  
  try {
    results.v4 = await uploadAcroFormTemplate('4');
  } catch (error: any) {
    console.error('Failed to upload v4:', error);
    results.errors.push(`v4: ${error.message}`);
  }
  
  return results;
};