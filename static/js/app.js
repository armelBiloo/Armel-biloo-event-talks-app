/**
 * BigQuery Release Pulse - Client App
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let state = {
    feedData: null,
    activeCategory: 'ALL',
    searchQuery: '',
    selectedItemId: null,
    isRefreshing: false,
    tweetModal: {
      item: null,
      entryDate: '',
      entryLink: '',
      style: 'impact',
      hashtags: new Set(['BigQuery', 'GoogleCloud', 'DataEngineering'])
    }
  };

  // DOM Elements
  const refreshBtn = document.getElementById('refreshBtn');
  const refreshBtnText = document.getElementById('refreshBtnText');
  const refreshSpinner = document.getElementById('refreshSpinner');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const feedStatus = document.getElementById('feedStatus');
  const statusText = document.getElementById('statusText');
  
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoryTabs = document.getElementById('categoryTabs');
  const lastRefreshedLabel = document.getElementById('lastRefreshedLabel');

  const statTotal = document.getElementById('statTotal');
  const statFeatures = document.getElementById('statFeatures');
  const statAnnouncements = document.getElementById('statAnnouncements');
  const statChanges = document.getElementById('statChanges');

  const selectionBanner = document.getElementById('selectionBanner');
  const selectedItemTitle = document.getElementById('selectedItemTitle');
  const copySelectedBtn = document.getElementById('copySelectedBtn');
  const tweetSelectedBtn = document.getElementById('tweetSelectedBtn');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');

  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  const emptyState = document.getElementById('emptyState');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const feedList = document.getElementById('feedList');

  // Tweet Modal Elements
  const tweetModal = document.getElementById('tweetModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const modalCategoryBadge = document.getElementById('modalCategoryBadge');
  const modalDateLabel = document.getElementById('modalDateLabel');
  const modalSummaryPreview = document.getElementById('modalSummaryPreview');
  const tweetTextArea = document.getElementById('tweetTextArea');
  const charCount = document.getElementById('charCount');
  const charProgressBar = document.getElementById('charProgressBar');
  const copyTweetTextBtn = document.getElementById('copyTweetTextBtn');
  const postToTwitterBtn = document.getElementById('postToTwitterBtn');
  const hashtagChips = document.getElementById('hashtagChips');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // Initialize
  init();

  function init() {
    bindEvents();
    fetchNotes(false);
  }

  function bindEvents() {
    // Refresh button click
    refreshBtn.addEventListener('click', () => {
      if (!state.isRefreshing) {
        fetchNotes(true);
      }
    });

    // Export CSV button click
    exportCsvBtn.addEventListener('click', () => {
      exportNotesToCsv();
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      if (state.searchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderFeed();
    });

    // Category Tabs
    categoryTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeCategory = btn.dataset.cat;
      renderFeed();
    });

    // Stat cards category filter shortcut
    document.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.category;
        const targetTab = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.dataset.cat === (cat === 'all' ? 'ALL' : cat));
        if (targetTab) targetTab.click();
      });
    });

    // Selection Banner Actions
    clearSelectionBtn.addEventListener('click', () => {
      state.selectedItemId = null;
      updateSelectionBanner();
      renderFeed();
    });

    copySelectedBtn.addEventListener('click', () => {
      if (!state.selectedItemId) return;
      const found = findItemById(state.selectedItemId);
      if (found) {
        copyCardToClipboard(found.item, found.entry);
      }
    });

    tweetSelectedBtn.addEventListener('click', () => {
      if (!state.selectedItemId) return;
      const item = findItemById(state.selectedItemId);
      if (item) {
        openTweetModal(item.item, item.entry.date, item.entry.link);
      }
    });

    // Reset filters button
    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      state.activeCategory = 'ALL';
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === 'ALL');
      });
      renderFeed();
    });

    retryBtn.addEventListener('click', () => fetchNotes(true));

    // Tweet Modal Events
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelModalBtn.addEventListener('click', closeTweetModal);
    
    // Close modal on backdrop click
    tweetModal.addEventListener('click', (e) => {
      if (e.target === tweetModal) closeTweetModal();
    });

    // Template style chips
    document.querySelectorAll('.chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.tweetModal.style = chip.dataset.style;
        updateTweetDraftText();
      });
    });

    // Hashtag chips toggle
    hashtagChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.tag-chip');
      if (!chip) return;
      const tag = chip.dataset.tag;
      if (state.tweetModal.hashtags.has(tag)) {
        state.tweetModal.hashtags.delete(tag);
        chip.classList.remove('active');
      } else {
        state.tweetModal.hashtags.add(tag);
        chip.classList.add('active');
      }
      updateTweetDraftText();
    });

    // Tweet textarea live counter
    tweetTextArea.addEventListener('input', () => {
      updateCharCounter();
    });

    // Copy Tweet Text
    copyTweetTextBtn.addEventListener('click', () => {
      const text = tweetTextArea.value;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Texte du tweet copié dans le presse-papiers ! 📋', 'success');
      }).catch(() => {
        showToast('Erreur lors de la copie', 'error');
      });
    });

    // Post to Twitter / X
    postToTwitterBtn.addEventListener('click', () => {
      const text = tweetTextArea.value.trim();
      if (!text) {
        showToast('Veuillez saisir un texte pour le tweet', 'error');
        return;
      }

      fetch('/api/tweet/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          hashtags: Array.from(state.tweetModal.hashtags),
          url: state.tweetModal.entryLink
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          window.open(data.intent_url, 'tweetWindow', 'width=560,height=480,resizable=yes');
          showToast('Ouverture de la fenêtre de partage Twitter / X... 🚀', 'success');
          closeTweetModal();
        } else {
          showToast(data.error || 'Échec de la génération du tweet', 'error');
        }
      })
      .catch(() => {
        const encoded = encodeURIComponent(text);
        window.open(`https://twitter.com/intent/tweet?text=${encoded}`, 'tweetWindow', 'width=560,height=480');
        closeTweetModal();
      });
    });
  }

  // Export release notes to CSV file
  function exportNotesToCsv() {
    if (!state.feedData || !state.feedData.entries) {
      showToast('Aucune donnée à exporter', 'error');
      return;
    }

    // Direct browser download from backend endpoint for full CSV
    window.location.href = '/api/notes/export/csv';
    showToast('Exportation du fichier CSV en cours... 📊', 'success');
  }

  // Copy card details to clipboard helper
  function copyCardToClipboard(item, entry, buttonEl = null) {
    const textToCopy = `📌 BigQuery Release Note (${entry.date})\n----------------------------------------\nCategory: ${item.category}\nSummary: ${item.summary}\nFull Detail: ${item.text}\nDocumentation Link: ${entry.link}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('Fiche copiée dans le presse-papiers ! 📋', 'success');
      if (buttonEl) {
        const originalHtml = buttonEl.innerHTML;
        buttonEl.innerHTML = `✓ Copié !`;
        buttonEl.style.color = '#34d399';
        setTimeout(() => {
          buttonEl.innerHTML = originalHtml;
          buttonEl.style.color = '';
        }, 2000);
      }
    }).catch(err => {
      console.error('Clipboard copy error:', err);
      showToast('Impossible de copier dans le presse-papiers', 'error');
    });
  }

  // Fetch release notes from backend API
  function fetchNotes(forceRefresh = false) {
    state.isRefreshing = true;
    refreshBtn.classList.add('refreshing');
    refreshBtnText.textContent = forceRefresh ? 'Refreshing...' : 'Loading...';
    refreshSpinner.classList.add('icon-spin');

    statusText.textContent = forceRefresh ? 'Fetching live feed...' : 'Loading feed...';

    if (!state.feedData) {
      showState('loading');
    }

    fetch(`/api/notes?refresh=${forceRefresh ? 'true' : 'false'}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then(resData => {
        if (!resData.success) throw new Error(resData.error || 'Unknown error');
        
        state.feedData = resData.data;
        updateDashboardStats();
        renderFeed();
        showState('content');

        lastRefreshedLabel.textContent = `Last fetched: ${state.feedData.last_refreshed_at}`;
        statusText.textContent = `Live Feed • ${state.feedData.total_items} Updates`;
        
        if (forceRefresh) {
          showToast(`Flux rafraîchi ! ${state.feedData.total_items} mises à jour chargées.`, 'success');
        }
      })
      .catch(err => {
        console.error('Fetch notes error:', err);
        if (!state.feedData) {
          errorMessage.textContent = err.message || 'Unable to fetch BigQuery release notes RSS feed.';
          showState('error');
        } else {
          showToast(`Échec du rafraîchissement: ${err.message}`, 'error');
        }
        statusText.textContent = 'Feed Error';
      })
      .finally(() => {
        state.isRefreshing = false;
        refreshBtn.classList.remove('refreshing');
        refreshSpinner.classList.remove('icon-spin');
        refreshBtnText.textContent = 'Refresh Feed';
      });
  }

  function updateDashboardStats() {
    if (!state.feedData) return;
    const counts = state.feedData.category_counts || {};
    statTotal.textContent = state.feedData.total_items || 0;
    statFeatures.textContent = counts.Feature || 0;
    statAnnouncements.textContent = counts.Announcement || 0;
    statChanges.textContent = (counts.Change || 0) + (counts.Issue || 0);
  }

  function renderFeed() {
    if (!state.feedData || !state.feedData.entries) return;

    feedList.innerHTML = '';
    let totalMatchedItems = 0;

    state.feedData.entries.forEach(entry => {
      const matchingItems = entry.items.filter(item => {
        const matchesCategory = state.activeCategory === 'ALL' || item.category === state.activeCategory;
        const query = state.searchQuery;
        const matchesQuery = !query || 
          entry.date.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.text.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query);
        
        return matchesCategory && matchesQuery;
      });

      if (matchingItems.length > 0) {
        totalMatchedItems += matchingItems.length;

        const groupEl = document.createElement('div');
        groupEl.className = 'date-group';

        const headerEl = document.createElement('div');
        headerEl.className = 'date-header';
        headerEl.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${entry.date}
        `;
        groupEl.appendChild(headerEl);

        matchingItems.forEach(item => {
          const cardEl = createNoteCard(entry, item);
          groupEl.appendChild(cardEl);
        });

        feedList.appendChild(groupEl);
      }
    });

    if (totalMatchedItems === 0) {
      showState('empty');
    } else {
      showState('content');
    }
  }

  function createNoteCard(entry, item) {
    const isSelected = state.selectedItemId === item.id;
    const card = document.createElement('div');
    card.className = `note-card ${isSelected ? 'selected' : ''}`;
    card.dataset.itemId = item.id;

    const catClass = `badge-${item.category.toLowerCase()}`;
    const catIcon = getCategoryIcon(item.category);

    card.innerHTML = `
      <div class="card-top">
        <span class="badge ${catClass}">${catIcon} ${item.category}</span>
        <div class="card-meta-right">
          <label class="select-checkbox-wrap">
            <input type="checkbox" class="item-select-checkbox" ${isSelected ? 'checked' : ''}>
            Select
          </label>
        </div>
      </div>

      <div class="card-body">
        ${item.html || `<p>${item.text}</p>`}
      </div>

      <div class="card-footer">
        <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" title="Voir la documentation officielle Google Cloud">
          Docs Link ↗
        </a>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm copy-summary-btn" title="Copier la fiche dans le presse-papiers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copier
          </button>
          <button class="btn btn-accent btn-sm tweet-card-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Tweet
          </button>
        </div>
      </div>
    `;

    // Event handlers inside card
    const checkbox = card.querySelector('.item-select-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      if (e.target.checked) {
        state.selectedItemId = item.id;
      } else if (state.selectedItemId === item.id) {
        state.selectedItemId = null;
      }
      updateSelectionBanner();
      renderFeed();
    });

    const copyBtn = card.querySelector('.copy-summary-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCardToClipboard(item, entry, copyBtn);
    });

    const tweetBtn = card.querySelector('.tweet-card-btn');
    tweetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTweetModal(item, entry.date, entry.link);
    });

    return card;
  }

  function getCategoryIcon(cat) {
    switch (cat) {
      case 'Feature': return '🚀';
      case 'Announcement': return '📢';
      case 'Change': return '⚡';
      case 'Issue': return '⚠️';
      case 'Security': return '🔒';
      default: return '📌';
    }
  }

  function updateSelectionBanner() {
    if (state.selectedItemId) {
      const found = findItemById(state.selectedItemId);
      if (found) {
        selectedItemTitle.textContent = `1 update selected: [${found.item.category}] ${found.entry.date}`;
        selectionBanner.classList.remove('hidden');
        return;
      }
    }
    selectionBanner.classList.add('hidden');
  }

  function findItemById(itemId) {
    if (!state.feedData) return null;
    for (const entry of state.feedData.entries) {
      for (const item of entry.items) {
        if (item.id === itemId) return { entry, item };
      }
    }
    return null;
  }

  function showState(type) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    feedList.classList.add('hidden');

    if (type === 'loading') loadingState.classList.remove('hidden');
    else if (type === 'error') errorState.classList.remove('hidden');
    else if (type === 'empty') emptyState.classList.remove('hidden');
    else if (type === 'content') feedList.classList.remove('hidden');
  }

  // Modal Functions
  function openTweetModal(item, dateStr, linkStr) {
    state.tweetModal.item = item;
    state.tweetModal.entryDate = dateStr;
    state.tweetModal.entryLink = linkStr;

    modalCategoryBadge.textContent = `${getCategoryIcon(item.category)} ${item.category}`;
    modalCategoryBadge.className = `badge badge-${item.category.toLowerCase()}`;
    modalDateLabel.textContent = dateStr;
    modalSummaryPreview.textContent = item.summary || item.text;

    updateTweetDraftText();
    tweetModal.classList.remove('hidden');
  }

  function closeTweetModal() {
    tweetModal.classList.add('hidden');
  }

  function updateTweetDraftText() {
    const item = state.tweetModal.item;
    if (!item) return;

    const dateStr = state.tweetModal.entryDate;
    const linkStr = state.tweetModal.entryLink;
    const summary = item.summary || item.text.slice(0, 140);
    const style = state.tweetModal.style;

    let draft = '';
    if (style === 'impact') {
      draft = `🚀 BigQuery ${item.category} (${dateStr}): ${summary}\n\nRead more: ${linkStr}`;
    } else if (style === 'quick') {
      draft = `New BigQuery Update: ${summary}\n🔗 ${linkStr}`;
    } else if (style === 'tech') {
      draft = `📊 BigQuery Release Note (${dateStr})\n• ${item.category}: ${summary}\n\nDoc: ${linkStr}`;
    } else {
      draft = tweetTextArea.value || `${summary}\n${linkStr}`;
    }

    if (state.tweetModal.hashtags.size > 0) {
      const tagsStr = Array.from(state.tweetModal.hashtags).map(t => `#${t}`).join(' ');
      draft = `${draft}\n\n${tagsStr}`;
    }

    tweetTextArea.value = draft;
    updateCharCounter();
  }

  function updateCharCounter() {
    const count = tweetTextArea.value.length;
    charCount.textContent = count;

    const percentage = Math.min(100, (count / 280) * 100);
    charProgressBar.style.width = `${percentage}%`;

    if (count > 280) {
      charProgressBar.className = 'progress-bar-fill overlimit';
      charCount.style.color = '#fb7185';
    } else if (count > 240) {
      charProgressBar.className = 'progress-bar-fill warning';
      charCount.style.color = '#fbbf24';
    } else {
      charProgressBar.className = 'progress-bar-fill';
      charCount.style.color = '#9ca3af';
    }
  }

  // Toast Notifications
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : '⚠️'}</span>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
