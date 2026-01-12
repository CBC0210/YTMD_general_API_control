import React from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { QueueItem } from "../../types";

export type QueueRowProps = {
  song: QueueItem;
  isCurrent: boolean;
  onDelete: (song: QueueItem) => void;
  onClick: (song: QueueItem) => void;
  onMoveUp?: (song: QueueItem) => void;
  onMoveDown?: (song: QueueItem) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

export const SwipeRow = React.forwardRef<HTMLDivElement, QueueRowProps>(({ 
  song, 
  isCurrent, 
  onDelete, 
  onClick, 
  onMoveUp, 
  onMoveDown, 
  canMoveUp, 
  canMoveDown 
}, ref) => {
  const startX = React.useRef<number | null>(null);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const max = 80;
  const openOffset = 56;
  const threshold = 48;

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX <= -threshold) setOpen(true); else setOpen(false);
    setDragX(0);
  };

  const onTouchStart = (e: React.TouchEvent) => { 
    startX.current = e.touches[0].clientX; 
    setDragging(true); 
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    setDragX(Math.max(-max, Math.min(0, dx)));
  };
  
  const onTouchEnd = (e?: React.TouchEvent) => { 
    if (e) e.preventDefault(); 
    endDrag(); 
    startX.current = null; 
  };

  const onMouseDown = (e: React.MouseEvent) => { 
    startX.current = e.clientX; 
    setDragging(true); 
  };
  
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || startX.current == null || e.buttons === 0) return;
    const dx = e.clientX - startX.current;
    setDragX(Math.max(-max, Math.min(0, dx)));
  };
  
  const onMouseUp = () => { 
    endDrag(); 
    startX.current = null; 
  };

  const translate = dragging ? dragX : (open ? -openOffset : 0);

  return (
    <div ref={ref} className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pl-3">
        <Button
          onClick={(e) => { e.stopPropagation(); onDelete(song); setOpen(false); }}
          disabled={isCurrent}
          style={{ backgroundColor: "#e74c3c" }}
          className="w-9 h-9 p-0 rounded-full flex items-center justify-center text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="刪除"
          title="刪除"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div
        className="flex items-center gap-3 p-3 bg-gray-700 transition-transform select-none"
        style={{ transform: `translateX(${translate}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={() => {
          if (dragging) return;
          if (open) { setOpen(false); return; }
          onClick(song);
        }}
      >
        <span className="text-gray-400 text-sm w-8">{song.queuePosition}</span>
        {song.thumbnail && (
          <img src={song.thumbnail} alt="thumb" className="w-12 h-12 object-cover rounded" />
        )}
        <div className="flex-1">
          <h4 className="font-medium">{song.title}</h4>
          <p className="text-gray-400 text-sm">{song.artist}</p>
        </div>
        {isCurrent && (
          <Badge style={{ backgroundColor: "#e74c3c" }}>播放中</Badge>
        )}
        {/* 移動按鈕 */}
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          {onMoveUp && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onMoveUp(song); }}
              disabled={!canMoveUp || isCurrent}
              className="border-gray-600 text-gray-300 hover:bg-gray-600 p-1 h-6 w-6 disabled:opacity-50"
              title="向上移動"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
          )}
          {onMoveDown && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onMoveDown(song); }}
              disabled={!canMoveDown || isCurrent}
              className="border-gray-600 text-gray-300 hover:bg-gray-600 p-1 h-6 w-6 disabled:opacity-50"
              title="向下移動"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

SwipeRow.displayName = "SwipeRow";





