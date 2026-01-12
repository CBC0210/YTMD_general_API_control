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

        {/* Progress Bar - 顯示相對進度百分比 */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            onValueChange={(value) => onSeek(value[0])}
            max={maxDuration}
            step={1}
            className="w-full cursor-pointer"
            title="拖動調整播放進度"
          />
          <div className="flex justify-between items-center text-sm">
            <span className="text-xs text-gray-500">拖動調整進度</span>
            <span className="text-gray-300 font-medium">
              {maxDuration > 0 
                ? `${Math.round((currentTime / maxDuration) * 100)}%`
                : '0%'}
            </span>
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
            className={`border-[3px] hover:scale-110 transition-all duration-200 ${
              repeatMode === 'ONE' 
                ? 'text-blue-500 border-blue-500 bg-blue-500/40 shadow-xl shadow-blue-500/50 font-bold scale-110 ring-2 ring-blue-500/50' : 
              repeatMode === 'ALL' 
                ? 'text-green-500 border-green-500 bg-green-500/40 shadow-xl shadow-green-500/50 font-bold scale-110 ring-2 ring-green-500/50' : 
              'text-gray-400 border-gray-500 hover:bg-gray-700 hover:border-gray-400'
            }`}
            title={
              repeatMode === 'ONE' ? '單曲循環' :
              repeatMode === 'ALL' ? '全部循環' :
              '關閉循環'
            }
          >
            {repeatMode === 'ONE' ? (
              <Repeat1 className={`${repeatMode === 'ONE' ? 'w-6 h-6' : 'w-5 h-5'} fill-current`} />
            ) : (
              <Repeat className={`${repeatMode === 'ALL' ? 'w-6 h-6 fill-current' : 'w-5 h-5'}`} />
            )}
          </Button>

          {/* 隨機播放 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleShuffle}
            className={`border-[3px] hover:scale-110 transition-all duration-200 ${
              isShuffled 
                ? 'text-purple-500 border-purple-500 bg-purple-500/40 shadow-xl shadow-purple-500/50 font-bold scale-110 ring-2 ring-purple-500/50' 
                : 'text-gray-400 border-gray-500 hover:bg-gray-700 hover:border-gray-400'
            }`}
            title={isShuffled ? '關閉隨機播放' : '開啟隨機播放'}
          >
            <Shuffle className={`${isShuffled ? 'w-6 h-6 fill-current' : 'w-5 h-5'}`} />
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

        {/* Volume Control - 顯示相對進度百分比 */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleMute}
            className={`border-[3px] p-2 hover:scale-110 transition-all duration-200 ${
              isMuted 
                ? 'text-red-500 border-red-500 bg-red-500/40 shadow-xl shadow-red-500/50 font-bold scale-110 ring-2 ring-red-500/50 hover:bg-red-500/50' 
                : 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
            }`}
            title={isMuted ? "取消靜音" : "靜音"}
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 fill-current" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
          <div className="flex-1 space-y-1">
            <Slider
              value={[volume]}
              onValueChange={(value) => onVolumeChange(value[0])}
              max={100}
              step={1}
              className="w-full cursor-pointer"
              disabled={isMuted}
              title="拖動調整音量"
            />
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">拖動調整音量</span>
              <span className="text-gray-300 font-medium">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};





