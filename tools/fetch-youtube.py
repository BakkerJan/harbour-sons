#!/usr/bin/env python3
"""Refresh data/videos.json from the Harbour Sons YouTube channel RSS feed.

Uses only the standard library so CI needs no install step. The feed is public,
needs no API key and has no quota, which is why we prefer it over the Data API.

Run:  python tools/fetch-youtube.py
"""
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "data", "site.json")
OUT = os.path.join(ROOT, "data", "videos.json")

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}
FEED = "https://www.youtube.com/feeds/videos.xml?channel_id={}"


def clean_title(title, band):
    """'Harbour Sons | Fisherman's Blues (Cover)' -> 'Fisherman's Blues'."""
    t = title.strip()
    for sep in ("|", "-", "–", "—"):
        head, _, tail = t.partition(sep)
        if tail and head.strip().lower() == band.lower():
            t = tail.strip()
            break
    return t


def main():
    with open(SITE, encoding="utf-8") as fh:
        site = json.load(fh)
    channel_id = site["youtube"]["channelId"]
    band = site["band"]["name"]

    url = FEED.format(channel_id)
    print(f"Fetching {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "harboursons-site/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()

    root = ET.fromstring(raw)
    videos = []
    for entry in root.findall("atom:entry", NS):
        vid = entry.findtext("yt:videoId", "", NS)
        if not vid:
            continue
        title = entry.findtext("atom:title", "", NS)
        group = entry.find("media:group", NS)
        desc = group.findtext("media:description", "", NS) if group is not None else ""
        stats = group.find("media:community/media:statistics", NS) if group is not None else None
        videos.append({
            "id": vid,
            "title": clean_title(title, band),
            "fullTitle": title,
            "description": desc.strip(),
            "published": entry.findtext("atom:published", "", NS),
            "url": f"https://www.youtube.com/watch?v={vid}",
            "thumb": f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg",
            "thumbFallback": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            "views": int(stats.get("views")) if stats is not None and stats.get("views") else None,
        })

    if not videos:
        print("No videos found in feed - refusing to overwrite existing data.", file=sys.stderr)
        return 1

    videos.sort(key=lambda v: v["published"], reverse=True)
    payload = {
        "channelId": channel_id,
        "channelUrl": f"https://www.youtube.com/channel/{channel_id}",
        "handle": site["youtube"]["handle"],
        "updated": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "count": len(videos),
        "videos": videos,
    }

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"Wrote {len(videos)} videos -> {os.path.relpath(OUT, ROOT)}")
    for v in videos:
        print(f"  {v['id']}  {v['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
