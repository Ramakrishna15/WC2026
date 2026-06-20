// Navigation
const pages = document.querySelectorAll('.page');
const navBtns = document.querySelectorAll('.nav-btn');

function showPage(name) {
  pages.forEach(p => p.classList.remove('active'));
  navBtns.forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');
}

navBtns.forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));

// Hero CTA
document.querySelector('.cta-btn').addEventListener('click', () => showPage('schedule'));

// ---- TEAMS ----
function flagImg(t) {
  return `<img class="t-flag-img" src="https://flagcdn.com/w80/${t.cc}.png" alt="${t.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" /><span class="t-flag-fallback" style="display:none">${t.flag}</span>`;
}

function renderTeams(list) {
  const container = document.getElementById('teams-grid');

  // if searching/filtering, show flat grid with group label on each card
  const isFiltered = list.length !== TEAMS.length;
  if (isFiltered) {
    container.className = 'teams-grid';
    container.innerHTML = list.map(t => `
      <div class="team-card">
        <div class="t-flag-wrap">${flagImg(t)}</div>
        <div class="t-name">${t.name}</div>
        <div class="t-conf">${t.confederation}</div>
        <div class="t-group">Group ${t.group}</div>
      </div>`).join('');
    return;
  }

  // group by group letter
  const groups = {};
  list.forEach(t => {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  });

  container.className = 'teams-grouped';
  container.innerHTML = Object.keys(groups).sort().map(g => `
    <div class="team-group-section">
      <div class="team-group-label">Group ${g}</div>
      <div class="team-group-cards">
        ${groups[g].sort((a,b) => (a.fifaRank||99) - (b.fifaRank||99)).map(t => `
          <div class="team-card">
            <div class="t-flag-wrap">${flagImg(t)}</div>
            <div class="t-name">${t.name}</div>
            <div class="t-conf">${t.confederation}</div>
            <div class="t-fifa-rank">FIFA #${t.fifaRank ?? '—'}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

renderTeams(TEAMS);

document.getElementById('team-search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderTeams(TEAMS.filter(t => t.name.toLowerCase().includes(q) || t.confederation.toLowerCase().includes(q)));
});

// ---- PLAYERS ----
const teamFilter = document.getElementById('team-filter');
const uniqueTeams = [...new Set(PLAYERS.map(p => p.team))].sort();
uniqueTeams.forEach(t => {
  const opt = document.createElement('option');
  opt.value = t; opt.textContent = t;
  teamFilter.appendChild(opt);
});

// Cache so we don't re-fetch on every filter
const photoCache = {};

async function loadCardPhoto(playerId, name) {
  if (photoCache[playerId]) {
    applyCardPhoto(playerId, photoCache[playerId]);
    return;
  }
  const src = await fetchPlayerPhoto(name);
  if (src) {
    photoCache[playerId] = src;
    applyCardPhoto(playerId, src);
  }
}

function applyCardPhoto(playerId, src) {
  const card = document.querySelector(`.player-card[data-id="${playerId}"]`);
  if (!card) return;
  const img  = card.querySelector('.p-card-img');
  const emoji = card.querySelector('.p-emoji');
  if (!img) return;
  img.src = src;
  img.onload = () => { emoji.style.display = 'none'; img.style.opacity = '1'; };
}

function renderPlayers(list) {
  const grid = document.getElementById('players-grid');
  if (!list.length) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;padding:2rem">No players found.</p>';
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="player-card" data-id="${p.id}">
      <div class="p-photo-wrap">
        <span class="p-emoji">${p.image}</span>
        <img class="p-card-img" alt="${p.name}" style="opacity:0" />
        <div class="p-photo-overlay">
          <span class="p-pos pos-${p.position}">${p.position}</span>
          <span class="p-number-badge">#${p.number}</span>
        </div>
      </div>
      <div class="p-body">
        <div class="p-name">${p.name}</div>
        <div class="p-team">${p.teamFlag} ${p.team}</div>
        <div class="p-stats">
          <div class="p-stat"><span class="sv">${p.caps}</span><span class="sk">Caps</span></div>
          <div class="p-stat"><span class="sv">${p.goals}</span><span class="sk">Goals</span></div>
          <div class="p-stat"><span class="sv">${p.age}</span><span class="sk">Age</span></div>
        </div>
        <div class="rating-bar">
          <div class="rating-fill" style="width:${p.rating}%"></div>
        </div>
        <div class="p-click-hint">Click for full profile →</div>
      </div>
    </div>`).join('');

  // Load photos in background
  list.forEach(p => loadCardPhoto(p.id, p.name));

  grid.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', () => {
      const player = PLAYERS.find(p => p.id === +card.dataset.id);
      if (player) openModal(player);
    });
  });
}

// ---- MODAL ----
const modal = document.getElementById('player-modal');
document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function closeModal() { modal.classList.add('hidden'); }

async function fetchPlayerPhoto(name) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&pithumbsize=300&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data?.query?.pages;
    const page = pages[Object.keys(pages)[0]];
    return page?.thumbnail?.source || null;
  } catch { return null; }
}

function openModal(p) {
  // Reset avatar — show emoji while photo loads
  const avatarEmoji = document.getElementById('modal-avatar-emoji');
  const avatarImg  = document.getElementById('modal-avatar-img');
  avatarEmoji.textContent = p.image;
  avatarEmoji.style.display = 'flex';
  avatarImg.src = '';
  avatarImg.style.display = 'none';

  // Fetch photo from Wikipedia asynchronously
  fetchPlayerPhoto(p.name).then(src => {
    if (src) {
      avatarImg.src = src;
      avatarImg.onload = () => {
        avatarEmoji.style.display = 'none';
        avatarImg.style.display = 'block';
      };
    }
  });

  document.getElementById('modal-number').textContent = `#${p.number} · ${p.club}`;
  document.getElementById('modal-name').textContent = p.name;
  document.getElementById('modal-team').textContent = `${p.teamFlag} ${p.team}`;

  const posEl = document.getElementById('modal-pos');
  posEl.textContent = p.position;
  posEl.className = `modal-pos p-pos pos-${p.position}`;

  document.getElementById('modal-bio').textContent = p.bio;

  document.getElementById('ms-caps').textContent = p.caps;
  document.getElementById('ms-goals').textContent = p.goals;
  document.getElementById('ms-assists').textContent = p.assists ?? '—';
  document.getElementById('ms-wc-apps').textContent = p.wc_apps ?? '—';
  document.getElementById('ms-wc-goals').textContent = p.wc_goals ?? '—';
  document.getElementById('ms-rating').textContent = p.rating;

  document.getElementById('md-born').textContent = p.born ?? '—';
  document.getElementById('md-birthplace').textContent = p.birthplace ?? '—';
  document.getElementById('md-club').textContent = p.club;
  document.getElementById('md-height').textContent = p.height ?? '—';
  document.getElementById('md-foot').textContent = p.foot ?? '—';
  document.getElementById('md-age').textContent = p.age;

  document.getElementById('modal-highlights-list').innerHTML =
    (p.highlights || []).map(h => `<span class="mh-item">${h}</span>`).join('');

  const fill = document.getElementById('mrb-fill');
  document.getElementById('mrb-val').textContent = `${p.rating} / 100`;
  fill.style.width = '0%';
  setTimeout(() => { fill.style.width = p.rating + '%'; }, 50);

  modal.classList.remove('hidden');
  modal.scrollTop = 0;
}

function filterPlayers() {
  const q = document.getElementById('player-search').value.toLowerCase();
  const pos = document.getElementById('pos-filter').value;
  const team = teamFilter.value;
  renderPlayers(PLAYERS.filter(p =>
    (!q || p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) || p.club.toLowerCase().includes(q)) &&
    (!pos || p.position === pos) &&
    (!team || p.team === team)
  ));
}

