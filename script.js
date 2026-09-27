/* =========================================================
     JS SECTION 1: Config base
     ========================================================= */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

const DIFFS = ['Extreme Demon', 'Insane Demon', 'Hard Demon', 'Medium Demon', 'Easy Demon'];

const COLOR = {
  'Extreme Demon': '#ad2323',
  'Insane Demon': '#dea11e',
  'Hard Demon': '#24ba5b',
  'Medium Demon': '#ba24a6',
  'Easy Demon': '#6224ba'
};

const MODE_ICON = {
  custom: '≡ Custom',
  asc: '≡ Tier (asc)',
  desc: '≡ Tier (desc)',
  att_asc: '≡ Attempts (asc)',
  att_desc: '≡ Attempts (desc)'
};

const DEFAULT_DIFFICULTY_IMAGES = {
  'Extreme Demon': 'resources/extreme_128.webp',
  'Insane Demon': 'resources/insane_128.webp',
  'Hard Demon': 'resources/hard_128.webp',
  'Medium Demon': 'resources/medium_128.webp',
  'Easy Demon': 'resources/easy_128.webp'
};

const DEFAULT_AVATAR = 'resources/avatar.jpg';

let S = {
  profile: {
    name: 'Player',
    nickname: '',
    bio: '',
    image: '',
    theme: 'dark-blue'
  },
  transparent: false,
  demons: [],
  mode: 'custom',
  filter: 'all',
  listTitle: 'My Demon List',
  bg: { type: 'default', value: '' },
  panelVisible: false,
  optCollapsed: true,
  alignItems: 'center',
  welcomed: false
};

/* =========================================================
   JS SECTION 2: Storage (localstorage)
   ========================================================= */
try {
  const saved = JSON.parse(localStorage.getItem('mydemonlist') || 'null');
  if (saved) {
    S = { 
      ...S, 
      ...saved, 
      transparent: saved.transparent ?? false,
      optCollapsed: saved.optCollapsed ?? true,
      panelVisible: saved.panelVisible ?? true,
      alignItems: saved.alignItems || 'center',
      welcomed: saved.welcomed ?? false,
      profile: { ...S.profile, ...(saved.profile || {}) } 
    };
    if (S.profile.theme === 'transparent') {
      S.profile.theme = 'dark-blue';
      S.transparent = true;
    }
  }
} catch (e) {
  console.error("Error loading data:", e);
}

const save = () => {
  try {
    localStorage.setItem('mydemonlist', JSON.stringify(S));
  } catch (e) {
    console.error("Error saving data:", e);
  }
};

let editId = null;
let afterId = null;
let dragId = null;
let selDiff = null;
let tmpProfileImg = '';
let tmpDemonVideo = '';
let tmpDemonFav = false;
let tmpTheme = '';
let confirmType = null;

/* =========================================================
   JS SECTION 3: Calculating levels
   ========================================================= */
function sorted() {
  const list = [...S.demons];
  if (S.mode === 'custom') return list;

  return list.sort((a, b) => {
    if (S.mode === 'asc' || S.mode === 'desc') {
      const tierA = a.tier ?? Number.MAX_SAFE_INTEGER;
      const tierB = b.tier ?? Number.MAX_SAFE_INTEGER;
      if (tierA !== tierB) {
        return S.mode === 'asc' ? tierA - tierB : tierB - tierA;
      }
      return 0;
    }
    if (S.mode === 'att_asc' || S.mode === 'att_desc') {
      const attA = a.attempts ?? Number.MAX_SAFE_INTEGER;
      const attB = b.attempts ?? Number.MAX_SAFE_INTEGER;
      if (attA !== attB) {
        return S.mode === 'att_asc' ? attA - attB : attB - attA;
      }
      return 0;
    }
    return 0;
  });
}

function view() {
  return sorted().filter(d => {
    if (S.filter === 'all') return true;
    if (S.filter === 'fav') return !!d.fav;
    return d.diff === S.filter;
  });
}

