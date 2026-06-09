const pool = require('../config/db');

exports.parseMentions = function(text) {
  const regex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }
  return mentions;
};

exports.createNotifications = async function(usernames, fromUserId, type, content, relatedId) {
  if (!usernames.length) return;

  const placeholders = usernames.map(() => '?').join(',');
  const [users] = await pool.query(
    `SELECT id, username FROM users WHERE username IN (${placeholders})`,
    usernames
  );

  const fromUserBlocked = users.find(u => u.id === fromUserId);
  const filteredUsers = users.filter(u => u.id !== fromUserId);

  if (filteredUsers.length === 0) return;

  const values = filteredUsers.map(u => [u.id, fromUserId, type, content, relatedId]);
  const rowPlaceholders = values.map(() => '(?, ?, ?, ?, ?)').join(',');

  await pool.query(
    `INSERT INTO notifications (user_id, from_user_id, type, content, related_id) VALUES ${rowPlaceholders}`,
    values.flat()
  );
};