renderPlayers(PLAYERS);
document.getElementById('player-search').addEventListener('input', filterPlayers);
document.getElementById('pos-filter').addEventListener('change', filterPlayers);
teamFilter.addEventListener('change', filterPlayers);

// ---- FANTASY ----
(function() {
  const FORMATIONS = {
    '4-3-3': [['GK'],['DEF','DEF','DEF','DEF'],['MID','MID','MID'],['FWD','FWD','FWD']],
    '4-4-2': [['GK'],['DEF','DEF','DEF','DEF'],['MID','MID','MID','MID'],['FWD','FWD']],
    '3-5-2': [['GK'],['DEF','DEF','DEF'],['MID','MID','MID','MID','MID'],['FWD','FWD']],
    '4-2-4': [['GK'],['DEF','DEF','DEF','DEF'],['MID','MID'],['FWD','FWD','FWD','FWD']],
  };

  let lineup = {};      // slotId → player
  let activeSlot = null;
  let formation = '4-3-3';

  function slotId(row, col) { return `s${row}_${col}`; }

  function renderPitch() {
    const rows = FORMATIONS[formation];
    const pitch = document.getElementById('fantasy-pitch');
    pitch.innerHTML = rows.map((row, ri) => `
      <div class="pitch-row">
        ${row.map((pos, ci) => {
          const id = slotId(ri, ci);
          const p = lineup[id];
          const isActive = activeSlot === id;
          return `
            <div class="pitch-slot" data-slot="${id}" data-pos="${pos}">
              <div class="slot-circle ${p ? 'filled' : ''} ${isActive ? 'active-slot' : ''}">
                ${p
                  ? `<span style="font-size:1.6rem">${p.image}</span>`
                  : `<span style="font-size:0.7rem;color:rgba(255,255,255,0.4)">${pos}</span>`}
              </div>
              <div class="slot-name">${p ? p.name.split(' ').slice(-1)[0] : '—'}</div>
              <div class="slot-pos-badge">${pos}</div>
            </div>`;
        }).join('')}
      </div>`).join('');

    // Load real photos into filled slots
    pitch.querySelectorAll('.pitch-slot').forEach(el => {
      const id = el.dataset.slot;
      const p = lineup[id];
      if (p && photoCache[p.id]) {
        const circle = el.querySelector('.slot-circle');
        circle.innerHTML = `<img src="${photoCache[p.id]}" alt="${p.name}" />`;
      } else if (p) {
        loadCardPhoto(p.id, p.name).then?.(() => {
          if (photoCache[p.id]) {
            const circle = el.querySelector('.slot-circle');
            if (circle) circle.innerHTML = `<img src="${photoCache[p.id]}" alt="${p.name}" />`;
          }
        });
      }
      el.addEventListener('click', () => onSlotClick(id, el.dataset.pos));
    });

    updateOverall();
  }

  function onSlotClick(id, pos) {
    activeSlot = activeSlot === id ? null : id;
    renderPitch();
    renderPool(document.querySelector('.pool-tab.active')?.dataset.pos || pos);
    // Switch pool tab to match slot position
    document.querySelectorAll('.pool-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.pos === pos);
    });
    renderPool(pos);
  }

  function renderPool(pos) {
    const list = document.getElementById('pool-list');
    const usedIds = new Set(Object.values(lineup).map(p => p.id));
    const players = PLAYERS.filter(p => p.position === pos);

    if (!players.length) {
      list.innerHTML = `<div class="pool-empty">No ${pos} players in squad data.</div>`;
      return;
    }

    list.innerHTML = players.map(p => {
      const isSelected = usedIds.has(p.id);
      const isActive = activeSlot && lineup[activeSlot]?.id === p.id;
      const avatarSrc = photoCache[p.id];
      return `
        <div class="pool-player ${isSelected ? 'selected' : ''} ${isActive ? 'pool-active' : ''}" data-pid="${p.id}">
          <div class="pool-avatar">
            ${avatarSrc
              ? `<img src="${avatarSrc}" alt="${p.name}" />`
              : `<span>${p.image}</span>`}
          </div>
          <div class="pool-info">
            <div class="pool-pname">${p.name}</div>
            <div class="pool-pteam">${p.teamFlag} ${p.team}</div>
          </div>
          <div class="pool-rating">${p.rating}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.pool-player:not(.selected)').forEach(el => {
      el.addEventListener('click', () => {
        if (!activeSlot) return;
        const p = PLAYERS.find(p => p.id === +el.dataset.pid);
        if (!p) return;
        // Remove player from any other slot first
        Object.keys(lineup).forEach(k => { if (lineup[k]?.id === p.id) delete lineup[k]; });
        lineup[activeSlot] = p;
        activeSlot = null;
        renderPitch();
        renderPool(pos);
      });
    });
  }

  function updateOverall() {
    const players = Object.values(lineup);
    const el = document.getElementById('fantasy-overall');
    if (!players.length) { el.textContent = '—'; return; }
    const avg = Math.round(players.reduce((s, p) => s + p.rating, 0) / players.length);
    el.textContent = avg;
  }

  // Pool tabs
  document.getElementById('pool-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.pool-tab');
    if (!tab) return;
    document.querySelectorAll('.pool-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderPool(tab.dataset.pos);
  });

  // Formation change
  document.getElementById('fantasy-formation').addEventListener('change', e => {
    formation = e.target.value;
    lineup = {};
    activeSlot = null;
    renderPitch();
    renderPool(document.querySelector('.pool-tab.active')?.dataset.pos || 'GK');
  });

  // Reset
  document.getElementById('fantasy-reset').addEventListener('click', () => {
    lineup = {};
    activeSlot = null;
    renderPitch();
    renderPool(document.querySelector('.pool-tab.active')?.dataset.pos || 'GK');
  });

  // Share / Copy
  document.getElementById('fantasy-share').addEventListener('click', () => {
    const name = document.getElementById('fantasy-team-name').value || 'My Fantasy XI';
    const rows = FORMATIONS[formation];
    const rowLabels = ['GK','DEF','MID','FWD'];
    let text = `🏆 ${name} (${formation})\n`;
    text += `⭐ Overall: ${document.getElementById('fantasy-overall').textContent}\n\n`;
    rows.forEach((row, ri) => {
      const players = row.map((_, ci) => lineup[slotId(ri, ci)]?.name || '?').join(', ');
      text += `${rowLabels[ri] || row[0]}: ${players}\n`;
    });
    text += '\nBuilt with FIFA WC 2026 App 🌍';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('fantasy-share');
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Lineup'; }, 2000);
    });
  });

  // Init
  renderPitch();
  renderPool('GK');
})();

// ---- SCHEDULE ----
(function() {
  const TODAY = new Date('2026-06-19');

  function matchStatus(dateStr) {
    const d = new Date(dateStr);
    if (d < TODAY) return 'FT';
    if (d.toDateString() === TODAY.toDateString()) return 'TODAY';
    return 'UPCOMING';
  }

  const VENUES = [
    'New York','Los Angeles','Dallas','Miami','Seattle',
    'Boston','Kansas City','Atlanta','Houston','Philadelphia',
    'Toronto','Vancouver','Mexico City','Guadalajara','Monterrey','San Francisco'
  ];

  const MD1 = ['2026-06-11','2026-06-12','2026-06-13','2026-06-14','2026-06-15','2026-06-16'];
  const MD2 = ['2026-06-18','2026-06-19','2026-06-20','2026-06-21','2026-06-22','2026-06-23'];
  const MD3 = ['2026-06-26','2026-06-27','2026-06-28','2026-06-29','2026-06-30','2026-07-01'];

  const KO_MATCHES = [
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-04', time: 'TBD', home: 'Winner A', away: 'Runner-up B', venue: 'New York' },
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-04', time: 'TBD', home: 'Winner C', away: 'Runner-up D', venue: 'Los Angeles' },
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-05', time: 'TBD', home: 'Winner E', away: 'Runner-up F', venue: 'Dallas' },
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-05', time: 'TBD', home: 'Winner G', away: 'Runner-up H', venue: 'Miami' },
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-06', time: 'TBD', home: 'Winner I', away: 'Runner-up J', venue: 'Seattle' },
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-06', time: 'TBD', home: 'Winner K', away: 'Runner-up L', venue: 'Boston' },
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-07', time: 'TBD', home: 'Best 3rd #1', away: 'Best 3rd #2', venue: 'Atlanta' },
    { matchday: 'ko', label: 'Round of 32', date: '2026-07-07', time: 'TBD', home: 'Best 3rd #3', away: 'Best 3rd #4', venue: 'Houston' },
    { matchday: 'ko', label: 'Round of 16', date: '2026-07-10', time: 'TBD', home: 'TBD', away: 'TBD', venue: 'New York' },
    { matchday: 'ko', label: 'Round of 16', date: '2026-07-11', time: 'TBD', home: 'TBD', away: 'TBD', venue: 'Los Angeles' },
    { matchday: 'ko', label: 'Quarter-Final', date: '2026-07-14', time: 'TBD', home: 'TBD', away: 'TBD', venue: 'Dallas' },
    { matchday: 'ko', label: 'Quarter-Final', date: '2026-07-15', time: 'TBD', home: 'TBD', away: 'TBD', venue: 'New York' },
    { matchday: 'ko', label: 'Semi-Final',    date: '2026-07-17', time: 'TBD', home: 'TBD', away: 'TBD', venue: 'Atlanta' },
    { matchday: 'ko', label: 'Semi-Final',    date: '2026-07-18', time: 'TBD', home: 'TBD', away: 'TBD', venue: 'Los Angeles' },
    { matchday: 'ko', label: '3rd Place',     date: '2026-07-18', time: '18:00', home: 'TBD', away: 'TBD', venue: 'Miami' },
    { matchday: 'ko', label: '🏆 FINAL',      date: '2026-07-19', time: '18:00', home: 'TBD', away: 'TBD', venue: 'New York' },
  ];

  // Generate all group stage matches
  function generateGroupMatches() {
    const byGroup = {};
    TEAMS.forEach(t => { if (!byGroup[t.group]) byGroup[t.group] = []; byGroup[t.group].push(t); });
    const matches = [];
    let id = 1;
    Object.keys(byGroup).sort().forEach((g, gi) => {
      const [t1, t2, t3, t4] = byGroup[g];
      const di = gi % 6;
      const v1 = VENUES[gi % VENUES.length], v2 = VENUES[(gi + 8) % VENUES.length];
      matches.push({ id: id++, group: g, matchday: 1, home: t1, away: t2, date: MD1[di], time: '15:00', venue: v1, status: matchStatus(MD1[di]) });
      matches.push({ id: id++, group: g, matchday: 1, home: t3, away: t4, date: MD1[di], time: '19:00', venue: v2, status: matchStatus(MD1[di]) });
      matches.push({ id: id++, group: g, matchday: 2, home: t1, away: t3, date: MD2[di], time: '15:00', venue: v1, status: matchStatus(MD2[di]) });
      matches.push({ id: id++, group: g, matchday: 2, home: t2, away: t4, date: MD2[di], time: '19:00', venue: v2, status: matchStatus(MD2[di]) });
      matches.push({ id: id++, group: g, matchday: 3, home: t1, away: t4, date: MD3[di], time: '20:00', venue: v1, status: matchStatus(MD3[di]) });
      matches.push({ id: id++, group: g, matchday: 3, home: t2, away: t3, date: MD3[di], time: '20:00', venue: v2, status: matchStatus(MD3[di]) });
    });
    return matches;
  }

  const ALL_MATCHES = generateGroupMatches();

  // Real results — keyed "home|away" matching generated match order
  const SCORES = {
    'Mexico|South Africa':        [2, 0],
    'South Korea|Czech Republic': [2, 1],
    'Canada|Bosnia & Herzegovina':[1, 1],
    'Qatar|Switzerland':          [1, 1],
    'Brazil|Morocco':             [1, 1],
    'Haiti|Scotland':             [0, 1],
    'United States|Paraguay':     [4, 1],
    'Australia|Turkey':           [2, 0],
    'Germany|Curaçao':            [7, 1],
    "Côte d'Ivoire|Ecuador":      [1, 0],
    'Netherlands|Japan':          [2, 2],
    'Sweden|Tunisia':             [5, 1],
    'Belgium|Egypt':              [1, 1],
    'Iran|New Zealand':           [2, 2],
    'Spain|Cape Verde':           [0, 0],
    'Saudi Arabia|Uruguay':       [1, 1],
    // June 16 — Groups I & J
    'France|Senegal':             [3, 1],
    'Iraq|Norway':                [1, 4],
    'Argentina|Algeria':          [3, 0],
    'Austria|Jordan':             [3, 1],
    // June 17 — Groups K & L
    'Portugal|DR Congo':          [1, 1],
    'Colombia|Uzbekistan':        [3, 1],
    'England|Croatia':            [4, 2],
    'Ghana|Panama':               [1, 0],
    // June 18 — Groups A & B (Matchday 2)
    'Czech Republic|South Africa':[1, 1],
    'Mexico|South Korea':         [1, 0],
    'Switzerland|Bosnia & Herzegovina': [4, 1],
    'Canada|Qatar':               [6, 0],
  };

  // Populate group filter
  const groupSel = document.getElementById('sched-group-filter');
  'ABCDEFGHIJKL'.split('').forEach(g => {
    const o = document.createElement('option'); o.value = g; o.textContent = `Group ${g}`; groupSel.appendChild(o);
  });

  function flagHtml(t) {
    if (!t || typeof t === 'string') return `<span style="font-size:1.3rem">🏳️</span>`;
    return `<img src="https://flagcdn.com/w80/${t.cc}.png" alt="${t.name}" style="width:32px;height:22px;object-fit:cover;border-radius:3px" onerror="this.style.display='none'" />`;
  }

  function teamName(t) { return typeof t === 'string' ? t : t.name; }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
  }

  function renderSchedule() {
    const md = document.querySelector('.sched-tab.active')?.dataset.md ?? 'all';
    const grp = groupSel.value;

    let matches;
    if (md === 'ko') {
      matches = KO_MATCHES.filter(m => !grp);
    } else {
      matches = ALL_MATCHES.filter(m =>
        (md === 'all' || m.matchday === +md) &&
        (!grp || m.group === grp)
      );
    }

    if (!matches.length) {
      document.getElementById('schedule-list').innerHTML = '<p class="sched-empty">No matches found.</p>';
      return;
    }

    // Group by date
    const byDate = {};
    matches.forEach(m => {
      const key = m.date;
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(m);
    });

    const html = Object.keys(byDate).sort().map(date => {
      const dayMatches = byDate[date];
      const rows = dayMatches.map(m => {
        const isKo = m.matchday === 'ko';
        const status = isKo ? 'UPCOMING' : m.status;
        const scoreKey = !isKo ? `${teamName(m.home)}|${teamName(m.away)}` : null;
        const result = scoreKey ? SCORES[scoreKey] : null;
        const statusClass = status === 'FT' ? 'status-ft' : status === 'TODAY' ? 'status-today' : isKo ? 'status-ko' : 'status-upcoming';
        const statusText = result ? 'FT' : status === 'TODAY' ? '🔴 TODAY' : status;
        const scoreOrVs = result
          ? `<span style="font-size:1.5rem;font-weight:900;letter-spacing:4px">${result[0]} – ${result[1]}</span>`
          : status === 'TODAY' ? '🔴  vs  ' : 'vs';
        const groupBadge = isKo ? `<span style="color:var(--accent);font-weight:700">${m.label}</span>` : `<span>Group ${m.group} · MD${m.matchday}</span>`;

        return `
          <div class="match-row">
            <div class="match-team home">
              <span class="match-team-flag">${flagHtml(m.home)}</span>
              <span>${teamName(m.home)}</span>
            </div>
            <div class="match-center">
              <div class="match-score">${scoreOrVs}</div>
              <span class="status-badge ${statusClass}">${statusText}</span>
              <span class="match-meta">${m.time !== 'TBD' ? m.time + ' · ' : ''}${m.venue}</span>
              <span class="match-meta">${groupBadge.replace(/<[^>]+>/g,'').trim()}</span>
            </div>
            <div class="match-team away">
              <span class="match-team-flag">${flagHtml(m.away)}</span>
              <span>${teamName(m.away)}</span>
            </div>
          </div>`;
      }).join('');

      return `<div class="sched-day-group">
        <div class="sched-day-label">${formatDate(date)}</div>
        ${rows}
      </div>`;
    }).join('');

    document.getElementById('schedule-list').innerHTML = html;
  }

  document.getElementById('sched-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.sched-tab');
    if (!tab) return;
    document.querySelectorAll('.sched-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (tab.dataset.md === 'ko') groupSel.value = '';
    renderSchedule();
  });

  groupSel.addEventListener('change', () => {
    if (groupSel.value) {
      document.querySelectorAll('.sched-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.sched-tab[data-md="all"]').classList.add('active');
    }
    renderSchedule();
  });

  renderSchedule();
})();

// ---- PREDICT ----
(function() {
  function teamScore(t) {
    const players = PLAYERS.filter(p => p.team === t.name);
    const avgRating = players.length
      ? players.reduce((s, p) => s + p.rating, 0) / players.length
      : null;
    // team strength (50%) + player ratings if available (30%) + small random upset factor (20%)
    const base = t.strength ?? 70;
    const playerBoost = avgRating ? (avgRating - base) * 0.3 : 0;
    const upset = (Math.random() * 10) - 5; // ±5 upset factor
    return base + playerBoost + upset;
  }

  function flagEl(t) {
    return `<img src="https://flagcdn.com/w160/${t.cc}.png" alt="${t.name}" onerror="this.style.display='none'" />`;
  }

  // Populate selects
  const selA = document.getElementById('select-a');
  const selB = document.getElementById('select-b');
  [...TEAMS].sort((a, b) => a.name.localeCompare(b.name)).forEach(t => {
    [selA, selB].forEach(sel => {
      const o = document.createElement('option');
      o.value = t.name; o.textContent = t.name;
      sel.appendChild(o);
    });
  });

  function updateFlag(selEl, flagId, pickId) {
    const t = TEAMS.find(t => t.name === selEl.value);
    const flagDiv = document.getElementById(flagId);
    const pickDiv = document.getElementById(pickId);
    if (t) {
      flagDiv.innerHTML = flagEl(t);
      pickDiv.classList.add('selected');
    } else {
      flagDiv.innerHTML = '🌍';
      pickDiv.classList.remove('selected');
    }
  }

  selA.addEventListener('change', () => updateFlag(selA, 'flag-a', 'pick-a'));
  selB.addEventListener('change', () => updateFlag(selB, 'flag-b', 'pick-b'));

  document.getElementById('predict-go').addEventListener('click', () => {
    const tA = TEAMS.find(t => t.name === selA.value);
    const tB = TEAMS.find(t => t.name === selB.value);
    if (!tA || !tB || tA.name === tB.name) {
      alert('Please select two different teams.');
      return;
    }

    const sA = teamScore(tA), sB = teamScore(tB);
    const total = sA + sB;
    const pctA = Math.round((sA / total) * 100);
    const pctB = 100 - pctA;
    const winner = pctA >= pctB ? tA : tB;
    const loser  = winner === tA ? tB : tA;
    const margin = Math.abs(pctA - pctB);

    // Simulated scoreline
    const wGoals = margin > 12 ? 3 : margin > 6 ? 2 : 1;
    const lGoals = Math.random() < 0.35 ? 1 : 0;
    const score = winner === tA
      ? `${wGoals} – ${lGoals}`
      : `${lGoals} – ${wGoals}`;

    // Factors
    const factors = [];
    const wPlayers = PLAYERS.filter(p => p.team === winner.name);
    const lPlayers = PLAYERS.filter(p => p.team === loser.name);
    if (wPlayers.length > lPlayers.length) factors.push({ text: `More squad depth (${wPlayers.length} stars)`, win: true });
    const wAvg = wPlayers.length ? Math.round(wPlayers.reduce((s,p)=>s+p.rating,0)/wPlayers.length) : 0;
    const lAvg = lPlayers.length ? Math.round(lPlayers.reduce((s,p)=>s+p.rating,0)/lPlayers.length) : 0;
    if (wAvg && lAvg) factors.push({ text: `Avg rating: ${winner.name} ${wAvg} vs ${loser.name} ${lAvg}`, win: wAvg > lAvg });
    factors.push({ text: `Overall strength: ${winner.name} ${winner.strength ?? 70} vs ${loser.name} ${loser.strength ?? 70}`, win: (winner.strength ?? 70) > (loser.strength ?? 70) });
    if (margin <= 5) factors.push({ text: 'Very close matchup — could go either way', win: false });

    const verdicts = [
      `${winner.name} edge out ${loser.name} in what promises to be a hard-fought contest. Expect pressure from both sides.`,
      `A tactical battle, but ${winner.name}'s quality gives them the advantage. ${loser.name} will make them work for it.`,
      `${winner.name} are predicted to progress, though ${loser.name} have the firepower to cause an upset.`,
      `On current form and squad depth, ${winner.name} look the stronger side. A tense but decisive win.`,
    ];

    // Render
    document.getElementById('result-flag').innerHTML = flagEl(winner);
    document.getElementById('result-name').textContent = winner.name;
    document.getElementById('result-score').textContent = `Predicted score: ${tA.name} ${score} ${tB.name}`;
    document.getElementById('bar-a-name').textContent = tA.name;
    document.getElementById('bar-b-name').textContent = tB.name;
    document.getElementById('pct-a').textContent = `${pctA}%`;
    document.getElementById('pct-b').textContent = `${pctB}%`;

    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    barA.style.width = '0%'; barB.style.width = '0%';

    document.getElementById('predict-factors').innerHTML =
      factors.map(f => `<span class="pfactor${f.win?' winner':''}">${f.text}</span>`).join('');
    document.getElementById('predict-verdict').textContent =
      verdicts[Math.floor(Math.random() * verdicts.length)];

    const result = document.getElementById('predict-result');
    result.classList.remove('hidden');
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(() => {
      barA.style.width = pctA + '%';
      barB.style.width = pctB + '%';
    }, 80);
  });
})();

