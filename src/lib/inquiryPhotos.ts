import { supabase } from "@/integrations/supabase/client";

/**
 * Extract the storage path from a stored value that may be either
 * a bare path ("venueId/file.jpg") or a legacy public URL.
 */
export function extractInquiryPhotoPath(value: string): string {
  if (!value) return value;
  const marker = "/inquiry-photos/";
  const idx = value.indexOf(marker);
  if (idx >= 0) return value.slice(idx + marker.length);
  return value;
}

/**
 * Generate a signed URL (default 1 hour) for an inquiry photo.
 * Accepts both bare paths and legacy public URLs.
 */
export async function getInquiryPhotoSignedUrl(
  value: string,
  expiresIn = 3600
): Promise<string> {
  const path = extractInquiryPhotoPath(value);
  const { data, error } = await supabase.storage
    .from("inquiry-photos")
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

export async function getInquiryPhotoSignedUrls(
  values: string[],
  expiresIn = 3600
): Promise<string[]> {
  return Promise.all(values.map((v) => getInquiryPhotoSignedUrl(v, expiresIn)));
}