function calculateHardest() {
  if (S.demons.length === 0) return '—';

  if (S.mode === 'custom') {
    const topDemon = S.demons[0];
    return topDemon ? topDemon.name : '—';
  } else {
    const rankedDemons = [...S.demons].sort((a, b) => {
      const rankDiffA = DIFFS.indexOf(a.diff);
      const rankDiffB = DIFFS.indexOf(b.diff);
      if (rankDiffA !== rankDiffB) return rankDiffA - rankDiffB;

      const tA = a.tier ?? 9999;
      const tB = b.tier ?? 9999;
      return tA - tB;
    });
    return rankedDemons[0] ? rankedDemons[0].name : '—';
  }
}

/* =========================================================
   JS SECTION 4: UI Rendering and components
   ========================================================= */
function renderList() {
  const listData = view();
  const container = $('list');

  $('btnModeList').textContent = MODE_ICON[S.mode] || '≡ Sort';

  let filterText = 'All';
  if (S.filter === 'fav') {
    filterText = 'Favorites';
  } else if (S.filter !== 'all') {
    filterText = S.filter.replace(' Demon', '');
  }
  $('btnFilter').textContent = filterText;

  if (!listData.length) {
    container.innerHTML = S.demons.length
      ? '<div class="empty">No Demons found.</div>'
      : '<div class="empty">Your list is empty.<br><button data-add="">+ Add your first Demon</button></div>';
    return;
  }

  container.innerHTML = listData.map((d, index) => {
    const videoId = extractYouTubeId(d.video);
    const imgSrc = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : (d.image || DEFAULT_DIFFICULTY_IMAGES[d.diff] || DEFAULT_AVATAR);

    const thumbImg = `<img class="demon-step-image${videoId ? ' has-video' : ''}" src="${esc(imgSrc)}" alt="${esc(d.name)}" onerror="this.src='${DEFAULT_AVATAR}'">`;
    const thumbBlock = videoId
      ? `<a class="demon-thumb-link" href="${esc(d.video)}" target="_blank" rel="noopener noreferrer" title="Watch video" draggable="false">${thumbImg}</a>`
      : thumbImg;

    const favIconHtml = d.fav ? `<img class="demon-step-fav" src="resources/fav_on.png" alt="Favorite" title="Favorite">` : '';

    return `
      <div class="demon-step" draggable="true" data-id="${d.id}" style="--dc:${COLOR[d.diff]}">
        ${favIconHtml}
        ${thumbBlock}
        
        <div class="demon-step-body">
          <div class="demon-step-title">#${index + 1} - ${esc(d.name)}</div>
          <div class="demon-step-description">
            <span class="demon-badge-diff" style="--dc:${COLOR[d.diff]}">
              <img class="demon-badge-img" src="${esc(DEFAULT_DIFFICULTY_IMAGES[d.diff])}" alt="icon">
              ${esc(d.diff)}
            </span>
            <span>Tier: <b>${d.tier ?? '—'}</b></span>
            <span>Attempts: <b>${d.attempts ?? '—'}</b></span>
          </div>
        </div>

        <div class="demon-step-options">
          <button class="btn-demon-add" data-add="${d.id}" title="Add below">+</button>
          <button class="btn-demon-edit" data-edit="${d.id}" title="Edit">✎</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderStats() {
  const p = S.profile;
  const profileSrc = p.image || DEFAULT_AVATAR;

  $('btnProfile').innerHTML = `<img src="${esc(profileSrc)}" alt="Avatar" onerror="this.src='${DEFAULT_AVATAR}'">`;
  $('headUsername').textContent = p.name;
  $('bodyImageProfile').src = profileSrc;
  $('bodyUsername').textContent = p.name;
  $('bodyNickname').textContent = p.nickname || 'none';$('bodyDescription').textContent = p.bio || 'No description provided.';

  $('bodyTotalDemons').textContent = S.demons.length;
  $('bodyHardest').textContent = calculateHardest();

  $('statsDemons').innerHTML = DIFFS.map(diffName => {
    const count = S.demons.filter(d => d.diff === diffName).length;
    const iconUrl = DEFAULT_DIFFICULTY_IMAGES[diffName];
    return `
      <div class="ct-stats-box-demon" title="${diffName}">
        <img class="stat-icon-img" src="${esc(iconUrl)}" alt="${diffName}">
        <div class="ct-stats-text-demon">${count}</div>
      </div>
    `;
  }).join('');
}

function applyTheme() {
  document.documentElement.dataset.theme = S.profile.theme || 'dark-blue';
}

function applyTransparency() {
  const isTrans = !!S.transparent;
  document.documentElement.dataset.transparent = isTrans ? "true" : "false";
  const btn = $('cfgToggleTransparent');
  if (btn) {
    btn.textContent = `Transparency: ${isTrans ? 'on' : 'off'}`;
    btn.classList.toggle('sel', isTrans);
  }
}

function applyBackground() {
  const b = S.bg || { type: 'default', value: '' };
  const target = document.querySelector('.ct-body') || document.body;

  if (b.type === 'color' && b.value) {
    target.style.backgroundImage = 'none';
    target.style.backgroundAttachment = '';
  } else if (b.type === 'image' && b.value) {
    target.style.backgroundImage = `url("${b.value}")`;
    target.style.backgroundSize = 'cover';
    target.style.backgroundPosition = 'center';
    target.style.backgroundRepeat = 'no-repeat';
    target.style.backgroundAttachment = 'fixed';
  } else {
    target.style.backgroundImage = '';
    target.style.backgroundAttachment = '';
  }
}

function renderTitle() {
  const el = $('rankingTitle');
  if (el && el.contentEditable !== 'true') {
    el.textContent = S.listTitle;
  }
}

function updatePanelVisibility() {
  const panel = $('statsPanel');
  const main = document.querySelector('.ct-b-main');
  const btn = $('btnTogglePanel');
  
  if (S.panelVisible !== false) {
    if (panel) panel.classList.remove('hidden');
    if (main) main.classList.remove('panel-closed');
    if (btn) btn.title = "Hide Panel";
  } else {
    if (panel) panel.classList.add('hidden');
    if (main) main.classList.add('panel-closed');
    if (btn) btn.title = "Show Panel";
  }
}

function updateListAlignment() {
  const list = $('list');
  if (!list) return;
  list.classList.remove('align-left', 'align-center', 'align-right');
  const align = S.alignItems || 'center';
  list.classList.add(`align-${align}`);
  
  document.querySelectorAll('#pAlign button').forEach(b => {
    b.classList.toggle('sel', b.dataset.a === align);
  });
}

function updateOptMenuVisibility() {
  const drawer = $('ctOptionsDrawer');
  const overlay = $('optionsOverlay');
  if (!drawer) return;

  if (S.optCollapsed) {
    drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  } else {
    drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
}

function checkWelcomeModal() {
  if (!S.welcomed) {
    setTimeout(() => {
      const welcomeModal = $('boxWelcomeModal');
      if (welcomeModal) welcomeModal.classList.add('open');
    }, 300);
  }
}

function closeWelcomeModal() {
  const welcomeModal = $('boxWelcomeModal');
  if (welcomeModal) welcomeModal.classList.remove('open');
  S.welcomed = true;
  save();
}

function renderAll() {
  applyTheme();
  applyTransparency();
  applyBackground();
  renderTitle();
  renderStats();
  renderList();
  markMenus();
  updatePanelVisibility();
  updateListAlignment();
  updateOptMenuVisibility();
  checkWelcomeModal();
}

function markMenus() {
  document.querySelectorAll('#menuMode button').forEach(b => {
    b.classList.toggle('sel', b.dataset.m === S.mode);
  });
  document.querySelectorAll('#menuFilter button').forEach(b => {
    b.classList.toggle('sel', b.dataset.f === S.filter);
  });
  markThemeButtons();
}

function markThemeButtons() {
  const currentTheme = S.profile.theme || 'dark-blue';
  document.querySelectorAll('#pTheme button').forEach(b => {
    b.classList.toggle('sel', b.dataset.t === currentTheme);
  });
}

/* =========================================================
   JS SECTION 5: Options menu toggle
   ========================================================= */
$('btnToggleOpt').onclick = (e) => {
  e.stopPropagation();
  S.optCollapsed = !S.optCollapsed;
  save();
  updateOptMenuVisibility();
};

if ($('btnCloseDrawer')) {$('btnCloseDrawer').onclick = (e) => {
    e.stopPropagation();
    S.optCollapsed = true;
    save();
    updateOptMenuVisibility();
  };
}

if ($('optionsOverlay')) {$('optionsOverlay').onclick = () => {
    S.optCollapsed = true;
    save();
    updateOptMenuVisibility();
  };
}

$('menuFilter').innerHTML = '<button data-f="all">All</button>' +
  '<button data-f="fav">Favorites</button>' +
  DIFFS.map(d => `<button data-f="${d}">${d}</button>`).join('');

function togglePop(pop, btn, e) {
  e.stopPropagation();
  const isOpen = pop.classList.contains('open');
  closePops();
  if (isOpen) return;

  const r = btn.getBoundingClientRect();
  const popWidth = 200;
  let leftPos = Math.min(r.left, window.innerWidth - popWidth - 10);
  if (leftPos < 10) leftPos = 10;

  pop.style.top = (r.bottom + 6) + 'px';
  pop.style.left = leftPos + 'px';
  pop.classList.add('open');
}

const closePops = () => document.querySelectorAll('.pop').forEach(p => p.classList.remove('open'));

$('btnModeList').onclick = e => togglePop($('menuMode'),$('btnModeList'), e);
$('btnFilter').onclick = e => togglePop($('menuFilter'), $('btnFilter'), e);$('btnConfig').onclick = e => togglePop($('menuConfig'),$('btnConfig'), e);

if ($('btnExport')) {$('btnExport').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(S, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `demon_list_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
}

if ($('btnImport')) {$('btnImport').onclick = () => {
    if ($('fileImport'))$('fileImport').click();
  };
}

if ($('fileImport')) {$('fileImport').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const importedData = JSON.parse(ev.target.result);
        if (importedData && typeof importedData === 'object') {
          S = { ...S, ...importedData, profile: { ...S.profile, ...(importedData.profile || {}) } };
          save();
          renderAll();
        }
      } catch (err) {
        console.error('Error loading level data:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
}

$('menuMode').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  S.mode = b.dataset.m;
  save();
  renderAll();
};

$('menuFilter').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  S.filter = b.dataset.f;
  save();
  renderAll();
};

document.addEventListener('click', closePops);

/* =========================================================
   JS SECTION 5B: Settings and themes
   ========================================================= */
if ($('menuConfig')) {$('menuConfig').onclick = e => e.stopPropagation(); }

if ($('pAlign')) {$('pAlign').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    S.alignItems = b.dataset.a;
    updateListAlignment();
    save();
  };
}

