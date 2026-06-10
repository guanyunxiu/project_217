const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.get('/history', authMiddleware, chatController.getHistory);
router.get('/online', authMiddleware, chatController.getOnlineUsers);

module.exports = router;
