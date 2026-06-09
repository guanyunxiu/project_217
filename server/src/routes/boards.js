const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const boardController = require('../controllers/boardController');

router.get('/', boardController.listBoards);
router.post('/', authMiddleware, adminMiddleware, boardController.createBoard);

module.exports = router;
