import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { User } from "lucide-react";

interface UserProfileProps {
  nickname: string;
  nicknameInput: string;
  onNicknameInputChange: (value: string) => void;
  onNicknameConfirm: () => void;
  onNicknameClear: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  nickname,
  nicknameInput,
  onNicknameInputChange,
  onNicknameConfirm,
  onNicknameClear,
}) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          使用者設定
        </CardTitle>
        <p className="text-xs text-gray-400 mt-1">只要輸入你的暱稱就能記錄歷史與喜歡</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {nickname && (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">目前暱稱</p>
                <p className="font-medium">{nickname}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onNicknameClear}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                清除暱稱
              </Button>
            </div>
          )}
          <div className="flex gap-3">
            <Input
              placeholder="輸入您的暱稱（選填）"
              value={nicknameInput}
              onChange={(e) => onNicknameInputChange(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" &&
                nicknameInput.trim() &&
                onNicknameConfirm()
              }
              className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
            <Button
              onClick={onNicknameConfirm}
              disabled={!nicknameInput.trim()}
              style={{ backgroundColor: "#e74c3c" }}
              className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              確認
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};





