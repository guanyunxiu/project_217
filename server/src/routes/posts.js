const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const postController = require('../controllers/postController');

router.get('/', postController.listPosts);
router.get('/:id', postController.getPost);
router.post('/', authMiddleware, postController.createPost);

module.exports = router;
