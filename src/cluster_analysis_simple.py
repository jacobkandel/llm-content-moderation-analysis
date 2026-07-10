"""
Refusal Cluster Analysis

Clusters LLM refusal responses using sentence embeddings and KMeans/HDBSCAN
to discover natural "refusal archetypes" across models.

Replaces the previous heuristic/mock approach with real semantic analysis.

Outputs:
  - web/public/clusters.json  — top refusal clusters with keywords and exemplars
  - web/public/similarity.json — nearest-neighbor similarity for sampled refusals

Dependencies:
  pip install sentence-transformers scikit-learn

Usage:
  python src/cluster_analysis_simple.py
"""

import json
import csv
import collections
import re
import os
import gzip
import logging
import warnings

import numpy as np

logger = logging.getLogger(__name__)

INPUT_FILE = "web/public/audit_log.csv.gz"
INPUT_FALLBACK = "web/public/audit_log.csv"
OUTPUT_CLUSTERS = "web/public/clusters.json"
OUTPUT_SIMILARITY = "web/public/similarity.json"

# Refusal verdicts (consistent with main pipeline)
REFUSAL_VERDICTS = frozenset([
    'REFUSAL', 'META_REFUSAL', 'POLICY_REFUSAL',
    'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal',
    'Hard_Refusal', 'Soft_Censorship', 'False_Refusal'
])

# Maximum refusals to embed (to limit memory and compute)
MAX_REFUSALS_FOR_EMBEDDING = 5000
# Maximum for similarity nearest-neighbor index
MAX_SIMILARITY_SAMPLE = 200
# Number of clusters to target
N_CLUSTERS = 8


def get_top_words(texts, n=5):
    """Extract top keywords by frequency (stopword-filtered)."""
    stopwords = {
        'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
        'to', 'of', 'in', 'on', 'for', 'with', 'by', 'at', 'this', 'that',
        'it', 'not', 'can', 'will', 'you', 'your', 'have', 'has', 'had',
        'been', 'from', 'they', 'their', 'its', 'there', 'would', 'could',
        'should', 'about', 'into', 'more', 'some', 'such', 'than', 'also',
        'just', 'like', 'what', 'when', 'where', 'which', 'while', 'who',
        'how', 'each', 'make', 'may', 'does', 'did', 'being', 'these',
        'those', 'then', 'only', 'very', 'over', 'any', 'other', 'after',
        'verdict', 'reason', 'removed', 'refusal', 'json', 'however',
        'provide', 'content', 'information', 'response', 'request',
        'able', 'help', 'please', 'sorry', 'cannot', 'cant', 'dont',
        'model', 'language', 'text', 'user', 'post', 'based', 'including',
        # Judge-reason scaffolding: verbs/nouns the model uses to *justify* a
        # verdict, which otherwise crowd out the actual topic of the content.
        'against', 'policy', 'policies', 'violate', 'violates', 'violated',
        'violation', 'promote', 'promotes', 'promoting', 'promotion',
        'platform', 'guideline', 'guidelines', 'flagged', 'flag', 'safety',
        'review', 'moderation', 'contains', 'contain', 'users', 'allowed',
        'because', 'which', 'could', 'this', 'that', 'requests',
    }
    words = []
    for text in texts:
        clean = re.sub(r'[^a-zA-Z\s]', '', text.lower())
        for w in clean.split():
            if len(w) > 3 and w not in stopwords:
                words.append(w)
    counts = collections.Counter(words)
    return [w for w, _ in counts.most_common(n)]


# Matches a JSON "reason"/"explanation" field even when the response is
# truncated mid-string (common in the stored exemplars).
_REASON_RE = re.compile(r'"(?:reason|explanation|justification)"\s*:\s*"(.*?)(?:"|$)', re.IGNORECASE | re.DOTALL)


def extract_reason(response):
    """
    Pull the human-readable refusal rationale out of a judge response.

    Judge responses are typically ```json {"verdict": "...", "reason": "..."}```.
    We want the reason prose for clustering/keywords/exemplars — not the JSON
    scaffolding (verdict/braces/fences), which dominates otherwise.
    Falls back to the fence-stripped text when there is no reason field.
    """
    if not response:
        return ""
    text = response.strip()
    # Strip Markdown code fences (```json ... ```)
    text = re.sub(r'^```[a-zA-Z]*\s*', '', text)
    text = re.sub(r'\s*```$', '', text).strip()

    # Try strict JSON first
    if text.startswith('{'):
        try:
            obj = json.loads(text)
            for key in ('reason', 'Reason', 'explanation', 'justification', 'message'):
                if isinstance(obj.get(key), str) and obj[key].strip():
                    return obj[key].strip()
        except (json.JSONDecodeError, AttributeError):
            pass
        # Regex fallback for truncated/relaxed JSON
        m = _REASON_RE.search(text)
        if m and m.group(1).strip():
            return m.group(1).strip()
        # Last resort: drop obvious JSON scaffolding tokens
        stripped = re.sub(r'["{}]|verdict|reason|:\s*|REMOVED|ALLOWED|,', ' ', text, flags=re.IGNORECASE)
        return re.sub(r'\s+', ' ', stripped).strip()

    return text


