"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Music2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  addDownloadedFocusTrack,
  formatTrackBytes,
  listDownloadedFocusTracks,
  removeDownloadedFocusTrack,
  type StoredFocusTrackMeta,
} from "@/features/dashboard/lib/focus-music-library";

const wrap: CSSProperties = {
  marginTop: "1.5rem",
};

const dropZone: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.55rem",
  minHeight: "8.5rem",
  padding: "1.25rem",
  borderRadius: "1.1rem",
  border: "1px dashed rgba(129,140,248,0.35)",
  background:
    "linear-gradient(180deg, rgba(99,102,241,0.1) 0%, rgba(255,255,255,0.03) 100%)",
  cursor: "pointer",
  textAlign: "center",
};

const listStyle: CSSProperties = {
  marginTop: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.55rem",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  padding: "0.8rem 0.95rem",
  borderRadius: "0.95rem",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
};

export function FocusMusicSettings() {
  const [tracks, setTracks] = useState<StoredFocusTrackMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await listDownloadedFocusTracks();
      setTracks(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load music library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      const list = files ? Array.from(files) : [];
      if (!list.length) return;
      setUploading(true);
      let added = 0;
      try {
        for (const file of list) {
          await addDownloadedFocusTrack(file);
          added += 1;
        }
        await refresh();
        toast.success(
          added === 1
            ? "Track saved to Focus music"
            : `${added} tracks saved to Focus music`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [refresh]
  );

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      try {
        await removeDownloadedFocusTrack(id);
        await refresh();
        toast.message(`Removed “${title}”`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove track");
      }
    },
    [refresh]
  );

  return (
    <div className="axion-card" style={wrap}>
      <div className="axion-kicker">Focus Hub</div>
      <h2 className="axion-title">Downloaded music</h2>
      <p className="axion-body">
        Upload MP3 / WAV / M4A tracks here. They stay on this device and appear under{" "}
        <strong>Mine</strong> in Focus Hub → Music.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        style={{
          ...dropZone,
          opacity: uploading ? 0.65 : 1,
          borderColor: dragging ? "rgba(129,140,248,0.7)" : "rgba(129,140,248,0.35)",
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload style={{ width: 22, height: 22, color: "#a5b4fc" }} />
        <div style={{ fontSize: "0.9rem", fontWeight: 650, color: "#e2e8f0" }}>
          {uploading ? "Saving…" : "Drop audio files or click to upload"}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          Max 20MB each · stored locally in this browser
        </div>
      </div>

      <div style={listStyle}>
        {loading ? (
          <p className="axion-meta">Loading library…</p>
        ) : tracks.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0.85rem 0.2rem",
              color: "#64748b",
              fontSize: "0.875rem",
            }}
          >
            <Music2 style={{ width: 16, height: 16, flexShrink: 0 }} />
            No downloaded tracks yet.
          </div>
        ) : (
          tracks.map((track) => (
            <div key={track.id} style={rowStyle}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.9rem",
                    fontWeight: 650,
                    color: "var(--foreground)",
                  }}
                >
                  {track.title}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: "0.72rem",
                    color: "#94a3b8",
                  }}
                >
                  {track.fileName} · {formatTrackBytes(track.size)}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove ${track.title}`}
                onClick={() => void handleDelete(track.id, track.title)}
                style={{ borderRadius: 999, flexShrink: 0 }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
