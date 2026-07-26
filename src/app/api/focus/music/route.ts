import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type FocusMusicTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  url: string;
  loop: boolean;
};

/**
 * Curated focus-friendly ambient / instrumental tracks.
 * Sources: Mixkit (royalty-free ambience) + SoundHelix demos.
 */
const AMBIENT_TRACKS: FocusMusicTrack[] = [
  {
    id: "rain",
    title: "Soft Rain",
    artist: "Mixkit Ambience",
    genre: "Ambient",
    url: "https://assets.mixkit.co/active_storage/sfx/2394/2394-preview.mp3",
    loop: true,
  },
  {
    id: "forest",
    title: "Forest Calm",
    artist: "Mixkit Ambience",
    genre: "Nature",
    url: "https://assets.mixkit.co/active_storage/sfx/1213/1213-preview.mp3",
    loop: true,
  },
  {
    id: "night",
    title: "Summer Night",
    artist: "Mixkit Ambience",
    genre: "Nature",
    url: "https://assets.mixkit.co/active_storage/sfx/1789/1789-preview.mp3",
    loop: true,
  },
  {
    id: "cafe",
    title: "Quiet Cafe",
    artist: "Mixkit Ambience",
    genre: "Ambience",
    url: "https://assets.mixkit.co/active_storage/sfx/444/444-preview.mp3",
    loop: true,
  },
  {
    id: "office",
    title: "Soft Office",
    artist: "Mixkit Ambience",
    genre: "Ambience",
    url: "https://assets.mixkit.co/active_storage/sfx/447/447-preview.mp3",
    loop: true,
  },
  {
    id: "lofi-room",
    title: "Focus Room",
    artist: "Mixkit Ambience",
    genre: "Lo-fi",
    url: "https://assets.mixkit.co/active_storage/sfx/2507/2507-preview.mp3",
    loop: true,
  },
  {
    id: "helix-1",
    title: "Deep Focus One",
    artist: "SoundHelix",
    genre: "Instrumental",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    loop: true,
  },
  {
    id: "helix-2",
    title: "Deep Focus Two",
    artist: "SoundHelix",
    genre: "Instrumental",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    loop: true,
  },
  {
    id: "helix-8",
    title: "Deep Focus Flow",
    artist: "SoundHelix",
    genre: "Instrumental",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    loop: true,
  },
];

/**
 * Curated Creative Commons / open phonk tracks from Internet Archive.
 * Download URLs redirect and support CORS for browser playback.
 */
const PHONK_TRACKS: FocusMusicTrack[] = [
  {
    id: "nghtmr-run",
    title: "NGHTMR RUN MASTER",
    artist: "Vlex",
    genre: "Phonk",
    url: "https://archive.org/download/nghtmr-run-master/NGHTMR%20RUN%20MASTER.mp3",
    loop: true,
  },
  {
    id: "dvrst",
    title: "DVRST",
    artist: "Archive Phonk",
    genre: "Phonk",
    url: "https://archive.org/download/DVRST/DVRST.mp3",
    loop: true,
  },
  {
    id: "find-a-way",
    title: "Find a Way",
    artist: "vasilik ft. lottapurp",
    genre: "Phonk",
    url: "https://archive.org/download/find-a-way-ft-lottapurp-wn7xk8/vasilik%20-%20Find%20a%20Way%20%28ft.%20lottapurp%29.mp3",
    loop: true,
  },
  {
    id: "cold-heat",
    title: "Set It Off",
    artist: "bitoblackmane · Ethereal: Cold Heat",
    genre: "Phonk",
    url: "https://archive.org/download/ethereal-cold-heat-p7ddxm/bitoblackmane%20-%20Ethereal-%20Cold%20Heat%20-%2001%20Set%20It%20Off.mp3",
    loop: true,
  },
  {
    id: "no-one-notices",
    title: "No One Notices",
    artist: "Aenvelora",
    genre: "Phonk",
    url: "https://archive.org/download/aenvelora-no-one-notices/Aenvelora%20-%20no%20one%20notices.mp3",
    loop: true,
  },
];