if ($('cfgToggleTransparent')) {$('cfgToggleTransparent').onclick = e => {
    e.stopPropagation();
    S.transparent = !S.transparent;
    applyTransparency();
    save();
  };
}

if ($('pTheme')) {$('pTheme').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    S.profile.theme = b.dataset.t;
    tmpTheme = S.profile.theme;
    applyTheme();
    markThemeButtons();
    save();
  };
}

if ($('cfgBgImgBtn')) {$('cfgBgImgBtn').onclick = e => {
    e.stopPropagation();
    if ($('cfgBgFile'))$('cfgBgFile').click();
  };
}

if ($('cfgBgFile')) {$('cfgBgFile').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      S.bg = { type: 'image', value: ev.target.result };
      applyBackground();
      save();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
}

if ($('cfgBgReset')) {$('cfgBgReset').onclick = e => {
    e.stopPropagation();
    S.bg = { type: 'default', value: '' };
    applyBackground();
    save();
  };
}

if ($('cfgClearList')) {$('cfgClearList').onclick = e => {
    e.stopPropagation();
    closePops();
    confirmType = 'clearDemons';
    $('cText').textContent = 'Are you sure you want to clear the entire Demon list? This action cannot be undone.';
    $('boxConfirm').classList.add('open');
  };
}

