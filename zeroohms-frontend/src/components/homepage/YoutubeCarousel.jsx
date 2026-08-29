import { useEffect, useState } from 'react';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function YoutubeCarousel({ maxResults = 12 }) {
  const [videos, setVideos] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/videos?maxResults=${maxResults}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar videos');
        if (cancelled) return;
        setVideos(data.videos || []);
        setState('done');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maxResults]);

  if (state === 'loading') {
    return <div className="yt-status">Cargando videos…</div>;
  }

  if (state === 'error') {
    return <div className="yt-status">No se pudieron cargar los videos de YouTube.</div>;
  }

  if (videos.length === 0) {
    return <div className="yt-status">No se encontraron videos de YouTube.</div>;
  }

  return (
    <div className="yt-scroll">
      {videos.map((v) => (
        <a
          key={v.videoId}
          className="yt-card"
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="yt-thumb">
            {v.thumbnail ? (
              <img src={v.thumbnail} alt={v.title} loading="lazy" />
            ) : (
              <span className="yt-thumb-placeholder">▶</span>
            )}
          </span>
          <span className="yt-info">
            <strong className="yt-title">{v.title}</strong>
            <span className="yt-date">{formatDate(v.publishedAt)}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
