# Requisiti di Scalabilità e Sicurezza

Questo documento sintetizza obiettivi e standard per l'infrastruttura MagSuite.

## Obiettivi di Scalabilità e SLA

- Gestire almeno 10k richieste al minuto con possibilità di scaling orizzontale tramite container aggiuntivi.
- Rimanere operativo con un uptime del 99.9% e un tempo di risposta medio inferiore ai 200 ms.
- Recovery Time Objective (RTO) di 1 ora e Recovery Point Objective (RPO) di 15 minuti.

## Standard di Sicurezza

- Autenticazione e autorizzazione basate su ruoli.
- Monitoraggio e registrazione degli accessi con audit trail.
- Aggiornamento regolare delle dipendenze e applicazione di patch di sicurezza.
- Protezione delle variabili sensibili attraverso segreti e permessi limitati.

## Crittografia

- TLS 1.2+ per tutti i servizi esposti pubblicamente.
- Crittografia AES-256 per i dati a riposo, incluse le copie di backup.
- Hash delle password con algoritmi come bcrypt con salt.

## Backup

- Backup incrementali giornalieri del database e settimanali completi.
- Conservazione delle copie per almeno 30 giorni in storage geograficamente separato.
- Verifica trimestrale del ripristino da backup.

## Condivisione e Revisione

- Salvare questo documento nel repository e condividerlo sui canali interni (es. Slack, e-mail).
- Riesaminare i requisiti ad ogni release principale.

