import express, { Router } from 'express';
import prisma from '../lib/prisma.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticate, requireRole } from '../middleware/auth.js';

const router: Router = express.Router();
const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Helper to ensure upload directory exists
const INSTALLER_DIR = path.join(process.cwd(), 'uploads', 'installer');
if (!fs.existsSync(INSTALLER_DIR)) {
  fs.mkdirSync(INSTALLER_DIR, { recursive: true });
}

const META_FILE = path.join(INSTALLER_DIR, 'meta.json');
const INSTALLER_FILE = path.join(INSTALLER_DIR, 'installer.zip');

/**
 * Validates that buffer starts with standard ZIP magic bytes (PK\x03\x04, PK\x05\x06, or PK\x07\x08)
 */
function isValidZipBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  );
}

/**
 * Validates version format to prevent path traversal or malformed strings
 */
function isValidVersion(version: unknown): version is string {
  return typeof version === 'string' && /^[a-zA-Z0-9.\-_+]{1,50}$/.test(version.trim());
}

// ==========================================
// INSTALLER ROUTES (Specific routes first)
// ==========================================

// Upload installer - ADMIN only
router.post(
  '/installer/upload',
  authenticate,
  requireRole('ADMIN'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { version } = req.body;
      const file = req.file;

      if (!isValidVersion(version)) {
        return res.status(400).json({ message: 'Érvénytelen verzió formátum (csak alfanumerikus, pont, kötőjel megengedett)' });
      }

      if (!file || !file.buffer || !isValidZipBuffer(file.buffer)) {
        return res.status(400).json({ message: 'Érvénytelen vagy hiányzó fájl. Csak valódi ZIP archívum tölthető fel.' });
      }

      const cleanVersion = version.trim();

      // Save file to disk
      fs.writeFileSync(INSTALLER_FILE, file.buffer);

      // Save metadata
      const meta = {
        version: cleanVersion,
        uploadedAt: new Date(),
        size: file.buffer.length,
      };
      fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

      console.log(`[INSTALLER] Admin uploaded installer version ${cleanVersion}, size: ${file.buffer.length} bytes`);

      res.json({ message: 'Telepítő sikeresen feltöltve', version: cleanVersion });
    } catch (error) {
      console.error('Error uploading installer:', error);
      res.status(500).json({ message: 'Belső szerverhiba' });
    }
  }
);

// Download installer - Public / Kiosk installer usage
router.get('/installer/download', async (req, res) => {
  try {
    if (!fs.existsSync(META_FILE) || !fs.existsSync(INSTALLER_FILE)) {
      return res.status(404).json({ message: 'Nincs elérhető telepítő' });
    }

    const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
    const safeVersion = String(meta.version).replace(/[^a-zA-Z0-9.\-_+]/g, '');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="EsportManager_Installer_v${safeVersion}.zip"`);

    const fileStream = fs.createReadStream(INSTALLER_FILE);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading installer:', error);
    res.status(500).json({ message: 'Belső szerverhiba' });
  }
});

// Get installer info
router.get('/installer', async (req, res) => {
  try {
    if (!fs.existsSync(META_FILE) || !fs.existsSync(INSTALLER_FILE)) {
      return res.status(404).json({ message: 'Nincs elérhető telepítő' });
    }

    const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
    res.json(meta);
  } catch (error) {
    console.error('Error fetching installer info:', error);
    res.status(500).json({ message: 'Belső szerverhiba' });
  }
});

// ==========================================
// UPDATE PACKAGE ROUTES
// ==========================================

// Get latest version info (Used by Desktop launcher)
router.get('/latest', async (req, res) => {
  try {
    const latest = await prisma.clientVersion.findFirst({
      where: { isActive: true },
      select: { version: true, createdAt: true },
    });

    if (!latest) {
      return res.status(404).json({ message: 'Nincs aktív verzió' });
    }

    res.json(latest);
  } catch (error) {
    console.error('Error fetching latest version:', error);
    res.status(500).json({ message: 'Belső szerverhiba' });
  }
});

// Download latest version (Used by Desktop launcher)
router.get('/download', async (req, res) => {
  try {
    const latest = await prisma.clientVersion.findFirst({
      where: { isActive: true },
    });

    if (!latest) {
      return res.status(404).json({ message: 'Nincs aktív verzió' });
    }

    const safeVersion = latest.version.replace(/[^a-zA-Z0-9.\-_+]/g, '');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="update-${safeVersion}.zip"`);
    res.send(latest.fileData);
  } catch (error) {
    console.error('Error downloading update:', error);
    res.status(500).json({ message: 'Belső szerverhiba' });
  }
});

// Upload new version (Update package) - ADMIN only
router.post(
  '/upload',
  authenticate,
  requireRole('ADMIN'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { version } = req.body;
      const file = req.file;

      if (!isValidVersion(version)) {
        return res.status(400).json({ message: 'Érvénytelen verzió formátum (csak alfanumerikus, pont, kötőjel megengedett)' });
      }

      if (!file || !file.buffer || !isValidZipBuffer(file.buffer)) {
        return res.status(400).json({ message: 'Érvénytelen vagy hiányzó fájl. Csak valódi ZIP archívum tölthető fel.' });
      }

      const cleanVersion = version.trim();

      // Deactivate current active version
      await prisma.clientVersion.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new version
      const newVersion = await prisma.clientVersion.create({
        data: {
          version: cleanVersion,
          fileData: Buffer.from(file.buffer),
          isActive: true,
        },
      });

      console.log(`[CLIENT UPDATE] Admin uploaded version ${cleanVersion}, size: ${file.buffer.length} bytes`);

      res.json({ message: 'Frissítés sikeresen feltöltve', version: newVersion.version });
    } catch (error) {
      console.error('Error uploading version:', error);
      res.status(500).json({ message: 'Belső szerverhiba' });
    }
  }
);

// List all versions - ADMIN only
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const versions = await prisma.clientVersion.findMany({
      select: {
        id: true,
        version: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(versions);
  } catch (error) {
    console.error('Error listing versions:', error);
    res.status(500).json({ message: 'Belső szerverhiba' });
  }
});

// ==========================================
// PARAMETERIZED ROUTES (Must be last)
// ==========================================

// Download specific version by ID
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const version = await prisma.clientVersion.findUnique({
      where: { id },
    });

    if (!version) {
      return res.status(404).json({ message: 'Verzió nem található' });
    }

    const safeVersion = version.version.replace(/[^a-zA-Z0-9.\-_+]/g, '');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="update-${safeVersion}.zip"`);
    res.send(version.fileData);
  } catch (error) {
    console.error('Error downloading version:', error);
    res.status(500).json({ message: 'Belső szerverhiba' });
  }
});

// Delete version by ID - ADMIN only
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const version = await prisma.clientVersion.findUnique({
      where: { id },
    });

    if (!version) {
      return res.status(404).json({ message: 'Verzió nem található' });
    }

    await prisma.clientVersion.delete({
      where: { id },
    });

    res.json({ message: 'Verzió sikeresen törölve' });
  } catch (error) {
    console.error('Error deleting version:', error);
    res.status(500).json({ message: 'Belső szerverhiba' });
  }
});

export const clientUpdateRouter: Router = router;
