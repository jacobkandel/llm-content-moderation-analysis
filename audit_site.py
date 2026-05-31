import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
import datetime

BASE_URL = "https://www.moderationbias.com"
visited = set()
to_visit = [BASE_URL]
pages = []

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for name, value in attrs:
                if name == "href":
                    self.links.append(value)
                    break

while to_visit:
    url = to_visit.pop()
    if url in visited:
        continue
    visited.add(url)
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            status = response.getcode()
            content_bytes = response.read()
            content = content_bytes.decode('utf-8', errors='ignore')
        # Parse links
        parser = LinkParser()
        parser.feed(content)
        for href in parser.links:
            full = urllib.parse.urljoin(BASE_URL, href)
            if full.startswith(BASE_URL) and full not in visited:
                to_visit.append(full)
        # Detect outdated marker (e.g., "March 2023")
        outdated_marker = bool(re.search(r"March\s+202[0-9]", content, re.I))
        pages.append({
            "url": url,
            "status": status,
            "error": None if status == 200 else f"HTTP {status}",
            "outdated_marker": outdated_marker,
        })
    except Exception as e:
        pages.append({
            "url": url,
            "status": None,
            "error": str(e),
            "outdated_marker": False,
        })

# Write report to JSON file in repository root
report_path = "report.json"
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(pages, f, indent=2)
print(f"Report written to {report_path}")

import os
import datetime

# Write last audit timestamp for freshness banner
# Use timezone‑aware UTC datetime (future‑proof)
last_audit = {"lastUpdated": datetime.datetime.now(datetime.timezone.utc).isoformat()}
# Ensure the Next.js public directory exists
public_dir = os.path.join("web", "public")
os.makedirs(public_dir, exist_ok=True)
with open(os.path.join(public_dir, "last_audit.json"), "w", encoding="utf-8") as f:
    json.dump(last_audit, f, indent=2)
print("Last audit timestamp written to web/public/last_audit.json")
