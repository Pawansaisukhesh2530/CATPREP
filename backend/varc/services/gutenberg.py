from __future__ import annotations

import re
from typing import Any

import requests

from .ai import clean_gutenberg_text


GUTENDEX_URL = 'https://gutendex.com/books/'


def _clean_whitespace(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def _pick_plain_text_url(formats: dict[str, str]) -> str:
    candidates = [
        'text/plain; charset=utf-8',
        'text/plain; charset=us-ascii',
        'text/plain',
    ]
    for key in candidates:
        if formats.get(key):
            return formats[key]

    for key, value in formats.items():
        if key.startswith('text/plain'):
            return value
    return ''


def _download_plain_text(url: str, max_chars: int = 12000) -> str:
    if not url:
        return ''

    response = requests.get(url, timeout=25, headers={'Range': 'bytes=0-120000'})
    response.raise_for_status()
    text = response.text or ''
    return text[:max_chars]


def fetch_gutenberg_articles(page: int, page_size: int = 5) -> dict[str, Any]:
    page = max(1, page)
    page_size = max(1, min(page_size, 8))

    response = requests.get(
        GUTENDEX_URL,
        params={
            'page': page,
            'languages': 'en',
            'topic': 'philosophy',
        },
        timeout=25,
    )
    response.raise_for_status()
    payload = response.json()

    results = payload.get('results', [])[:page_size]
    articles: list[dict[str, Any]] = []
    for item in results:
        title = _clean_whitespace(item.get('title', 'Untitled'))
        formats = item.get('formats') or {}
        plain_text_url = _pick_plain_text_url(formats)

        raw_content = ''
        if plain_text_url:
            try:
                raw_content = _download_plain_text(plain_text_url)
            except requests.RequestException:
                raw_content = ''

        cleaned = clean_gutenberg_text(raw_content, title=title) if raw_content else ''
        if not cleaned:
            cleaned = 'Classic literature excerpt not available in plain text for this title.'

        articles.append(
            {
                'id': f'gutenberg:{item.get("id", title)}',
                'title': title,
                'content': cleaned,
                'source': 'gutenberg',
                'type': 'classic',
                'url': item.get('url', ''),
                'published_at': '',
            }
        )

    count = payload.get('count', 0)
    pages = max(1, (count + page_size - 1) // page_size)
    return {'articles': articles, 'page': page, 'pages': pages}