type ArchiveSearchDoc = {
  identifier?: string;
  title?: string;
  creator?: string | string[];
};

type ArchiveSearchResponse = {
  response?: { docs?: ArchiveSearchDoc[] };
};

type ArchiveFile = {
  name?: string;
  format?: string;
};

type ArchiveMetadata = {
  metadata?: { title?: string; creator?: string | string[] };
  files?: ArchiveFile[];
};

function archiveDownloadUrl(identifier: string, fileName: string): string {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
}

/** Serve remote audio via same-origin proxy for reliable browser playback. */
function withStreamProxy(url: string): string {
  return `/api/focus/music/stream?url=${encodeURIComponent(url)}`;
}

function mapProxiedTracks(tracks: FocusMusicTrack[]): FocusMusicTrack[] {
  return tracks.map((t) => ({ ...t, url: withStreamProxy(t.url) }));
}

function creatorLabel(creator: string | string[] | undefined): string {
  if (Array.isArray(creator)) return creator.filter(Boolean).join(", ") || "Archive Phonk";
  return creator?.trim() || "Archive Phonk";
}

/** Live pull of extra open phonk tracks from Internet Archive. */
async function fetchLivePhonk(limit = 8): Promise<FocusMusicTrack[]> {
  try {
    const search =
      "https://archive.org/advancedsearch.php?q=" +
      encodeURIComponent('subject:phonk AND mediatype:audio AND format:"VBR MP3"') +
      "&fl[]=identifier&fl[]=title&fl[]=creator&rows=" +
      limit +
      "&page=1&output=json";

    const searchRes = await fetch(search, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!searchRes.ok) return [];

    const searchJson = (await searchRes.json()) as ArchiveSearchResponse;
    const docs = searchJson.response?.docs ?? [];
    const curatedIds = new Set(PHONK_TRACKS.map((t) => t.id));
    const out: FocusMusicTrack[] = [];

    for (const doc of docs) {
      const identifier = doc.identifier?.trim();
      if (!identifier || curatedIds.has(identifier)) continue;

      try {
        const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
          next: { revalidate: 3600 },
          headers: { Accept: "application/json" },
        });
        if (!metaRes.ok) continue;
        const meta = (await metaRes.json()) as ArchiveMetadata;
        const mp3 = (meta.files ?? []).find(
          (f) =>
            typeof f.name === "string" &&
            f.name.toLowerCase().endsWith(".mp3") &&
            (f.format === "VBR MP3" || f.format === "MPEG 2 Layer 3" || !f.format)
        );
        if (!mp3?.name) continue;

        out.push({
          id: identifier,
          title: (doc.title || meta.metadata?.title || identifier).slice(0, 80),
          artist: creatorLabel(doc.creator ?? meta.metadata?.creator),
          genre: "Phonk",
          url: archiveDownloadUrl(identifier, mp3.name),
          loop: true,
        });
      } catch {
        /* skip item */
      }

      if (out.length >= limit) break;
    }

    return out;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre")?.trim().toLowerCase() || "all";
  const id = searchParams.get("id")?.trim();
  const live = searchParams.get("live") !== "0";

  let tracks: FocusMusicTrack[] = [...AMBIENT_TRACKS, ...PHONK_TRACKS];

  if (genre === "phonk") {
    const liveTracks = live ? await fetchLivePhonk(6) : [];
    const seen = new Set(PHONK_TRACKS.map((t) => t.url));
    tracks = [
      ...PHONK_TRACKS,
      ...liveTracks.filter((t) => {
        if (seen.has(t.url)) return false;
        seen.add(t.url);
        return true;
      }),
    ];
  } else if (genre === "ambient" || genre === "calm") {
    tracks = AMBIENT_TRACKS;
  }

  if (id) {
    tracks = tracks.filter((t) => t.id === id);
  }

  return NextResponse.json(
    {
      ok: true,
      genre,
      count: tracks.length,
      tracks: mapProxiedTracks(tracks),
    },
    {
      headers: {
        "Cache-Control":
          genre === "phonk"
            ? "public, s-maxage=600, stale-while-revalidate=3600"
            : "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
