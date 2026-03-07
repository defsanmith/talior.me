"use client";

import { cn } from "@/lib/utils";
import { usePreviewPresetMutation } from "@/store/api/presets/queries";
import { FontFamily, PreviewPresetDto, SectionOrder } from "@tailor.me/shared";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false },
);
const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), {
  ssr: false,
});

interface AppearancePreviewProps {
  fontFamily: FontFamily;
  fontSize: 10 | 11 | 12;
  sectionOrder: SectionOrder[];
  className?: string;
}

export function AppearancePreview({
  fontFamily,
  fontSize,
  sectionOrder,
  className,
}: AppearancePreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [isClient, setIsClient] = useState(false);
  const [triggerPreview, { isLoading }] = usePreviewPresetMutation();
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsClient(true);
    import("react-pdf").then((rp) => {
      rp.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${rp.pdfjs.version}/build/pdf.worker.min.mjs`;
    });
  }, []);

  const previewHash = useMemo(
    () => JSON.stringify({ fontFamily, fontSize, sectionOrder }),
    [fontFamily, fontSize, sectionOrder],
  );

  const fetchPreview = useCallback(async () => {
    const dto: PreviewPresetDto = { fontFamily, fontSize, sectionOrder };
    try {
      setError(null);
      const blob = await triggerPreview(dto).unwrap();
      const url = URL.createObjectURL(blob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      setError("Could not generate preview. Fill out your profile first.");
    }
  }, [fontFamily, fontSize, sectionOrder, triggerPreview]);

  useEffect(() => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(fetchPreview, 800);
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, [previewHash, fetchPreview]);

  if (!isClient) {
    return (
      <div
        className={cn(
          "flex h-[600px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading PDF viewer…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-red-500/20 bg-red-950/10 p-8",
          className,
        )}
      >
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchPreview}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-zinc-900/80">
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Generating preview…</span>
          </div>
        </div>
      )}

      {pdfUrl && (
        <div className="overflow-hidden rounded-lg">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="flex h-[800px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            }
            error={
              <div className="flex h-[400px] items-center justify-center text-red-400">
                Failed to load PDF
              </div>
            }
            className="flex flex-col items-center"
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={600}
                className="mb-4 shadow-lg"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            ))}
          </Document>
        </div>
      )}

      {!pdfUrl && !isLoading && (
        <div className="flex h-[600px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800">
          <p className="text-zinc-500">PDF preview will appear here</p>
        </div>
      )}
    </div>
  );
}
