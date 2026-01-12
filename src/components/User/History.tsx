import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Clock } from "lucide-react";
import { SearchResultItem } from "../Search/SearchResultItem";
import type { Song } from "../../types";

interface HistoryProps {
  nickname: string;
  history: Song[];
  historyExpanded: boolean;
  onHistoryExpandedChange: (expanded: boolean) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onPlay: (song: Song) => void;
  onInsertAfterCurrent: (song: Song) => void;
  isAdding: (id?: string) => boolean;
  renderAddLabel: (id?: string) => string;
  infoMsg?: string;
}

export const History: React.FC<HistoryProps> = ({
  nickname,
  history,
  historyExpanded,
  onHistoryExpandedChange,
  onClearHistory,
  onDeleteHistoryItem,
  onAddToQueue,
  onPlay,
  onInsertAfterCurrent,
  isAdding,
  renderAddLabel,
  infoMsg,
}) => {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  
  if (!nickname) return null;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>歷史記錄</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                清除歷史
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-800 border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">清除歷史記錄</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  這將刪除您所有的點歌歷史，確定要繼續嗎？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClearHistory}
                  style={{ backgroundColor: "#e74c3c" }}
                  className="hover:opacity-80"
                >
                  清除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {infoMsg && (
          <div className="text-xs text-gray-400">{infoMsg}</div>
        )}
        {history.length === 0 && (
          <div className="text-gray-400 text-sm">目前沒有歷史記錄</div>
        )}
        {(historyExpanded ? history : history.slice(0, 5)).map((song) => {
          const songId = song.videoId || song.id || '';
          return (
            <SearchResultItem
              key={song.id}
              song={song}
              onPlay={onPlay}
              onAddToQueue={onAddToQueue}
              onInsertAfterCurrent={onInsertAfterCurrent}
              onDelete={onDeleteHistoryItem}
              isAdding={isAdding(songId)}
              isMenuOpen={openMenus.has(songId)}
              onMenuToggle={() => {
                setOpenMenus((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(songId)) {
                    newSet.delete(songId);
                  } else {
                    newSet.add(songId);
                  }
                  return newSet;
                });
              }}
            />
          );
        })}
        {history.length > 5 && (
          <div className="pt-1 flex justify-end">
            <button
              className="text-xs text-gray-300 hover:text-white underline"
              onClick={() => onHistoryExpandedChange(!historyExpanded)}
            >
              {historyExpanded ? '收合' : '展開'}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};





