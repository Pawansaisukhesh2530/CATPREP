from rest_framework import serializers
from .models import Attempt, QuestionAttempt


class QuestionAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionAttempt
        fields = (
            'id',
            'question',
            'user_answer',
            'correct_answer',
            'is_correct',
            'explanation',
            'mistake_type',
        )
        read_only_fields = ('id',)


class AttemptSerializer(serializers.ModelSerializer):
    question_attempts = QuestionAttemptSerializer(many=True)

    class Meta:
        model = Attempt
        fields = (
            'id',
            'user',
            'article_title',
            'score',
            'total',
            'feedback',
            'created_at',
            'question_attempts',
        )
        read_only_fields = ('id', 'created_at', 'user')

    def create(self, validated_data):
        question_data = validated_data.pop('question_attempts', [])
        request = self.context.get('request')
        user = None
        if request and request.user and request.user.is_authenticated:
            user = request.user

        attempt = Attempt.objects.create(user=user, **validated_data)
        for item in question_data:
            QuestionAttempt.objects.create(attempt=attempt, **item)
        return attempt
