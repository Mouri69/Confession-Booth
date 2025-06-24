// Generate or retrieve anonymous userId
function getUserId() {
  let userId = localStorage.getItem('anonUserId');
  if (!userId) {
    userId = 'anon-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonUserId', userId);
  }
  return userId;
}

const userId = getUserId();
const confessionForm = document.getElementById('confessionForm');
const confessionInput = document.getElementById('confessionInput');
const confessionWall = document.getElementById('confessionWall');

// Socket.IO setup
const socket = io();

// Render a single confession
function renderConfession(confession) {
  const div = document.createElement('div');
  div.className = 'confession';
  div.innerHTML = `
    <div class="text">${escapeHTML(confession.text)}</div>
    <div class="meta">${new Date(confession.timestamp).toLocaleString()}</div>
    <div class="actions">
      <button class="upvote">👍</button>
      <span class="votes">${confession.votes}</span>
      <button class="downvote">👎</button>
      <button disabled title="Coming soon">💬 ${confession.comments.length}</button>
    </div>
    <div class="comments"></div>
  `;

  // Voting logic
  div.querySelector('.upvote').onclick = async () => {
    await fetch(`/api/confessions/${confession._id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: 1 })
    });
  };
  div.querySelector('.downvote').onclick = async () => {
    await fetch(`/api/confessions/${confession._id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: -1 })
    });
  };

  return div;
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[tag]));
}

// Render all confessions
function renderWall(confessions) {
  confessionWall.innerHTML = '';
  confessions.forEach(confession => {
    confessionWall.appendChild(renderConfession(confession));
  });
}

// Fetch and display confessions
async function loadConfessions() {
  const res = await fetch('/api/confessions');
  const data = await res.json();
  renderWall(data);
}

// Handle new confession submission
confessionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = confessionInput.value.trim();
  if (!text) return;
  const res = await fetch('/api/confessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, userId })
  });
  if (res.ok) {
    confessionInput.value = '';
  }
});

// Listen for real-time new confessions
socket.on('new_confession', (confession) => {
  // Prepend the new confession
  const first = confessionWall.firstChild;
  const div = renderConfession(confession);
  confessionWall.insertBefore(div, first);
});

// Initial load
loadConfessions(); 