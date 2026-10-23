# Hookah Mixer

Serverless веб-приложение: подбирает миксы табака для кальяна по вкусовому описанию, крепости и брендам.
Хостится на GitHub Pages (Jekyll), фронтенд на Vanilla JS + ES modules.

Сайт: https://demansh.github.io/hookah-mixer/ (отладка: `?debug=1`)

## Структура
- `index.html`, `_layouts/`, `_data/i18n/` — страница и тексты интерфейса RU/EN
- `assets/js/` — приложение: `ui/` интерфейс, `engine/` подбор миксов
- `assets/data/` — собранная база (генерируется из `data-src/`, руками не править)
- `data-src/` — исходники базы: теги, бренды, табаки, концепты, миксы, правила
- `eval/` — набор запросов для оценки качества
- `tools/` — скрипты для данных и модели (Python через `uv`)
- `notes/` — журнал замечаний и прогонов eval

## Python-окружение
```bash
uv sync
```

## Выгрузка базы из Google Sheets
```bash
cp tools/sheets.env.example tools/sheets.env
./tools/pull_sheets.sh
```
