import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { EventService } from '../services/eventService';
import { UserRole } from '../types';

const router = Router();
const eventService = new EventService();

const validateCreateEvent = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('maxCapacity').isInt({ min: 1 }).withMessage('Max capacity must be at least 1'),
  body('registrationDeadline').isISO8601().withMessage('Valid registration deadline is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('ticketTypes').isArray({ min: 1 }).withMessage('At least one ticket type is required'),
  body('ticketTypes.*.name').notEmpty().withMessage('Ticket type name is required'),
  body('ticketTypes.*.price').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('ticketTypes.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

router.get('/hot', async (req: Request, res: Response) => {
  try {
    const events = await eventService.getHotEvents();
    res.json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get hot events';
    res.status(500).json({ message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, tags, keyword, sortBy, sortOrder, limit, offset } = req.query;
    
    const result = await eventService.getPublishedEvents({
      category: category as string,
      tags: tags ? (tags as string).split(',') : undefined,
      keyword: keyword as string,
      sortBy: sortBy as 'startTime' | 'createdAt',
      sortOrder: sortOrder as 'ASC' | 'DESC',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get events';
    res.status(500).json({ message });
  }
});

router.get('/my', authenticateJWT, requireRole(UserRole.ORGANIZER), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const events = await eventService.getOrganizerEvents(req.user.userId);
    res.json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get events';
    res.status(500).json({ message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await eventService.getById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get event';
    res.status(500).json({ message });
  }
});

router.post('/', authenticateJWT, requireRole(UserRole.ORGANIZER), validateCreateEvent, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { ticketTypes, ...eventData } = req.body;
    
    const event = await eventService.createEvent(
      req.user.userId,
      {
        ...eventData,
        startTime: new Date(eventData.startTime),
        endTime: new Date(eventData.endTime),
        registrationDeadline: new Date(eventData.registrationDeadline)
      },
      ticketTypes
    );
    
    res.status(201).json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create event';
    res.status(400).json({ message });
  }
});

router.put('/:id', authenticateJWT, requireRole(UserRole.ORGANIZER), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { id } = req.params;
    const { ticketTypes, ...updates } = req.body;
    
    const event = await eventService.updateEvent(
      id,
      req.user.userId,
      {
        ...updates,
        startTime: updates.startTime ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
        registrationDeadline: updates.registrationDeadline ? new Date(updates.registrationDeadline) : undefined
      },
      ticketTypes
    );
    
    res.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update event';
    res.status(400).json({ message });
  }
});

router.post('/:id/publish', authenticateJWT, requireRole(UserRole.ORGANIZER), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { id } = req.params;
    const event = await eventService.publishEvent(id, req.user.userId);
    
    res.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish event';
    res.status(400).json({ message });
  }
});

export default router;
