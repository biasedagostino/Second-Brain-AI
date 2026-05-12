# Second Brain AI (v20260512.03)

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
