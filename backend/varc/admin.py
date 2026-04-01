from django.contrib import admin
from .models import Attempt, QuestionAttempt


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'article_title', 'score', 'total', 'created_at')
    search_fields = ('article_title',)


@admin.register(QuestionAttempt)
class QuestionAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'attempt', 'is_correct', 'mistake_type')
    search_fields = ('question',)
