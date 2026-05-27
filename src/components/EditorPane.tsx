import React, { useRef, useEffect, useState } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "../lib/utils";

const INITIAL_HTML_CONTENT = `
<h1 class="text-2xl md:text-3xl font-extrabold mb-4 font-sans text-gray-900 border-b pb-2">
  阅读与批注笔记
</h1>
<p class="mb-4">
  写好一段批注后，我们可以给文字生成一个锚点标记。
</p>

<p class="mb-4">
  比如，针对论文的核心模型架构，插入一个标记：
  <span
    contenteditable="false"
    class="editor-anchor cursor-pointer inline-flex items-center justify-center text-[10px] font-bold rounded-sm bg-amber-50 text-amber-800 border border-dashed border-amber-300 select-none h-[18px] w-[18px] mx-0.5 align-middle transition-all"
    data-anchor-id="default-model-architecture"
    data-bound="false"
    id="editor-default-model-architecture"
  >?</span>
  。插入后选中它，在左侧PDF中点击对应的几处公式或示意图位置进行多点绑定。
</p>

<p class="mb-4">
  再比如，我们发现文献第 1 处和第 3 处的实验数据有互相佐证的关系：
  <span
    contenteditable="false"
    class="editor-anchor cursor-pointer inline-flex items-center justify-center text-[10px] font-bold rounded-sm bg-amber-50 text-amber-800 border border-dashed border-amber-300 select-none h-[18px] w-[18px] mx-0.5 align-middle transition-all"
    data-anchor-id="default-experiment"
    data-bound="false"
    id="editor-default-experiment"
  >?</span>
  。这非常适合建立一个“一对多”的书签链路！
</p>

<p class="text-gray-400 text-xs italic mt-20 border-t pt-4 font-sans">
  注：编辑时，您可以像在 Word
  中一样加粗、斜体。双击编辑或直接点击插入标记按钮。点击顶部“上传本地
  PDF”可以随时查看您本人的 PDF 文件。
</p>
`;

interface EditorPaneProps {
  anchors: Anchor[];
  activeAnchor: string | null;
  pendingAnchor: string | null;
  activePositionId: string | null;
  onAddAnchor: (id: string, autoBind?: boolean) => void;
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
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [panelScale, setPanelScale] = useState<"compact" | "normal" | "large">(
    "normal",
  );

  // Initialize editor content once on mount and scan/sync existing anchors to state
  useEffect(() => {
    if (editorRef.current) {
      if (!editorRef.current.innerHTML.trim()) {
        editorRef.current.innerHTML = INITIAL_HTML_CONTENT;
      }
      // Scan all existing editor anchors inside the document and register them in state
      const els = editorRef.current.querySelectorAll(".editor-anchor");
      els.forEach((el) => {
        const id = el.getAttribute("data-anchor-id");
        if (id) {
          onAddAnchor(id, false); // Register silently
        }
      });
    }
  }, [onAddAnchor]);

  // Synchronize anchor text and visual states directly in ContentEditable elements
  useEffect(() => {
    if (!editorRef.current) return;

    anchors.forEach((a, idx) => {
      const el = editorRef.current?.querySelector(`[data-anchor-id="${a.id}"]`);
      if (el) {
        const displayIndex = idx + 1;
        if (a.bound && a.positions.length > 0) {
          el.setAttribute("data-bound", "true");
          el.innerHTML = `${displayIndex}`;
          el.setAttribute(
            "title",
            `🔗 已绑定 ${a.positions.length} 处 PDF 位置 (第 ${Array.from(
              new Set(a.positions.map((p) => p.page)),
            )
              .sort((x, y) => x - y)
              .join(", ")} 页)`,
          );
          el.className = cn(
            "editor-anchor cursor-pointer inline-flex items-center justify-center text-[10px] font-black rounded-sm bg-blue-100 text-blue-800 border border-blue-300 select-none h-[18px] w-[18px] mx-0.5 transition-all hover:bg-blue-200 shadow-xs align-middle",
            activeAnchor === a.id
              ? "ring-4 ring-yellow-400 ring-offset-1 bg-yellow-101 text-yellow-950 font-black border-yellow-500 animate-anchor-flash"
              : "",
          );
        } else {
          el.setAttribute("data-bound", "false");
          el.innerHTML = "?";
          el.setAttribute(
            "title",
            "💡 待定位锚点：双击或点击后在 PDF 上点击打点追加位置",
          );
          el.className = cn(
            "editor-anchor cursor-pointer inline-flex items-center justify-center text-[10px] font-bold rounded-sm bg-amber-50 text-amber-800 border border-dashed border-amber-300 select-none h-[18px] w-[18px] mx-0.5 transition-all hover:bg-amber-100 align-middle",
            activeAnchor === a.id
              ? "ring-4 ring-yellow-400 ring-offset-1 bg-yellow-101 text-yellow-950 font-black border-yellow-500 animate-anchor-flash"
              : "",
          );
        }
      }
    });
  }, [anchors, activeAnchor, activePositionId]);

