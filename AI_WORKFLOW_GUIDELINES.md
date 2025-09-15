# 🤖 Workflow di Sviluppo Automatico - MagSuite

## 📋 Linee Guida per AI Assistant

### ✅ Operazioni Automatiche (Senza Conferma)

**Commit e Push Automatici:**
- ✅ Correzioni di bug e errori
- ✅ Miglioramenti di codice esistenti
- ✅ Ottimizzazioni di performance
- ✅ Refactoring interno
- ✅ Aggiornamenti di dipendenze minori
- ✅ Fix di linting e formattazione
- ✅ Miglioramenti di documentazione
- ✅ Test e validazioni
- ✅ Correzioni di sicurezza non critiche

**Verifiche Automatiche:**
- ✅ Monitoraggio deployment Render dopo ogni push
- ✅ Controllo log per errori
- ✅ Verifica health check
- ✅ Test con TestSprite ogni 3-5 modifiche significative

### ⚠️ Operazioni che Richiedono Conferma

**Modifiche Strutturali:**
- 🔄 Cambiamenti architetturali importanti
- 🔄 Modifiche al database schema (nuove tabelle/colonne)
- 🔄 Cambiamenti alle API pubbliche
- 🔄 Modifiche alle configurazioni di produzione
- 🔄 Aggiornamenti di dipendenze major
- 🔄 Cambiamenti alle variabili d'ambiente critiche

**Operazioni Sensibili:**
- 🔄 Rollback o reset del database
- 🔄 Modifiche ai file di configurazione Render
- 🔄 Cambiamenti ai secret e API key
- 🔄 Deploy in produzione con modifiche breaking

### 🚀 Workflow Standard

1. **Analisi e Implementazione**
   - Identificare il problema/feature
   - Implementare la soluzione
   - Testare localmente se possibile

2. **Commit Automatico**
   ```bash
   git add .
   git commit -m "🔧 [TIPO] Descrizione chiara della modifica"
   git push
   ```

3. **Monitoraggio Render**
   - Controllare status deployment
   - Verificare log per errori
   - Testare health check
   - Documentare risultati

4. **TestSprite Periodico**
   - Ogni 3-5 modifiche significative
   - Analisi completa del codebase
   - Report di qualità e sicurezza

### 📝 Convenzioni Commit

**Formato:** `🔧 [TIPO] Descrizione`

**Tipi:**
- `🔧 FIX` - Correzioni bug
- `✨ FEAT` - Nuove funzionalità
- `⚡ PERF` - Ottimizzazioni performance
- `🔒 SEC` - Miglioramenti sicurezza
- `📚 DOCS` - Documentazione
- `🧪 TEST` - Test e validazioni
- `♻️ REFACTOR` - Refactoring
- `🚀 DEPLOY` - Modifiche deployment

**Esempi:**
```bash
git commit -m "🔧 FIX: Resolve database connection timeout"
git commit -m "✨ FEAT: Add user authentication middleware"
git commit -m "⚡ PERF: Optimize database queries with indexes"
git commit -m "🔒 SEC: Add input validation to API endpoints"
```

### 🔍 Verifiche Post-Deploy

**Automatiche:**
- ✅ Status deployment Render
- ✅ Health check endpoint
- ✅ Log errori ultimi 10 minuti
- ✅ Metriche CPU/Memory

### ⏱️ Regola ferrea di verifica deploy (auto-timeout)
- Polling ogni 15 secondi dello stato deploy finché non è `live/healthy` o `failed`.
- Non chiudere la task finché l’esito non è determinato (success/fail).
- In caso di `build_in_progress` prolungato (>10 minuti) segnare come fail temporaneo e aprire azione di remediation.

**Periodiche (ogni 3-5 deploy):**
- 🔍 TestSprite codebase analysis
- 🔍 Security scan completo
- 🔍 Performance analysis
- 🔍 Database health check

### 📊 Reporting

**Dopo ogni deploy:**
- Status: ✅ Successo / ❌ Errore
- Tempo deploy: X minuti
- Errori risolti: Lista
- Prossimi passi: Se necessario

**Report TestSprite:**
- Qualità codice: Score/10
- Vulnerabilità: Lista
- Performance: Metriche
- Raccomandazioni: Action items

### 🎯 Obiettivi

- **Zero manualità** per modifiche routine
- **Deploy automatico** per ogni commit
- **Monitoraggio proattivo** di Render
- **Qualità continua** con TestSprite
- **Documentazione automatica** dei cambiamenti

### 🧱 Regola d'oro di deploy (Render)

- L'applicazione deve essere servita da **un unico servizio Render** che include:
  - **Backend Node** (API)
  - **Frontend statico** buildato nello stesso container (Vite → copiato in `./public`)
  - **Accesso al database Supabase** tramite le env del medesimo servizio
- Non creare servizi separati per frontend o backend. Il blueprint `render.yaml` e il `backend/Dockerfile` sono la fonte di verità per questa architettura.

### 🔁 Regola ferrea post-attività (sempre)

Al termine di ogni attività, seguire rigorosamente la sequenza:

1. **Commit** delle modifiche
2. **Push** del branch
3. **Verifica deploy** (stato/health/log su Render)
4. **Eventuali correzioni** se necessari problemi
5. Nuovo **commit** + **push**
6. Una volta verde: merge su `main` ⇒ **live**

Questa sequenza è obbligatoria e non va saltata.

---

**🤖 Questa linea guida è attiva e permanente. L'AI Assistant seguirà automaticamente questo workflow per tutte le operazioni di sviluppo.**

**📅 Ultimo aggiornamento:** 2025-09-14  
**🔄 Prossima verifica TestSprite:** Dopo 3 modifiche significative
