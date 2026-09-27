'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const rooms = new Map();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(PUBLIC_DIR, requested);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (error, contents) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(contents);
  });
});

const wss = new WebSocket.Server({ server, path: '/signal' });
const send = (socket, payload) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload)); };
const broadcast = (room, payload, except) => {
  for (const member of room.members.values()) if (member !== except) send(member, payload);
};
const newCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from(crypto.randomBytes(6), byte => alphabet[byte % alphabet.length]).join(''); } while (rooms.has(code));
  return code;
};
const cleanName = value => String(value || 'Guest').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24) || 'Guest';

wss.on('connection', socket => {
  socket.id = crypto.randomUUID();
  socket.on('message', raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { send(socket, { type: 'error', message: 'That request could not be read.' }); return; }

    if (message.type === 'create') {
      if (socket.room) return send(socket, { type: 'error', message: 'You are already in a room.' });
      const maxUsers = Math.max(2, Math.min(8, Math.floor(Number(message.maxUsers) || 4)));
      const code = newCode();
      const room = { code, maxUsers, hostId: socket.id, members: new Map(), chat: [] };
      rooms.set(code, room);
      socket.room = room;
      socket.name = cleanName(message.name);
      socket.isHost = true;
      room.members.set(socket.id, socket);
      send(socket, { type: 'created', code, id: socket.id, maxUsers, members: [{ id: socket.id, name: socket.name, isHost: true }] });
      return;
    }

    if (message.type === 'join') {
      if (socket.room) return send(socket, { type: 'error', message: 'You are already in a room.' });
      const code = String(message.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const room = rooms.get(code);
      if (!room) return send(socket, { type: 'error', message: 'Room not found. Check the code and try again.' });
      if (room.members.size >= room.maxUsers) return send(socket, { type: 'error', message: 'This room is full.' });
      socket.room = room;
      socket.name = cleanName(message.name);
      socket.isHost = false;
      const existing = Array.from(room.members.values(), member => ({ id: member.id, name: member.name, isHost: member.isHost }));
      room.members.set(socket.id, socket);
      send(socket, { type: 'joined', code, id: socket.id, maxUsers: room.maxUsers, members: [...existing, { id: socket.id, name: socket.name, isHost: false }], chat: room.chat });
      broadcast(room, { type: 'peer-joined', member: { id: socket.id, name: socket.name, isHost: false }, count: room.members.size }, socket);
      return;
    }

    const room = socket.room;
    if (!room) return send(socket, { type: 'error', message: 'Create or join a room first.' });
    if (message.type === 'signal') {
      const target = room.members.get(String(message.to || ''));
      if (!target || !message.payload || !['offer', 'answer', 'candidate'].includes(message.payload.type)) return;
      send(target, { type: 'signal', from: socket.id, payload: message.payload });
    } else if (message.type === 'chat') {
      const text = String(message.text || '').trim().slice(0, 1000);
      if (!text) return;
      const entry = { id: socket.id, name: socket.name, text, time: Date.now() };
      room.chat.push(entry);
      if (room.chat.length > 100) room.chat.shift();
      broadcast(room, { type: 'chat', message: entry });
    }
  });

  socket.on('close', () => {
    const room = socket.room;
    if (!room) return;
    if (socket.isHost) {
      broadcast(room, { type: 'room-closed' }, socket);
      for (const member of room.members.values()) { member.room = null; member.close(1000, 'Room closed'); }
      rooms.delete(room.code);
      return;
    }
    room.members.delete(socket.id);
    broadcast(room, { type: 'peer-left', id: socket.id, count: room.members.size });
  });
});

server.listen(PORT, () => console.log(`Roomcast is ready at http://localhost:${PORT}`));
