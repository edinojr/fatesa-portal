import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  console.log("Checking buckets...");
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error("Error listing buckets:", bucketsError);
    return;
  }

  const pedagogicoBucket = buckets?.find(b => b.name === 'pedagogico');

  if (!pedagogicoBucket) {
    console.log("Creating 'pedagogico' bucket...");
    const { data, error } = await supabase.storage.createBucket('pedagogico', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (error) {
      console.error("Error creating bucket:", error);
    } else {
      console.log("Bucket created successfully!");
    }
  } else {
    console.log("Bucket 'pedagogico' already exists.");
  }
}

setupStorage();
