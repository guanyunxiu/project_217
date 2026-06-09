const pool = require('../config/db');
const { parseMentions, createNotifications } = require('../utils/mention');

exports.listComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const [rows] = await pool.query(
      `SELECT c.*, u.username 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = ? 
       ORDER BY c.created_at ASC`,
      [postId]
    );

    res.json(rows);
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { content, post_id } = req.body;

    if (!content || !post_id) {
      return res.status(400).json({ message: '评论内容和帖子ID不能为空' });
    }

    const [postRows] = await pool.query('SELECT id, title, user_id FROM posts WHERE id = ?', [post_id]);
    if (postRows.length === 0) {
      return res.status(400).json({ message: '帖子不存在' });
    }

    const [result] = await pool.query(
      'INSERT INTO comments (content, post_id, user_id) VALUES (?, ?, ?)',
      [content, post_id, req.user.id]
    );

    const mentionedUsers = parseMentions(content);
    if (mentionedUsers.length > 0) {
      await createNotifications(
        mentionedUsers,
        req.user.id,
        'comment_mention',
        `在评论中提及了你`,
        post_id
      );

      const io = require('../app').getIO();
      if (io) {
        mentionedUsers.forEach(username => {
          io.to(`user_${username}`).emit('notification', {
            type: 'comment_mention',
            content: `${req.user.username}在评论中提及了你`,
            related_id: post_id
          });
        });
      }
    }

    const postOwner = postRows[0];
    if (postOwner.user_id !== req.user.id) {
      const [existing] = await pool.query(
        'SELECT id FROM notifications WHERE user_id = ? AND from_user_id = ? AND type = ? AND related_id = ?',
        [postOwner.user_id, req.user.id, 'post_reply', post_id]
      );
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO notifications (user_id, from_user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)',
          [postOwner.user_id, req.user.id, 'post_reply', `${req.user.username}评论了你的帖子「${postOwner.title}」`, post_id]
        );

        const [ownerRows] = await pool.query('SELECT username FROM users WHERE id = ?', [postOwner.user_id]);
        if (ownerRows.length > 0) {
          const io = require('../app').getIO();
          if (io) {
            io.to(`user_${ownerRows[0].username}`).emit('notification', {
              type: 'post_reply',
              content: `${req.user.username}评论了你的帖子「${postOwner.title}」`,
              related_id: post_id
            });
          }
        }
      }
    }

    res.status(201).json({
      message: '评论发布成功',
      comment: { id: result.insertId, content, post_id, user_id: req.user.id }
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
