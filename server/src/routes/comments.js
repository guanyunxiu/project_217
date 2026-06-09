const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const commentController = require('../controllers/commentController');

router.get('/post/:postId', commentController.listComments);
router.post('/', authMiddleware, commentController.createComment);

module.exports = router;