if ($('cfgClearStorage')) {$('cfgClearStorage').onclick = e => {
    e.stopPropagation();
    closePops();
    confirmType = 'clearStorage';
    $('cText').textContent = 'Are you sure you want to clear all local saved data? This action cannot be undone.';
    $('boxConfirm').classList.add('open');
  };
}

/* =========================================================
   JS SECTION 6: Demon modal
   ========================================================= */
function debounce(fn, delay = 100) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

$('dDiff').innerHTML = DIFFS.map(d =>
  `<button type="button" data-d="${d}" style="--dc:${COLOR[d]}" title="${d}">
     <img src="${DEFAULT_DIFFICULTY_IMAGES[d]}" alt="${d}">
   </button>`
).join('');

function setDiff(d) {
  selDiff = d;
  document.querySelectorAll('#dDiff button').forEach(b => {
    b.classList.toggle('sel', b.dataset.d === d);
  });
  updateDemonPreview();
}

$('dDiff').onclick = e => {
  const b = e.target.closest('button');
  if (b) setDiff(b.dataset.d);
};

let autocompleteData = [];

async function fetchAutocompleteData() {
  try {
    const res = await fetch('levels.json');
    if (!res.ok) throw new Error('Level data could not be loaded');
    const data = await res.json();
    autocompleteData = Array.isArray(data) ? data : (data.levels || data.data || []);
  } catch (err) {
    console.log('Could not load levels.json remotely:', err);
  }
}

