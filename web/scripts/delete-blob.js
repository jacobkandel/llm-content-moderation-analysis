const { del } = require('@vercel/blob');
async function deleteBlob() {
    console.log("Deleting corrupted blobs...");
    try {
        await del(['https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/data/audit_log.csv.gz', 'https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/data/audit_log_lite.csv.gz']);
        console.log("✅ Deleted.");
    } catch (e) {
        console.error("❌ Failed:", e);
    }
}
deleteBlob();
