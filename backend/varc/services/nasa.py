from __future__ import annotations

import html
import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import feedparser
import requests
from bs4 import BeautifulSoup


NASA_RSS_URL = 'https://www.nasa.gov/rss/dyn/breaking_news.rss'
REQUEST_TIMEOUT = 5
MAX_WORKERS = 3

logger = logging.getLogger(__name__)


def _strip_html(value: str) -> str:
    clean = re.sub(r'<[^>]+>', ' ', value or '')
    return re.sub(r'\s+', ' ', html.unescape(clean)).strip()


def _extract_main_container(soup: BeautifulSoup) -> Any:
    selectors = [
        'div[itemprop="articleBody"]',
        'div.article-body',
        'div.wysiwyg',
        'article',
        'main',
        'section',
    ]
    for selector in selectors:
        node = soup.select_one(selector)
        if node is not None:
            return node
    return soup


def _paragraphs_from_container(container: Any) -> list[str]:
    blocked_tokens = ('nav', 'footer', 'share', 'menu', 'related', 'breadcrumb', 'newsletter', 'promo')
    paragraphs: list[str] = []
    for para in container.find_all('p'):
        classes = ' '.join(para.get('class') or []).lower()
        parent_classes = ' '.join((para.parent.get('class') or [])).lower() if para.parent else ''
        if any(token in classes for token in blocked_tokens):
            continue
        if any(token in parent_classes for token in blocked_tokens):
            continue
        text = para.get_text(' ', strip=True)
        if text:
            paragraphs.append(text)
    return paragraphs


def _normalize_paragraphs(paragraphs: list[str]) -> str:
    noise_pattern = re.compile(r'^(read more|related|image credit|credits?:|follow us|visit|learn more)', re.IGNORECASE)
    cleaned: list[str] = []
    for paragraph in paragraphs:
        text = _strip_html(paragraph)
        if len(text) < 25:
            continue
        if noise_pattern.match(text):
            continue
        cleaned.append(text)
    return '\n\n'.join(cleaned).strip()


def _fetch_full_nasa_content(url: str, rss_summary: str) -> str:
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
        logger.warning('NASA full-content fetch failed for %s: %s', url, exc)
        return rss_summary

    soup = BeautifulSoup(response.text, 'html.parser')
    container = _extract_main_container(soup)
    paragraphs = _paragraphs_from_container(container)
    if not paragraphs and container is not soup:
        paragraphs = _paragraphs_from_container(soup)

    content = _normalize_paragraphs(paragraphs)
    if len(content) < 280:
        return rss_summary
    return content


def _entry_to_article(entry: Any) -> dict[str, Any] | None:
    title = _strip_html(getattr(entry, 'title', 'Untitled'))
    summary = _strip_html(getattr(entry, 'summary', ''))
    link = getattr(entry, 'link', '')
    if not title:
        return None

    content = _fetch_full_nasa_content(link, summary) if link else summary
    if not content:
        content = 'Science update from NASA.'

    return {
        'id': f'nasa:{link or title}',
        'title': title,
        'content': content,
        'source': 'nasa',
        'type': 'science',
        'url': link,
        'published_at': getattr(entry, 'published', ''),
    }


def fetch_nasa_articles(page: int, page_size: int = 5) -> dict[str, Any]:
    parsed = feedparser.parse(NASA_RSS_URL)
    entries = parsed.entries or []

    page = max(1, page)
    page_size = 1 if page_size == 1 else max(3, min(page_size, 5))
    start = (page - 1) * page_size
    end = start + page_size
    sliced = entries[start:end]

    articles: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(_entry_to_article, entry) for entry in sliced]
        for future in as_completed(futures):
            try:
                article = future.result()
                if article is not None:
                    articles.append(article)
            except Exception as exc:
                logger.warning('NASA entry parse failed: %s', exc)

    ordering = {getattr(entry, 'link', ''): idx for idx, entry in enumerate(sliced)}
    articles.sort(key=lambda item: ordering.get(item.get('url', ''), 9999))

    pages = max(1, (len(entries) + page_size - 1) // page_size)
    return {'articles': articles, 'page': page, 'pages': pages}
