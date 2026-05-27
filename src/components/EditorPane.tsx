import React, { useRef, useEffect } from "react";
import { Anchor, PDFPosition } from "../types";
import {
  Pointer,
  Bold,
  Italic,
  Underline,
  Trash2,
  CheckCircle,
  HelpCircle,
  Eye,
  Plus,
  Compass,
} from "lucide-react";
import { cn } from "../lib/utils";

interface EditorPaneProps {
  anchors: Anchor[];
  activeAnchor: string | null;
  pendingAnchor: string | null;
  activePositionId: string | null;
  onAddAnchor: (id: string) => void;
  onAnchorClick: (id: string) => void;
  onStartBinding: (id: string) => void;
  onStopBinding: () => void;
  onDeletePosition: (anchorId: string, posId: string) => void;
  onClearPositions: (anchorId: string) => void;
  onSelectPosition: (posId: string) => void;
}

export default function EditorPane({
  anchors,
  activeAnchor,
  pendingAnchor,
  activePositionId,
  onAddAnchor,
  onAnchorClick,
  onStartBinding,
  onStopBinding,
  onDeletePosition,
  onClearPositions,
  onSelectPosition,
}: EditorPaneProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Synchronize anchor text and visual states directly in ContentEditable elements
  useEffect(() => {
    if (!editorRef.current) return;

    anchors.forEach((a) => {
      const el = editorRef.current?.querySelector(`[data-anchor-id="${a.id}"]`);
      if (el) {
        const uniquePages = Array.from(
          new Set(a.positions.map((p) => p.page)),
        ).sort((x, y) => x - y);

        if (a.bound && uniquePages.length > 0) {
          el.setAttribute("data-bound", "true");
          el.innerHTML = `🔗 PDF 引文 (P.${uniquePages.join(", ")})`;
          el.className = cn(
            "editor-anchor cursor-pointer px-2 py-0.5 mx-1 rounded bg-blue-100 text-blue-800 border border-blue-300 font-semibold text-xs select-none transition-all hover:bg-blue-200 inline-flex items-center gap-1",
            activeAnchor === a.id
              ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-200"
              : "",
          );
        } else {
          el.setAttribute("data-bound", "false");
          el.innerHTML = "🔗 待定位锚点";
          el.className = cn(
            "editor-anchor cursor-pointer px-2 py-0.5 mx-1 rounded bg-amber-50 text-amber-800 border border-dashed border-amber-400 font-medium text-xs select-none transition-all hover:bg-amber-100 inline-flex items-center gap-1",
            activeAnchor === a.id
              ? "ring-2 ring-amber-500 ring-offset-1 bg-amber-100"
              : "",
          );
        }
      }
    });
  }, [anchors, activeAnchor]);

  // Handle active anchor highlight within the document page
  useEffect(() => {
    if (activeAnchor && editorRef.current) {
      const el = editorRef.current.querySelector(
        `[data-anchor-id="${activeAnchor}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeAnchor]);

  const handleCommand = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const handleInsertAnchor = () => {
    editorRef.current?.focus();
    const id = `anchor-${Date.now()}`;
    const span = `<span contenteditable="false" class="editor-anchor cursor-pointer px-2 py-0.5 mx-1 rounded bg-amber-50 text-amber-800 border border-dashed border-amber-400 font-medium text-xs select-none transition-all" data-anchor-id="${id}" data-bound="false" id="editor-${id}">🔗 待定位锚点</span>`;

    const savedSelection = window.getSelection();
    if (
      savedSelection &&
      savedSelection.rangeCount > 0 &&
      editorRef.current?.contains(savedSelection.anchorNode)
    ) {
      document.execCommand("insertHTML", false, span + "&nbsp;");
    } else {
      if (editorRef.current) {
        editorRef.current.innerHTML += span + "&nbsp;";
      }
    }

    onAddAnchor(id);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchorEl = target.closest(".editor-anchor");
    if (anchorEl) {
      const id = anchorEl.getAttribute("data-anchor-id");
      if (id) {
        onAnchorClick(id);
      }
    }
  };

  const selectedAnchorData = anchors.find((a) => a.id === activeAnchor);
  const isBinding = pendingAnchor === activeAnchor;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Editor Main Toolbar */}
      <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-between px-4 gap-2 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleCommand("bold")}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            title="加粗 (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCommand("italic")}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            title="斜体 (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCommand("underline")}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            title="下划线 (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-2" />

          <button
            onClick={handleInsertAnchor}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md transition-colors text-xs font-semibold shadow-sm"
            title="在光标处插入链接锚点"
          >
            <Plus className="w-3.5 h-3.5" />
            插入标记锚点
          </button>
        </div>
        <div className="text-xs text-gray-400 font-mono hidden md:block">
          文字编辑器 · UTF-8
        </div>
      </div>

      {/* Embedded Anchor Info Board (Only visible when an anchor is selected/active) */}
      {selectedAnchorData ? (
        <div className="bg-blue-50/90 border-b border-blue-200 px-6 py-3.5 shrink-0 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm inline-block animate-pulse" />
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  已选锚点面板：
                </span>
                <span className="text-xs font-semibold text-blue-700 font-mono bg-blue-100 px-1.5 py-0.5 rounded">
                  {selectedAnchorData.id}
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-1">
                {selectedAnchorData.bound
                  ? `本标记已绑定 ${selectedAnchorData.positions.length} 处 PDF 位置，点击右下角定位点，可在两边互相极速跳转！`
                  : "这是一个未定位的锚点。请点击下方“在PDF上追加位置”按钮并在左侧打点。"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isBinding) {
                    onStopBinding();
                  } else {
                    onStartBinding(selectedAnchorData.id);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors",
                  isBinding
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.01]"
                    : "bg-blue-600 text-white hover:bg-blue-700",
                )}
              >
                {isBinding ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    完成打点 (点击结束)
                  </>
                ) : (
                  <>
                    <Pointer className="w-3.5 h-3.5 animate-bounce" />在 PDF
                    上追加位置
                  </>
                )}
              </button>
              {selectedAnchorData.bound && (
                <button
                  onClick={() => onClearPositions(selectedAnchorData.id)}
                  className="px-2.5 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="清除此标记绑定的所有坐标"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  全部清空
                </button>
              )}
            </div>
          </div>

          {/* Bound Positions List tags */}
          {selectedAnchorData.positions.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-blue-800 font-medium shrink-0 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                包含 {selectedAnchorData.positions.length} 处子定位：
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedAnchorData.positions.map((pos, idx) => {
                  const isActive = activePositionId === pos.id;
                  return (
                    <div
                      key={pos.id}
                      onClick={() => onSelectPosition(pos.id)}
                      className={cn(
                        "group inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white text-xs border cursor-pointer select-none transition-all shadow-sm",
                        isActive
                          ? "border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-semibold bg-blue-50/50"
                          : "border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                      )}
                    >
                      <span>
                        位置 {idx + 1} (第 {pos.page} 页)
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePosition(selectedAnchorData.id, pos.id);
                        }}
                        className="p-0.5 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-700 transition-colors opacity-60 group-hover:opacity-100"
                        title="删除此单一位置"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2.5 shrink-0 text-xs text-gray-500 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span>
            点击下方笔记中的任何【🔗标签】，可以管理并跳转其关联的所有 PDF
            位置。
          </span>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6 md:p-8 shadow-inner">
        {/* The Page Container mimicking an exact report sheet */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onClick={handleEditorClick}
          className="bg-white mx-auto min-h-[850px] max-w-2xl shadow-md border border-gray-200 p-8 md:p-12 focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-800 leading-relaxed text-sm md:text-base cursor-text font-serif"
          style={{
            minHeight: "297mm",
          }}
        >
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4 font-sans text-gray-900 border-b pb-2">
            阅读与批注笔记
          </h1>
          <p className="mb-4">
            写好一段批注后，我们可以给文字生成一个锚点标记。
          </p>

          <p className="mb-4">
            比如，针对论文的核心模型架构，插入一个标记：
            <span
              contenteditable="false"
              className="editor-anchor cursor-pointer px-1.5 py-0.5 mx-1 rounded bg-amber-50 text-amber-800 border border-dashed border-amber-400 font-medium text-xs select-none"
              data-anchor-id="default-model-architecture"
              data-bound="false"
              id="editor-default-model-architecture"
            >
              🔗 待定位锚点
            </span>
            。插入后选中它，在左侧PDF中点击对应的几处公式或示意图位置进行多点绑定。
          </p>

          <p className="mb-4">
            再比如，我们发现文献第 1 处和第 3 处的实验数据有互相佐证的关系：
            <span
              contenteditable="false"
              className="editor-anchor cursor-pointer px-1.5 py-0.5 mx-1 rounded bg-amber-50 text-amber-800 border border-dashed border-amber-400 font-medium text-xs select-none"
              data-anchor-id="default-experiment"
              data-bound="false"
              id="editor-default-experiment"
            >
              🔗 待定位锚点
            </span>
            。这非常适合建立一个“一对多”的书签链路！
          </p>

          <p className="text-gray-400 text-xs italic mt-20 border-t pt-4 font-sans">
            注：编辑时，您可以像在 Word
            中一样加粗、斜体。双击编辑或直接点击插入标记按钮。点击顶部“上传本地
            PDF”可以随时查看您本人的 PDF 文件。
          </p>
        </div>
      </div>
    </div>
  );
}
