(function() {
    var idx = null;
    var documents = {};

    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    if (!input || !results) return;

    function renderNoResults() {
        results.innerHTML = '<p class="search-empty">No posts found. Try a different query.</p>';
    }

    function renderResults(hits) {
        var html = '';
        hits.forEach(function(hit) {
            var doc = documents[hit.ref];
            if (!doc) return;
            var snippet = doc.content || '';
            if (snippet.length > 240) {
                snippet = snippet.substring(0, 240) + '…';
            }
            html += '<a href="' + doc.path + '" class="search-result-item">'
                + '<h2 class="search-result-title">' + escapeHtml(doc.title) + '</h2>'
                + '<span class="search-result-date">' + escapeHtml(doc.date) + '</span>'
                + '<p class="search-result-snippet">' + escapeHtml(snippet) + '</p>'
                + '</a>';
        });
        results.innerHTML = html;
    }

    function extractDate(path) {
        var match = path.match(/\/(\d{4})-(\d{2})-(\d{2})-/);
        if (!match) return '';
        var months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
        var d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function doSearch(query) {
        if (!idx) return;
        if (!query || query.trim().length === 0) {
            results.innerHTML = '<p class="search-empty">Type to search across all posts.</p>';
            return;
        }
        var hits = idx.search(query, {});
        if (hits.length === 0) {
            renderNoResults();
        } else {
            renderResults(hits);
        }
    }

    function loadIndex() {
        if (typeof window.searchIndex === 'undefined') {
            setTimeout(loadIndex, 100);
            return;
        }
        idx = elasticlunr.Index.load(window.searchIndex);
        var docs = window.searchIndex.documentStore.docs;
        for (var id in docs) {
            if (docs.hasOwnProperty(id)) {
                documents[id] = {
                    path: id,
                    title: docs[id].title,
                    content: docs[id].body,
                    date: extractDate(id)
                };
            }
        }
        var params = new URLSearchParams(window.location.search);
        var q = params.get('q');
        if (q) {
            input.value = q;
            doSearch(q);
        }
    }
    loadIndex();

    var debounceTimer;
    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            doSearch(input.value.trim());
        }, 150);
    });

    document.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            input.focus();
            input.select();
        }
    });
})();
