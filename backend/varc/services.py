import json
import re
from functools import lru_cache
from typing import Any

import requests
from django.conf import settings


def _clean_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def fetch_guardian_articles(topic: str, page: int, page_size: int = 5) -> dict:
    if not settings.GUARDIAN_API_KEY:
        raise ValueError('GUARDIAN_API_KEY is not configured on the server')

    params = {
        'api-key': settings.GUARDIAN_API_KEY,
        'q': topic,
        'show-fields': 'bodyText,headline',
        'page-size': max(1, min(page_size, 10)),
        'page': max(1, page),
        'order-by': 'newest',
    }

    response = requests.get('https://content.guardianapis.com/search', params=params, timeout=20)
    response.raise_for_status()
    payload = response.json().get('response', {})

    articles = []
    for item in payload.get('results', []):
        content = _clean_text((item.get('fields') or {}).get('bodyText', ''))
        if not content:
            continue
        title = _clean_text((item.get('fields') or {}).get('headline') or item.get('webTitle', 'Untitled'))
        articles.append(
            {
                'id': item.get('id'),
                'title': title,
                'content': content,
                'section': item.get('sectionName', ''),
                'published_at': item.get('webPublicationDate', ''),
            }
        )

    return {
        'articles': articles,
        'page': payload.get('currentPage', page),
        'pages': payload.get('pages', page),
    }


def _openai_chat_json(prompt: str, system_prompt: str) -> dict[str, Any] | None:
    if not settings.OPENAI_API_KEY:
        return None

    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {settings.OPENAI_API_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'model': settings.OPENAI_MODEL,
            'temperature': 0.3,
            'response_format': {'type': 'json_object'},
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': prompt},
            ],
        },
        timeout=45,
    )

    if not response.ok:
        return None

    content = response.json().get('choices', [{}])[0].get('message', {}).get('content')
    if not content:
        return None

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


def _gemini_json(prompt: str, system_prompt: str) -> dict[str, Any] | None:
    if not settings.GEMINI_API_KEY:
        return None

    url = (
        f'https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent'
        f'?key={settings.GEMINI_API_KEY}'
    )

    response = requests.post(
        url,
        headers={'Content-Type': 'application/json'},
        json={
            'system_instruction': {'parts': [{'text': system_prompt}]},
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'temperature': 0.4, 'response_mime_type': 'application/json'},
        },
        timeout=45,
    )

    if not response.ok:
        return None

    candidates = response.json().get('candidates', [])
    text = ''
    if candidates:
        text = (
            candidates[0]
            .get('content', {})
            .get('parts', [{}])[0]
            .get('text', '')
        )
    if not text:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


@lru_cache(maxsize=128)
def _cached_rc_generation(article_hash: str, title: str) -> str:
    prompt = (
        'Generate 4 to 5 CAT-level VARC RC questions from the passage. '
        'Return strict JSON with key questions. '
        'Each question needs prompt, options (4), answer (0-3), explanation, type '
        '(Inference|Tone|Main Idea|Vocabulary).\n'
        f'Title: {title}\nPassage: {article_hash}'
    )

    generated = _gemini_json(
        prompt,
        'You are a CAT VARC question setter. Return valid JSON only.',
    )

    if generated and isinstance(generated.get('questions'), list):
        return json.dumps({'questions': generated['questions'][:5]})

    fallback = {
        'questions': [
            {
                'prompt': 'What is the primary purpose of the passage?',
                'options': [
                    'To present and analyze a central argument',
                    'To narrate a fictional event',
                    'To provide only factual statistics',
                    'To reject all counter-positions',
                ],
                'answer': 0,
                'explanation': 'Fallback question: Gemini output unavailable.',
                'type': 'Main Idea',
            }
        ]
    }
    return json.dumps(fallback)


def generate_rc_questions(article_text: str, title: str = '') -> list[dict[str, Any]]:
    payload_str = _cached_rc_generation(article_text[:7000], title)
    payload = json.loads(payload_str)
    return payload['questions']


