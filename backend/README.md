# Django Backend (VARC API)

## Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Ensure `.env.local` exists at workspace root with backend keys.
4. Run migrations:

```bash
python manage.py migrate
```

5. Start server:

```bash
python manage.py runserver
```

## API Endpoints

- `GET /api/articles/?topic=<topic>&page=<page>`
- `POST /api/generate-rc/`
- `POST /api/evaluate/`
- `POST /api/save-attempt/`