  // Handle active anchor highlight within the document page and scroll it container-wise
  useEffect(() => {
    if (activeAnchor && editorRef.current) {
      setTimeout(() => {
        const el = editorRef.current?.querySelector(
          `[data-anchor-id="${activeAnchor}"]`,
        );
        if (el) {
          const container = editorContainerRef.current;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            
            // Mathematically precise centering of the target element inside the scroll parent
            const scrollTopTarget = 
              container.scrollTop + 
              (elRect.top - containerRect.top) - 
              (containerRect.height / 2) + 
              (elRect.height / 2);
              
            container.scrollTo({
              top: scrollTopTarget,
              behavior: "smooth"
            });
          } else {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }

          // Force animate/flash the element visual rings
          el.classList.remove("animate-anchor-flash");
          void el.offsetHeight; // reflow to restart animation
          el.classList.add("animate-anchor-flash");
        }
      }, 50);
    }
  }, [activeAnchor, activePositionId]);

  const handleCommand = (command: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false);
  };

  const handleInsertAnchor = () => {
    const id = `anchor-${Date.now()}`;

    // Focus first to make sure there's an active cursor inside the editor if nothing is active
    if (
      editorRef.current &&
      !editorRef.current.contains(document.activeElement)
    ) {
      editorRef.current.focus();
    }

    const selection = window.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      editorRef.current?.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const el = document.createElement("span");
      el.setAttribute("contenteditable", "false");
      el.className =
        "editor-anchor cursor-pointer inline-flex items-center justify-center text-[10px] font-bold rounded-sm bg-amber-50 text-amber-800 border border-dashed border-amber-300 select-none h-[18px] w-[18px] mx-0.5 align-middle transition-all";
      el.setAttribute("data-anchor-id", id);
      el.setAttribute("data-bound", "false");
      el.id = `editor-${id}`;
      el.innerText = "?";

      range.insertNode(el);

      // Move cursor right after the newly inserted element
      const postRange = document.createRange();
      postRange.setStartAfter(el);
      postRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(postRange);
    } else {
      if (editorRef.current) {
        const el = document.createElement("span");
        el.setAttribute("contenteditable", "false");
        el.className =
          "editor-anchor cursor-pointer inline-flex items-center justify-center text-[10px] font-bold rounded-sm bg-amber-50 text-amber-800 border border-dashed border-amber-300 select-none h-[18px] w-[18px] mx-0.5 align-middle transition-all";
        el.setAttribute("data-anchor-id", id);
        el.setAttribute("data-bound", "false");
        el.id = `editor-${id}`;
        el.innerText = "?";
        editorRef.current.appendChild(el);
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
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
            title="加粗 (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCommand("italic")}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
            title="斜体 (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCommand("underline")}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
            title="下划线 (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-2" />

          <button
            onClick={handleInsertAnchor}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md transition-colors text-xs font-semibold shadow-sm cursor-pointer"
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
        <div
          className={cn(
            "bg-blue-50/95 border-b border-blue-200 shrink-0 transition-all duration-300 shadow-sm",
            panelScale === "compact"
              ? "px-4 py-1.5"
              : panelScale === "large"
                ? "px-8 py-4.5"
                : "px-6 py-3",
          )}
        >
          {/* Header Row: Title, Scale Controls, and Minimize and Collapse Controls */}
          <div className="flex items-center justify-between gap-4 border-b border-blue-100/60 pb-1.5 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-sm inline-block animate-pulse" />
              <span
                className={cn(
                  "font-bold text-blue-900 uppercase tracking-wider",
                  panelScale === "compact"
                    ? "text-[10px]"
                    : panelScale === "large"
                      ? "text-xs"
                      : "text-[11px]",
                )}
              >
                🔗 已选关联锚点
              </span>
              <span
                className={cn(
                  "font-semibold text-blue-700 font-mono bg-blue-100/80 px-1.5 py-0.5 rounded",
                  panelScale === "compact"
                    ? "text-[9px]"
                    : panelScale === "large"
                      ? "text-xs"
                      : "text-[10px]",
                )}
              >
                {selectedAnchorData.id}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Presets and Buttons to Scale */}
              <div className="flex items-center bg-blue-100/50 hover:bg-blue-100 rounded-md p-0.5 border border-blue-200/50 shadow-xs">
                <span
                  className={cn(
                    "text-blue-800 font-medium px-1 select-none",
                    panelScale === "compact"
                      ? "text-[9px]"
                      : panelScale === "large"
                        ? "text-xs"
                        : "text-[10px]",
                  )}
                >
                  面板缩放:
                </span>
                <button
                  onClick={() => setPanelScale("compact")}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition-all text-center",
                    panelScale === "compact"
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : "text-blue-700 hover:bg-blue-200/60 font-medium",
                  )}
                  style={{
                    fontSize:
                      panelScale === "compact"
                        ? "9px"
                        : panelScale === "large"
                          ? "11px"
                          : "10px",
                  }}
                  title="紧凑缩放率 - 85%"
                >
                  85%
                </button>
                <button
                  onClick={() => setPanelScale("normal")}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition-all text-center",
                    panelScale === "normal"
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : "text-blue-700 hover:bg-blue-200/60 font-medium",
                  )}
                  style={{
                    fontSize:
                      panelScale === "compact"
                        ? "9px"
                        : panelScale === "large"
                          ? "11px"
                          : "10px",
                  }}
                  title="标准缩放率 - 100%"
                >
                  100%
                </button>
                <button
                  onClick={() => setPanelScale("large")}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition-all text-center",
                    panelScale === "large"
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : "text-blue-700 hover:bg-blue-200/60 font-medium",
                  )}
                  style={{
                    fontSize:
                      panelScale === "compact"
                        ? "9px"
                        : panelScale === "large"
                          ? "11px"
                          : "10px",
                  }}
                  title="扩展放大率 - 115%"
                >
                  115%
                </button>
              </div>

              {/* Toggle Minimization */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-blue-100/80 rounded text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                title={
                  isCollapsed ? "展开书签管理面板" : "收缩面板，腾出编辑器空间"
                }
              >
                {isCollapsed ? (
                  <ChevronDown
                    className={
                      panelScale === "compact"
                        ? "w-3.5 h-3.5"
                        : panelScale === "large"
                          ? "w-4.5 h-4.5"
                          : "w-4 h-4"
                    }
                  />
                ) : (
                  <ChevronUp
                    className={
                      panelScale === "compact"
                        ? "w-3.5 h-3.5"
                        : panelScale === "large"
                          ? "w-4.5 h-4.5"
                          : "w-4 h-4"
                    }
                  />
                )}
              </button>
            </div>
          </div>

          {!isCollapsed ? (
            <div className="space-y-2 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p
                    className={cn(
                      "text-blue-800 leading-normal",
                      panelScale === "compact"
                        ? "text-[10px]"
                        : panelScale === "large"
                          ? "text-sm"
                          : "text-xs",
                    )}
                  >
                    {selectedAnchorData.bound
                      ? `✨ 本书签关联了 ${selectedAnchorData.positions.length} 个 PDF 精确位置。点击位置卡片或 PDF 上的数字可极速互相定位！`
                      : "💡 此文字标记还未绑定 PDF 坐标。现在即可点击追加位置，然后直接在左侧 PDF 任意处打点。"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (isBinding) {
                        onStopBinding();
                      } else {
                        onStartBinding(selectedAnchorData.id);
                      }
                    }}
                    className={cn(
                      "rounded font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer",
                      panelScale === "compact"
                        ? "px-2 py-1 text-[10px]"
                        : panelScale === "large"
                          ? "px-4 py-2 text-sm"
                          : "px-3 py-1.5 text-xs",
                      isBinding
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse"
                        : "bg-blue-600 text-white hover:bg-blue-700",
                    )}
                  >
                    {isBinding ? (
                      <>
                        <CheckCircle
                          className={
                            panelScale === "compact"
                              ? "w-3 h-3"
                              : panelScale === "large"
                                ? "w-4 h-4"
                                : "w-3.5 h-3.5"
                          }
                        />
                        完成打点
                      </>
                    ) : (
                      <>
                        <Pointer
                          className={cn(
                            "animate-bounce",
                            panelScale === "compact"
                              ? "w-3 h-3"
                              : panelScale === "large"
                                ? "w-4 h-4"
                                : "w-3.5 h-3.5",
                          )}
                        />
                        在 PDF 追加点
                      </>
                    )}
                  </button>

                  {selectedAnchorData.bound && (
                    <button
                      onClick={() => onClearPositions(selectedAnchorData.id)}
                      className={cn(
                        "bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer",
                        panelScale === "compact"
                          ? "px-1.5 py-1 text-[10px]"
                          : panelScale === "large"
                            ? "px-3 py-2 text-sm"
                            : "px-2.5 py-1.5 text-xs",
                      )}
                      title="清除此标记绑定的所有坐标"
                    >
                      <Trash2
                        className={
                          panelScale === "compact"
                            ? "w-3 h-3"
                            : panelScale === "large"
                              ? "w-4 h-4"
                              : "w-3.5 h-3.5"
                        }
                      />
                      全部清空
                    </button>
                  )}
                </div>
              </div>

              {/* Bound Positions List tags */}
              {selectedAnchorData.positions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span
                    className={cn(
                      "text-blue-800 font-semibold shrink-0 flex items-center gap-1",
                      panelScale === "compact"
                        ? "text-[10px]"
                        : panelScale === "large"
                          ? "text-sm"
                          : "text-xs",
                    )}
                  >
                    <Compass
                      className={
                        panelScale === "compact"
                          ? "w-3 h-3"
                          : panelScale === "large"
                            ? "w-4 h-4"
                            : "w-3.5 h-3.5"
                      }
                    />
                    子坐标列表 ({selectedAnchorData.positions.length} 处):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAnchorData.positions.map((pos, idx) => {
                      const isActive = activePositionId === pos.id;
                      return (
                        <div
                          key={pos.id}
                          onClick={() => onSelectPosition(pos.id)}
                          className={cn(
                            "group inline-flex items-center rounded bg-white border cursor-pointer select-none transition-all shadow-xs gap-1",
                            panelScale === "compact"
                              ? "px-1.5 py-0.5 text-[10px]"
                              : panelScale === "large"
                                ? "px-3 py-1.5 text-sm"
                                : "px-2 py-1 text-xs",
                            isActive
                              ? "border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-bold bg-blue-50"
                              : "border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                          )}
                        >
                          <span>
                            位置 {idx + 1} (P.{pos.page})
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePosition(selectedAnchorData.id, pos.id);
                            }}
                            className="p-0.5 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-700 transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                            title="删除此单一位置"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
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
            <div className="flex items-center justify-between py-0.5">
              <span
                className={cn(
                  "text-blue-700 font-medium",
                  panelScale === "compact"
                    ? "text-[10px]"
                    : panelScale === "large"
                      ? "text-sm"
                      : "text-xs",
                )}
              >
                {selectedAnchorData.bound
                  ? `已折叠 · 当前标记已绑定 ${selectedAnchorData.positions.length} 处 PDF 坐标，点击右侧 ` +
                    (isBinding ? "✔️" : "🔼") +
                    " 管理。"
                  : "已折叠 · 当前标记未定位。"}
              </span>

              {isBinding && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded animate-pulse font-bold">
                  正在 PDF 上打点定位中...
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2.5 shrink-0 text-xs text-gray-500 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-400 animate-bounce" />
          <span>
            点击下方笔记中的任何【🔗标签】，可以管理并跳转其关联的所有 PDF
            位置。
          </span>
        </div>
      )}

      {/* Editor Content Area */}
      <div
        ref={editorContainerRef}
        className="flex-1 overflow-auto bg-gray-50 p-6 md:p-8 shadow-inner"
      >
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
        />
      </div>
    </div>
  );
}
