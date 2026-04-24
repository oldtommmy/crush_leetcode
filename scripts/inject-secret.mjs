import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST_DIR = 'dist';
const SECRET = process.env.CRUSH_SECRET;

async function injectSecret() {
  if (!SECRET) {
    console.log('No CRUSH_SECRET provided, skipping injection.');
    return;
  }

  const assetsDir = join(DIST_DIR, 'assets');
  const files = await import('node:fs').then(fs => fs.readdirSync(assetsDir));
  
  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = join(assetsDir, file);
      let content = await readFile(filePath, 'utf-8');
      
      // Look for the specific pattern where apiKey: "" might be assigned
      // This is a naive replacement but works for small bundles
      if (content.includes('apiKey:""') || content.includes('apiKey: ""')) {
        console.log(`Injecting secret into ${file}...`);
        content = content.replace(/apiKey:\s*["']["']/g, `apiKey:"${SECRET}"`);
        await writeFile(filePath, content);
      }
    }
  }
}

injectSecret().catch(console.error);