fetchAutocompleteData();

function parseLevelItem(item) {
  const name = item.name;
  const creator = item.publisherName;
  
  const rawDiff = item.difficulty;
  let matchedDiff = '';
  if (rawDiff) {
    const found = DIFFS.find(d => 
      d.toLowerCase().replace(' demon', '') === String(rawDiff).toLowerCase()
    );
    if (found) matchedDiff = found;
  }

  const rawRating = item.rating ?? item.tier;
  let formattedTier = '';
  if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
    const num = parseFloat(rawRating);
    if (!isNaN(num)) {
      formattedTier = (Math.round(num * 100) / 100).toString();
    }
  }

  let video;
  const ytId = item.showcase;
  if (ytId) video = `https://www.youtube.com/watch?v=${ytId}`;

  return { name, creator, diff: matchedDiff || rawDiff, tier: formattedTier, video };
}

const dNameInput = $('dName');
const autoList = $('dNameAutocomplete');

const handleSearchInput = debounce(async () => {
  const query = dNameInput.value.trim().toLowerCase();
  if (!query) {
    autoList.classList.remove('open');
    autoList.innerHTML = '';
    autoList._matches = [];
    return;
  }

  if (!autocompleteData.length) {
    await fetchAutocompleteData();
  }

  if (!autocompleteData.length) return;

  const matches = [];
  const queryClean = query.toLowerCase().trim();
  const exactMatches = [];
  const startsWithMatches = [];
  const includesMatches = [];

  for (let i = 0; i < autocompleteData.length; i++) {
    const parsed = parseLevelItem(autocompleteData[i]);
    const levelName = parsed.name.toLowerCase();

    if (levelName === queryClean) {
      exactMatches.push(parsed);
    } else if (levelName.startsWith(queryClean)) {
      startsWithMatches.push(parsed);
    } else if (levelName.includes(queryClean)) {
      includesMatches.push(parsed);
    }
  }

  matches.push(...exactMatches, ...startsWithMatches, ...includesMatches);
  matches.length = Math.min(matches.length, 12);

  if (!matches.length) {
    autoList.classList.remove('open');
    autoList.innerHTML = '';
    autoList._matches = [];
    return;
  }

  autoList._matches = matches;

  autoList.innerHTML = matches.map((item, idx) => `
    <div class="autocomplete-item" data-idx="${idx}">
      <div class="autocomplete-item-main">
        <b>${esc(item.name)}</b>
        ${item.creator ? `<span class="autocomplete-creator">by ${esc(item.creator)}</span>` : ''}
      </div>
      <span class="autocomplete-item-meta">
        <span>${esc(item.diff)}</span>
        ${item.tier !== '' ? `<span>Tier: ${esc(item.tier)}</span>` : ''}
      </span>
    </div>
  `).join('');
  autoList.classList.add('open');
}, 300);

dNameInput.addEventListener('input', handleSearchInput);

autoList.addEventListener('click', e => {
  const itemEl = e.target.closest('.autocomplete-item');
  if (!itemEl || !autoList._matches) return;

  const idx = parseInt(itemEl.dataset.idx, 10);
  const selected = autoList._matches[idx];
  if (!selected) return;

  dNameInput.value = selected.name;

  if (selected.diff && DIFFS.includes(selected.diff)) {
    setDiff(selected.diff);
  }

  if (selected.tier !== '') {
    $('dTier').value = selected.tier;
  }

  if (selected.video) {
    tmpDemonVideo = selected.video;
    $('dVideoUrl').value = selected.video;
    updateDemonPreview();
  }

  autoList.classList.remove('open');
});

