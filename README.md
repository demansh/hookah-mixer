# Hookah Mixer

Serverless веб-приложение: по описанию настроения («свежие тропические фрукты с холодком», «Закат на Мальдивах»)
предлагает 3 микса из 3–4 ароматов с процентами — классика с изюминкой, сбалансированный эксперимент и смелое
сочетание. Без брендов и конкретных табаков: микс можно назвать кальянщику.
Хостится на GitHub Pages (Jekyll), фронтенд на Vanilla JS + ES modules.

Сайт: https://demansh.github.io/hookah-mixer/ (отладка: `?debug=1`)

## Структура
- `index.html`, `_layouts/`, `_data/i18n/` — страница и тексты интерфейса RU/EN
- `assets/js/` — приложение: `ui/` интерфейс, `engine/` подбор миксов
- `assets/data/` — собранная база (генерируется из `data-src/`, руками не править)
- `data-src/tags.csv` — ароматы и свойства вкуса
- `data-src/category_affinity.csv`, `data-src/pairings.csv` — граф сочетаемости ароматов
- `data-src/concepts.yaml` — образы и фразы → ароматы
- `eval/` — набор запросов для оценки качества
- `tools/` — валидатор и сборщик базы (Python через `uv`)

## Работа с базой
```bash
uv sync
uv run tools/validate.py
uv run tools/build.py
```
