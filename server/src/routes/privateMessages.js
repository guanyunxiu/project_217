const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const pmController = require('../controllers/privateMessageController');

router.get('/conversations', authMiddleware, pmController.getConversations);
router.get('/unread-count', authMiddleware, pmController.getUnreadCount);
router.get('/:userId', authMiddleware, pmController.getMessages);
router.post('/', authMiddleware, pmController.sendMessage);

module.exports = router;
