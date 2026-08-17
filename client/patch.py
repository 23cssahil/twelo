import re

with open('src/components/Dashboard.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "const [callerAvatar, setCallerAvatar] = useState('');",
    "const [callerAvatar, setCallerAvatar] = useState('');\n  const [callerSocketId, setCallerSocketId] = useState(null);"
)
code = code.replace(
    "socket.on('incoming_call', ({ from, fromUsername, fromAvatar, signal, isVideo }) => {",
    "socket.on('incoming_call', ({ from, fromSocketId, fromUsername, fromAvatar, signal, isVideo }) => {"
)
code = code.replace(
    "setCallerId(from);",
    "setCallerId(from);\n        setCallerSocketId(fromSocketId);"
)
code = code.replace(
    "socket.emit('answer_call', { to: callerId, signal: data });",
    "socket.emit('answer_call', { to: callerId, toSocketId: callerSocketId, signal: data });"
)
code = code.replace(
    "socket.emit('end_call', { to: callerId });",
    "socket.emit('end_call', { to: callerId, toSocketId: callerSocketId });"
)
code = code.replace(
    "setCallerSignal(null);",
    "setCallerSignal(null);\n    setCallerSocketId(null);"
)

with open('src/components/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