document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-container')) {
    autoList.classList.remove('open');
  }
});

function extractYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function updateDemonPreview() {
  const vid = extractYouTubeId(tmpDemonVideo);
  if (vid) {
    $('dImgPreview').src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
    return;
  }
  const existing = editId ? S.demons.find(x => x.id === editId) : null;
  $('dImgPreview').src = (existing && existing.image) || DEFAULT_DIFFICULTY_IMAGES[selDiff] || DEFAULT_AVATAR;
}

function updateFavIconUI() {
  const img = $('imgFavIcon');
  if (img) {
    img.src = tmpDemonFav ? 'resources/fav_on.png' : 'resources/fav_off.png';
  }
}

if ($('btnFavToggle')) {$('btnFavToggle').onclick = () => {
    tmpDemonFav = !tmpDemonFav;
    updateFavIconUI();
  };
}

function openDemonBox(id, after) {
  editId = id;
  afterId = after;
  const d = id ? S.demons.find(x => x.id === id) : null;

  $('boxDemonTitle').textContent = d ? 'Edit Demon' : 'Add New Demon';
  $('dSave').textContent = d ? 'Save Changes' : 'Add';
  $('dName').value = d ? d.name : '';
  $('dTier').value = d && d.tier != null ? d.tier : '';
  $('dAttempts').value = d && d.attempts != null ? d.attempts : '';
  
  tmpDemonFav = d ? !!d.fav : false;
  updateFavIconUI();

  tmpDemonVideo = d ? (d.video || '') : '';
  $('dVideoUrl').value = tmpDemonVideo;

  setDiff(d ? d.diff : DIFFS[0]);
  updateDemonPreview();

  $('dErr').textContent = '';$('dDelete').classList.toggle('hide', !d);
  autoList.classList.remove('open');
  $('boxDemon').classList.add('open');$('dName').focus();
}

const closeDemonBox = () => {
  autoList.classList.remove('open');
  $('boxDemon').classList.remove('open');
};

$('dVideoUrl').oninput = e => {
  tmpDemonVideo = e.target.value.trim();
  updateDemonPreview();
};

$('dImgReset').onclick = () => {
  tmpDemonVideo = '';
  $('dVideoUrl').value = '';
  updateDemonPreview();
};

$('dSave').onclick = () => {
  const name = $('dName').value.trim();
  if (!name || !selDiff) {
    $('dErr').textContent = 'Name and difficulty are required.';
    return;
  }

  const t = $('dTier').value.trim();
  const att = $('dAttempts').value.trim();
  const data = {
    name,
    diff: selDiff,
    tier: t === '' ? null : Math.max(0, Math.round(parseFloat(t) * 100) / 100),
    attempts: att === '' ? null : Math.max(0, parseInt(att, 10)),
    video: tmpDemonVideo || '',
    fav: tmpDemonFav
  };

  if (editId) {
    Object.assign(S.demons.find(x => x.id === editId), data);
  } else {
    const newDemon = {
      id: 'd_' + Date.now() + Math.random().toString(36).slice(2, 6),
      ...data
    };
    const index = afterId ? S.demons.findIndex(x => x.id === afterId) + 1 : S.demons.length;
    S.demons.splice(index, 0, newDemon);
  }

  save();
  closeDemonBox();
  renderAll();
};

$('dCancel').onclick = closeDemonBox;
$('boxDemon').addEventListener('mousedown', e => {
  if (e.target.id === 'boxDemon') closeDemonBox();
});

$('dDelete').onclick = () => {
  const d = S.demons.find(x => x.id === editId);
  if (!d) return;
  confirmType = 'demon';
  $('cText').textContent = `Are you sure you want to delete "${d.name}"?`;
  $('boxConfirm').classList.add('open');
};

$('cNo').onclick = () => {$('boxConfirm').classList.remove('open');
  confirmType = null;
};

