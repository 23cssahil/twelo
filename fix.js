const fs = require('fs');
let code = fs.readFileSync('client/src/components/Dashboard.jsx', 'utf8');

const regex1 = /<div key=\{msg\._id\} className=\{\msg-wrapper \$\{msg\.sender === user\.id \? 'sent' : 'received'\}\\} [\s\S]*?<div \s*id=\{\msg-bubble-\$\{msg\._id\}\\} \s*className="msg-bubble"\s*onClick=\{\(\) => setSelectedMsgId\(prev => prev === msg\._id \? null : msg\._id\)\}\s*>/m;
const match1 = code.match(regex1);

if (match1) {
    const replacement1 = match1[0].replace(
        /<div \s*id=\{\msg-bubble-\$\{msg\._id\}\\} /m,
        "<div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === user.id ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>\n                          <div \n                            id={msg-bubble-} "
    );
    code = code.replace(regex1, replacement1);
}

const regex2 = /<\/div>\s*\{msg\.sender === user\.id && index === messages\.length - 1 && \(\s*<div style=\{\{ fontSize: '0\.7rem', color: '#a8a8a8', marginTop: '4px', textAlign: 'right', paddingRight: '12px' \}\}>\s*\{msg\.isViewed \? 'Seen just now' : 'Sent'\}\s*<\/div>\s*\)\}\s*\{swipeMsgId === msg\._id && \(/m;
const match2 = code.match(regex2);

if (match2) {
    let rep2 = match2[0].replace("</div>", "</div></div>");
    // wait we need to put the Seen div INSIDE the new wrapper, so the wrapper closes AFTER the Seen div.
    // The original structure: </div> {msg.sender...} {swipeMsgId...}
    // We want: </div> {msg.sender...} </div> {swipeMsgId...}
    
    code = code.replace(regex2, "                          </div>\n" +
"                          {msg.sender === user.id && index === messages.length - 1 && (\n" +
"                            <div style={{ fontSize: '0.7rem', color: '#a8a8a8', marginTop: '4px', textAlign: 'right', paddingRight: '12px' }}>\n" +
"                              {msg.isViewed ? 'Seen just now' : 'Sent'}\n" +
"                            </div>\n" +
"                          )}\n" +
"                        </div>\n" +
"                        {swipeMsgId === msg._id && (");
}

fs.writeFileSync('client/src/components/Dashboard.jsx', code);
