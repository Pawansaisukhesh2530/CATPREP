from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Attempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('article_title', models.CharField(max_length=500)),
                ('score', models.PositiveIntegerField()),
                ('total', models.PositiveIntegerField()),
                ('feedback', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'user',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='varc_attempts',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='QuestionAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question', models.TextField()),
                ('user_answer', models.TextField(blank=True, default='')),
                ('correct_answer', models.TextField(blank=True, default='')),
                ('is_correct', models.BooleanField(default=False)),
                ('explanation', models.TextField(blank=True, default='')),
                ('mistake_type', models.CharField(blank=True, default='', max_length=120)),
                (
                    'attempt',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='question_attempts',
                        to='varc.attempt',
                    ),
                ),
            ],
        ),
    ]
