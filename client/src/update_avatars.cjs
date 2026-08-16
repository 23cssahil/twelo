const fs = require('fs');
let code = fs.readFileSync('C:/Users/DELL/Documents/telo/client/src/components/Dashboard.jsx', 'utf8');

// Replace {req.username.charAt(0).toUpperCase()} with {req.avatarUrl ? <img src={req.avatarUrl} alt='avatar' /> : req.username.charAt(0).toUpperCase()}
code = code.replace(/\{([a-zA-Z0-9_\.]+)\.username\.charAt\(0\)\.toUpperCase\(\)\}/g, (match, p1) => {
  return `{${p1}.avatarUrl ? <img src={${p1}.avatarUrl} alt='avatar' /> : ${p1}.username.charAt(0).toUpperCase()}`;
});

// For user.username.charAt(0)
code = code.replace(/\{user\.username\.charAt\(0\)\.toUpperCase\(\)\}/g, 
  "{user.avatarUrl ? <img src={user.avatarUrl} alt='avatar' /> : user.username.charAt(0).toUpperCase()}");

// For anonymous chat avatar
code = code.replace(
  /<div className="user-avatar-small"([^>]*)>\?<\/div>/,
  "{anonymousPartnerAvatar ? <div className='user-avatar-small'$1><img src={anonymousPartnerAvatar} alt='avatar' /></div> : <div className='user-avatar-small'$1>?</div>}"
);

// For pulse avatar callerName
code = code.replace(/\{callerName\.charAt\(0\)\.toUpperCase\(\)\}/g,
  "{callerName.charAt(0).toUpperCase()}" // We don't have caller avatarUrl easily available unless we send it via socket
);

fs.writeFileSync('C:/Users/DELL/Documents/telo/client/src/components/Dashboard.jsx', code);
