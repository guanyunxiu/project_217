require('dotenv').config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'forum_jwt_secret_key_2024',
  PORT: process.env.PORT || 3110
};
