# TrueKeate

**TrueKeate** — Plataforma Web3 de intercambio (trueque) de Bienes, Productos, Servicios y Criptos
representados en NFTs, con custodia atómica mediante contrato escrow, reputación comunitaria y
meta-transacciones sin gas (EIP-712).

## Estado del proyecto

- **Fase 1 — Concepto**: completada (requerimientos, diccionario de datos, entornos, decisiones D1–D41).
- **Fase 2 — Auditoría**: completada (informes de auditoría, casos de uso con criterios Gherkin/EARS,
  diagramas CDU, sincronía de documentos, estilo visual RNF-08/RF-19).
- **Fase 3 — Desarrollo**: pendiente (plan de ciclos C1–C8 definido en `arquitectura_tecnica.md`).

## Estructura

| Carpeta | Contenido |
|---|---|
| `RepoTecnico/` | Documentación técnica: `requerimientos.md` (guía principal, D1–D41), `diccionario_datos.md`, `arquitectura_tecnica.md` (ciclos C1–C8), `casos_uso.md` (CU-01…CU-31), `CDU/` (diagramas), informes de auditoría, `estado_proyecto.md` |
| `TrueKeate/` | Activos de marca: logotipos/título (SVG recolorables, PNG, ICO), imágenes hero, guía SBT (RF-19) |

## Ramas

- `escrow-dsh-GCP` — rama de trabajo del proyecto (documentación TrueKeate).
- `main` — rama del repositorio base (contenido previo, sin relación funcional con esta rama).

## Flujo de trabajo

Los commits se crean localmente en `escrow-dsh-GCP` y se cargan (push) a los repositorios remotos
(GitHub, GitLab.com) únicamente cuando el director del proyecto lo indique.
