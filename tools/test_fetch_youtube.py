import importlib.util
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("fetch-youtube.py")
SPEC = importlib.util.spec_from_file_location("fetch_youtube", SCRIPT)
fetch_youtube = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fetch_youtube)


class FetchYouTubeTests(unittest.TestCase):
    def test_keeps_existing_data_when_feed_returns_404(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site = root / "site.json"
            output = root / "videos.json"
            site.write_text(json.dumps({
                "youtube": {"channelId": "test-channel", "handle": "test"},
                "band": {"name": "Test Band"},
            }), encoding="utf-8")
            output.write_text('{"existing": true}\n', encoding="utf-8")

            error = urllib.error.HTTPError(
                "https://example.test/feed", 404, "Not Found", None, None
            )
            with (
                patch.object(fetch_youtube, "SITE", site),
                patch.object(fetch_youtube, "OUT", output),
                patch.object(fetch_youtube.urllib.request, "urlopen", side_effect=error),
            ):
                self.assertEqual(fetch_youtube.main(), 0)

            self.assertEqual(output.read_text(encoding="utf-8"), '{"existing": true}\n')


if __name__ == "__main__":
    unittest.main()