$('cYes').onclick = () => {
  if (confirmType === 'clearDemons') {
    S.demons = [];
    save();
    $('boxConfirm').classList.remove('open');
    renderAll();
  } else if (confirmType === 'clearStorage') {
    try { localStorage.removeItem('mydemonlist'); } catch (e) { console.error(e); }
    $('boxConfirm').classList.remove('open');
    location.reload();
    return;
  } else {
    S.demons = S.demons.filter(x => x.id !== editId);
    save();
    $('boxConfirm').classList.remove('open');
    closeDemonBox();
    renderAll();
  }
  confirmType = null;
};

$('list').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.edit) openDemonBox(b.dataset.edit, null);
  else if (b.dataset.add !== undefined) openDemonBox(null, b.dataset.add || null);
});

/* =========================================================
   JS SECTION 7: Drag and drop
   ========================================================= */
const listElem = $('list');

listElem.addEventListener('dragstart', e => {
  const row = e.target.closest('.demon-step');
  if (!row) return;
  dragId = row.dataset.id;
  row.classList.add('drag');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});

listElem.addEventListener('dragover', e => {
  const row = e.target.closest('.demon-step');
  if (!row || !dragId) return;
  e.preventDefault();
  document.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
  row.classList.add('over');
});

listElem.addEventListener('dragend', () => {
  dragId = null;
  renderList();
});

listElem.addEventListener('drop', e => {
  const row = e.target.closest('.demon-step');
  if (!row || !dragId || row.dataset.id === dragId) return;
  e.preventDefault();

  const currentList = view();
  const fromIndex = currentList.findIndex(x => x.id === dragId);
  const toIndex = currentList.findIndex(x => x.id === row.dataset.id);

  const [moved] = currentList.splice(fromIndex, 1);
  currentList.splice(toIndex, 0, moved);

  const visibleIds = new Set(currentList.map(x => x.id));
  let k = 0;
  S.demons = sorted().map(d => visibleIds.has(d.id) ? currentList[k++] : d);

  S.mode = 'custom';
  save();
  dragId = null;
  renderAll();
});

let touchDragElem = null;
let touchDragId = null;

listElem.addEventListener('touchstart', e => {
  if (S.mode !== 'custom') return;
  const row = e.target.closest('.demon-step');
  if (!row || e.target.closest('button') || e.target.closest('a')) return;

  touchDragElem = row;
  touchDragId = row.dataset.id;
}, { passive: true });

listElem.addEventListener('touchmove', e => {
  if (!touchDragElem || !touchDragId) return;
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const row = target ? target.closest('.demon-step') : null;

  document.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
  if (row && row.dataset.id !== touchDragId) {
    row.classList.add('over');
  }
}, { passive: true });

listElem.addEventListener('touchend', e => {
  if (!touchDragElem || !touchDragId) return;
  const changedTouch = e.changedTouches[0];
  const target = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);
  const row = target ? target.closest('.demon-step') : null;

  document.querySelectorAll('.over').forEach(x => x.classList.remove('over'));

  if (row && row.dataset.id !== touchDragId) {
    const currentList = view();
    const fromIndex = currentList.findIndex(x => x.id === touchDragId);
    const toIndex = currentList.findIndex(x => x.id === row.dataset.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [moved] = currentList.splice(fromIndex, 1);
      currentList.splice(toIndex, 0, moved);

      const visibleIds = new Set(currentList.map(x => x.id));
      let k = 0;
      S.demons = sorted().map(d => visibleIds.has(d.id) ? currentList[k++] : d);

      S.mode = 'custom';
      save();
      renderAll();
    }
  }

  touchDragElem = null;
  touchDragId = null;
});

/* =========================================================
   JS SECTION 8: Profile management
   ========================================================= */
function openProfile() {
  const p = S.profile;
  tmpProfileImg = p.image || '';
  tmpTheme = p.theme || 'dark-blue';

  $('pName').value = p.name;
  $('pNick').value = p.nickname;
  $('pBio').value = p.bio;
  $('pImg').src = tmpProfileImg || DEFAULT_AVATAR;
  $('pErr').textContent = '';

  markThemeButtons();
  $('boxProfile').classList.add('open');
}

$('btnProfile').onclick = openProfile;
$('pImgBtn').onclick = () =>$('pFile').click();

$('pImgDel').onclick = () => {
  tmpProfileImg = '';
  $('pImg').src = DEFAULT_AVATAR;
};

