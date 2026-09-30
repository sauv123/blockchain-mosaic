const https = require('https');
https.get('https://tinyurl.com/api-create.php?url=' + encodeURIComponent('https://4e4bb9685b19c31b-158-148-186-80.serveousercontent.com/quest.html'), (resp) => {
  let data = '';
  resp.on('data', (chunk) => data += chunk);
  resp.on('end', () => console.log(data));
});
