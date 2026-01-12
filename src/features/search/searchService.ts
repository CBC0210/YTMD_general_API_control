import type { Song } from "../../types";

/**
 * Parse YTMD search API response and extract song items
 */
export function parseSearchResponse(data: any): Song[] {
  if (!data) {
    console.log('parseSearchResponse: No data provided');
    return [];
  }
  
  console.log('parseSearchResponse: Input data type:', typeof data);
  console.log('parseSearchResponse: Input data keys:', data ? Object.keys(data) : 'null');
  
  let items: any[] = [];
  
  // Handle different response structures
  // First, check for tabbedSearchResultsRenderer (most common structure)
  if (data?.contents?.tabbedSearchResultsRenderer?.tabs) {
    console.log('Found tabbedSearchResultsRenderer structure');
    // Find the "Songs" tab or first tab
    const tabs = data.contents.tabbedSearchResultsRenderer.tabs;
    const songsTab = tabs.find((tab: any) => 
      tab?.tabRenderer?.title?.toLowerCase() === 'songs' || 
      tab?.tabRenderer?.title?.toLowerCase() === '歌曲'
    ) || tabs[0];
    
    if (songsTab?.tabRenderer?.content?.sectionListRenderer?.contents) {
      songsTab.tabRenderer.content.sectionListRenderer.contents.forEach((section: any) => {
        if (section?.musicShelfRenderer?.contents) {
          items.push(...section.musicShelfRenderer.contents);
        }
      });
    }
  }
  // Check for sectionListRenderer structure (direct)
  else if (data?.contents?.sectionListRenderer?.contents) {
    data.contents.sectionListRenderer.contents.forEach((section: any) => {
      if (section?.musicShelfRenderer?.contents) {
        items.push(...section.musicShelfRenderer.contents);
      }
    });
  }
  // Check for singleColumnBrowseResultsRenderer
  else if (data?.contents?.singleColumnBrowseResultsRenderer?.tabs) {
    const tab = data.contents.singleColumnBrowseResultsRenderer.tabs[0];
    if (tab?.tabRenderer?.content?.sectionListRenderer?.contents) {
      tab.tabRenderer.content.sectionListRenderer.contents.forEach((section: any) => {
        if (section?.musicShelfRenderer?.contents) {
          items.push(...section.musicShelfRenderer.contents);
        }
      });
    }
  }
  // Check if data is directly an array
  else if (Array.isArray(data)) {
    console.log('Found array structure, length:', data.length);
    items = data;
  }
  // Check for items property
  else if (data?.items) {
    console.log('Found items property, length:', data.items.length);
    items = data.items;
  } else {
    console.log('No recognized structure found. Data:', JSON.stringify(data).substring(0, 500));
  }
  
  console.log('Extracted items count:', items.length);
  
  // Map items to Song format
  const mapped: Song[] = items.map((s: any) => {
    // Handle musicResponsiveListItemRenderer structure (YTMD standard)
    const renderer = s.musicResponsiveListItemRenderer || s;
    
    // Extract videoId from various possible locations
    const videoId = renderer.videoId || 
                   renderer?.playlistItemData?.videoId || 
                   renderer?.navigationEndpoint?.watchEndpoint?.videoId ||
                   renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
                   renderer?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
    
    // Extract title from flexColumns[0]
    let title = '';
    if (renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text) {
      title = renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text;
    } else if (renderer.title?.runs?.[0]?.text) {
      title = renderer.title.runs[0].text;
    } else if (renderer.title?.text) {
      title = renderer.title.text;
    } else if (renderer.title) {
      title = renderer.title;
    }
    
    // Extract artist from flexColumns[1] (usually the artist/album info)
    let artist = '';
    if (renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs) {
      // Get all runs and join them, but skip separators
      const runs = renderer.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs;
      artist = runs
        .filter((run: any) => run.text && run.text.trim() !== ' • ')
        .map((run: any) => run.text)
        .join(' ')
        .trim();
    } else if (renderer.artists?.[0]?.name) {
      artist = renderer.artists[0].name;
    } else if (renderer.artist?.name) {
      artist = renderer.artist.name;
    } else if (renderer.longBylineText?.runs?.[0]?.text) {
      artist = renderer.longBylineText.runs[0].text;
    }
    
    // Extract album (usually in flexColumns[2] or similar)
    let album = '';
    if (renderer.flexColumns?.[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text) {
      album = renderer.flexColumns[2].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text;
    } else if (renderer.album?.name) {
      album = renderer.album.name;
    } else if (renderer.album) {
      album = renderer.album;
    }
    
    // Extract duration from fixedColumns[0]
    let duration = '';
    if (renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text) {
      duration = renderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text;
    } else if (renderer.duration?.text) {
      duration = renderer.duration.text;
    } else if (renderer.duration?.runs?.[0]?.text) {
      duration = renderer.duration.runs[0].text;
    } else if (renderer.duration) {
      duration = renderer.duration;
    }
    
    // Extract thumbnail
    let thumbnail = '';
    if (renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url) {
      thumbnail = renderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url;
    } else if (renderer.thumbnails?.[0]?.url) {
      thumbnail = renderer.thumbnails[0].url;
    } else if (renderer.thumbnail?.thumbnails?.[0]?.url) {
      thumbnail = renderer.thumbnail.thumbnails[0].url;
    }
    if (!thumbnail && videoId) {
      thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    
    return {
      id: videoId || '',
      videoId: videoId || '',
      title,
      artist,
      album,
      duration,
      thumbnail,
    };
  }).filter((s: Song) => s.videoId && s.title); // Filter out items without videoId or title
  
  console.log('Final mapped results count:', mapped.length);
  
  return mapped;
}

