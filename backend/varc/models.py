from django.conf import settings
from django.db import models


class Attempt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='varc_attempts',
    )
    article_title = models.CharField(max_length=500)
    score = models.PositiveIntegerField()
    total = models.PositiveIntegerField()
    feedback = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.article_title} ({self.score}/{self.total})'


class QuestionAttempt(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name='question_attempts')
    question = models.TextField()
    user_answer = models.TextField(blank=True, default='')
    correct_answer = models.TextField(blank=True, default='')
    is_correct = models.BooleanField(default=False)
    explanation = models.TextField(blank=True, default='')
    mistake_type = models.CharField(max_length=120, blank=True, default='')

    def __str__(self) -> str:
        return f'QuestionAttempt #{self.pk} - correct={self.is_correct}'
