# Second Brain AI

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
