import React, { useState, useCallback } from "react";
import PDFPane from "./components/PDFPane";
import EditorPane from "./components/EditorPane";
import { Anchor, PDFPosition } from "./types";
import { FileUp, Info, HelpCircle } from "lucide-react";
import { DEMO_PDF_BASE64 } from "./components/DemoPDF";

export default function App() {
  const [file, setFile] = useState<File | string | null>(
    `data:application/pdf;base64,${DEMO_PDF_BASE64}`,
  );
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [activePositionId, setActivePositionId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Reset state on new file upload to prevent stale anchors
      setAnchors([]);
      setPendingAnchor(null);
      setActiveAnchor(null);
      setActivePositionId(null);
    }
  };

  const addAnchor = useCallback((id: string, autoBind = true) => {
    setAnchors((prev) => {
      if (prev.some((a) => a.id === id)) return prev;
      return [...prev, { id, positions: [], bound: false }];
    });
    if (autoBind) {
      // Auto-enter pending binding mode for this new anchor
      setPendingAnchor(id);
      setActiveAnchor(id);
      setActivePositionId(null);
    }
  }, []);

  const bindAnchor = (page: number, x: number, y: number) => {
    if (!pendingAnchor) return;
    const positionId = `pos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newPos: PDFPosition = { id: positionId, page, x, y };

    setAnchors((prev) =>
      prev.map((a) => {
        if (a.id === pendingAnchor) {
          return {
            ...a,
            positions: [...a.positions, newPos],
            bound: true,
          };
        }
        return a;
      }),
    );
    setActivePositionId(positionId);
  };

  const cancelPending = () => {
    setPendingAnchor(null);
  };

  const handleAnchorClickInEditor = (id: string) => {
    let anchor = anchors.find((a) => a.id === id);
    if (!anchor) {
      addAnchor(id, true);
      return;
    }

    if (activeAnchor === id) {
      // If it is already active, cycle through its bound positions sequentially
      if (anchor.positions.length > 0) {
        const currentIndex = anchor.positions.findIndex(
          (p) => p.id === activePositionId,
        );
        const nextIndex = (currentIndex + 1) % anchor.positions.length;
        const nextPos = anchor.positions[nextIndex];
        setActivePositionId(nextPos.id);
      }
    } else {
      // If it's a new selection, select it and snap to its first position (if bound)
      setActiveAnchor(id);
      if (anchor.positions.length > 0) {
        setActivePositionId(anchor.positions[0].id);
      } else {
        setActivePositionId(null);
      }
    }
  };

  const handlePDFPositionClick = (anchorId: string, positionId: string) => {
    setActiveAnchor(anchorId);
    setActivePositionId(positionId);
  };

  const deletePositionDetail = (anchorId: string, posId: string) => {
    setAnchors((prev) =>
      prev.map((a) => {
        if (a.id === anchorId) {
          const updatedPositions = a.positions.filter((p) => p.id !== posId);
          return {
            ...a,
            positions: updatedPositions,
            bound: updatedPositions.length > 0,
          };
        }
        return a;
      }),
    );
    if (activePositionId === posId) {
      setActivePositionId(null);
    }
  };

  const clearAnchorPositions = (anchorId: string) => {
    setAnchors((prev) =>
      prev.map((a) =>
        a.id === anchorId ? { ...a, positions: [], bound: false } : a,
      ),
    );
    if (activeAnchor === anchorId) {
      setActivePositionId(null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden font-sans text-gray-900">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 2v8" />
              <path d="m4.93 10.93 14.14 14.14" />
              <path d="M2 22l6.3-6.3" />
              <path d="M22 2l-7.1 7.1" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-gray-800">
              PDF 多点联动书签阅读器
            </h1>
            <p className="text-xs text-gray-400">
              单个文字锚点可锁定多个 PDF 位置 · Bidirectional Coordinates Link
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white text-sm font-semibold rounded-lg shadow-sm">
            <FileUp className="w-4 h-4" />
            上传本地 PDF
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: PDF */}
        <div className="w-1/2 border-r border-gray-200 bg-gray-100 flex flex-col relative">
          <PDFPane
            file={file}
            anchors={anchors}
            pendingAnchor={pendingAnchor}
            activeAnchor={activeAnchor}
            activePositionId={activePositionId}
            onBindAnchor={bindAnchor}
            onAnchorClick={handlePDFPositionClick}
          />
          {pendingAnchor && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg font-medium text-sm flex items-center gap-3 animate-pulse pointer-events-none z-50">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
                正在为当前选中锚点绑定位置，请直接在左侧 PDF
                点选位置（支持多点绑定）
              </span>
              <button
                onClick={cancelPending}
                className="pointer-events-auto bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded-md text-xs font-semibold ml-2 transition-colors transition-transform active:scale-95"
              >
                结束/完成打点
              </button>
            </div>
          )}
        </div>

        {/* Right Pane: Editor */}
        <div className="w-1/2 bg-white flex flex-col relative">
          <EditorPane
            anchors={anchors}
            activeAnchor={activeAnchor}
            pendingAnchor={pendingAnchor}
            activePositionId={activePositionId}
            onAddAnchor={addAnchor}
            onAnchorClick={handleAnchorClickInEditor}
            onStartBinding={(id) => setPendingAnchor(id)}
            onStopBinding={cancelPending}
            onDeletePosition={(anchorId, posId) =>
              deletePositionDetail(anchorId, posId)
            }
            onClearPositions={clearAnchorPositions}
            onSelectPosition={(posId) => setActivePositionId(posId)}
          />
        </div>
      </main>
    </div>
  );
}
