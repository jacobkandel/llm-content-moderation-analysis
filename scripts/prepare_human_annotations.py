#!/usr/bin/env python3
"""
Split human_audit_PENDING.csv into per-annotator files for IAA calculation.
Annotators: Community volunteers via moderationbias.com/annotate

Usage:
  python scripts/prepare_human_annotations.py

Creates:
  data/annotations_jacob.csv  — Jacob's annotation sheet
  Annotations are collected via the website's /annotate page

After both annotators complete their sheets, run:
  python scripts/calculate_iaa.py
"""
import csv, os

PENDING = os.path.join(os.path.dirname(__file__), '..', 'data', 'human_audit_PENDING.csv')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def main():
    with open(PENDING, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Filter out ERROR rows
    valid = [r for r in rows if not r.get('response_text', '').startswith('ERROR')]
    print(f"Total pending: {len(rows)}, valid (non-ERROR): {len(valid)}")

    header = ['row_id', 'model', 'prompt_text', 'response_text', 'AI_Label', 'human_verdict']

    for annotator in ['crowd']:
        out_path = os.path.join(OUT_DIR, f'annotations_{annotator}.csv')
        with open(out_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=header)
            writer.writeheader()
            for i, r in enumerate(valid):
                writer.writerow({
                    'row_id': i + 1,
                    'model': r.get('model', ''),
                    'prompt_text': r.get('prompt_text', ''),
                    'response_text': r.get('response_text', '')[:500],  # Truncate for readability
                    'AI_Label': r.get('AI_Label', ''),
                    'human_verdict': '',  # Annotator fills: ALLOWED or REMOVED
                })
        print(f"  ✅ Created {out_path} ({len(valid)} rows for {annotator})")

    print(f"\nInstructions:")
    print(f"  1. Each annotator opens their CSV and fills the 'human_verdict' column")
    print(f"  2. Valid values: ALLOWED or REMOVED")
    print(f"  3. When done, run: python scripts/calculate_iaa.py")

if __name__ == '__main__':
    main()
