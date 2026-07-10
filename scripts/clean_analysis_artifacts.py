"""
Clean already-generated analysis artifacts in place — no source CSV required.

The trigger-word and cluster generators historically surfaced moderation-harness
scaffolding (verdict / allowed / removed / flagged / redacted …) and raw judge
JSON, which read as noise on the site. The generators are now fixed
(src/analysis/trigger_extraction.py, src/cluster_analysis_simple.py) so future
audit runs produce clean data. This script applies the same cleanup to the JSON
that is already committed under web/public, so the fix ships without waiting for
a full re-audit.

Idempotent: safe to run repeatedly.

Usage:
  python scripts/clean_analysis_artifacts.py
"""

import json
import os
import re

TRIGGER_FILE = "web/public/assets/trigger_words.json"
CLUSTERS_FILE = "web/public/clusters.json"

# Keep in sync with SCAFFOLDING_WORDS in src/analysis/trigger_extraction.py and
# the stopword additions in src/cluster_analysis_simple.py:get_top_words.
SCAFFOLDING_WORDS = {
    'context', 'redacted', 'check', 'allowed', 'removed', 'user', 'users', 'content',
    'verdict', 'flagged', 'flag', 'request', 'requests', 'safety', 'review', 'response',
    'responses', 'moderation', 'moderate', 'moderator', 'policy', 'policies', 'platform',
    'guidelines', 'guideline', 'classification', 'classify', 'assistant', 'system',
    'reason', 'reasons', 'post', 'posts', 'contains', 'contain', 'against', 'violate',
    'violates', 'violated', 'violation', 'promote', 'promotes', 'promoting', 'promotion',
}

_REASON_RE = re.compile(
    r'"(?:reason|explanation|justification)"\s*:\s*"(.*?)(?:"|$)',
    re.IGNORECASE | re.DOTALL,
)


def extract_reason(response):
    """Pull the human-readable rationale out of a (possibly truncated) judge response."""
    if not response:
        return ""
    text = response.strip()
    text = re.sub(r'^```[a-zA-Z]*\s*', '', text)
    text = re.sub(r'\s*```$', '', text).strip()
    text = text.rstrip('.')  # drop the generator's trailing "..." ellipsis noise
    if text.startswith('{'):
        try:
            obj = json.loads(text)
            for key in ('reason', 'Reason', 'explanation', 'justification', 'message'):
                if isinstance(obj.get(key), str) and obj[key].strip():
                    return obj[key].strip()
        except (json.JSONDecodeError, AttributeError):
            pass
        m = _REASON_RE.search(text)
        if m and m.group(1).strip():
            return m.group(1).strip()
        stripped = re.sub(r'["{}]|verdict|reason|:\s*|REMOVED|ALLOWED|,', ' ', text, flags=re.IGNORECASE)
        return re.sub(r'\s+', ' ', stripped).strip()
    return text


def clean_triggers():
    if not os.path.exists(TRIGGER_FILE):
        print(f"⚠️  {TRIGGER_FILE} not found; skipping.")
        return
    words = json.load(open(TRIGGER_FILE))
    kept = [w for w in words if w.get('word', '').lower() not in SCAFFOLDING_WORDS]
    removed = [w['word'] for w in words if w.get('word', '').lower() in SCAFFOLDING_WORDS]
    with open(TRIGGER_FILE, 'w') as f:
        json.dump(kept, f, indent=2)
    print(f"✅ triggers: kept {len(kept)}/{len(words)} words. Dropped scaffolding: {', '.join(removed) or '(none)'}")


def clean_clusters():
    if not os.path.exists(CLUSTERS_FILE):
        print(f"⚠️  {CLUSTERS_FILE} not found; skipping.")
        return
    clusters = json.load(open(CLUSTERS_FILE))
    for c in clusters:
        if 'exemplar' in c:
            c['exemplar'] = extract_reason(c['exemplar'])
        if 'keywords' in c and isinstance(c['keywords'], list):
            filtered = [k for k in c['keywords'] if k.lower() not in SCAFFOLDING_WORDS]
            # Never leave a cluster with no label — fall back to its top category.
            if not filtered and c.get('top_categories'):
                filtered = [next(iter(c['top_categories'])).lower()]
            c['keywords'] = filtered
    with open(CLUSTERS_FILE, 'w') as f:
        json.dump(clusters, f, indent=2)
    print(f"✅ clusters: cleaned {len(clusters)} exemplars + keywords")


if __name__ == "__main__":
    clean_triggers()
    clean_clusters()
