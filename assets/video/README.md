# Hero background video

Drop a file called `hero.mp4` in this folder to use your own footage as the
homepage background, then set `hero.mode` to `"video"` in `data/site.json`.

## Encoding guidance

Background video is decoration, so favour a small file over fidelity:

- **10-20 seconds**, cut so it loops without an obvious seam
- **1920x1080**, 24-30 fps
- **Under 5 MB** — GitHub Pages has a soft 1 GB repo limit and no CDN tuning,
  and visitors on phones pay for every byte
- **No audio track** unless you want the sound toggle to appear
- Slow, wide, ambient shots read best; fast cuts fight with the text on top

With ffmpeg:

```
ffmpeg -i source.mov -t 15 -an \
  -vf "scale=1920:-2,fps=25" \
  -c:v libx264 -crf 30 -preset slow -movflags +faststart \
  hero.mp4
```

Optionally add a WebM for smaller files in Firefox/Chrome, and point
`hero.videoWebm` at it:

```
ffmpeg -i hero.mp4 -c:v libvpx-vp9 -crf 40 -b:v 0 -an hero.webm
```

If `hero.mp4` is missing or fails to load, the site silently falls back to
`hero.poster` — nothing breaks.
