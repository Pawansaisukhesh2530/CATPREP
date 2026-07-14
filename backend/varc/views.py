from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AttemptSerializer
from .services import (
    SUPPORTED_SOURCES,
    analytics_insights,
    evaluate_answers,
    evaluate_summary,
    evaluate_tone,
    explain_text,
    fetch_articles,
    generate_rc_questions,
)


class ArticlesAPIView(APIView):
    def get(self, request):
        source = request.query_params.get('source', 'guardian').strip().lower()
        try:
            page = int(request.query_params.get('page', '1'))
        except ValueError:
            page = 1

        if source not in SUPPORTED_SOURCES:
            return Response(
                {'detail': 'source must be one of: guardian, aeon, gutenberg, nasa, medium, mixed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = fetch_articles(source=source, page=page)
            return Response(data)
        except Exception as exc:
            return Response(
                {
                    'articles': [],
                    'page': page,
                    'pages': 1,
                    'detail': f'Partial fetch failure: {exc}',
                },
                status=status.HTTP_200_OK,
            )


class GenerateRCAPIView(APIView):
    def post(self, request):
        article_text = request.data.get('article_text', '').strip()
        title = request.data.get('title', '').strip()

        if not article_text:
            return Response({'detail': 'article_text is required'}, status=status.HTTP_400_BAD_REQUEST)

        questions = generate_rc_questions(article_text=article_text, title=title)
        return Response({'questions': questions})


class EvaluateAPIView(APIView):
    def post(self, request):
        passage = request.data.get('passage', '').strip()
        questions = request.data.get('questions', [])
        correct_answers = request.data.get('correct_answers', {})
        user_answers = request.data.get('user_answers', {})
        user_reasoning = request.data.get('user_reasoning', {})

        if not passage or not isinstance(questions, list):
            return Response(
                {'detail': 'passage and questions are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = evaluate_answers(
            passage=passage,
            questions=questions,
            correct_answers=correct_answers,
            user_answers=user_answers,
            user_reasoning=user_reasoning,
        )
        return Response(result)


class EvaluateSummaryAPIView(APIView):
    def post(self, request):
        article_text = request.data.get('article_text', '').strip()
        user_summary = request.data.get('user_summary', '').strip()

        if not article_text or not user_summary:
            return Response(
                {'detail': 'article_text and user_summary are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = evaluate_summary(article_text=article_text, user_summary=user_summary)
        return Response(result)


class EvaluateToneAPIView(APIView):
    def post(self, request):
        passage = request.data.get('passage', '').strip()
        user_tone = request.data.get('user_tone', '').strip()

        if not passage or not user_tone:
            return Response(
                {'detail': 'passage and user_tone are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = evaluate_tone(passage=passage, user_tone=user_tone)
        return Response(result)


class ExplainTextAPIView(APIView):
    def post(self, request):
        selected_text = request.data.get('selected_text', '').strip()
        if not selected_text:
            return Response({'detail': 'selected_text is required'}, status=status.HTTP_400_BAD_REQUEST)

        result = explain_text(selected_text=selected_text)
        return Response(result)


class AnalyticsAPIView(APIView):
    def post(self, request):
        history = request.data.get('attempt_history', [])
        if not isinstance(history, list):
            return Response({'detail': 'attempt_history must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        result = analytics_insights(attempt_history=history)
        return Response(result)


class SaveAttemptAPIView(APIView):
    def post(self, request):
        serializer = AttemptSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        attempt = serializer.save()
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)
