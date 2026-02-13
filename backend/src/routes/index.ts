import { Router } from 'express';
import authRoutes from './authRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import articleRoutes from './articleRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import inviteRoutes from './inviteRoutes.js';
import auditRoutes from './auditRoutes.js';
import chatRoutes from './chatRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import satisfactionRoutes from './satisfactionRoutes.js';
import timeTrackingRoutes from './timeTrackingRoutes.js';
import planRoutes from './planRoutes.js';
import billingRoutes from './billingRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/categories', categoryRoutes);
router.use('/articles', articleRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/invites', inviteRoutes);
router.use('/audit', auditRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/satisfaction', satisfactionRoutes);
router.use('/time', timeTrackingRoutes);
router.use('/plan', planRoutes);
router.use('/billing', billingRoutes);

export default router;
