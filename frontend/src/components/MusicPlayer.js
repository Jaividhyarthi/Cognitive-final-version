import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Play, Pause, SkipForward, Volume2, ExternalLink, Music } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const T = {
  white: '#FFFFFF', primary: '#2A7C6F', primaryLight: '#EAF4F2',
  accent: '#E8A838', text: '#1C1C2E', textMuted: '#4A4A68', textFaint: '#9494A8',
  border: '#E2DDD6', surfaceAlt: '#F0ECE6', bg: '#F7F5F0',
};

const SOURCE_BADGE = {
  spotify:   { bg: '#DCFCE7', color: '#15803D', label: 'Spotify' },
  youtube:   { bg: '#FEE2E2', color: '#DC2626', label: 'YouTube' },
  simulated: { bg: T.surfaceAlt, color: T.textFaint, label: 'Built-in' },
};

function MusicPlayer({ onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => { fetchPlaylists(); }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);

  const fetchPlaylists = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/music/playlists`);
      setPlaylists(res.data);
      if (res.data.length > 0) {
        setCurrentPlaylist(res.data[0]);
        if (res.data[0].tracks?.length > 0) setCurrentTrack(res.data[0].tracks[0]);
      }
    } catch { } finally { setLoading(false); }
  };

  const togglePlay = () => {
    if (currentTrack?.preview_url && audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(() => {});
    }
    setIsPlaying(p => !p);
  };

  const skipTrack = () => {
    if (!currentPlaylist?.tracks?.length) return;
    const next = (currentTrackIndex + 1) % currentPlaylist.tracks.length;
    setCurrentTrackIndex(next);
    setCurrentTrack(currentPlaylist.tracks[next]);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  const selectPlaylist = (pl) => {
    setCurrentPlaylist(pl);
    setCurrentTrackIndex(0);
    setCurrentTrack(pl.tracks?.[0] || null);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  const src = currentPlaylist?.source || 'simulated';
  const badge = SOURCE_BADGE[src] || SOURCE_BADGE.simulated;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40"
      style={{ backgroundColor: T.white, borderTop: `1px solid ${T.border}`, boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}>

      {currentTrack?.preview_url && (
        <audio ref={audioRef} src={currentTrack.preview_url} onEnded={skipTrack} />
      )}

      <div className="max-w-5xl mx-auto px-5 py-4">
        <div className="flex items-center gap-4">

          {/* Album art */}
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
            style={{ backgroundColor: T.primaryLight }}>
            {currentTrack?.album_art || currentPlaylist?.image ? (
              <img src={currentTrack?.album_art || currentPlaylist?.image}
                alt="cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5" style={{ color: T.primary }} />
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
                {currentTrack?.title || 'Select a track'}
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
            </div>
            <p className="text-xs truncate" style={{ color: T.textFaint }}>
              {currentTrack?.artist || currentPlaylist?.name || '—'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button data-testid="music-player-play-btn" onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ backgroundColor: T.primary, color: '#FFFFFF' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#1F5C52'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = T.primary}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button data-testid="music-player-skip-btn" onClick={skipTrack}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: T.surfaceAlt, color: T.textMuted }}>
              <SkipForward className="w-4 h-4" />
            </button>
            {currentTrack?.external_url && (
              <a data-testid="music-player-external-link"
                href={currentTrack.external_url} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: T.surfaceAlt, color: T.textMuted }}>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-2 w-28">
            <Volume2 className="w-4 h-4 flex-shrink-0" style={{ color: T.textFaint }} />
            <input type="range" min={0} max={100} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="flex-1" style={{ accentColor: T.primary }} />
          </div>

          {/* Close */}
          <button data-testid="music-player-close-btn" onClick={onClose}
            className="p-2 rounded-xl transition-colors flex-shrink-0"
            style={{ color: T.textFaint }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = T.surfaceAlt}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Playlist tabs */}
        {!loading && playlists.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {playlists.map(pl => (
              <button key={pl.id} data-testid={`playlist-${pl.id}-btn`}
                onClick={() => selectPlaylist(pl)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  backgroundColor: currentPlaylist?.id === pl.id ? T.primary : T.surfaceAlt,
                  color: currentPlaylist?.id === pl.id ? '#FFFFFF' : T.textMuted,
                }}>
                {pl.name}
              </button>
            ))}
          </div>
        )}

        {/* YouTube embed when playing */}
        {currentTrack?.embed_url && isPlaying && (
          <div className="mt-3">
            <iframe src={`${currentTrack.embed_url}?autoplay=1`} title={currentTrack.title}
              width="100%" height="80" frameBorder="0"
              allow="autoplay; encrypted-media" className="rounded-xl" />
          </div>
        )}

        {!currentTrack?.preview_url && !currentTrack?.embed_url && currentTrack && (
          <p className="text-xs text-center mt-2" style={{ color: T.textFaint }}>
            {currentTrack.external_url
              ? 'Open the external link to listen on the original platform.'
              : 'Preview not available for this track.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;