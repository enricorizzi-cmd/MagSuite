Multi-column sorting for lists
================================

All list/table views must support tri-state, multi-column sorting:

- First click: ascending
- Second click: descending
- Third click: remove sorting for that column

Columns used for sorting show a small arrow (up/down) and a number that indicates the sort priority (1 = first, then 2, etc.).

How it’s implemented
--------------------

- The shared component `frontend/src/components/ListFilters.vue` now includes sorting controls and applies ordering to the items it exposes via the default slot prop `filtered`.
- Sorting is sequential and stable; when multiple columns are selected, ordering is applied in the order columns were activated.
- Sorting compares values by inferred field type: numbers numerically, booleans as false < true, strings case-insensitively. Null/undefined values are placed last.

How to use in pages
-------------------

- Wrap lists with `ListFilters` (as already done in several pages) and consume the `filtered` slot prop as the source of items to render. No code changes are required to enable sorting where `ListFilters` is used.
- The sorting header appears automatically using inferred fields from the provided items. If you need custom labels or a restricted set/order of fields, pass `fields` to `ListFilters`:

```vue
<ListFilters :items="rows" :fields="[
  { key: 'status', label: 'Stato', type: 'enum', options: ['active','pending','suspended'] },
  { key: 'role', label: 'Ruolo', type: 'string' },
  { key: 'last_login', label: 'Ultimo Login', type: 'string' }
]" v-slot="{ filtered }">
  <!-- render filtered rows here -->
</ListFilters>
```

Notes
-----

- Keep using `filtered` for rendering; it now includes both filter and sort transformations.
- Prefer `ListFilters` in all new list/table views to get consistent filters and sorting across the app.