$('pFile').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    tmpProfileImg = ev.target.result;
    $('pImg').src = tmpProfileImg;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

const closeProfile = () => {
  $('boxProfile').classList.remove('open');
  applyTheme();
};

$('pCancel').onclick = closeProfile;
$('boxProfile').addEventListener('mousedown', e => {
  if (e.target.id === 'boxProfile') closeProfile();
});

$('pSave').onclick = () => {
  const name = $('pName').value.trim();
  if (!name) {
    $('pErr').textContent = 'Username is required.';
    return;
  }

  Object.assign(S.profile, {
    name: name,
    nickname: $('pNick').value.trim(),
    bio: $('pBio').value.trim(),
    image: tmpProfileImg,
    theme: tmpTheme || S.profile.theme
  });

  save();
  $('boxProfile').classList.remove('open');
  renderAll();
};

/* =========================================================
   JS SECTION 9: List title
   ========================================================= */
function startEditTitle() {
  const el = $('rankingTitle');
  if (!el) return;
  el.contentEditable = 'true';
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function saveTitle() {
  const el = $('rankingTitle');
  if (!el) return;
  el.contentEditable = 'false';
  let val = el.textContent.trim() || '';
  if (val.length > 24) {
    val = val.slice(0, 24);
  }
  el.textContent = val;
  S.listTitle = val;
  save();
}

if ($('btnEditTitle'))$('btnEditTitle').onclick = startEditTitle;

if ($('rankingTitle')) {$('rankingTitle').addEventListener('input', e => {
    if (e.target.textContent.length > 24) {
      e.target.textContent = e.target.textContent.slice(0, 24);
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(e.target);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  $('rankingTitle').addEventListener('blur', saveTitle);
  $('rankingTitle').addEventListener('keydown', e => {     if (e.key === 'Enter') {       e.preventDefault();$('rankingTitle').blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      $('rankingTitle').textContent = (S.listTitle || 'My Demon List').slice(0, 24);$('rankingTitle').blur();
    }
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closePops();
    if (!S.optCollapsed) {
      S.optCollapsed = true;
      save();
      updateOptMenuVisibility();
    }
    if ($('boxConfirm').classList.contains('open')) {$('boxConfirm').classList.remove('open');
      confirmType = null;
    } else {
      closeDemonBox();
      closeProfile();
    }
  }
});

/* =========================================================
   JS SECTION 10: Floating buttons
   ========================================================= */
if ($('btnTogglePanel')) {$('btnTogglePanel').onclick = () => {
    S.panelVisible = !S.panelVisible;
    save();
    updatePanelVisibility();
  };
}

const btnScrollTop = $('btnScrollTop');
const btnTogglePanel = $('btnTogglePanel');

window.addEventListener('scroll', () => {
  if (window.scrollY > 250) {
    if (btnScrollTop) btnScrollTop.classList.add('visible');
    if (btnTogglePanel) btnTogglePanel.classList.add('pushed');
  } else {
    if (btnScrollTop) btnScrollTop.classList.remove('visible');
    if (btnTogglePanel) btnTogglePanel.classList.remove('pushed');
  }
});

if (btnScrollTop) {
  btnScrollTop.onclick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

if ($('btnFloatingHelp')) {$('btnFloatingHelp').onclick = e => {
    e.stopPropagation();
    $('boxFloatingMenu').classList.add('open');
  };
}

if ($('btnCloseFloatingMenu')) {
  $('btnCloseFloatingMenu').onclick = () => {$('boxFloatingMenu').classList.remove('open');
  };
}

if ($('boxFloatingMenu')) {$('boxFloatingMenu').onclick = e => {
    if (e.target.id === 'boxFloatingMenu') {
      $('boxFloatingMenu').classList.remove('open');
    }
  };
}

if ($('btnCloseWelcomeModal'))$('btnCloseWelcomeModal').onclick = closeWelcomeModal;
if ($('btnStartWelcome'))$('btnStartWelcome').onclick = closeWelcomeModal;
if ($('boxWelcomeModal')) {$('boxWelcomeModal').onclick = e => {
    if (e.target.id === 'boxWelcomeModal') closeWelcomeModal();
  };
}

renderAll();