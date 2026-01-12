import React from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Repeat,
  Repeat1,
  Shuffle,
  Rewind,
  FastForward,
} from "lucide-react";
import { formatTime, parseDuration } from "../../utils/time";
import type { QueueItem } from "../../types";

interface NowPlayingProps {
  currentSong: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  songDuration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: 'NONE' | 'ALL' | 'ONE' | null;
  isShuffled: boolean;
  likeState: 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | null;
  canPlayPrevious: boolean;
  canPlayNext: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleLike: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  songDuration,
  volume,
  isMuted,
  repeatMode,
  isShuffled,
  likeState,
  canPlayPrevious,
  canPlayNext,
  onPlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleRepeat,
  onToggleShuffle,
  onToggleLike,
  onGoBack,
  onGoForward,
}) => {
  if (!currentSong) return null;

  const maxDuration = songDuration || (currentSong.duration ? parseDuration(currentSong.duration) : 225);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="space-y-4 pt-4">
        {/* Song Info with thumbnail (stacked) */}
        <div className="flex flex-col items-center gap-3 text-center">
          {currentSong.thumbnail && (
            <img 
              src={currentSong.thumbnail} 
              alt="thumb" 
              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded" 
            />
          )}
          <div className="text-center">
            <h3 className="text-lg font-medium">{currentSong.title}</h3>
            <p className="text-gray-400">{currentSong.artist}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            onValueChange={(value) => onSeek(value[0])}
            max={maxDuration}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(songDuration || 0)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {/* 進度控制：向後跳轉 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onGoBack}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            title="向後 10 秒"
          >
            <Rewind className="w-4 h-4" />
          </Button>

          {/* 上一首 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!canPlayPrevious}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            title="上一首"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          {/* 播放/暫停 */}
          <Button
            onClick={onPlayPause}
            size="sm"
            style={{ backgroundColor: "#e74c3c" }}
            className="hover:opacity-80 px-4"
            title={isPlaying ? "暫停" : "播放"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>

          {/* 下一首 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!canPlayNext}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            title="下一首"
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          {/* 進度控制：向前跳轉 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onGoForward}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            title="向前 10 秒"
          >
            <FastForward className="w-4 h-4" />
          </Button>

          {/* 重複模式 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleRepeat}
            className={`border-gray-600 hover:bg-gray-700 ${
              repeatMode === 'ONE' ? 'text-blue-400' : 
              repeatMode === 'ALL' ? 'text-green-400' : 
              'text-gray-300'
            }`}
            title={
              repeatMode === 'ONE' ? '單曲循環' :
              repeatMode === 'ALL' ? '全部循環' :
              '關閉循環'
            }
          >
            {repeatMode === 'ONE' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </Button>

          {/* 隨機播放 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleShuffle}
            className={`border-gray-600 hover:bg-gray-700 ${
              isShuffled ? 'text-purple-400' : 'text-gray-300'
            }`}
            title={isShuffled ? '關閉隨機播放' : '開啟隨機播放'}
          >
            <Shuffle className={`w-4 h-4 ${isShuffled ? 'fill-current' : ''}`} />
          </Button>

          {/* 喜歡 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleLike}
            className={`border-gray-600 hover:bg-gray-700 ${
              likeState === 'LIKE' ? 'text-red-500 hover:text-red-400' : 
              likeState === 'DISLIKE' ? 'text-gray-500' :
              'text-gray-300 hover:text-red-400'
            }`}
            title={
              likeState === 'LIKE' ? '取消喜歡' :
              likeState === 'DISLIKE' ? '不喜歡' :
              '喜歡'
            }
          >
            <Heart
              className={`w-4 h-4 ${
                likeState === 'LIKE' ? 'fill-current' : ''
              }`}
            />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleMute}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 p-2"
            title={isMuted ? "取消靜音" : "靜音"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            onValueChange={(value) => onVolumeChange(value[0])}
            max={100}
            step={1}
            className="flex-1"
            disabled={isMuted}
          />
          <span className="text-sm text-gray-400 w-8">
            {isMuted ? '0' : volume}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};





