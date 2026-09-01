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
| `"video"` | Plays `assets/video/hero.mp4`, muted and looping *(current setting)* | **Best option.** Full control, no YouTube branding, no third-party requests |
| `"youtube"` | Ambient muted loop of a channel video | Stopgap if you have no video file |
| `"image"` | Static poster only | Fastest, calmest |

Whatever the mode, the background **degrades to the poster image**
(`hero.poster`) when any of these are true:

- the visitor has "reduce motion" turned on
- the browser reports data-saver mode
- the screen is phone-sized and `hero.disableOnMobile` is `true`
- the video file is missing or fails to load

So nothing ever breaks — worst case you get a still image.

Other `hero` keys:

- `videoMp4` / `videoWebm` — paths used by `"video"` mode
- `hasAudio` — shows the corner unmute button. `false` here, because the audio
  was stripped during encoding. The video always *starts* muted either way
- `poster` — the still shown before playback and as the fallback
- `overlayOpacity` — `0`–`1`. Raise it if text is hard to read over the footage
- `youtubeId`, `startAt`, `endAt` — only used by `"youtube"` mode
- `disableOnMobile` — when `true`, phones get the poster instead of the video

### Replacing the footage

Drop a new `hero.mp4` into `assets/video/` — the encoding recipe and the
reasoning behind each flag are in
[`assets/video/README.md`](assets/video/README.md). Aim for under 5 MB.

Self-hosting is worth it over `"youtube"` mode: the YouTube embed briefly
flashes its own player controls while it boots, and the crop that hides its
title bar throws away part of the frame.

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

The site is live at **https://harboursons.nl** (the `bakkerjan.github.io/harbour-sons`
URL 301-redirects to it). The custom domain is stored in the repository's Pages
settings rather than a `CNAME` file, which is normal for Actions-based
deployment and survives redeploys.

If you ever change the domain, update the absolute `og:url`, `og:image` and
`canonical` URLs in `index.html` too — social platforms fetch those from their
own servers, so a relative path has nothing to resolve against.

---

## Brand assets

The committed images in `assets/img/` are derived from the master artwork
(the `.ai` / `.eps` / 6250px `.png` originals), which is deliberately **not** in
this repo — it is far too large.

To regenerate them, point the script at the master Logo folder:

```bash
python tools/build-assets.py "C:/path/to/Logo"
```

It trims the transparent margins, resizes, writes WebP, builds the favicons and
the Open Graph card, and derives white line-art variants (`*-white.webp`) for
use on dark grounds. Those are made by folding the ink density into the alpha
channel rather than inverting RGB, which looks identical but roughly halves the
file size.

Requires Pillow (`pip install Pillow`).

The palette in `assets/css/style.css` is sampled from the colour badge, so the
site and the logo agree:

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` | `#FBF3E4` | page ground |
| `--sand` | `#F3E0BC` | alternating panels |
| `--ink` | `#12181C` | body text (16.2:1 on paper) |
| `--ink-soft` | `#4A565E` | secondary text (6.8:1) |
| `--brass` | `#D89C60` | fills, ticker |
| `--brass-mid` | `#B47830` | borders |
| `--brass-deep` | `#8A5A1F` | small caps (5.3:1) |
| `--sea-deep` | `#3F5F6C` | meta text (6.2:1) |

The hero and the footer are the two dark anchors; everything between them is
cream. Every text colour above meets WCAG AA on the ground it sits on.

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
