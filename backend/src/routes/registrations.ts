import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Parser } from 'json2csv';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { RegistrationService } from '../services/registrationService';
import { UserRole, RegistrationStatus } from '../types';

const router = Router();
const registrationService = new RegistrationService();

const validateRegister = [
  body('ticketTypeId').notEmpty().withMessage('Ticket type is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('contactName').notEmpty().withMessage('Contact name is required'),
  body('contactPhone').notEmpty().withMessage('Contact phone is required'),
  body('contactEmail').isEmail().withMessage('Valid contact email is required')
];

router.get('/my', authenticateJWT, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const registrations = await registrationService.getUserRegistrations(req.user.userId);
    res.json(registrations);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get registrations';
    res.status(500).json({ message });
  }
});

router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { id } = req.params;
    const registration = await registrationService.getById(id, req.user.userId);
    
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    res.json(registration);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get registration';
    res.status(500).json({ message });
  }
});

router.post('/event/:eventId', authenticateJWT, validateRegister, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { eventId } = req.params;
    const registration = await registrationService.registerForEvent(
      req.user.userId,
      eventId,
      req.body
    );
    
    res.status(201).json(registration);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ message });
  }
});

router.get('/event/:eventId/list', authenticateJWT, requireRole(UserRole.ORGANIZER), async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { ticketTypeId, status } = req.query;
    
    const registrations = await registrationService.getEventRegistrations(eventId, {
      ticketTypeId: ticketTypeId as string,
      status: status as RegistrationStatus
    });
    
    res.json(registrations);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get registrations';
    res.status(500).json({ message });
  }
});

router.get('/event/:eventId/export', authenticateJWT, requireRole(UserRole.ORGANIZER), async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const registrations = await registrationService.getEventRegistrations(eventId);
    
    const csvData = registrations.map((r) => ({
      orderNumber: r.orderNumber,
      contactName: r.contactName,
      contactPhone: r.contactPhone,
      contactEmail: r.contactEmail,
      ticketType: r.ticketType?.name || '',
      quantity: r.quantity,
      totalPrice: r.totalPrice,
      status: r.status,
      checkedInAt: r.checkedInAt,
      createdAt: r.createdAt
    }));
    
    const parser = new Parser();
    const csv = parser.parse(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${eventId}.csv`);
    res.send(csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export registrations';
    res.status(500).json({ message });
  }
});

router.post('/checkin', authenticateJWT, requireRole(UserRole.ORGANIZER), async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.body;
    
    if (!orderNumber) {
      return res.status(400).json({ message: 'Order number is required' });
    }
    
    const registration = await registrationService.checkIn(orderNumber);
    res.json(registration);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Check-in failed';
    res.status(400).json({ message });
  }
});

export default router;
