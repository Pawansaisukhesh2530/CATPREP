from django.urls import path
from .views import (
    AnalyticsAPIView,
    ArticlesAPIView,
    EvaluateAPIView,
    EvaluateSummaryAPIView,
    ExplainTextAPIView,
    GenerateRCAPIView,
    SaveAttemptAPIView,
)

urlpatterns = [
    path('articles/', ArticlesAPIView.as_view(), name='api-articles'),
    path('generate-rc/', GenerateRCAPIView.as_view(), name='api-generate-rc'),
    path('evaluate/', EvaluateAPIView.as_view(), name='api-evaluate'),
    path('evaluate-summary/', EvaluateSummaryAPIView.as_view(), name='api-evaluate-summary'),
    path('explain-text/', ExplainTextAPIView.as_view(), name='api-explain-text'),
    path('analytics/', AnalyticsAPIView.as_view(), name='api-analytics'),
    path('save-attempt/', SaveAttemptAPIView.as_view(), name='api-save-attempt'),
]
