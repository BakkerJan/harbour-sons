# Harbour Sons — band site

A static site for [Harbour Sons](https://www.youtube.com/@HarbourSons). No build
step, no framework, no npm install: plain HTML, one stylesheet, one ES module.
It is designed to be dropped straight onto GitHub Pages.

---

## Run it locally

```bash
python -m http.server 4173
```

Then open <http://localhost:4173>.

It has to be served over HTTP rather than opened as a `file://` path, because
the page fetches `data/site.json` and `data/videos.json`.

---

## Editing the content

Almost everything on the page comes from **`data/site.json`** — band name,
tagline, bio, members, gig dates, booking email, social links and the scrolling
ticker. Edit that file and reload; you should not need to touch the HTML.

| What you want to change | Where |
| --- | --- |
| Band name, tagline, blurb | `band` |
| Hero background behaviour | `hero` (see below) |
| Bio text and line-up | `about` |
| Gig dates | `shows` |
| Booking email | `contact` |
| Social buttons | `links` — leave `url` empty to hide a button |
| Scrolling strip | `marquee` |

Dates use `YYYY-MM-DD`. Past dates automatically grey out and drop their
ticket button; you can leave them in place as an archive or delete them.

---

## The hero background video

`hero.mode` in `data/site.json` picks one of three behaviours:

| Mode | What it does | When to use it |
| --- | --- | --- |
| `"video"` | Plays `assets/video/hero.mp4`, muted and looping | **Best option.** Full control, no YouTube branding, no third-party requests |
| `"youtube"` | Ambient muted loop of a channel video *(current setting)* | Good stopgap — no video file needed |
| `"image"` | Static poster only | Fastest, calmest |

Whatever the mode, the background **degrades to the poster image**
(`hero.poster`) when any of these are true:

- the visitor has "reduce motion" turned on
- the browser reports data-saver mode
- the screen is phone-sized and `hero.disableOnMobile` is `true`
- the video file is missing or fails to load

So nothing ever breaks — worst case you get a still image.

Other `hero` keys:

- `youtubeId` — which video to use as the backdrop
- `startAt` / `endAt` — trim to the best few seconds (seconds, `0` = ignore)
- `overlayOpacity` — `0`–`1`. Raise it if text is hard to read over the footage
- `videoMp4` / `videoWebm` — paths used by `"video"` mode

### Switching to your own footage

1. Put `hero.mp4` in `assets/video/` (see the encoding notes in
   [`assets/video/README.md`](assets/video/README.md) — aim for under 5 MB)
2. Set `"mode": "video"` in `data/site.json`

This is worth doing. The YouTube mode briefly flashes YouTube's own player
controls while it boots, and the crop that hides its title bar throws away some
of the frame. A self-hosted file has neither problem.

---

## The YouTube integration

The site does **not** call the YouTube API from the browser. Instead:

1. `tools/fetch-youtube.py` reads the channel's public RSS feed and writes
   `data/videos.json`
2. A GitHub Action (`.github/workflows/refresh-youtube.yml`) runs it daily and
   commits any change
3. The page just reads the committed JSON

This means no API key, no quota, no CORS problems, and the video grid renders
instantly instead of waiting on a third party.

Videos play in a lightbox using `youtube-nocookie.com`, and the embed is only
created when someone actually clicks play — so no YouTube tracking cookie is
set on visitors who never watch anything.

To refresh by hand after uploading a video:

```bash
python tools/fetch-youtube.py
```

Or trigger the **Refresh YouTube videos** workflow from the Actions tab.

Titles are tidied on the way in: `Harbour Sons | Fisherman's Blues (Cover)`
becomes `Fisherman's Blues (Cover)`, since the band name is already everywhere
else on the page.

---

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. Push to `main`

`.github/workflows/deploy.yml` publishes the repository root on every push.
`.nojekyll` is present so Jekyll does not eat any files.

If you use a custom domain, add a `CNAME` file containing the domain and update
the absolute `og:image` URL in `index.html` so social previews work.

---

## Brand assets

The committed images in `assets/img/` are derived from the master artwork
(the `.ai` / `.eps` / 6250px `.png` originals), which is deliberately **not** in
this repo — it is far too large.

To regenerate them, point the script at the master Logo folder:

```bash
python tools/build-assets.py "C:/path/to/Logo"
```

It trims the transparent margins, resizes, writes WebP, produces the white
line-art versions used on dark backgrounds by inverting the mono artwork, and
builds the favicons and the Open Graph card.

Requires Pillow (`pip install Pillow`).

The palette in `assets/css/style.css` is sampled from the colour badge, so the
site and the logo agree: ink `#0E1417`, sand `#F3DDB6`, brass `#D89C60`,
sea `#789CA8`, cream `#FBF3E4`.

---

## Notes on how it is built

- **Fails open.** Scroll-reveal animations only hide content once JS has
  confirmed it can reveal it again, with a timeout as a backstop. A broken
  observer gives you a plain page, never a blank one.
- **Respects preferences.** `prefers-reduced-motion` stops the grain, the
  ticker, the reveals and the background video.
- **Keyboard and screen readers.** The lightbox moves focus, closes on Escape,
  and destroys its iframe on close so audio actually stops.
- **No horizontal scroll** at any width down to 320px.

### Still to fill in

`data/site.json` ships with placeholder copy that needs real content:

- `about.members` — real names and instruments
- `about.body` and `band.tagline` — written by someone in the band
- `shows` — the invented dates are examples, replace them
- `contact.bookingEmail` — currently `booking@harboursons.example`
- `links` — Instagram / Spotify / Facebook URLs are empty, so those buttons are
  hidden until you add them
