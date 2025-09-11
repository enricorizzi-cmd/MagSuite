# Team Guide

This document describes how the team works with MagSuite.

## Branching Policy

- `main` holds the latest stable code.
- `staging` aggregates features for validation before release.
- `production` mirrors the live deployment.
- create feature branches from `main` using the pattern `feature/<short-description>` and merge them through pull requests.

## Environments

- **Local**: run services with `./start.sh` or the individual backend and frontend commands.
- **Staging**: code merged into `staging` is automatically built and pushed as container images.
- **Production**: code on `production` is deployed to the live environment.

## CI/CD

GitHub Actions run linting and automated tests for the backend, frontend and Python package. Every pull request must pass the workflow before merging.

## UI Standard: Filtri in Testata per Liste

- Ogni pagina che mostra una lista deve includere, in testata della lista, i filtri che permettono di filtrare quella lista.
- I campi dei filtri devono coprire tutti i campi presenti negli oggetti della lista (esclusi campi non primitivi). Per campi booleani viene mostrato un selettore Sì/No/Tutti; per insiemi con pochi valori un selettore a tendina; per numeri un input di uguaglianza; per stringhe un input di ricerca “contiene”.
- Riutilizzare il componente `frontend/src/components/ListFilters.vue` per garantire coerenza.

Esempio di utilizzo:

```
<ListFilters :items="items" v-slot="{ filtered }">
  <div v-for="it in filtered" :key="it.id"> ... </div>
  <div v-if="filtered.length===0">Nessun risultato con i filtri correnti.</div>
  <!-- Il messaggio "Nessun elemento" resta fuori quando items è vuoto -->
  <!-- Nota: i campi dei filtri vengono derivati automaticamente dagli items -->
  <!-- Opzionale: passare prop 'fields' per definire etichette o forzare i tipi -->
  <!-- <ListFilters :items="items" :fields="[{ key:'status', type:'enum' }]" /> -->
```

Note applicative:

- All Settings (elenco aziende): includere filtro per stato (sospesa/attiva) oltre agli altri campi (`id`, `name`).
- Pagina Utenti: includere filtri per `ruolo` e `stato` (e in generale tutti i campi disponibili negli elementi: `email`, `name`, `company_id`, ecc.).
