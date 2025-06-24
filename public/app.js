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
const nicknameInput = document.getElementById('nicknameInput');

const BACKEND_URL = 'https://0461665d-176b-4f0e-ad76-c54df5107797-00-2y23ah23ldcie.janeway.replit.dev';
const socket = io(BACKEND_URL);

// Render a single confession
function renderConfession(confession) {
  const div = document.createElement('div');
  div.className = 'confession';
  div.dataset.id = confession._id;

  // Show nickname or userId, and highlight if it's the current user
  let displayName = confession.nickname ? confession.nickname : confession.userId;
  if (confession.userId === userId) {
    displayName += ' (You)';
  }
  div.innerHTML = `
    <div class="confession-header">
      <span class="confession-nickname">${escapeHTML(displayName)}</span>
      <span class="meta">${new Date(confession.timestamp).toLocaleString()}</span>
    </div>
    <div class="text">${escapeHTML(confession.text)}</div>
    <div class="actions"></div>
    <div class="comments"></div>
  `;

  // Actions
  const actionsDiv = div.querySelector('.actions');

  // Upvote button
  const upvoteBtn = document.createElement('button');
  upvoteBtn.className = 'upvote';
  upvoteBtn.textContent = '👍';
  upvoteBtn.onclick = async () => {
    await fetch(`${BACKEND_URL}/api/confessions/${confession._id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: 1, userId })
    });
  };
  actionsDiv.appendChild(upvoteBtn);

  // Vote count
  const votesSpan = document.createElement('span');
  votesSpan.className = 'votes';
  votesSpan.textContent = confession.votes;
  actionsDiv.appendChild(votesSpan);

  // Downvote button
  const downvoteBtn = document.createElement('button');
  downvoteBtn.className = 'downvote';
  downvoteBtn.textContent = '👎';
  downvoteBtn.onclick = async () => {
    await fetch(`${BACKEND_URL}/api/confessions/${confession._id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: -1, userId })
    });
  };
  actionsDiv.appendChild(downvoteBtn);

  // Comment count (disabled for now)
  const commentCountBtn = document.createElement('button');
  commentCountBtn.disabled = true;
  commentCountBtn.textContent = `💬 ${confession.comments.length}`;
  actionsDiv.appendChild(commentCountBtn);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️ Delete';
  deleteBtn.onclick = async () => {
    const adminSecret = prompt('Enter admin password:');
    if (!adminSecret) return;
    await fetch(`${BACKEND_URL}/api/confessions/${confession._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSecret })
    });
  };
  actionsDiv.appendChild(deleteBtn);

  // Emojis
  const emojis = ['😂', '😮', '😢', '❤️'];
  emojis.forEach(emoji => {
    const count = confession.reactions && confession.reactions[emoji] ? confession.reactions[emoji] : 0;
    const emojiBtn = document.createElement('button');
    emojiBtn.className = 'emoji-btn';
    emojiBtn.innerHTML = `${emoji} <span>${count}</span>`;
    emojiBtn.onclick = async () => {
      await fetch(`${BACKEND_URL}/api/confessions/${confession._id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
    };
    actionsDiv.appendChild(emojiBtn);
  });

  // Comments
  const commentsDiv = div.querySelector('.comments');
  commentsDiv.innerHTML = confession.comments.map(
    c => {
      let commentName = c.nickname ? c.nickname : c.userId;
      if (c.userId === userId) commentName += ' (You)';
      return `<div class="comment"><span class="comment-nickname">${escapeHTML(commentName)}</span>: ${escapeHTML(c.text)}</div>`;
    }
  ).join('');

  // Add comment form
  const commentForm = document.createElement('form');
  commentForm.className = 'comment-form';
  commentForm.innerHTML = `
    <input type="text" placeholder="Add a comment..." required>
    <button type="submit">Send</button>
  `;
  commentsDiv.appendChild(commentForm);

  commentForm.onsubmit = async (e) => {
    e.preventDefault();
    const input = commentForm.querySelector('input');
    const text = input.value.trim();
    const nickname = nicknameInput.value.trim();
    if (!text) return;
    await fetch(`${BACKEND_URL}/api/confessions/${confession._id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userId, nickname })
    });
    input.value = '';
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
  const res = await fetch(`${BACKEND_URL}/api/confessions`);
  const data = await res.json();
  renderWall(data);
}

// Handle new confession submission
confessionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = confessionInput.value.trim();
  const nickname = nicknameInput.value.trim();
  if (!text) return;
  const res = await fetch(`${BACKEND_URL}/api/confessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, userId, nickname })
  });
  if (res.ok) {
    confessionInput.value = '';
    nicknameInput.value = '';
  }
});

// Listen for real-time new confessions
socket.on('new_confession', (confession) => {
  // Prepend the new confession
  const first = confessionWall.firstChild;
  const div = renderConfession(confession);
  confessionWall.insertBefore(div, first);
});

// Listen for vote updates
socket.on('update_confession', (confession) => {
  // Find and update the confession in the wall
  const confessionDivs = confessionWall.querySelectorAll('.confession');
  confessionDivs.forEach(div => {
    if (div.querySelector('.text').textContent === confession.text) {
      div.querySelector('.votes').textContent = confession.votes;
    }
  });
});

// Remove confession when deleted
socket.on('delete_confession', (id) => {
  const confessionDivs = confessionWall.querySelectorAll('.confession');
  confessionDivs.forEach(div => {
    if (div.dataset.id === id) {
      div.remove();
    }
  });
});

// Update confession when changed (votes, comments, reactions)
socket.on('update_confession', (confession) => {
  const confessionDivs = confessionWall.querySelectorAll('.confession');
  confessionDivs.forEach(div => {
    if (div.dataset.id === confession._id) {
      // Replace the confession div with a new one
      const newDiv = renderConfession(confession);
      confessionWall.replaceChild(newDiv, div);
    }
  });
});

// Initial load
loadConfessions();