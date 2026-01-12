import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Heart } from "lucide-react";
import { SearchResultItem } from "../Search/SearchResultItem";
import type { Song } from "../../types";

interface LikedSongsProps {
  likedSongs: Song[];
  onAddToQueue: (song: Song) => void;
  onPlay: (song: Song) => void;
  onInsertAfterCurrent: (song: Song) => void;
  onToggleLike: (song: Song) => void;
  isAdding: (id?: string) => boolean;
  renderAddLabel: (id?: string) => string;
  infoMsg?: string;
}

export const LikedSongs: React.FC<LikedSongsProps> = ({
  likedSongs,
  onAddToQueue,
  onPlay,
  onInsertAfterCurrent,
  onToggleLike,
  isAdding,
  renderAddLabel,
  infoMsg,
}) => {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  
  if (likedSongs.length === 0) return null;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          喜歡的歌曲
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {infoMsg && (
          <div className="text-xs text-gray-400">{infoMsg}</div>
        )}
        {likedSongs.map((song) => {
          const songId = song.videoId || song.id || '';
          const isLiked = true; // 在喜歡的歌曲列表中，所有歌曲都是已喜歡的
          return (
            <SearchResultItem
              key={song.id}
              song={song}
              onPlay={onPlay}
              onAddToQueue={onAddToQueue}
              onInsertAfterCurrent={onInsertAfterCurrent}
              onToggleLike={onToggleLike}
              isLiked={isLiked}
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
      </CardContent>
    </Card>
  );
};





