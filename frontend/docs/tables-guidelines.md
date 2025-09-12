# Linee guida tabelle (uniformità UI)

Obiettivo: ogni vista con elenco/tabella include in modo coerente
1) Filtri
2) Ordinamento
3) Pulsante "Nuovo …"
4) Lista elementi con tutte le colonne rilevanti nello stesso ordine dei filtri
5) Ultima colonna "Azioni" con il tasto "Modifica" che apre il form di modifica

## Componenti da usare
- `ListFiltersTable.vue`: wrapper standard che combina `ListFilters` (filtri+ordinamenti) con la tabella e la colonna Azioni.
  - Props principali:
    - `items: any[]`
    - `fields: Array<{ key: string; label?: string; type: 'string'|'number'|'boolean'|'enum'; options?: any[]; align?: 'left'|'right' }>`
    - `newLabel?: string` (es. "Nuovo cliente")
  - Emits:
    - `new` (apre il form di creazione)
    - `edit` (restituisce la riga da modificare)

## Regole di progettazione
- Filtri
  - I filtri sono generati da `fields` e compaiono nello stesso ordine.
  - Tipi: `string` (contains, case-insensitive), `number` (uguaglianza), `boolean` (Sì/No/Tutti), `enum` (valore esatto da lista `options`).
  - Pulsante "Azzera" quando almeno un filtro è attivo.

- Ordinamento
  - Multi-colonna: clic ripetuto sul chip del campo cicla tra asc → desc → nessuno.
  - I chip mostrano l’indice di priorità e il pulsante "Azzera ordine" azzera tutti.

- Pulsante "Nuovo …"
  - Sempre visibile sopra i filtri se presente `newLabel`.
  - Testo: "Nuovo <entità>" (es. "Nuovo cliente").
  - L’handler nella pagina apre un modal/drawer con il form di creazione.

- Tabella
  - Le colonne seguono esattamente l’ordine di `fields`.
  - Allineamento: numeri a destra, altri a sinistra; possibilità di forzare con `align`.
  - Valori: `-` per vuoti; booleani come `Sì/No`; numeri formattati locale.
  - Empty state: messaggio "Nessun risultato." dentro al contenitore tabellare.

- Colonna Azioni (ultima a destra)
  - Header "Azioni"; per ogni riga un bottone `Modifica` che emette `edit` con l’oggetto riga.
  - La pagina ricevente apre il form di modifica precompilato e, al salvataggio, ricarica i dati.

- Paginazione
  - Posizionata sotto la tabella, con: indicatore pagina, `Indietro/Avanti`, selettore `limit` (20/50/100).
  - La logica resta nella pagina (client-side o server-side in base all’endpoint).

## Eccezioni e casi speciali
- Viste derivate/non anagrafiche (es. Giacenze):
  - Il pulsante "Nuovo" può aprire la creazione dell’entità sorgente (es. "Nuovo articolo").
  - La colonna "Modifica" apre la modifica dell’entità sorgente.
- Flussi operativi (Inventario, Movimenti):
  - L’azione di modifica può essere sostituita da azioni di workflow (freeze/approve/close, conferma documenti).
  - Filtri/ordinamento vanno comunque esposti; se il backend richiede filtri server-side (date range, tipo), replicare la UI mantenendo lo stile coerente.

## Esempio minimo di adozione
```
<ListFiltersTable
  :items="rows"
  :fields="[
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'name', label: 'Nome', type: 'string' }
  ]"
  new-label="Nuovo cliente"
  @new="openCreate"
  @edit="openEdit"
/>
```

## Note di accessibilità
- I modali devono avere titolo, `aria-label` ai bottoni, e chiusura con overlay/ESC.
- Focus iniziale su primo campo del form (da applicare progressivamente).

