import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, optionalAuth, getHighestRole } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';
import { UserRole } from '../utils/enums.js';
import { discordService } from '../services/discordService.js';


const router = Router();
const NEWS_CHANNEL_ID = '1452371140986278011';

// Helper to slugify title
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces with -
    .replace(/^-+|-+$/g, ''); // Trim -
};

// GET /api/news
// List news (Public: only published, Admin/Organizer: all)
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { limit = '10', offset = '0' } = req.query;
    
    let showAll = false;
    if (req.user) {
        const role = getHighestRole(req.user);
        if (role === UserRole.ADMIN || role === UserRole.ORGANIZER) {
            showAll = true;
        }
    }
    
    const where: any = {};
    if (!showAll) {
        where.isPublished = true;
    }

    const posts = await prisma.newsPost.findMany({
      where,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.newsPost.count({ where });

    res.json({ success: true, data: posts, total });
  })
);

// GET /api/news/:slug
// Get single post
router.get(
  '/:slug',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const post = await prisma.newsPost.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
      }
    });

    if (!post) throw new ApiError('Cikk nem található', 404, 'NOT_FOUND');
    if (!post.isPublished) {
        // Allow if user is admin/organizer?
        // Checking auth token helper would be needed. 
        // For now, strict public visibility.
        // throw new ApiError('Cikk nem található', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: post });
  })
);

// POST /api/news
// Create news (Admin/Organizer)
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { keycloakId: userId } });

    if (!['ADMIN', 'ORGANIZER'].includes(user?.role || '')) {
        throw new ApiError('Nincs jogosultságod híreket írni', 403, 'FORBIDDEN');
    }

    const { title, content, excerpt, coverImage, isPublished } = req.body;
    
    if (!title) throw new ApiError('Cím kötelező', 400, 'MISSING_TITLE');
    if (!content) throw new ApiError('Tartalom kötelező', 400, 'MISSING_CONTENT');

    let slug = createSlug(title);
    // Ensure uniqueness
    let exists = await prisma.newsPost.findUnique({ where: { slug } });
    let counter = 1;
    while(exists) {
        slug = `${createSlug(title)}-${counter}`;
        exists = await prisma.newsPost.findUnique({ where: { slug } });
        counter++;
    }

    const post = await prisma.newsPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        coverImage,
        isPublished: !!isPublished,
        publishedAt: isPublished ? new Date() : null,
        authorId: user!.id
      }
    });

    // Send Discord Notification if published
    if (post.isPublished) {
        try {
            await discordService.sendMessage(
                NEWS_CHANNEL_ID,
                {
                    title: `📰 Új hír: ${post.title}`,
                    description: post.excerpt || 'Kattints a részletekért!',
                    color: 0x3b82f6,
                    fields: [
                        { name: 'Szerző', value: user?.displayName || user?.username || 'EsportHub', inline: true },
                        { name: 'Megtekintés', value: `[Kattints ide](https://esport.pollak.info/news/${post.slug})`, inline: true }
                    ],
                    image: post.coverImage ? { url: post.coverImage } : undefined
                }
            );
        } catch (error) {
            console.error('Failed to send Discord notification for news:', error);
        }
    }

    res.status(201).json({ success: true, data: post });
  })
);

// PUT /api/news/:id
// Update news
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { keycloakId: userId } });

    if (!['ADMIN', 'ORGANIZER'].includes(user?.role || '')) {
        throw new ApiError('Nincs jogosultságod szerkeszteni', 403, 'FORBIDDEN');
    }

    const { title, content, excerpt, coverImage, isPublished } = req.body;
    const post = await prisma.newsPost.findUnique({ where: { id: req.params.id } });
    if (!post) throw new ApiError('Cikk nem található', 404, 'NOT_FOUND');

    const wasPublished = post.isPublished;
    const nowPublished = isPublished !== undefined ? isPublished : post.isPublished;

    const updated = await prisma.newsPost.update({
        where: { id: req.params.id },
        data: {
            title,
            content,
            excerpt,
            coverImage,
            isPublished: nowPublished,
            publishedAt: (nowPublished && !wasPublished) ? new Date() : post.publishedAt
        }
    });

    // Send Discord Notification if JUST published
    if (nowPublished && !wasPublished) {
        try {
            await discordService.sendMessage(
                NEWS_CHANNEL_ID,
                {
                    title: `📰 Új hír: ${updated.title}`,
                    description: updated.excerpt || 'Kattints a részletekért!',
                    color: 0x3b82f6,
                    fields: [
                         { name: 'Szerző', value: user?.displayName || user?.username || 'EsportHub', inline: true },
                        { name: 'Megtekintés', value: `[Kattints ide](https://esport.pollak.info/news/${updated.slug})`, inline: true }
                    ],
                    image: updated.coverImage ? { url: updated.coverImage } : undefined
                }
            );
        } catch (error) {
             console.error('Failed to send Discord notification for news:', error);
        }
    }

    res.json({ success: true, data: updated });
  })
);

// DELETE /api/news/:id
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { keycloakId: userId } });

    if (!['ADMIN', 'ORGANIZER'].includes(user?.role || '')) {
        throw new ApiError('Nincs jogosultságod törölni', 403, 'FORBIDDEN');
    }

    await prisma.newsPost.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Cikk törölve' });
  })
);

export const newsRouter: Router = router;
