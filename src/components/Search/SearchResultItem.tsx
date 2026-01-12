import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "../ui/button";
import { Plus, Play, MoreVertical } from "lucide-react";
import type { Song } from "../../types";

interface SearchResultItemProps {
  song: Song;
  onPlay: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onInsertAfterCurrent: (song: Song) => void;
  isAdding: boolean;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  song,
  onPlay,
  onAddToQueue,
  onInsertAfterCurrent,
  isAdding,
  isMenuOpen,
  onMenuToggle,
}) => {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 處理點擊外部關閉選單
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        onMenuToggle();
      }
    };

    // 使用 setTimeout 確保選單已經渲染
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, onMenuToggle]);

  const handleRowClick = (e: React.MouseEvent) => {
    // 如果點擊在選單相關元素上，不觸發播放
    const target = e.target as HTMLElement;
    const clickedButton = target.closest('[data-menu-button]');
    const clickedMenu = target.closest('[data-menu-content]');
    const clickedContainer = target.closest('.menu-container');
    
    if (clickedButton || clickedMenu || clickedContainer) {
      return;
    }
    console.log('SearchResultItem: Calling onPlay for song:', song.title);
    onPlay(song);
  };

  const handleMenuButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('SearchResultItem: Menu button clicked, current isMenuOpen:', isMenuOpen);
    // 如果選單已經打開，點擊按鈕應該關閉它；如果關閉，應該打開它
    // 這個邏輯由 onMenuToggle 處理
    onMenuToggle();
  };

  return (
    <div
      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer relative"
      onClick={handleRowClick}
    >
      <div className="flex items-center gap-3 flex-1">
        {song.thumbnail && (
          <img src={song.thumbnail} alt="thumb" className="w-12 h-12 object-cover rounded" />
        )}
        <div className="flex-1">
          <h4 className="font-medium">{song.title}</h4>
          <p className="text-gray-400 text-sm">
            {song.artist} • {song.album} • {song.duration}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 relative menu-container" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="relative">
          <Button
            ref={menuButtonRef}
            variant="outline"
            size="sm"
            disabled={isAdding}
            className="border-gray-600 text-gray-300 hover:bg-gray-600 p-2"
            title="更多選項"
            data-menu-button={song.videoId || song.id}
            onClick={handleMenuButtonClick}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          {isMenuOpen && (() => {
            console.log('SearchResultItem: Rendering menu, isMenuOpen:', isMenuOpen, 'songId:', song.videoId || song.id);
            const buttonEl = menuButtonRef.current;
            if (!buttonEl) {
              console.error('SearchResultItem: Could not find button element for menu');
              return null;
            }
            const rect = buttonEl.getBoundingClientRect();
            console.log('SearchResultItem: Button rect:', rect, 'window.scrollY:', window.scrollY, 'window.scrollX:', window.scrollX);
            // 使用 getBoundingClientRect 的 top/left 加上 scrollY/scrollX，或者直接使用 viewport 座標
            // 對於 fixed 定位，應該使用 viewport 座標（不包含 scroll）
            const menuStyle: React.CSSProperties = {
              position: 'fixed',
              top: `${rect.bottom + 4}px`,
              left: `${rect.right - 160}px`,
              zIndex: 99999,
            };
            console.log('SearchResultItem: Menu style:', menuStyle);
            return createPortal(
              <div 
                ref={menuRef}
                className="bg-gray-800 border border-gray-700 rounded-md shadow-lg min-w-[160px]"
                data-menu-content="true"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                style={menuStyle}
              >
                <button
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAdding}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('SearchResultItem: Add to queue clicked');
                    onMenuToggle();
                    onAddToQueue(song);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Plus className="w-4 h-4" />
                  {isAdding ? '加入中…' : '加入佇列'}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-700"
                  disabled={isAdding}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('SearchResultItem: Insert after current clicked');
                    onMenuToggle();
                    onInsertAfterCurrent(song);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Play className="w-4 h-4" />
                  {isAdding ? '插播中…' : '插播（當前歌曲後）'}
                </button>
              </div>,
              document.body
            );
          })()}
        </div>
      </div>
    </div>
  );
};
