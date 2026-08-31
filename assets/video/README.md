# Hero background video

`hero.mp4` in this folder is the homepage background. It is wired up via
`hero.mode: "video"` in [`../../data/site.json`](../../data/site.json).

## What is here now

The current file was encoded from the band's own clip (`Website (1).mp4`,
1920x1080, 10.7s). The source was 24 MB at roughly 19 Mbps — fine for a video
player, far too heavy for a page background, where the file competes with the
fonts, the logo and the video thumbnails for the visitor's first few seconds.

It was re-encoded with the audio track stripped, since a muted background loop
never needs it and it is dead weight in every download.

## Re-encoding

To regenerate it from a new source clip:

```bash
ffmpeg -i source.mp4 -an -vf "scale=1920:-2,fps=25" \
  -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p \
  -movflags +faststart assets/video/hero.mp4
```

What each flag is doing:

- `-an` — drop the audio track entirely
- `-crf 30` — quality target. Lower is better and bigger; 28-32 is the useful
  range for something sitting behind a dark scrim at 78% opacity, where fine
  detail is invisible anyway
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
Safari falls back to MP4.

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
