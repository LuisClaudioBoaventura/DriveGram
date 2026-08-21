# 🚀 DriveGram - Armazenamento em Nuvem com Interface Google Drive/OneDrive sobre Telegram

O **DriveGram** é uma aplicação completa de armazenamento em nuvem inspirada no Google Drive e OneDrive, utilizando as **Mensagens Salvas** (*Saved Messages*) do **Telegram** como backend de armazenamento ilimitado e gratuito (com suporte a até 2GB por arquivo ou 4GB no Telegram Premium).

---

## ✨ Principais Funcionalidades

### 1. 📁 Sistema de Pastas & Subpastas Ilimitadas
- Crie pastas, subpastas com cores personalizadas e navegação por *Breadcrumbs*.
- Arraste e solte (*Drag & Drop*) arquivos de qualquer formato.
- Visualização em **Grade** (Cards) ou **Lista Detalhada** com ordenação por Nome, Tamanho, Data e Tipo.
- Busca rápida global com filtros (Vídeos, PDFs, Documentos, Imagens, Áudios).

### 2. 🎓 Módulo de Cursos com Índice Rápido & Reprodução Sequencial
- **Índice Rápido de Aulas**: Sidebar retrátil com Módulos e Aulas sequenciais, marcação de conclusão (check verde) e duração.
- **Reprodução em Sequência (Autoplay Contínuo)**:
  - Botão de alternância *Reprodução em Sequência (ON/OFF)*.
  - Contagem regressiva visual de 5 segundos ao término de cada vídeo antes de passar para a próxima aula.
  - Botões rápidos: "Aula Anterior" / "Próxima Aula".
  - Seletor de velocidade (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`).
  - Anotações da aula sincronizadas em tempo real.
  - Materiais de apoio complementares (PDFs de aula).

### 3. ☁️ Persistência em Nuvem (Zero Perda de Dados)
- **Manifesto nas Mensagens Salvas**: O DriveGram grava automaticamente um manifesto `#drivegram_metadata_sync` no seu chat de Mensagens Salvas no Telegram.
- **Restauração Instantânea**: Ao formatar o computador ou abrir o DriveGram em outro PC, basta clicar em "Restaurar do Telegram" para reconstruir 100% da sua árvore de pastas, cursos e metadados.
- **Backup Manual**: Suporte a exportação e importação de arquivo `.json`.

### 4. 🎬 Streaming & Visualizador Universal
- Streaming contínuo de vídeo e áudio sem precisar baixar o arquivo completo antes.
- Visualizador de PDFs, Lightbox de imagens e arquivos de código.

---

## 🛠️ Como Executar

### 1. Instalar as Dependências
Abra o terminal na pasta do projeto e execute:
```bash
npm install
```

### 2. Iniciar a Aplicação (Frontend + Backend)
```bash
npm start
```
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`

---

## 🔑 Como Obter as Credenciais do Telegram (Opcional para conexão direta)
1. Acesse [my.telegram.org](https://my.telegram.org) e faça login com seu número.
2. Vá em **API Development Tools** e crie uma aplicação.
3. Copie o **`api_id`** e o **`api_hash`**.
4. No DriveGram, clique em **"Conectar Telegram"** no canto superior direito, insira os dados e digite o código de confirmação recebido no seu aplicativo Telegram.
