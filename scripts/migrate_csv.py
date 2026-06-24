import csv
import sys

input_file = 'web/public/audit_log.csv'
output_file = 'web/public/audit_log_migrated.csv'

# The canonical 20-column schema used by the current audit_runner.py
NEW_HEADERS = [
    'test_date', 'model', 'model_version', 'prompt_id', 'category', 'style',
    'persona', 'system_prompt', 'verdict', 'classification', 'prompt_text',
    'response_text', 'prompt_tokens', 'completion_tokens', 'total_tokens',
    'run_cost', 'confidence', 'reasoning', 'expected_safe', 'benchmark_source'
]

def migrate_16(row):
    """Original 16-col schema (Jan-Apr 2026): no model_version, system_prompt, expected_safe, benchmark_source."""
    return [
        row[0],   # test_date
        row[1],   # model
        '',       # model_version (new)
        row[2],   # prompt_id
        row[3],   # category
        row[4],   # style
        row[5],   # persona
        '',       # system_prompt (new)
        row[6],   # verdict
        row[7],   # classification
        row[8],   # prompt_text
        row[9],   # response_text
        row[10],  # prompt_tokens
        row[11],  # completion_tokens
        row[12],  # total_tokens
        row[13],  # run_cost
        row[14],  # confidence
        row[15],  # reasoning
        '',       # expected_safe (new)
        '',       # benchmark_source (new)
    ]

def migrate_18(row):
    """18-col schema (May 2026): has model_version and system_prompt but no expected_safe/benchmark_source."""
    return [
        row[0],   # test_date
        row[1],   # model
        row[2],   # model_version
        row[3],   # prompt_id
        row[4],   # category
        row[5],   # style
        row[6],   # persona
        row[7],   # system_prompt
        row[8],   # verdict
        row[9],   # classification
        row[10],  # prompt_text
        row[11],  # response_text
        row[12],  # prompt_tokens
        row[13],  # completion_tokens
        row[14],  # total_tokens
        row[15],  # run_cost
        row[16],  # confidence
        row[17],  # reasoning
        '',       # expected_safe (new)
        '',       # benchmark_source (new)
    ]

def run():
    print(f"Migrating {input_file} to uniform 20-column schema...")
    with open(input_file, 'r', encoding='utf-8') as fin, \
         open(output_file, 'w', encoding='utf-8', newline='') as fout:
        reader = csv.reader(fin)
        writer = csv.writer(fout)

        try:
            first_row = next(reader)
        except StopIteration:
            return

        writer.writerow(NEW_HEADERS)

        counts = {16: 0, 18: 0, 20: 0, 'dropped': 0}

        for row in reader:
            n = len(row)
            if n == 16:
                writer.writerow(migrate_16(row))
                counts[16] += 1
            elif n == 18:
                writer.writerow(migrate_18(row))
                counts[18] += 1
            elif n == 20:
                writer.writerow(row)
                counts[20] += 1
            else:
                counts['dropped'] += 1

        print(f"  Migrated 16-col rows: {counts[16]}")
        print(f"  Migrated 18-col rows: {counts[18]}")
        print(f"  Kept 20-col rows:     {counts[20]}")
        print(f"  Dropped bad rows:     {counts['dropped']}")
        total = counts[16] + counts[18] + counts[20]
        print(f"  Total rows written:   {total}")

if __name__ == '__main__':
    run()
