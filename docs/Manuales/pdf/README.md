# PDF de manuales — TrueKeate

Versión descargable (A4) de los manuales literales de `docs/Manuales/`, con el
estilo visual del proyecto (paleta navy/teal/cyan/gold, tipografía sans-serif).

## Contenido

- `*.pdf` — un PDF por manual, con portada (TrueKeate + tema), índice y
  contenido con headers/footers y figuras embebidas.
- `html/` — los HTML autocontenidos e intermedios (mismo nombre que el PDF).
- Nomenclatura: `<carpeta>-<archivo>.pdf`, p. ej. `03-Implementacion-01-contratos-escrow.pdf`.

## Regenerar los PDF (comando exacto)

Playwright + Chromium ya están instalados en `web/`. Desde `web/`:

```bash
cd web

export LD_LIBRARY_PATH=/tmp/playwright-libs/extracted/usr/lib/x86_64-linux-gnu:/tmp/playwright-libs/extracted/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
export FONTCONFIG_PATH=/tmp/fontconfig
export FONTCONFIG_FILE=/tmp/fontconfig/fonts.conf

node scripts/generar-pdfs.mjs
```

El script lee los `.md` de `docs/Manuales/` (español), genera los HTML
estilizados en `docs/Manuales/pdf/html/` y produce cada PDF A4 en
`docs/Manuales/pdf/` mediante Playwright Chromium (`page.pdf`, formato A4,
`printBackground`, headers/footers).

> Si solo se quieren regenerar los HTML (sin Chromium):
> `HTML_ONLY=1 node scripts/generar-pdfs.mjs`
