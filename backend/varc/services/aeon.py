from __future__ import annotations

import hashlib
import html
import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import feedparser
import requests
from bs4 import BeautifulSoup
from django.core.cache import cache


AEON_RSS_URL = 'https://aeon.co/feed.rss'
REQUEST_TIMEOUT = 12
MAX_WORKERS = 3
ARTICLE_CACHE_TIMEOUT = 60 * 60 * 24

logger = logging.getLogger(__name__)


def _strip_html(value: str) -> str:
    clean = re.sub(r'<[^>]+>', ' ', value or '')
    return re.sub(r'\s+', ' ', html.unescape(clean)).strip()


def _normalize_paragraphs(paragraphs: list[str]) -> str:
    cleaned = []
    noise_pattern = re.compile(
        r'^(advertisement|related|subscribe|sign up|read more|share this|by\s+|author\s+|published\s+)',
        flags=re.IGNORECASE,
    )
    for paragraph in paragraphs:
        text = _strip_html(paragraph)
        if not text or len(text) < 20:
            continue
        if noise_pattern.match(text):
            continue
        cleaned.append(text)

    return '\n\n'.join(cleaned).strip()


def _article_cache_key(url: str) -> str:
    digest = hashlib.sha1(url.encode('utf-8', errors='ignore')).hexdigest()
    return f'aeon_article_{digest}'


def _paragraphs_from_container(container: Any) -> list[str]:
    blocked_container_classes = ('author', 'byline', 'promo', 'ad', 'advert', 'nav', 'newsletter')
    paragraphs: list[str] = []
    for para in container.find_all('p'):
        classes = ' '.join(para.get('class') or []).lower()
        parent_classes = ' '.join((para.parent.get('class') or [])).lower() if para.parent else ''
        if any(token in classes for token in blocked_container_classes):
            continue
        if any(token in parent_classes for token in blocked_container_classes):
            continue
        paragraphs.append(para.get_text(' ', strip=True))
    return paragraphs


def _extract_main_container(soup: BeautifulSoup) -> Any:
    body = soup.select_one('div.eon-article__body')
    if body is not None:
        return body

    article_tag = soup.find('article')
    if article_tag is not None:
        return article_tag

    section_tag = soup.find('section')
    if section_tag is not None:
        return section_tag

    main_tag = soup.find('main')
    if main_tag is not None:
        return main_tag

    return soup


def _fetch_full_aeon_content(url: str, rss_summary: str) -> str:
    if not url:
        return rss_summary

    try:
        response = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={
                'User-Agent': (
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/123.0.0.0 Safari/537.36'
                )
            },
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning('Aeon full-content fetch failed for %s: %s', url, exc)
        return rss_summary

    soup = BeautifulSoup(response.text, 'html.parser')
    container = _extract_main_container(soup)

    paragraphs = _paragraphs_from_container(container)
    if not paragraphs and container is not soup:
        paragraphs = _paragraphs_from_container(soup)

    full_text = _normalize_paragraphs(paragraphs)
    if len(full_text) < 500:
        return rss_summary

    return full_text


def _scrape_and_cache_article_payload(url: str, title: str, rss_summary: str) -> dict[str, str] | None:
    content = _fetch_full_aeon_content(url, rss_summary)
    if not content or content == rss_summary:
        return None

    payload = {
        'title': title,
        'content': content,
        'source': 'aeon',
        'type': 'philosophy',
    }
    cache.set(_article_cache_key(url), payload, timeout=ARTICLE_CACHE_TIMEOUT)
    return payload


def fetch_aeon_articles(page: int, page_size: int = 5) -> dict[str, Any]:
    parsed = feedparser.parse(AEON_RSS_URL)
    entries = parsed.entries or []

    page = max(1, page)
    page_size = 1 if page_size == 1 else max(3, min(page_size, 5))
    start = (page - 1) * page_size
    end = start + page_size
    sliced = entries[start:end]

    url_seed_data: dict[str, dict[str, str]] = {}
    for entry in sliced:
        link = getattr(entry, 'link', '')
        if not link or link in url_seed_data:
            continue

        title = _strip_html(getattr(entry, 'title', 'Untitled'))
        summary = _strip_html(getattr(entry, 'summary', ''))
        url_seed_data[link] = {'title': title, 'summary': summary}

    content_by_url: dict[str, str] = {}
    scrape_queue: list[tuple[str, str, str]] = []
    for url, seed in url_seed_data.items():
        cached_payload = cache.get(_article_cache_key(url))
        if isinstance(cached_payload, dict) and cached_payload.get('content'):
            content_by_url[url] = str(cached_payload['content'])
            continue
        scrape_queue.append((url, seed['title'], seed['summary']))

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [
            pool.submit(_scrape_and_cache_article_payload, url, title, summary)
            for url, title, summary in scrape_queue
        ]
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as exc:
                logger.warning('Aeon scrape task failed: %s', exc)

    # Map scraped payloads back by URL cache for deterministic lookup.
    for url in url_seed_data:
        if url in content_by_url:
            continue
        cached_payload = cache.get(_article_cache_key(url))
        if isinstance(cached_payload, dict) and cached_payload.get('content'):
            content_by_url[url] = str(cached_payload['content'])

    articles: list[dict[str, Any]] = []
    for entry in sliced:
        title = _strip_html(getattr(entry, 'title', 'Untitled'))
        summary = _strip_html(getattr(entry, 'summary', ''))
        link = getattr(entry, 'link', '')
        if not summary and not link:
            continue

        content = content_by_url.get(link) or summary
        articles.append(
            {
                'id': f'aeon:{link or title}',
                'title': title,
                'content': content,
                'source': 'aeon',
                'type': 'philosophy',
                'url': link,
                'published_at': getattr(entry, 'published', ''),
            }
        )

    pages = max(1, (len(entries) + page_size - 1) // page_size)
    return {'articles': articles, 'page': page, 'pages': pages}
