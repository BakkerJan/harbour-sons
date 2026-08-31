# Hero background video

`hero.mp4` in this folder is the homepage background. It is wired up via
`hero.mode: "video"` in [`../../data/site.json`](../../data/site.json).

## What is here now

Encoded from the band's own clip (`Website (1).mp4`, 1920x1080, 30fps, 10.7s).

| File | Codec | Size |
| --- | --- | --- |
| source | h264 @ 18.7 Mbps + AAC | 24.2 MB |
| `hero.webm` | VP9, crf 34, no audio | **0.75 MB** |
| `hero.mp4` | h264, crf 23, no audio | **2.52 MB** |

The page lists WebM first, so Chrome and Firefox take the 0.75 MB file and
Safari falls back to the MP4. That is a 97% reduction on the source for most
visitors.

The source was fine for a video player and far too heavy for a page background,
where the file competes with the fonts, the logo and the video thumbnails for
the visitor's first few seconds. The audio track was stripped — a muted loop
never needs it, and it was 192 kbps of dead weight in every download.

crf 23 is higher quality than a background strictly needs. That is deliberate:
the footage is dim (mean luminance 39/255) and sits under a scrim, and shadow
detail is exactly where h264 shows blocking. Cheap insurance at this file size.

## Re-encoding

To regenerate it from a new source clip:

```bash
ffmpeg -i source.mp4 -an -vf "scale=1920:-2,fps=25" \
  -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p \
  -movflags +faststart assets/video/hero.mp4
```

What each flag is doing:

- `-an` — drop the audio track entirely
- `-crf 23` — quality target. Lower is better and bigger. Check the resulting
  size before settling: this clip is a mostly locked-off shot, so it compressed
  far better than a moving one would, which is why 23 fits in 2.5 MB here
- `-preset slow` — spend more CPU for a smaller file. One-off cost
- `-pix_fmt yuv420p` — the only chroma format Safari will play
- `-movflags +faststart` — moves the index to the front so playback can begin
  before the whole file arrives. **Without this the video will not start until
  it has fully downloaded.**

Optionally add a WebM, which is typically 20-30% smaller again in Chrome and
Firefox, and point `hero.videoWebm` at it:

```bash
ffmpeg -i assets/video/hero.mp4 -an \
  -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 assets/video/hero.webm
```

The page lists WebM first and MP4 second, so browsers take the smaller one and
Safari falls back to MP4. The video is only removed (leaving the poster) when
`networkState` reaches `NETWORK_NO_SOURCE` — i.e. every source failed. A single
source being rejected is normal and must not kill the fallback.

## Guidance for a replacement clip

- **10-20 seconds**, cut so it loops without an obvious seam
- **Under 5 MB.** GitHub Pages has no CDN tuning and phone visitors pay for
  every byte
- Slow, wide, ambient shots read best. Fast cuts fight with the text on top
- Avoid anything with burnt-in titles — the crest and tagline sit over the
  middle of the frame

If `hero.mp4` is missing or fails to load, the site silently falls back to
`hero.poster` — nothing breaks.

## Audio

`hero.hasAudio` in `data/site.json` controls whether the corner unmute button
appears. It is `false` here because the audio was stripped. If you encode a
version that keeps its soundtrack (drop the `-an`), set it to `true` and the
toggle appears. The video always *starts* muted regardless — browsers refuse to
autoplay audio, and a page that makes noise unprompted is a page people close.
