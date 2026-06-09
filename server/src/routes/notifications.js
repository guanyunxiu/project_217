const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', authMiddleware, notificationController.listNotifications);
router.put('/:id/read', authMiddleware, notificationController.markAsRead);
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

module.exports = router;
