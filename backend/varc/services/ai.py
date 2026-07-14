import hashlib
import json
import re
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache


CACHE_TIMEOUT_AI = 60 * 60
TONE_CACHE_TIMEOUT = 60 * 60 * 24
ALLOWED_TONES = [
    'Neutral-Analytical',
    'Critical',
    'Supportive',
    'Skeptical',
    'Descriptive',
    'Persuasive',
]


def _clean_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


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
        text = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')
    if not text:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _hash_key(prefix: str, text: str) -> str:
    return f'{prefix}:{hashlib.sha1(text.encode("utf-8", errors="ignore")).hexdigest()}'


def summarize_long_article(article_text: str, title: str = '') -> str:
    text = _clean_text(article_text)
    if len(text) < 4500:
        return ''

    prompt_input = f'{title}\n\n{text[:7000]}'
    cache_key = _hash_key('article-summary', prompt_input)
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return cached

    prompt = (
        'Summarize this CAT RC passage in 3 to 4 concise lines. '
        'Return strict JSON with key summary.\n'
        f'Title: {title}\nPassage: {text[:7000]}'
    )

    generated = _gemini_json(
        prompt,
        'You are a CAT VARC tutor. Return valid JSON only.',
    )

    summary = ''
    if generated and isinstance(generated.get('summary'), str):
        summary = generated['summary'].strip()

    cache.set(cache_key, summary, CACHE_TIMEOUT_AI)
    return summary


def clean_gutenberg_text(raw_text: str, title: str = '') -> str:
    text = raw_text.strip()
    if not text:
        return text

    text = re.sub(r'\*\*\*\s*START OF THE PROJECT GUTENBERG EBOOK.*?\*\*\*', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK.*?\*\*\*', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    if len(text) < 3000:
        return text

    payload = f'{title}\n\n{text[:9000]}'
    cache_key = _hash_key('gutenberg-clean', payload)
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return cached

    prompt = (
        'Clean this classic literature passage for RC practice. '
        'Keep original meaning and style, remove boilerplate, page markers, and noisy metadata. '
        'Return strict JSON with key cleaned_text.\n'
        f'Title: {title}\nText: {text[:9000]}'
    )
    cleaned = _gemini_json(
        prompt,
        'You clean reading passages for CAT aspirants. Return JSON only.',
    )

    output = text
    if cleaned and isinstance(cleaned.get('cleaned_text'), str):
        output = cleaned['cleaned_text'].strip()

    cache.set(cache_key, output, CACHE_TIMEOUT_AI)
    return output


def generate_rc_questions(article_text: str, title: str = '') -> list[dict[str, Any]]:
    prompt_payload = article_text[:7000]
    cache_key = _hash_key('rc-questions', f'{title}\n{prompt_payload}')
    cached = cache.get(cache_key)
    if isinstance(cached, list):
        return cached

    prompt = (
        'Generate 4 to 5 CAT-level VARC RC questions from the passage. '
        'Return strict JSON with key questions. '
        'Each question needs prompt, options (4), answer (0-3), explanation, type '
        '(Inference|Tone|Main Idea|Vocabulary).\n'
        f'Title: {title}\nPassage: {prompt_payload}'
    )

    generated = _gemini_json(
        prompt,
        'You are a CAT VARC question setter. Return valid JSON only.',
    )

    if generated and isinstance(generated.get('questions'), list):
        questions = generated['questions'][:5]
        cache.set(cache_key, questions, CACHE_TIMEOUT_AI)
        return questions

    fallback = [
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
    cache.set(cache_key, fallback, CACHE_TIMEOUT_AI)
    return fallback


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
    model_context = article_text[:6500]
    if len(article_text) > 6500:
        gemini_summary = summarize_long_article(article_text)
        if gemini_summary:
            model_context = f'Condensed passage summary: {gemini_summary}'

    prompt = json.dumps(
        {
            'article_text': model_context,
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


def evaluate_tone(passage: str, user_tone: str) -> dict[str, Any]:
    normalized_passage = passage.strip()[:7000]
    normalized_user_tone = user_tone.strip() or 'Neutral-Analytical'

    cache_key = _hash_key('tone-eval', normalized_passage)
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        actual = str(cached.get('actualTone', 'Neutral-Analytical'))
        explanation = str(cached.get('explanation', 'Tone inferred from passage structure and language cues.'))
        return {
            'actualTone': actual,
            'userTone': normalized_user_tone,
            'isCorrect': actual.lower() == normalized_user_tone.lower(),
            'explanation': explanation,
        }

    prompt = json.dumps(
        {
            'passage': normalized_passage,
            'allowed_tones': ALLOWED_TONES,
            'required_output': {
                'actualTone': 'must be one of allowed_tones',
                'explanation': 'short explanation in 1-3 lines',
            },
        }
    )

    result = _openai_chat_json(
        prompt,
        'You are a CAT VARC evaluator. Identify only one dominant tone from allowed categories and return strict JSON.',
    )

    actual_tone = 'Neutral-Analytical'
    explanation = 'The passage uses balanced reasoning and explanatory framing.'
    if result:
        candidate_tone = str(result.get('actualTone', '')).strip()
        if candidate_tone in ALLOWED_TONES:
            actual_tone = candidate_tone
        candidate_explanation = str(result.get('explanation', '')).strip()
        if candidate_explanation:
            explanation = candidate_explanation

    cache.set(
        cache_key,
        {'actualTone': actual_tone, 'explanation': explanation},
        timeout=TONE_CACHE_TIMEOUT,
    )

    return {
        'actualTone': actual_tone,
        'userTone': normalized_user_tone,
        'isCorrect': actual_tone.lower() == normalized_user_tone.lower(),
        'explanation': explanation,
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
