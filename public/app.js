(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const homeView = $('#home-view');
  const roomView = $('#room-view');
  const createForm = $('#create-form');
  const joinForm = $('#join-form');
  const homeError = $('#home-error');
  const stage = $('#stage');
  const stageEmpty = $('#stage-empty');
  const videoGrid = $('#video-grid');
  const toast = $('#toast');
  const members = new Map();
  const peers = new Map();
  let socket;
  let roomInfo;
  let screenStream;
  let tilePage = 0;
  let toastTimer;

  function connect() {
    if (socket && socket.readyState === WebSocket.OPEN) return Promise.resolve(socket);
    if (socket && socket.readyState === WebSocket.CONNECTING) {
      return new Promise((resolve, reject) => {
        socket.addEventListener('open', () => resolve(socket), { once: true });
        socket.addEventListener('error', () => reject(new Error('Could not connect to Roomcast. Please try again.')), { once: true });
      });
    }
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/signal`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('The room server is taking too long to respond.')), 7000);
      socket.addEventListener('open', () => { clearTimeout(timeout); resolve(socket); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Could not connect to Roomcast. Please try again.')); }, { once: true });
    });
  }

  function send(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }

  function showError(message) { homeError.textContent = message || ''; }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
  }

  function switchTab(join) {
    $('#create-tab').classList.toggle('active', !join);
    $('#join-tab').classList.toggle('active', join);
    $('#create-tab').setAttribute('aria-selected', String(!join));
    $('#join-tab').setAttribute('aria-selected', String(join));
    createForm.classList.toggle('hidden', join);
    joinForm.classList.toggle('hidden', !join);
    showError('');
  }

  function enterRoom(info) {
    roomInfo = info;
    tilePage = 0;
    members.clear();
    for (const member of info.members || []) members.set(member.id, member);
    homeView.classList.add('hidden');
    roomView.classList.remove('hidden');
    $('#room-code-display').textContent = info.code;
    $('#room-heading').textContent = info.isHost ? 'Your room' : 'Room with ' + (Array.from(members.values()).find(member => member.isHost)?.name || 'your host');
    $('#share-screen').classList.remove('sharing');
    $('#share-screen span').textContent = 'Share screen';
    $('#share-screen').classList.remove('hidden');
    $('#stage-kicker').textContent = 'SHARE A SCREEN OR CHAT';
    $('#stage-title').textContent = 'Your screen goes here.';
    $('#stage-description').textContent = 'Anyone in the room can share. Each screen appears in its own tile for everyone to follow along.';
    $('#stage-status').textContent = 'ROOM IS OPEN';
    $('#stage-hint').textContent = 'Waiting for a screen to be shared';
    stageEmpty.classList.remove('hidden');
    videoGrid.classList.remove('visible');
    const chatBox = $('#chat-messages');
    chatBox.replaceChildren();
    for (const message of info.chat || []) appendChatMessage(message);
    if (!chatBox.childElementCount) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'Say hello to everyone in the room 👋';
      chatBox.append(empty);
    }
    renderPeople();
    updateStageState();
    if (!info.isHost) {
      for (const member of info.members || []) {
        if (member.id !== info.id) {
          getPeer(member.id);
          createOffer(member.id);
        }
      }
    }
  }

  function renderPeople() {
    const list = $('#people-list');
    list.replaceChildren();
    for (const member of members.values()) {
      const row = document.createElement('div');
      row.className = 'person';
      const avatar = document.createElement('span');
      avatar.className = 'avatar';
      avatar.textContent = member.name.trim().slice(0, 1).toUpperCase();
      const details = document.createElement('div');
      details.className = 'person-info';
      const name = document.createElement('div');
      name.className = 'person-name';
      name.textContent = member.name;
      if (member.isHost) {
        const tag = document.createElement('span');
        tag.className = 'host-tag';
        tag.textContent = 'HOST';
        name.append(tag);
      }
      const role = document.createElement('div');
      role.className = 'person-role';
      role.textContent = member.id === roomInfo.id ? 'You' : (member.isHost ? 'Room host' : 'Guest');
      details.append(name, role);
      const state = document.createElement('span');
      state.className = 'person-state';
      state.textContent = '● Here';
      row.append(avatar, details, state);
      list.append(row);
    }
    $('#people-count').textContent = `${members.size} of ${roomInfo.maxUsers} ${roomInfo.maxUsers === 1 ? 'person' : 'people'}`;
  }

  function appendChatMessage(message) {
    const chatBox = $('#chat-messages');
    chatBox.querySelector('.chat-empty')?.remove();
    const item = document.createElement('article');
    item.className = `chat-message${message.id === roomInfo.id ? ' own' : ''}`;
    const meta = document.createElement('div');
    meta.className = 'chat-meta';
    const time = new Date(message.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    meta.textContent = `${message.id === roomInfo.id ? 'You' : message.name} · ${time}`;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = message.text;
    item.append(meta, bubble);
    chatBox.append(item);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function updateStageState() {
    const tiles = [...videoGrid.querySelectorAll('.video-tile')];
    const pageCount = Math.ceil(tiles.length / 3);
    tilePage = Math.min(tilePage, Math.max(0, pageCount - 1));
    tiles.forEach((tile, index) => tile.classList.toggle('is-paged-out', Math.floor(index / 3) !== tilePage));
    videoGrid.dataset.shareCount = String(Math.min(3, Math.max(0, tiles.length - tilePage * 3)));
    $('#tile-nav').classList.toggle('hidden', pageCount <= 1);
    $('#tile-prev').disabled = tilePage === 0;
    $('#tile-next').disabled = tilePage >= pageCount - 1;
    $('#tile-page-label').textContent = `${tilePage + 1} / ${Math.max(1, pageCount)}`;
    if (tiles.length) {
      stageEmpty.classList.add('hidden');
      videoGrid.classList.add('visible');
      $('#stage-status').textContent = `${tiles.length} SCREEN${tiles.length === 1 ? '' : 'S'} LIVE`;
      $('#stage-hint').textContent = tiles.length === 1 ? `Shared by ${tiles[0].dataset.sharer || 'a participant'}` : `${tiles.length} participants are sharing`;
    } else {
      videoGrid.classList.remove('visible');
      stageEmpty.classList.remove('hidden');
      $('#stage-status').textContent = 'ROOM IS OPEN';
      $('#stage-hint').textContent = 'Waiting for a screen to be shared';
    }
  }

  function getPeer(remoteId) {
    if (peers.has(remoteId)) return peers.get(remoteId);
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    const state = { pc, polite: roomInfo.id.localeCompare(remoteId) > 0, makingOffer: false, ignoreOffer: false, video: null, stream: null };
    peers.set(remoteId, state);
    if (screenStream) {
      for (const track of screenStream.getTracks()) pc.addTrack(track, screenStream);
    }
    pc.onicecandidate = event => {
      if (event.candidate) send({ type: 'signal', to: remoteId, payload: { type: 'candidate', candidate: event.candidate } });
    };
    pc.onnegotiationneeded = async () => {
      try {
        state.makingOffer = true;
        await pc.setLocalDescription();
        send({ type: 'signal', to: remoteId, payload: pc.localDescription });
      } catch (error) { console.warn('Could not negotiate this connection:', error); }
      finally { state.makingOffer = false; }
    };
    pc.ontrack = event => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;
      state.stream = remoteStream;
      if (event.track.kind === 'video') {
        event.track.onended = () => {
          state.video?.closest('.video-tile')?.remove();
          state.video = null;
          updateStageState();
        };
      }
      if (!state.video) {
        const member = members.get(remoteId);
        state.video = document.createElement('video');
        state.video.autoplay = true;
        state.video.playsInline = true;
        const tile = document.createElement('div');
        tile.className = 'video-tile';
        tile.dataset.sharer = member?.name || 'Host';
        const label = document.createElement('div');
        label.className = 'video-label';
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        label.append(dot, document.createTextNode(`${member?.name || 'Host'}’s screen`));
        tile.append(state.video, label);
        state.video.dataset.peer = remoteId;
        videoGrid.append(tile);
        updateStageState();
      }
      state.video.srcObject = remoteStream;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') pc.restartIce();
    };
    return state;
  }

  async function createOffer(remoteId) {
    const state = getPeer(remoteId);
    try {
      state.makingOffer = true;
      await state.pc.setLocalDescription();
      send({ type: 'signal', to: remoteId, payload: state.pc.localDescription });
    } catch (error) { console.warn('Could not start the video connection:', error); }
    finally { state.makingOffer = false; }
  }

  async function onSignal(message) {
    const state = getPeer(message.from);
    const pc = state.pc;
    const payload = message.payload;
    if (payload.type === 'candidate') {
      try { await pc.addIceCandidate(payload.candidate); } catch (error) { if (!state.ignoreOffer) console.warn('Could not add a connection candidate:', error); }
      return;
    }
    const offerCollision = payload.type === 'offer' && (state.makingOffer || pc.signalingState !== 'stable');
    state.ignoreOffer = !state.polite && offerCollision;
    if (state.ignoreOffer) return;
    try {
      await pc.setRemoteDescription(payload);
      if (payload.type === 'offer') {
        await pc.setLocalDescription();
        send({ type: 'signal', to: message.from, payload: pc.localDescription });
      }
    } catch (error) { console.warn('Could not process the video connection:', error); }
  }

  function removePeer(id) {
    const state = peers.get(id);
    if (state) {
      state.pc.close();
      const tile = state.video?.closest('.video-tile');
      if (tile) tile.remove();
      peers.delete(id);
    }
    members.delete(id);
    if (roomInfo) renderPeople();
    if (roomInfo) updateStageState();
  }

  function onMessage(event) {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'created' || message.type === 'joined') {
      enterRoom({ ...message, isHost: message.type === 'created' });
    } else if (message.type === 'peer-joined') {
      members.set(message.member.id, message.member);
      renderPeople();
      getPeer(message.member.id);
      notify(`${message.member.name} joined the room`);
    } else if (message.type === 'peer-left') {
      const name = members.get(message.id)?.name || 'Someone';
      removePeer(message.id);
      notify(`${name} left the room`);
    } else if (message.type === 'signal') {
      onSignal(message);
    } else if (message.type === 'chat') {
      appendChatMessage(message.message);
    } else if (message.type === 'room-closed') {
      notify('The host closed this room');
      leaveRoom(false);
    } else if (message.type === 'error') {
      showError(message.message);
      $('#create-form button[type="submit"]').disabled = false;
      $('#join-form button[type="submit"]').disabled = false;
    }
  }

  async function submitRoom(type, values) {
    showError('');
    const submit = (type === 'create' ? createForm : joinForm).querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await connect();
      socket.removeEventListener('message', onMessage);
      socket.addEventListener('message', onMessage);
      send(values);
    } catch (error) {
      showError(error.message);
      submit.disabled = false;
    }
  }

  async function toggleShare() {
    const button = $('#share-screen');
    if (screenStream) {
      stopSharing();
      return;
    }
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      const track = screenStream.getVideoTracks()[0];
      if (track) track.addEventListener('ended', stopSharing, { once: true });
      for (const [id, state] of peers) {
        for (const mediaTrack of screenStream.getTracks()) state.pc.addTrack(mediaTrack, screenStream);
      }
      const localVideo = document.createElement('video');
      localVideo.autoplay = true;
      localVideo.muted = true;
      localVideo.playsInline = true;
      localVideo.srcObject = screenStream;
      const tile = document.createElement('div');
      tile.className = 'video-tile local-tile';
      tile.dataset.sharer = members.get(roomInfo.id)?.name || 'You';
      const label = document.createElement('div');
      label.className = 'video-label';
      label.innerHTML = '<span class="status-dot"></span>Your screen';
      tile.append(localVideo, label);
      videoGrid.prepend(tile);
      updateStageState();
      button.classList.add('sharing');
      button.querySelector('span').textContent = 'Stop sharing';
    } catch (error) {
      if (error.name !== 'NotAllowedError') notify('Screen sharing could not start. Check your browser permissions.');
    }
  }

  function stopSharing() {
    if (!screenStream) return;
    const stream = screenStream;
    screenStream = null;
    for (const state of peers.values()) {
      for (const sender of state.pc.getSenders()) {
        if (stream.getTracks().includes(sender.track)) state.pc.removeTrack(sender);
      }
    }
    stream.getTracks().forEach(track => track.stop());
    videoGrid.querySelector('.local-tile')?.remove();
    $('#share-screen').classList.remove('sharing');
    $('#share-screen span').textContent = 'Share screen';
    if (roomInfo) updateStageState();
  }

  function leaveRoom(closeSocket = true) {
    stopSharing();
    for (const [id] of peers) removePeer(id);
    if (socket) socket.removeEventListener('message', onMessage);
    roomInfo = null;
    members.clear();
    roomView.classList.add('hidden');
    homeView.classList.remove('hidden');
    createForm.querySelector('button[type="submit"]').disabled = false;
    joinForm.querySelector('button[type="submit"]').disabled = false;
    showError('');
    if (closeSocket && socket) socket.close();
    if (closeSocket) socket = null;
  }

  async function copyCode() {
    if (!roomInfo) return;
    try { await navigator.clipboard.writeText(roomInfo.code); notify('Room code copied'); }
    catch { notify(`Room code: ${roomInfo.code}`); }
  }

  $('#create-tab').addEventListener('click', () => switchTab(false));
  $('#join-tab').addEventListener('click', () => switchTab(true));
  createForm.addEventListener('submit', event => {
    event.preventDefault();
    submitRoom('create', { type: 'create', name: $('#host-name').value, maxUsers: $('#room-size').value });
  });
  joinForm.addEventListener('submit', event => {
    event.preventDefault();
    submitRoom('join', { type: 'join', name: $('#guest-name').value, code: $('#room-code').value });
  });
  $('#room-code').addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
  $('#share-screen').addEventListener('click', toggleShare);
  $('#leave-room').addEventListener('click', () => leaveRoom(true));
  $('#copy-code').addEventListener('click', copyCode);
  $('#invite-copy').addEventListener('click', copyCode);
  $('#tile-prev').addEventListener('click', () => { if (tilePage > 0) { tilePage--; updateStageState(); } });
  $('#tile-next').addEventListener('click', () => {
    const pageCount = Math.ceil(videoGrid.querySelectorAll('.video-tile').length / 3);
    if (tilePage < pageCount - 1) { tilePage++; updateStageState(); }
  });
  $('#chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text || !roomInfo) return;
    send({ type: 'chat', text });
    input.value = '';
    input.focus();
  });
})();
