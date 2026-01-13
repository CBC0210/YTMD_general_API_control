/**
 * Backend API Server for User Data Storage
 * Stores user data in data/ directory on the server
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`[SERVER] Data directory ensured: ${DATA_DIR}`);
  } catch (error) {
    console.error('[SERVER] Failed to create data directory:', error);
  }
}

// Get user data file path
function getUserDataPath(nickname) {
  // Sanitize nickname to prevent path traversal
  const sanitized = nickname.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${sanitized}.json`);
}

// Read user data from file
async function readUserData(nickname) {
  try {
    const filePath = getUserDataPath(nickname);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default
      return { history: [], likes: [] };
    }
    console.error(`[SERVER] Failed to read user data for "${nickname}":`, error);
    throw error;
  }
}

// Write user data to file
async function writeUserData(nickname, data) {
  try {
    const filePath = getUserDataPath(nickname);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[SERVER] Saved user data for "${nickname}"`);
  } catch (error) {
    console.error(`[SERVER] Failed to save user data for "${nickname}":`, error);
    throw error;
  }
}

// API Routes

// GET /api/users/:nickname/history
app.get('/api/users/:nickname/history', async (req, res) => {
  try {
    const { nickname } = req.params;
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    const userData = await readUserData(nickname);
    res.json(userData.history || []);
  } catch (error) {
    console.error('[SERVER] Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// POST /api/users/:nickname/history
app.post('/api/users/:nickname/history', async (req, res) => {
  try {
    const { nickname } = req.params;
    const item = req.body;
    
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    if (!item || !item.videoId) {
      return res.status(400).json({ error: 'Invalid item: videoId is required' });
    }
    
    const userData = await readUserData(nickname);
    const history = userData.history || [];
    
    // Remove existing item with same videoId
    const filtered = history.filter(x => x.videoId !== item.videoId);
    
    // Add to beginning
    filtered.unshift(item);
    
    // Keep only last 200 items
    userData.history = filtered.slice(0, 200);
    
    await writeUserData(nickname, userData);
    res.json({ success: true, count: userData.history.length });
  } catch (error) {
    console.error('[SERVER] Error adding history:', error);
    res.status(500).json({ error: 'Failed to add history' });
  }
});

// DELETE /api/users/:nickname/history/:videoId
app.delete('/api/users/:nickname/history/:videoId', async (req, res) => {
  try {
    const { nickname, videoId } = req.params;
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    
    const userData = await readUserData(nickname);
    userData.history = (userData.history || []).filter(x => x.videoId !== videoId);
    
    await writeUserData(nickname, userData);
    res.json({ success: true, count: userData.history.length });
  } catch (error) {
    console.error('[SERVER] Error removing history item:', error);
    res.status(500).json({ error: 'Failed to remove history item' });
  }
});

// DELETE /api/users/:nickname/history
app.delete('/api/users/:nickname/history', async (req, res) => {
  try {
    const { nickname } = req.params;
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    
    const userData = await readUserData(nickname);
    userData.history = [];
    
    await writeUserData(nickname, userData);
    res.json({ success: true });
  } catch (error) {
    console.error('[SERVER] Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// GET /api/users/:nickname/likes
app.get('/api/users/:nickname/likes', async (req, res) => {
  try {
    const { nickname } = req.params;
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    const userData = await readUserData(nickname);
    res.json(userData.likes || []);
  } catch (error) {
    console.error('[SERVER] Error getting likes:', error);
    res.status(500).json({ error: 'Failed to get likes' });
  }
});

// POST /api/users/:nickname/likes
app.post('/api/users/:nickname/likes', async (req, res) => {
  try {
    const { nickname } = req.params;
    const item = req.body;
    
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    if (!item || !item.videoId) {
      return res.status(400).json({ error: 'Invalid item: videoId is required' });
    }
    
    const userData = await readUserData(nickname);
    const likes = userData.likes || [];
    
    // Check if already liked
    const alreadyLiked = likes.some(x => x.videoId === item.videoId);
    
    if (!alreadyLiked) {
      likes.push(item);
      userData.likes = likes;
      await writeUserData(nickname, userData);
      res.json({ success: true, count: userData.likes.length });
    } else {
      res.json({ success: true, count: userData.likes.length, message: 'Already liked' });
    }
  } catch (error) {
    console.error('[SERVER] Error adding like:', error);
    res.status(500).json({ error: 'Failed to add like' });
  }
});

// DELETE /api/users/:nickname/likes/:videoId
app.delete('/api/users/:nickname/likes/:videoId', async (req, res) => {
  try {
    const { nickname, videoId } = req.params;
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    
    const userData = await readUserData(nickname);
    userData.likes = (userData.likes || []).filter(x => x.videoId !== videoId);
    
    await writeUserData(nickname, userData);
    res.json({ success: true, count: userData.likes.length });
  } catch (error) {
    console.error('[SERVER] Error removing like:', error);
    res.status(500).json({ error: 'Failed to remove like' });
  }
});

// GET /api/users/:nickname/recommendations
app.get('/api/users/:nickname/recommendations', async (req, res) => {
  try {
    const { nickname } = req.params;
    const limit = parseInt(req.query.limit || '10', 10);
    
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: 'Nickname is required' });
    }
    
    const userData = await readUserData(nickname);
    const history = userData.history || [];
    const likes = userData.likes || [];
    
    // Return recommendation metadata (same structure as before)
    const recommendations = [];
    const seen = new Set();
    
    // First 2 songs from likes and history
    const firstTwoSongs = [];
    
    // Add liked songs first
    for (const song of likes) {
      if (song.videoId && !seen.has(song.videoId) && firstTwoSongs.length < 2) {
        seen.add(song.videoId);
        firstTwoSongs.push(song);
      }
    }
    
    // Fill remaining slots with history songs
    for (const song of history) {
      if (song.videoId && !seen.has(song.videoId) && firstTwoSongs.length < 2) {
        seen.add(song.videoId);
        firstTwoSongs.push(song);
      }
    }
    
    recommendations.push(...firstTwoSongs);
    
    // Extract artists and keywords
    const allUserSongs = [...likes, ...history];
    const artists = new Set();
    const keywords = new Set();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    allUserSongs.forEach(song => {
      if (song.artist) {
        song.artist.split(/[,&、，]/).forEach(artist => {
          const cleaned = artist.trim();
          if (cleaned && cleaned.length > 0) {
            artists.add(cleaned);
          }
        });
      }
      if (song.title) {
        const words = song.title.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2 && !commonWords.has(word));
        words.forEach(word => keywords.add(word));
      }
    });
    
    res.json({
      firstTwo: recommendations,
      artists: Array.from(artists),
      keywords: Array.from(keywords),
      seen: Array.from(seen),
      limit: limit,
    });
  } catch (error) {
    console.error('[SERVER] Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  await ensureDataDir();
  
  app.listen(PORT, () => {
    console.log(`[SERVER] User Data API Server running on port ${PORT}`);
    console.log(`[SERVER] Data directory: ${DATA_DIR}`);
  });
}

start().catch(error => {
  console.error('[SERVER] Failed to start server:', error);
  process.exit(1);
});
