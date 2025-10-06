import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 20);
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.csv', '.png', '.jpg', '.jpeg', '.heic'];
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/heif'
]);

const EXTENSION_NORMALIZATION: Record<string, string[]> = {
  '.jpg': ['jpg', 'jpeg'],
  '.jpeg': ['jpg', 'jpeg'],
  '.png': ['png'],
  '.pdf': ['pdf'],
  '.csv': ['csv'],
  '.docx': ['docx'],
  '.doc': ['doc'],
  '.heic': ['heic', 'heif']
};

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

async function antivirusScanStub(_buffer: Buffer) {
  // TODO: intégrer un antivirus en production (ClamAV, VirusTotal…)
  return true;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_UPLOAD_MB) {
    return NextResponse.json({ error: `Fichier trop volumineux (max ${MAX_UPLOAD_MB} Mo)` }, { status: 413 });
  }

  const originalName = file.name;
  const extension = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json({ error: 'Extension non autorisée' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const detected = await fileTypeFromBuffer(buffer);
  if (detected) {
    if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
      return NextResponse.json({ error: 'Type MIME non autorisé' }, { status: 400 });
    }

    const normalizedExtensions = EXTENSION_NORMALIZATION[extension] ?? [];
    if (normalizedExtensions.length > 0 && !normalizedExtensions.includes(detected.ext)) {
      return NextResponse.json({ error: 'Extension et contenu du fichier ne correspondent pas' }, { status: 400 });
    }
  } else {
    const fallbackAllowed =
      (extension === '.csv' && (!file.type || file.type === 'text/csv')) ||
      (extension === '.doc' && (!file.type || file.type === 'application/msword'));

    if (!fallbackAllowed) {
      return NextResponse.json({ error: 'Type MIME non détecté ou non autorisé' }, { status: 400 });
    }
  }

  const clean = await antivirusScanStub(buffer);
  if (!clean) {
    return NextResponse.json({ error: 'Analyse antivirus échouée' }, { status: 400 });
  }

  await ensureUploadDir();

  const safeName = `${randomUUID()}${extension}`;
  const filePath = path.join(UPLOAD_DIR, safeName);

  await fs.writeFile(filePath, buffer);

  const baseUrl = (process.env.BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`).replace(/\/$/, '');
  const fileUrl = `${baseUrl}/uploads/${safeName}`;

  return NextResponse.json({
    fileUrl,
    fileName: originalName,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream'
  });
}
