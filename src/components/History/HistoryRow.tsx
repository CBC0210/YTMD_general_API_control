import React from "react";
import { Button } from "../ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { Song } from "../../types";

interface HistoryRowProps {
  song: Song;
  onDelete: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  isAdding: boolean;
  renderAddLabel: (id?: string) => string;
}

export const HistoryRow: React.FC<HistoryRowProps> = ({ 
  song, 
  onDelete, 
  onAddToQueue,
  isAdding,
  renderAddLabel
}) => (
  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
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
        onClick={() => onAddToQueue(song)}
        disabled={isAdding}
        style={{ backgroundColor: "#e74c3c" }}
        className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4 mr-1" />
        {renderAddLabel(song.videoId || song.id)}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(song)}
        className="border-gray-600 text-gray-300 hover:bg-gray-700"
        aria-label="刪除"
        title="刪除"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </div>
);





