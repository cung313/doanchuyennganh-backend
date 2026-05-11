const bcrypt = require('bcrypt');
const plainPassword = 'admin123'; // Mật khẩu thuần túy

bcrypt.hash(plainPassword, 10, (err, hash) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Mật khẩu đã mã hóa:', hash);
  }
});