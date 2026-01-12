export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  videoId?: string;
  thumbnail?: string;
}

export interface QueueItem extends Song {
  status: "playing" | "queued";
  queuePosition: number;
}





