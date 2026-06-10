import csv
import sys
import gzip

input_file = 'web/public/audit_log.csv'
output_file = 'web/public/audit_log_migrated.csv'

new_headers = ['test_date', 'model', 'model_version', 'prompt_id', 'category', 'style', 'persona', 'system_prompt', 'verdict', 'classification', 'prompt_text', 'response_text', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'run_cost', 'confidence', 'reasoning', 'expected_safe', 'benchmark_source']

def run():
    print(f"Migrating {input_file} to uniform 20-column schema...")
    with open(input_file, 'r', encoding='utf-8') as fin, open(output_file, 'w', encoding='utf-8') as fout:
        reader = csv.reader(fin)
        writer = csv.writer(fout)
        
        try:
            first_row = next(reader)
        except StopIteration:
            return
            
        writer.writerow(new_headers)
        
        migrated_count = 0
        kept_count = 0
        dropped_count = 0
        
        for row in reader:
            if len(row) == 16:
                new_row = [
                    row[0], row[1], '', row[2], row[3], row[4], row[5], '',
                    row[6], row[7], row[8], row[9], row[10], row[11], row[12],
                    row[13], row[14], row[15], '', ''
                ]
                writer.writerow(new_row)
                migrated_count += 1
            elif len(row) == 20:
                writer.writerow(row)
                kept_count += 1
            else:
                dropped_count += 1

        print(f"Migrated 16-col rows: {migrated_count}")
        print(f"Kept 20-col rows: {kept_count}")
        print(f"Dropped bad rows: {dropped_count}")

run()
