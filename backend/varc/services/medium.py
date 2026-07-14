from __future__ import annotations

import html
import re
from typing import Any

import feedparser


MEDIUM_RSS_URL = 'https://medium.com/feed/topic/technology'


def _strip_html(value: str) -> str:
    clean = re.sub(r'<[^>]+>', ' ', value or '')
    return re.sub(r'\s+', ' ', html.unescape(clean)).strip()


def fetch_medium_articles(page: int, page_size: int = 5) -> dict[str, Any]:
    parsed = feedparser.parse(MEDIUM_RSS_URL)
    entries = parsed.entries or []

    page = max(1, page)
    page_size = max(1, min(page_size, 10))
    start = (page - 1) * page_size
    end = start + page_size
    sliced = entries[start:end]

    articles: list[dict[str, Any]] = []
    for entry in sliced:
        title = _strip_html(getattr(entry, 'title', 'Untitled'))
        summary = _strip_html(getattr(entry, 'summary', ''))
        link = getattr(entry, 'link', '')
        if not summary:
            continue

        articles.append(
            {
                'id': f'medium:{link or title}',
                'title': title,
                'content': summary,
                'source': 'medium',
                'type': 'science',
                'url': link,
                'published_at': getattr(entry, 'published', ''),
            }
        )

    pages = max(1, (len(entries) + page_size - 1) // page_size)
    return {'articles': articles, 'page': page, 'pages': pages}
