"use client";

import { cn } from "@/lib/utils";
import { useLazyGetResumePdfQuery } from "@/store/api/jobs/queries";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { EditableResume } from "./types";

// Dynamically import react-pdf components with SSR disabled
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false },
);

const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), {
  ssr: false,
});

interface PdfPreviewProps {
  jobId: string;
  resume: EditableResume;
  className?: string;
}

export function PdfPreview({ jobId, resume, className }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [isClient, setIsClient] = useState(false);
  const [triggerGetPdf, { isLoading }] = useLazyGetResumePdfQuery();

  // Only render PDF components on the client
  useEffect(() => {
    setIsClient(true);

    // Configure PDF.js worker on client side only
    import("react-pdf").then((reactPdf) => {
      reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${reactPdf.pdfjs.version}/build/pdf.worker.min.mjs`;
    });
  }, []);

  // Create a stable hash of the resume to detect changes
  const resumeHash = useMemo(() => {
    return JSON.stringify(resume);
  }, [resume]);

  // Fetch PDF when resume changes (debounced)
  const fetchPdf = useCallback(async () => {
    setError(null);

    try {
      const result = await triggerGetPdf(jobId).unwrap();
      const url = URL.createObjectURL(result);

      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    }
  }, [jobId, pdfUrl, triggerGetPdf]);

  // Debounced fetch when resume changes
  useEffect(() => {
    if (!isClient) return;

    const timeoutId = setTimeout(() => {
      fetchPdf();
    }, 1000); // Wait 1 second after changes stop

    return () => clearTimeout(timeoutId);
  }, [resumeHash, isClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

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
          <span>Loading PDF viewer...</span>
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
            onClick={fetchPdf}
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
            <span>Generating PDF...</span>
          </div>
        </div>
      )}

      {pdfUrl && (
        <div className="overflow-hidden rounded-lg bg-zinc-800 shadow-xl">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
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

      {!pdfUrl && !isLoading && !error && (
        <div className="flex h-[600px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800">
          <p className="text-zinc-500">PDF preview will appear here</p>
        </div>
      )}
    </div>
  );
}
