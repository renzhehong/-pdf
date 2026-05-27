import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Anchor, PDFPosition } from "../types";
import { Loader2, AlertCircle, MapPin } from "lucide-react";
import { cn } from "../lib/utils";

// 显式指定安全可靠的 https cdn 链接作为 worker 地址，避免由于沙箱环境的协议缺省导致的安全加载限制
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || "4.4.41"}/build/pdf.worker.min.mjs`;

interface PDFPaneProps {
  file: File | string | null;
  anchors: Anchor[];
  pendingAnchor: string | null;
  activeAnchor: string | null;
  activePositionId: string | null;
  onBindAnchor: (page: number, x: number, y: number) => void;
  onAnchorClick: (anchorId: string, positionId: string) => void;
}

export default function PDFPane({
  file,
  anchors,
  pendingAnchor,
  activeAnchor,
  activePositionId,
  onBindAnchor,
  onAnchorClick,
}: PDFPaneProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 当文件变更时，重置页数和错误
  useEffect(() => {
    setNumPages(0);
    setLoadError(null);
  }, [file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoadError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF Load Error detail:", error);
    setLoadError(error);
  }

  // Dual Scroll trigger for perfect multi-link positioning
  useEffect(() => {
    if (activePositionId) {
      setTimeout(() => {
        const pinEl = document.getElementById(`pdf-pos-${activePositionId}`);
        if (pinEl && scrollContainerRef.current) {
          pinEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    } else if (activeAnchor) {
      setTimeout(() => {
        const anchorData = anchors.find((a) => a.id === activeAnchor);
        if (anchorData && anchorData.positions.length > 0) {
          const firstPos = anchorData.positions[0];
          const pinEl = document.getElementById(`pdf-pos-${firstPos.id}`);
          if (pinEl && scrollContainerRef.current) {
            pinEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 50);
    }
  }, [activePositionId, activeAnchor]);

  const handlePageClick = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number,
  ) => {
    if (!pendingAnchor) return;

    // Calculate percentage coordinates relative to the page div
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onBindAnchor(pageIndex, x, y);
  };

  // Group all bound positions per page for efficient rendering
  const positionsByPage = anchors.reduce(
    (acc, anchor) => {
      anchor.positions.forEach((pos) => {
        if (!acc[pos.page]) {
          acc[pos.page] = [];
        }
        acc[pos.page].push({
          anchorId: anchor.id,
          pos,
          anchor,
        });
      });
      return acc;
    },
    {} as Record<
      number,
      { anchorId: string; pos: PDFPosition; anchor: Anchor }[]
    >,
  );

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
        <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center shrink-0">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <p>请点击右上角按钮上传 PDF 文件</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-500 bg-gray-50 p-8 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500 hover:scale-105 transition-transform" />
        <h3 className="text-lg font-semibold text-gray-800">PDF 加载失败</h3>
        <p className="text-sm text-gray-600 text-center max-w-md">
          {loadError.message || "无法加载该 PDF。请确保文件未损坏且格式正确。"}
        </p>
        <p className="text-xs text-gray-400 font-mono text-center max-w-md">
          有些浏览器隐私沙箱环境可能会阻拦在线 CDN
          Worker（pdf.worker.js）。如果反复出现，您可以尝试在普通网页卡片或无痕标签页中打开。
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex-1 overflow-auto bg-gray-200 p-8 flex flex-col items-center select-none",
        pendingAnchor ? "cursor-crosshair" : "cursor-default",
      )}
    >
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex flex-col items-center justify-center p-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
            <p className="font-semibold text-sm">正在载入 PDF 文档...</p>
          </div>
        }
        className="flex flex-col gap-8"
      >
        {Array.from(new Array(numPages), (el, index) => {
          const pageIndex = index + 1;
          const pagePositions = positionsByPage[pageIndex] || [];

          return (
            <div
              key={`page_${pageIndex}`}
              id={`pdf-page-${pageIndex}`}
              className="relative shadow-md hover:shadow-lg bg-white w-fit mx-auto transition-all"
              onClick={(e) => handlePageClick(e, pageIndex)}
            >
              <Page
                pageNumber={pageIndex}
                className="max-w-full"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />

              {/* Render multi-bound pin tags for this page */}
              {pagePositions.map(({ anchorId, pos, anchor }) => {
                const isSelected = activePositionId === pos.id;
                const isHostSelected = activeAnchor === anchorId;
                const localIndex =
                  anchor.positions.findIndex((p) => p.id === pos.id) + 1;

                return (
                  <div
                    key={`pdf-pin-${pos.id}`}
                    id={`pdf-pos-${pos.id}`}
                    className={cn(
                      "absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center text-[10px] font-black shadow-md transition-all z-20 cursor-pointer select-none border border-white",
                      isSelected
                        ? "bg-blue-600 text-white ring-4 ring-blue-500/40 ring-offset-2 scale-125 z-30 font-bold"
                        : isHostSelected
                          ? "bg-blue-500 text-white ring-2 ring-blue-300 scale-110 z-20"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-115 z-10",
                    )}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnchorClick(anchorId, pos.id);
                    }}
                    title={`点击返回笔记。位置：${localIndex} (共 ${anchor.positions.length} 处)`}
                  >
                    {localIndex}
                  </div>
                );
              })}

              {/* Subtle hover overlay for crosshair targeting */}
              {pendingAnchor && (
                <div className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/5 transition-colors pointer-events-none" />
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
}
