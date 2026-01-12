import React from "react";
import { Button } from "../ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { Song } from "../../types";

interface HistorySwipeRowProps {
  song: Song;
  onDelete: (song: Song) => void;
  onClick: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  isAdding: boolean;
  renderAddLabel: (id?: string) => string;
}

export const HistorySwipeRow: React.FC<HistorySwipeRowProps> = ({ 
  song, 
  onDelete, 
  onClick,
  onAddToQueue,
  isAdding,
  renderAddLabel
}) => {
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
  
  const onTouchEnd = () => { 
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
    <div className="relative overflow-hidden rounded-lg">
      {/* 背後的刪除按鈕區 */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pl-3">
        <Button
          onClick={(e) => { e.stopPropagation(); onDelete(song); setOpen(false); }}
          style={{ backgroundColor: "#e74c3c" }}
          className="w-9 h-9 p-0 rounded-full flex items-center justify-center text-white hover:opacity-80"
          aria-label="刪除"
          title="刪除"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      {/* 前景內容，可左右滑動 */}
      <div
        className="flex items-center justify-between p-3 bg-gray-700 transition-transform select-none cursor-pointer"
        style={{ transform: `translateX(${translate}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={() => {
          if (dragging) return; // 拖動中不觸發 click
          if (open) { setOpen(false); return; }
          onClick(song);
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          {song.thumbnail && (
            <img src={song.thumbnail} alt="thumb" className="w-10 h-10 object-cover rounded" />
          )}
          <div className="flex-1">
            <h4 className="font-medium">{song.title}</h4>
            <p className="text-gray-400 text-sm">
              {song.artist}{song.album ? ` • ${song.album}` : ''}{song.duration ? ` • ${song.duration}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onAddToQueue(song); }}
            disabled={isAdding}
            style={{ backgroundColor: "#e74c3c" }}
            className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-1" />
            {renderAddLabel(song.videoId || song.id)}
          </Button>
        </div>
      </div>
    </div>
  );
};