def evaluate_answers(
    passage: str,
    questions: list[dict[str, Any]],
    user_answers: dict[str, Any],
    correct_answers: dict[str, Any] | None = None,
    user_reasoning: dict[str, str] | None = None,
) -> dict[str, Any]:
    prompt = json.dumps(
        {
            'passage': passage[:7000],
            'questions': questions,
            'correct_answers': correct_answers or {},
            'user_answers': user_answers,
            'user_reasoning': user_reasoning or {},
            'required_output': {
                'score': 'number',
                'total': 'number',
                'feedback': 'string',
                'reasoning_feedback': 'string',
                'mistake_types': ['string'],
                'question_results': [
                    {
                        'question_index': 'number',
                        'is_correct': 'boolean',
                        'correct_answer': 'string',
                        'explanation': 'string',
                        'mistake_type': 'string',
                        'reasoning_feedback': 'string',
                    }
                ],
            },
        }
    )

    evaluated = _openai_chat_json(
        prompt,
        'You are a CAT VARC evaluator. Return strict JSON only.',
    )

    if evaluated:
        return evaluated

    results = []
    score = 0
    for idx, question in enumerate(questions, start=1):
        q_id = str(idx)
        selected = user_answers.get(q_id)
        correct_index = question.get('answer')
        correct = selected == correct_index
        if correct:
            score += 1
        options = question.get('options', [])
        correct_option = options[correct_index] if isinstance(correct_index, int) and correct_index < len(options) else ''
        results.append(
            {
                'question_index': idx,
                'is_correct': correct,
                'correct_answer': correct_option,
                'explanation': question.get('explanation', ''),
                'mistake_type': '' if correct else 'Misinterpretation',
                'reasoning_feedback': '' if correct else 'Revisit option elimination logic.',
            }
        )

    return {
        'score': score,
        'total': len(questions),
        'feedback': 'Fallback evaluator used because OpenAI key is unavailable.',
        'reasoning_feedback': 'Try writing concise reasoning for each answer before checking.',
        'mistake_types': [item['mistake_type'] for item in results if item['mistake_type']],
        'question_results': results,
    }


def evaluate_summary(article_text: str, user_summary: str) -> dict[str, str]:
    prompt = json.dumps(
        {
            'article_text': article_text[:6000],
            'user_summary': user_summary,
            'required_output': {
                'what_user_got_right': 'string',
                'what_was_missed': 'string',
                'ideal_summary': 'string',
            },
        }
    )

    result = _openai_chat_json(prompt, 'You are a concise VARC summary evaluator. Return strict JSON only.')
    if result:
        return result

    return {
        'what_user_got_right': 'Your summary captures part of the central theme.',
        'what_was_missed': 'It misses one or more key supporting arguments.',
        'ideal_summary': 'Provide a 2-line summary with central claim and one key support.',
    }


def explain_text(selected_text: str) -> dict[str, str]:
    prompt = json.dumps(
        {
            'selected_text': selected_text,
            'required_output': {
                'simplified_explanation': 'string',
                'tone': 'string',
                'intent': 'string',
            },
        }
    )

    result = _gemini_json(prompt, 'You simplify reading passages for CAT VARC students. Return JSON only.')
    if result:
        return result

    return {
        'simplified_explanation': 'This text presents an argument and supporting idea in simpler terms.',
        'tone': 'Analytical',
        'intent': 'To explain and persuade through reasoning.',
    }


def analytics_insights(attempt_history: list[dict[str, Any]]) -> dict[str, Any]:
    prompt = json.dumps(
        {
            'attempt_history': attempt_history,
            'required_output': {
                'weak_areas': ['string'],
                'performance_patterns': ['string'],
                'improvement_suggestions': ['string'],
            },
        }
    )

    result = _openai_chat_json(prompt, 'You are a VARC performance analyst. Return strict JSON only.')
    if result:
        return result

    return {
        'weak_areas': ['Inference', 'Tone questions under timed pressure'],
        'performance_patterns': ['Accuracy drops in final third of tests'],
        'improvement_suggestions': ['Do 2 timed inference drills daily and review wrong options deeply'],
    }
