# Second Brain AI (v20260512.09)

## 🛡️ Protezione Salvataggio Duplicati (Aggiornamento 2026-05-12.09)
- **Controllo Concorrenza:** Implementato uno stato di caricamento (`isSavingInsight`) che disabilita i pulsanti e i menu a tendina durante il salvataggio di un approfondimento nella Wiki.
- **Prevenzione Note Doppie:** Risolto un problema che poteva causare la creazione di più documenti identici in caso di clic multipli o interazioni rapide durante l'indicizzazione AI.

## 📖 Lettura Estesa nella Wiki (Aggiornamento 2026-05-12.08)
- **Modalità Lettura:** Abilitata la possibilità di cliccare sulle voci della Wiki per aprirle in modalità estesa.
- **Coerenza UI:** Integrato il componente `ExpandableNote` anche nel modulo Wiki, permettendo di leggere il contenuto completo, visualizzare i tag e avviare una ri-analisi IA direttamente dalla Wiki.

## ⚙️ Configurazione Prompt Ricerca (Aggiornamento 2026-05-12.07)
- **Prompt AI Esteso:** Aggiunta la possibilità di personalizzare il prompt utilizzato per la "Ricerca Wiki" nella sezione Impostazioni.
- **Sincronizzazione Cloud:** Il nuovo prompt è ora salvato e sincronizzato su Firestore per ogni utente autorizzato.
- **Variabili Dinamiche:** Supporto per la variabile `{{topic}}` nel prompt di ricerca per definire come l'AI deve analizzare i temi online.

## 📚 Nuova Funzione Wiki & Ricerca Online (Aggiornamento 2026-05-12.06)
- **Modulo Wiki:** Introdotta una nuova sezione "Wiki" per l'organizzazione strutturata della conoscenza. Le note sono ora catalogate per categorie (tag) con una navigazione laterale dedicata.
- **Ricerca Approfondimenti Online:** Implementata la possibilità di effettuare ricerche di approfondimento direttamente dal portale. L'AI analizza il web (simulato) per fornire nuovi dati su temi specifici.
- **Note di Approfondimento:** I risultati della ricerca possono essere salvati come nuove voci della Wiki o collegati direttamente come "approfondimenti" a note già esistenti, creando una gerarchia di conoscenza.

## 🔧 Fix TypeScript Environment Types (Aggiornamento 2026-05-12.05)
- **Definizioni Vite:** Aggiunto il file `vite-env.d.ts` per risolvere l'errore di compilazione TypeScript relativo a `import.meta.env`.

## 🛠️ Correzione Ri-analisi AI (Aggiornamento 2026-05-12.04)
- **Robustezza Parsing JSON:** Implementata una logica di estrazione JSON più resiliente in `indexContent` per gestire risposte AI che includono testo extra prima o dopo l'oggetto JSON.
- **Feedback Utente:** Aggiunta la gestione degli errori e notifiche (alert) nel processo di ri-analisi per informare l'utente in caso di fallimento del servizio.
- **Validazione Risultati:** Inseriti controlli di tipo e validità sui dati restituiti dall'AI per prevenire sovrascritture di dati vuoti o corrotti in Firestore.

## 🧠 Potenziamento Connessioni Semantiche (Aggiornamento 2026-05-12.03)
- **Prompt Strutturato:** Ottimizzato il motore di indicizzazione con uno schema JSON rigoroso per garantire che le connessioni suggerite dall'AI siano sempre consistenti con la struttura dati del sistema.
- **Raffinamento "suggestedConnections":** Migliorata la logica di associazione tra le nuove note e quelle esistenti, forzando l'AI a cercare attivamente punti di contatto all'interno del database di tag già presenti.
- **Normalizzazione Tag Avanzata:** Incrementata l'accuratezza nella deduplicazione dei tag, riducendo la frammentazione nel grafo della conoscenza.

## 🔗 Link Cliccabili e Markdown (Aggiornamento 2026-05-12.02)
- **Supporto Bare URLs:** Implementato il plugin `remark-gfm` per rendere automaticamente cliccabili i link testuali (es. https://...) inseriti nelle note o generati dall'AI.
- **Navigazione Esterna Sicura:** Tutti i link vengono ora aperti automaticamente in una nuova scheda (`target="_blank"`) con attributi di sicurezza (`rel="noopener noreferrer"`), evitando di abbandonare il portale.
- **Miglioramento Rendering:** Ottimizzato il rendering markdown per supportare tabelle, liste di controllo e altre funzionalità GFM (GitHub Flavored Markdown).

## 📱 Ottimizzazione Mobile (Aggiornamento 2026-05-12.01)
- **Risoluzione Problemi Visibilità:** Corretto un bug critico nel layout CSS che rendeva l'applicativo non visibile su alcuni smartphone. Implementato l'utilizzo di `h-svh` (Small Viewport Height) per gestire correttamente le barre degli strumenti dei browser mobili (Safari, Chrome).
- **Contenitore Flex-Responsive:** Aggiornato il contenitore principale per supportare correttamente l'alternanza tra visualizzazione mobile (colonna) e desktop (riga), garantendo che il contenuto occupi sempre lo spazio corretto senza clipping.
- **Miglioramento Scrolling:** Ottimizzata la gestione dell'overflow per assicurare una navigazione fluida e reattiva su schermi touch.


A powerful personal knowledge management system that utilizes AI to index your thoughts, automate note connections, and provide context-aware answers to your questions.

## Features

- **Intelligent Indexing:** Automatically generates summaries and keywords for your notes, websites, and documents.
- **AI-Powered Semantic Search:** Easily find related information with context-aware question answering.
- **Automatic Connections:** Discover hidden relationships between entries in your graph.
- **Material Design 3:** A clean, functional, and aesthetic interface.
- **Google Drive Integration:** Seamlessly upload and reference your documents/images directly in your notes.
- **Multi-API Support:** Configure multiple OpenRouter API keys for your preferred LLMs.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd second-brain-ai
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in the required values.

4. Run the development server:
   ```bash
   npm run dev
   ```

## Security & Privacy Note

This repository is designed to be shared. Please ensure that you do **not** commit any sensitive files or configuration files that contain API keys or proprietary information.
- The project is configured to automatically ignore sensitive files (e.g., `firebase-applet-config.json`, `.env*`, etc.) using `.gitignore`.
- Always verify your `.gitignore` settings before committing and pushing code.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
