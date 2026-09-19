const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

let patchCount = 0;

// ======================================================
// PATCH 1: Encrypt on send_message socket save
// ======================================================
const p1old = `      const message = new Message({\r
        sender: senderId,\r
        receiver: receiverId,\r
        message: messageText,\r
        replyTo: replyTo,\r
        messageType: messageType,\r
        fileUrl: fileUrl,\r
        isViewOnce: isViewOnce\r
      });\r
      await message.save();`;

const p1new = `      // Encrypt message text before saving to DB for privacy\r
      const encryptedMsgText = (messageType === 'text' && messageText) ? encryptMsg(messageText) : messageText;\r
      let encryptedReplyTo = replyTo;\r
      if (replyTo && replyTo.messageText) {\r
        encryptedReplyTo = Object.assign({}, replyTo, { messageText: encryptMsg(replyTo.messageText) });\r
      }\r
      const message = new Message({\r
        sender: senderId,\r
        receiver: receiverId,\r
        message: encryptedMsgText,\r
        replyTo: encryptedReplyTo,\r
        messageType: messageType,\r
        fileUrl: fileUrl,\r
        isViewOnce: isViewOnce\r
      });\r
      await message.save();`;

if (content.includes(p1old)) { content = content.replace(p1old, p1new); patchCount++; console.log('[OK] Patch 1 applied'); }
else { console.log('[FAIL] Patch 1 not found'); }

// ======================================================
// PATCH 2: Decrypt on GET /api/messages fetch
// ======================================================
const p2old = `    res.json({\r
      messages: messages.reverse(), // Reverse to have oldest first in UI\r
      hasMore,\r
      nextCursor\r
    });`;

const p2new = `    // Decrypt messages before sending to client\r
    const decryptedMessages = messages.reverse().map(m => {\r
      const obj = m.toObject ? m.toObject() : Object.assign({}, m);\r
      obj.message = decryptMsg(obj.message);\r
      if (obj.replyTo && obj.replyTo.messageText) {\r
        obj.replyTo = Object.assign({}, obj.replyTo, { messageText: decryptMsg(obj.replyTo.messageText) });\r
      }\r
      return obj;\r
    });\r
    res.json({\r
      messages: decryptedMessages,\r
      hasMore,\r
      nextCursor\r
    });`;

if (content.includes(p2old)) { content = content.replace(p2old, p2new); patchCount++; console.log('[OK] Patch 2 applied'); }
else { console.log('[FAIL] Patch 2 not found'); }

// ======================================================
// PATCH 3: Report route — auto-fetch last 20 messages
// ======================================================
const p3old = `    const { reportedUserId, reportedUsername, reason, chatContext } = req.body;\r
    const reporterId = req.user.userId;\r
    const reporter = await User.findById(reporterId);\r
\r
    const newReport = new Report({\r
      reporterId,\r
      reporterUsername: reporter.username,\r
      reportedUserId,\r
      reportedUsername,\r
      reason,\r
      chatContext\r
    });`;

const p3new = `    const { reportedUserId, reportedUsername, reason } = req.body;\r
    const reporterId = req.user.userId;\r
    const reporter = await User.findById(reporterId);\r
\r
    // Auto-fetch last 20 messages between reporter and reported user from DB\r
    let chatContext = '[]';\r
    try {\r
      const last20 = await Message.find({\r
        $or: [\r
          { sender: reporterId, receiver: reportedUserId },\r
          { sender: reportedUserId, receiver: reporterId }\r
        ],\r
        isDeletedForEveryone: { $ne: true }\r
      })\r
        .sort({ createdAt: -1 })\r
        .limit(20)\r
        .lean();\r
\r
      const formatted = last20.reverse().map(m => ({\r
        from: m.sender.toString() === reporterId.toString() ? reporter.username : reportedUsername,\r
        message: decryptMsg(m.message),\r
        type: m.messageType,\r
        fileUrl: m.fileUrl || null,\r
        time: m.createdAt\r
      }));\r
      chatContext = JSON.stringify(formatted);\r
    } catch (fetchErr) {\r
      console.error('[Report] Could not fetch chat context:', fetchErr.message);\r
    }\r
\r
    const newReport = new Report({\r
      reporterId,\r
      reporterUsername: reporter.username,\r
      reportedUserId,\r
      reportedUsername,\r
      reason,\r
      chatContext\r
    });`;

if (content.includes(p3old)) { content = content.replace(p3old, p3new); patchCount++; console.log('[OK] Patch 3 applied'); }
else { console.log('[FAIL] Patch 3 not found'); }

fs.writeFileSync(filePath, content);
console.log(`\nDone! ${patchCount}/3 patches applied.`);
if (patchCount < 3) process.exit(1);
