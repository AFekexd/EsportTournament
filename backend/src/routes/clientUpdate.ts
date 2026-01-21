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

// In-memory installer storage (for simplicity - in production use file system or S3)
let installerData: { version: string; fileData: Buffer; uploadedAt: Date } | null = null;

// Upload installer
router.post('/installer/upload', upload.single('file'), async (req, res) => {
  try {
    const { version } = req.body;
    const file = req.file;

    if (!version || !file) {
      return res.status(400).json({ message: 'Version and file are required' });
    }

    // Store installer
    installerData = {
      version,
      fileData: Buffer.from(file.buffer),
      uploadedAt: new Date()
    };

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
    if (!installerData) {
      return res.status(404).json({ message: 'No installer available' });
    }

    res.json({
      version: installerData.version,
      uploadedAt: installerData.uploadedAt,
      size: installerData.fileData.length
    });
  } catch (error) {
    console.error('Error fetching installer info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download installer
router.get('/installer/download', async (req, res) => {
  try {
    if (!installerData) {
      return res.status(404).json({ message: 'No installer available' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="EsportManager_Installer_v${installerData.version}.zip"`);
    res.send(installerData.fileData);
  } catch (error) {
    console.error('Error downloading installer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export const clientUpdateRouter: Router = router;
