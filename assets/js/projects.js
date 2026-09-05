(function () {
    'use strict';

    // Native details controls also work when JavaScript is unavailable.
    function revealProject() {
        var target = document.getElementById(window.location.hash.slice(1));
        if (target && target.matches('.project-item')) target.open = true;
    }
    window.addEventListener('hashchange', revealProject);
    revealProject();

    var grid = document.getElementById('authorGrid');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-author]'));
    var search = document.getElementById('authorSearch');
    var previous = document.getElementById('authorPrev');
    var next = document.getElementById('authorNext');
    var pagination = document.getElementById('authorPagination');
    var page = 0;
    var pageSize = 24;

    function renderAuthors() {
        var query = search.value.trim().toLocaleLowerCase();
        var matches = cards.filter(function (card) {
            return card.dataset.author.toLocaleLowerCase().indexOf(query) !== -1;
        });
        var pages = Math.max(1, Math.ceil(matches.length / pageSize));
        page = Math.max(0, Math.min(page, pages - 1));
        cards.forEach(function (card) { card.hidden = true; });
        matches.slice(page * pageSize, (page + 1) * pageSize).forEach(function (card) { card.hidden = false; });
        document.getElementById('authorResultCount').textContent = matches.length + ' 位作者';
        document.getElementById('authorPageState').textContent = (page + 1) + ' / ' + pages;
        document.getElementById('authorEmpty').hidden = matches.length > 0;
        pagination.hidden = matches.length === 0;
        previous.disabled = page === 0;
        next.disabled = page >= pages - 1;
    }
    search.addEventListener('input', function () { page = 0; renderAuthors(); });
    previous.addEventListener('click', function () { page -= 1; renderAuthors(); });
    next.addEventListener('click', function () { page += 1; renderAuthors(); });
    renderAuthors();
})();
