import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Heart, Plus } from "lucide-react";
import type { Song } from "../../types";

interface LikedSongsProps {
  likedSongs: Song[];
  onAddToQueue: (song: Song) => void;
  onToggleLike: (song: Song) => void;
  isAdding: (id?: string) => boolean;
  renderAddLabel: (id?: string) => string;
  infoMsg?: string;
}

export const LikedSongs: React.FC<LikedSongsProps> = ({
  likedSongs,
  onAddToQueue,
  onToggleLike,
  isAdding,
  renderAddLabel,
  infoMsg,
}) => {
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
        {likedSongs.map((song) => (
          <div
            key={song.id}
            className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
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
                onClick={() => onAddToQueue(song)}
                disabled={isAdding(song.videoId || song.id)}
                style={{ backgroundColor: "#e74c3c" }}
                className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-1" />
                {renderAddLabel(song.videoId || song.id)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleLike(song)}
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                title="取消喜歡"
              >
                <Heart className="w-4 h-4 fill-current" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};





