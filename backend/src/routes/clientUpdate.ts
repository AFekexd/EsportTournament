import express from 'express';
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

export const clientUpdateRouter = router;
