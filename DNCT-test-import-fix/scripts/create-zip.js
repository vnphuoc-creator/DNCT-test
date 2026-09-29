import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();
const rootDir = process.cwd();

function addFilesRecursively(dirPath, zipFolder) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (
      item === 'node_modules' ||
      item === '.git' ||
      item === 'dist' ||
      item === '.cache' ||
      item === '.temp' ||
      item === 'quan-ly-kho-aht-dien-nuoc.zip'
    ) {
      continue;
    }

    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const subFolder = zipFolder.folder(item);
      addFilesRecursively(fullPath, subFolder);
    } else {
      const content = fs.readFileSync(fullPath);
      zipFolder.file(item, content);
    }
  }
}

async function buildZip() {
  console.log('Generating ZIP package...');
  addFilesRecursively(rootDir, zip);

  if (!fs.existsSync(path.join(rootDir, 'public'))) {
    fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
  }

  const outputPath = path.join(rootDir, 'public', 'quan-ly-kho-aht-dien-nuoc.zip');
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(outputPath, buffer);
  console.log(`ZIP successfully generated at: ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

buildZip().catch(console.error);
