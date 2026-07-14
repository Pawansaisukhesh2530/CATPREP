from __future__ import annotations

import logging
import random
from typing import Any

from django.core.cache import cache

from .aeon import fetch_aeon_articles
from .ai import summarize_long_article
from .guardian import fetch_guardian_articles
from .gutenberg import fetch_gutenberg_articles
from .medium import fetch_medium_articles
from .nasa import fetch_nasa_articles


CONTENT_CACHE_TIMEOUT = 10 * 60
SUPPORTED_SOURCES = {'guardian', 'aeon', 'gutenberg', 'nasa', 'medium', 'mixed'}
logger = logging.getLogger(__name__)


def _with_optional_summary(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    enriched = []
    for article in articles:
        content = article.get('content', '')
        if len(content) > 4500:
            try:
                summary = summarize_long_article(content, article.get('title', ''))
                if summary:
                    article = {**article, 'summary': summary}
            except Exception as exc:
                logger.warning('Summary generation failed for %s: %s', article.get('source', 'unknown'), exc)
        enriched.append(article)
    return enriched


def _valid_articles(payload: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []

    raw_articles = payload.get('articles', [])
    if not isinstance(raw_articles, list):
        return []

    valid: list[dict[str, Any]] = []
    for item in raw_articles:
        if not isinstance(item, dict):
            continue
        title = str(item.get('title', '')).strip()
        content = str(item.get('content', '')).strip()
        if not title or not content:
            continue
        valid.append(item)
    return valid


def _safe_fetch_source(source: str, page: int, page_size: int) -> dict[str, Any] | None:
    try:
        return _fetch_single_source(source=source, page=page, page_size=page_size)
    except Exception as exc:
        logger.warning('Source fetch failed for %s page %s: %s', source, page, exc)
        return None


def _fetch_single_source(source: str, page: int, page_size: int = 5) -> dict[str, Any]:
    if source == 'guardian':
        return fetch_guardian_articles(page=page, page_size=page_size)
    if source == 'aeon':
        return fetch_aeon_articles(page=page, page_size=page_size)
    if source == 'gutenberg':
        return fetch_gutenberg_articles(page=page, page_size=page_size)
    if source == 'nasa':
        return fetch_nasa_articles(page=page, page_size=page_size)
    if source == 'medium':
        return fetch_medium_articles(page=page, page_size=page_size)
    raise ValueError(f'Unsupported source: {source}')


def fetch_articles(source: str, page: int) -> dict[str, Any]:
    source = (source or 'guardian').strip().lower()
    page = max(1, int(page or 1))

    if source not in SUPPORTED_SOURCES:
        raise ValueError('source must be one of: guardian, aeon, gutenberg, nasa, medium, mixed')

    cache_key = f'articles:{source}:{page}'
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    if source == 'mixed':
        selected_articles: list[dict[str, Any]] = []
        for src in ('aeon', 'guardian', 'nasa', 'gutenberg'):
            payload = _safe_fetch_source(src, page=page, page_size=3)
            candidates = _valid_articles(payload)
            if not candidates:
                continue
            selected_articles.append(random.choice(candidates))

        payload = {
            'articles': _with_optional_summary(selected_articles),
            'page': page,
            'pages': 1,
        }
        cache.set(cache_key, payload, CONTENT_CACHE_TIMEOUT)
        return payload

    source_payload = _safe_fetch_source(source, page=page, page_size=5)
    if not source_payload:
        payload = {'articles': [], 'page': page, 'pages': 1}
        cache.set(cache_key, payload, CONTENT_CACHE_TIMEOUT)
        return payload

    payload = {
        'articles': _with_optional_summary(_valid_articles(source_payload)),
        'page': int(source_payload.get('page', page) or page),
        'pages': int(source_payload.get('pages', 1) or 1),
    }
    cache.set(cache_key, payload, CONTENT_CACHE_TIMEOUT)
    return payload