def load_refusals():
    """Load refusal responses from the audit log."""
    input_path = INPUT_FILE if os.path.exists(INPUT_FILE) else INPUT_FALLBACK
    if not os.path.exists(input_path):
        print("❌ Audit log not found. Run audits first.")
        return []

    refusals = []
    opener = gzip.open if input_path.endswith('.gz') else open
    with opener(input_path, 'rt', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            v = row.get('verdict', '').strip()
            if v in REFUSAL_VERDICTS:
                response = row.get('response_text') or row.get('response', '')
                if not response or len(response.strip()) < 20:
                    continue  # Skip empty/trivial responses
                # Cluster on the refusal *rationale*, not the JSON scaffolding.
                reason = extract_reason(response)
                if not reason or len(reason) < 20:
                    continue  # No usable rationale
                refusals.append({
                    'response': reason,
                    'model': row.get('model') or row.get('model_id', ''),
                    'prompt_id': row.get('prompt_id') or row.get('case_id', ''),
                    'category': row.get('category', 'Uncategorized'),
                })

    print(f"📊 Found {len(refusals):,} refusals with response text")
    return refusals


def embed_texts(texts, model_name='all-MiniLM-L6-v2'):
    """
    Embed texts using sentence-transformers.
    Falls back to TF-IDF if sentence-transformers is not available.
    """
    try:
        from sentence_transformers import SentenceTransformer
        print(f"🧠 Loading embedding model: {model_name}...")
        model = SentenceTransformer(model_name)
        print(f"   Encoding {len(texts):,} texts...")
        embeddings = model.encode(
            texts,
            show_progress_bar=True,
            batch_size=64,
            normalize_embeddings=True,  # For cosine similarity via dot product
        )
        return np.array(embeddings)
    except ImportError:
        print("⚠️  sentence-transformers not installed. Falling back to TF-IDF embeddings.")
        print("   Install with: pip install sentence-transformers")
        return _tfidf_fallback(texts)


def _tfidf_fallback(texts):
    """Fallback: TF-IDF vectorization when sentence-transformers is unavailable."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.decomposition import TruncatedSVD

    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words='english',
        max_df=0.95,
        min_df=2,
    )
    tfidf_matrix = vectorizer.fit_transform(texts)

    # Reduce dimensionality to ~128 for clustering
    n_components = min(128, tfidf_matrix.shape[1] - 1, tfidf_matrix.shape[0] - 1)
    if n_components > 0:
        svd = TruncatedSVD(n_components=n_components, random_state=42)
        reduced = svd.fit_transform(tfidf_matrix)
        # Normalize for cosine similarity
        norms = np.linalg.norm(reduced, axis=1, keepdims=True)
        norms[norms == 0] = 1
        reduced = reduced / norms
        return reduced
    return tfidf_matrix.toarray()


def cluster_embeddings(embeddings, n_clusters=N_CLUSTERS):
    """Cluster embeddings using KMeans (or HDBSCAN if available)."""
    try:
        from sklearn.cluster import KMeans
        print(f"🔬 Clustering into {n_clusters} groups (KMeans)...")
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        return labels, kmeans.cluster_centers_
    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        # Fallback: assign all to one cluster
        return np.zeros(len(embeddings), dtype=int), None


def compute_cosine_similarities(embeddings, indices, top_k=5):
    """
    Compute nearest neighbors for a subset of embeddings.
    Returns dict mapping index → [(neighbor_idx, score), ...]
    """
    similarities = {}
    for idx in indices:
        # Dot product with normalized vectors = cosine similarity
        scores = embeddings @ embeddings[idx]
        # Exclude self
        scores[idx] = -1
        top_indices = np.argsort(scores)[::-1][:top_k]
        similarities[idx] = [
            (int(ni), float(scores[ni]))
            for ni in top_indices
            if scores[ni] > 0
        ]
    return similarities


def main():
    print("=" * 60)
    print("🧬 Refusal Cluster Analysis (Semantic Embeddings)")
    print("=" * 60)

    # 1. Load refusal data
    refusals = load_refusals()
    if not refusals:
        # Write empty but valid JSON
        os.makedirs(os.path.dirname(OUTPUT_CLUSTERS), exist_ok=True)
        with open(OUTPUT_CLUSTERS, 'w') as f:
            json.dump([], f)
        with open(OUTPUT_SIMILARITY, 'w') as f:
            json.dump([], f)
        print("⚠️  No refusals found. Created empty output files.")
        return

    # 2. Sample if too many refusals (for memory/speed)
    if len(refusals) > MAX_REFUSALS_FOR_EMBEDDING:
        print(f"   Sampling {MAX_REFUSALS_FOR_EMBEDDING:,} from {len(refusals):,} refusals...")
        rng = np.random.RandomState(42)
        indices = rng.choice(len(refusals), MAX_REFUSALS_FOR_EMBEDDING, replace=False)
        refusals = [refusals[i] for i in sorted(indices)]

    # 3. Embed response texts
    texts = [r['response'][:512] for r in refusals]  # Truncate long responses
    embeddings = embed_texts(texts)

    # 4. Cluster
    labels, centers = cluster_embeddings(embeddings, n_clusters=min(N_CLUSTERS, len(refusals)))

    # 5. Build cluster summaries
    cluster_groups = collections.defaultdict(list)
    for idx, label in enumerate(labels):
        cluster_groups[int(label)].append(idx)

    final_clusters = []
    for cluster_id, member_indices in sorted(cluster_groups.items()):
        members = [refusals[i] for i in member_indices]
        responses = [m['response'] for m in members]
        keywords = get_top_words(responses, n=5)
        models_count = collections.Counter(m['model'] for m in members)
        categories_count = collections.Counter(m['category'] for m in members)

        # Find the exemplar closest to the cluster center
        if centers is not None:
            member_embeddings = embeddings[member_indices]
            center = centers[cluster_id]
            distances = np.linalg.norm(member_embeddings - center, axis=1)
            exemplar_local_idx = int(np.argmin(distances))
            exemplar = members[exemplar_local_idx]['response']
        else:
            exemplar = members[0]['response']

        final_clusters.append({
            "cluster_id": cluster_id + 1,
            "size": len(members),
            "keywords": keywords,
            "top_categories": dict(categories_count.most_common(3)),
            "exemplar": exemplar[:300] + ("..." if len(exemplar) > 300 else ""),
            "models": dict(models_count),
        })

    # Sort by size (largest first), keep top clusters
    final_clusters.sort(key=lambda x: x['size'], reverse=True)
    final_clusters = final_clusters[:10]

    # 6. Compute real similarity data
    print(f"🔗 Computing nearest-neighbor similarities...")
    sim_sample_size = min(MAX_SIMILARITY_SAMPLE, len(refusals))
    rng = np.random.RandomState(42)
    sim_indices = sorted(rng.choice(len(refusals), sim_sample_size, replace=False))

    similarities = compute_cosine_similarities(embeddings, sim_indices, top_k=5)

    sim_data = []
    for idx in sim_indices:
        r = refusals[idx]
        neighbors = similarities.get(idx, [])
        matches = []
        for ni, score in neighbors:
            neighbor = refusals[ni]
            matches.append({
                "prompt_id": neighbor['prompt_id'],
                "model": neighbor['model'],
                "response": neighbor['response'][:150] + ("..." if len(neighbor['response']) > 150 else ""),
                "score": round(score, 4),
            })
        sim_data.append({
            "id": f"{r['model']}_{r['prompt_id']}",
            "prompt_id": r['prompt_id'],
            "model": r['model'],
            "cluster": int(labels[idx]) + 1,
            "similar": matches,
        })

    # 7. Save outputs
    os.makedirs(os.path.dirname(OUTPUT_CLUSTERS), exist_ok=True)
    with open(OUTPUT_CLUSTERS, 'w') as f:
        json.dump(final_clusters, f, indent=2)
    with open(OUTPUT_SIMILARITY, 'w') as f:
        json.dump(sim_data, f, indent=2)

    print(f"\n✅ Cluster Analysis Complete")
    print(f"   Clusters: {len(final_clusters)} ({OUTPUT_CLUSTERS}, {os.path.getsize(OUTPUT_CLUSTERS):,} bytes)")
    print(f"   Similarity: {len(sim_data)} items ({OUTPUT_SIMILARITY}, {os.path.getsize(OUTPUT_SIMILARITY):,} bytes)")

    for c in final_clusters[:6]:
        top_models = ', '.join(f"{m}" for m, _ in sorted(c['models'].items(), key=lambda x: -x[1])[:3])
        print(f"   Cluster {c['cluster_id']:2d}: {c['size']:5d} refusals | keywords: {', '.join(c['keywords'])} | models: {top_models}")


if __name__ == "__main__":
    main()
