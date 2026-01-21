import express, { Router } from 'express';
import prisma from '../lib/prisma.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

// Get latest version info
router.get('/latest', async (req, res) => {
  try {
    const latest = await prisma.clientVersion.findFirst({
      where: { isActive: true },
      select: { version: true, createdAt: true }
    });

    if (!latest) {
      return res.status(404).json({ message: 'No active version found' });
    }

    res.json(latest);
  } catch (error) {
    console.error('Error fetching latest version:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// List all versions
router.get('/', async (req, res) => {
  try {
    const versions = await prisma.clientVersion.findMany({
      select: {
        id: true,
        version: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(versions);
  } catch (error) {
    console.error('Error listing versions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download specific version
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const version = await prisma.clientVersion.findUnique({
      where: { id }
    });

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="update-${version.version}.zip"`);
    res.send(version.fileData);
  } catch (error) {
    console.error('Error downloading version:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download latest version
router.get('/download', async (req, res) => {
  try {
    const latest = await prisma.clientVersion.findFirst({
      where: { isActive: true }
    });

    if (!latest) {
      return res.status(404).json({ message: 'No active version found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="update-${latest.version}.zip"`);
    res.send(latest.fileData);
  } catch (error) {
    console.error('Error downloading update:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload new version
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { version } = req.body;
    const file = req.file;

    if (!version || !file) {
      return res.status(400).json({ message: 'Version and file are required' });
    }

    // Deactivate current active version
    await prisma.clientVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new version
    const newVersion = await prisma.clientVersion.create({
      data: {
        version,
        fileData: Buffer.from(file.buffer),
        isActive: true
      }
    });

    res.json({ message: 'Version uploaded successfully', version: newVersion.version });
  } catch (error) {
    console.error('Error uploading version:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete version
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if version exists and is active
    const version = await prisma.clientVersion.findUnique({
      where: { id }
    });

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    if (version.isActive) {
        // Prevent deleting active version unless it's the only one maybe? 
        // Or just warn frontend. For now let's allow but maybe we should activate previous?
        // Let's just allow deletion.
    }

    await prisma.clientVersion.delete({
      where: { id }
    });

    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Error deleting version:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

import fs from 'fs';
import path from 'path';

// ... (existing imports are fine, but ensure fs and path are available)

// Helper to ensure upload directory exists
const INSTALLER_DIR = path.join(process.cwd(), 'uploads', 'installer');
if (!fs.existsSync(INSTALLER_DIR)) {
  fs.mkdirSync(INSTALLER_DIR, { recursive: true });
}

const META_FILE = path.join(INSTALLER_DIR, 'meta.json');
const INSTALLER_FILE = path.join(INSTALLER_DIR, 'installer.zip');

// Upload installer
router.post('/installer/upload', upload.single('file'), async (req, res) => {
  try {
    const { version } = req.body;
    const file = req.file;

    if (!version || !file) {
      return res.status(400).json({ message: 'Version and file are required' });
    }

    // Save file to disk
    fs.writeFileSync(INSTALLER_FILE, file.buffer);

    // Save metadata
    const meta = {
      version,
      uploadedAt: new Date(),
      size: file.buffer.length
    };
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

    console.log(`[INSTALLER] Uploaded version ${version}, size: ${file.buffer.length} bytes`);

    res.json({ message: 'Installer uploaded successfully', version });
  } catch (error) {
    console.error('Error uploading installer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get installer info
router.get('/installer', async (req, res) => {
  try {
    if (!fs.existsSync(META_FILE) || !fs.existsSync(INSTALLER_FILE)) {
      return res.status(404).json({ message: 'No installer available' });
    }

    const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
    res.json(meta);
  } catch (error) {
    console.error('Error fetching installer info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download installer
router.get('/installer/download', async (req, res) => {
  try {
    if (!fs.existsSync(META_FILE) || !fs.existsSync(INSTALLER_FILE)) {
      return res.status(404).json({ message: 'No installer available' });
    }

    const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="EsportManager_Installer_v${meta.version}.zip"`);
    
    const fileStream = fs.createReadStream(INSTALLER_FILE);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading installer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export const clientUpdateRouter: Router = router;
