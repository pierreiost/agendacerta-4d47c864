import { useEffect, useState } from "react";
import { getInquiryPhotoSignedUrls } from "@/lib/inquiryPhotos";

export function useSignedInquiryUrls(paths: string[] | null | undefined) {
  const [urls, setUrls] = useState<string[]>([]);
  const key = (paths || []).join("|");

  useEffect(() => {
    let cancelled = false;
    if (!paths || paths.length === 0) {
      setUrls([]);
      return;
    }
    getInquiryPhotoSignedUrls(paths).then((signed) => {
      if (!cancelled) setUrls(signed);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
