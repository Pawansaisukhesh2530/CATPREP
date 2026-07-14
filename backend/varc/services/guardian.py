from __future__ import annotations

import re
from typing import Any

import requests
from django.conf import settings


def _clean_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def fetch_guardian_articles(page: int, page_size: int = 5) -> dict[str, Any]:
    if not settings.GUARDIAN_API_KEY:
        raise ValueError('GUARDIAN_API_KEY is not configured on the server')

    params = {
        'api-key': settings.GUARDIAN_API_KEY,
        'q': 'global affairs OR policy OR economy OR society',
        'show-fields': 'bodyText,headline,trailText',
        'page-size': max(1, min(page_size, 10)),
        'page': max(1, page),
        'order-by': 'newest',
    }

    response = requests.get('https://content.guardianapis.com/search', params=params, timeout=20)
    response.raise_for_status()

    payload = response.json().get('response', {})
    articles = []
    for item in payload.get('results', []):
        fields = item.get('fields') or {}
        content = _clean_text(fields.get('bodyText', '') or fields.get('trailText', ''))
        if not content:
            continue

        title = _clean_text(fields.get('headline') or item.get('webTitle', 'Untitled'))
        articles.append(
            {
                'id': f"guardian:{item.get('id', title)}",
                'title': title,
                'content': content,
                'source': 'guardian',
                'type': 'news',
                'url': item.get('webUrl', ''),
                'published_at': item.get('webPublicationDate', ''),
            }
        )

    return {
        'articles': articles,
        'page': payload.get('currentPage', page),
        'pages': payload.get('pages', page),
    }
