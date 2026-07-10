// GitHub activity widget — live data from the public GitHub REST API.
// No auth, no backend: subject to GitHub's unauthenticated rate limit,
// so results are cached client-side for a while to keep repeat loads cheap.

(function initGithubActivity() {
  const list = document.getElementById("ghActivity");
  if (!list) return;

  const USERNAME = "samiryasar14";
  const CACHE_KEY = `gh-repos-${USERNAME}`;
  const CACHE_TTL = 15 * 60 * 1000;

  const LANG_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    Swift: "#F05138",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Shell: "#89e051",
    Ruby: "#701516",
    PHP: "#4F5D95",
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  function render(repos) {
    if (!repos.length) {
      list.innerHTML = `<li class="gh-activity__empty">No public repos yet — <a href="https://github.com/${USERNAME}" target="_blank" rel="noopener noreferrer">visit the profile</a>.</li>`;
      return;
    }

    list.innerHTML = repos
      .map((repo) => {
        const color = LANG_COLORS[repo.language] || "#6b7280";
        const desc = repo.description ? escapeHtml(repo.description) : "No description";
        return `
          <li class="gh-activity__item">
            <span class="gh-activity__lang" style="background:${color}" aria-hidden="true"></span>
            <div class="gh-activity__body">
              <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="gh-activity__name">${escapeHtml(repo.name)}</a>
              <p class="gh-activity__desc">${desc}</p>
            </div>
            <span class="gh-activity__time mono">${timeAgo(repo.pushed_at)}</span>
          </li>`;
      })
      .join("");
  }

  function showError() {
    list.innerHTML = `<li class="gh-activity__empty">Couldn't load live activity right now — <a href="https://github.com/${USERNAME}" target="_blank" rel="noopener noreferrer">view the profile directly</a>.</li>`;
  }

  function loadFromCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;
    } catch (e) {
      /* localStorage unavailable or corrupt cache — fall through to a live fetch */
    }
    return null;
  }

  function saveToCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
    } catch (e) {
      /* storage full or unavailable — non-fatal, just skip caching */
    }
  }

  const cached = loadFromCache();
  if (cached) {
    render(cached);
    return;
  }

  fetch(`https://api.github.com/users/${USERNAME}/repos?sort=pushed&per_page=10`)
    .then((res) => {
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    })
    .then((repos) => {
      const cleaned = repos
        .filter((r) => !r.fork && !r.private)
        .slice(0, 5)
        .map((r) => ({
          name: r.name,
          description: r.description,
          html_url: r.html_url,
          language: r.language,
          pushed_at: r.pushed_at,
        }));
      render(cleaned);
      saveToCache(cleaned);
    })
    .catch(showError);
})();
