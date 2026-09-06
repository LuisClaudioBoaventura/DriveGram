# 🚀 DriveGram

<div align="center">

<img width="1855" height="917" alt="DriveGram - Home" src="https://github.com/user-attachments/assets/02e37ab8-f9ef-4908-9eff-5abc638a7db4" />

**Seu ecossistema completo de armazenamento em nuvem ilimitado, streaming e bibliotecas digitais — com interface moderna inspirada no Google Drive e OneDrive, potencializado pela infraestrutura do Telegram.**

**Your complete ecosystem for unlimited cloud storage, streaming, and digital libraries — featuring a modern interface inspired by Google Drive and OneDrive, powered by Telegram's infrastructure.**

<br />

[![Licença: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram MTProto](https://img.shields.io/badge/Telegram-MTProto%20GramJS-2CA5E0.svg)](https://telegram.org/)
[![Android Capacitor](https://img.shields.io/badge/Android-Capacitor%208-brightgreen.svg)](https://capacitorjs.com/)
[![Desktop Tauri v2](https://img.shields.io/badge/Desktop-Tauri%20v2%20(Rust)-24C8D8.svg)](https://tauri.app/)
[![Node.js Mobile](https://img.shields.io/badge/Node.js%20Mobile-Embedded%20Engine-orange.svg)](https://github.com/red-mobile/nodejs-mobile-cordova)

<br />

**Idiomas / Languages:**  
[ 🇧🇷 **Português** ](#portugues) &nbsp;•&nbsp; [ 🇺🇸 **English** ](#english) &nbsp;*(or view [README.en.md](README.en.md))*

</div>

---

<a id="portugues"></a>
# 🇧🇷 DriveGram - Português

## 📖 Sobre o Projeto

O **DriveGram** transforma as **Mensagens Salvas (*Saved Messages*)** do seu **Telegram** em uma nuvem pessoal corporativa, ilimitada e com streaming de altíssima velocidade.

Esqueça as limitações de espaço dos serviços tradicionais pagos. No DriveGram você conta com:
- **Armazenamento 100% Ilimitado e Gratuito**: Arquivos de até **2 GB** cada (ou até **4 GB** por arquivo para usuários do Telegram Premium).
- **Streaming Instantâneo sem Download Prévio**: Assista a filmes, aulas e ouça músicas/audiolivros direto da nuvem via protocolo *HTTP 206 (Partial Content)*.
- **Ecossistema Multiplataforma (Desktop & Android APK)**: Funciona no computador (Windows/Mac/Linux) e possui aplicativo nativo Android (`.apk`) com servidor Node.js embutido que roda 100% independente no celular (sem precisar do PC ligado).
- **Sincronização Ativa & Backup Contínuo**: Seus dados e pastas são sintetizados em manifestos seguros (`#drivegram_metadata_sync`) no Telegram, com restauração em 1 clique e política inteligente de retenção.

---

## 📥 Downloads Prontos para Uso (Instalação Fácil)

Baixe os instaladores oficiais da versão mais recente diretamente na [**Página de Releases do GitHub**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/tag/v1.2.0):

| Plataforma | Pacote / Instalador | Tamanho | Descrição | Link Direto |
| :--- | :--- | :--- | :--- | :--- |
| 💻 **Windows Desktop** | **`DriveGram-Setup.exe`** | **`4,33 MB`** | **Recomendado**. Instalador executável nativo ultraleve (Tauri v2) com assistente de instalação e atalho na Área de Trabalho. | [⬇️ **Download .EXE**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram-Setup.exe) |
| 🏢 **Windows Corporativo** | **`DriveGram.msi`** | **`13,24 MB`** | Pacote de instalação corporativa Windows Installer (.msi nativo). | [⬇️ **Download .MSI**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.msi) |
| 📱 **Android** | **`DriveGram.apk`** | **`82,8 MB`** | Aplicativo Android oficial com servidor Node.js embutido de inicialização autônoma. | [⬇️ **Download .APK**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.apk) |

> 🏷️ *Todos os instaladores, notas de atualização e código fonte também estão disponíveis na [Aba de Releases](https://github.com/LuisClaudioBoaventura/DriveGram/releases).*

---

## 🌟 Todas as Funcionalidades e Bibliotecas

O DriveGram é dividido em módulos inteligentes e dedicados para cada tipo de mídia e necessidade:

### 📁 1. Meu Drive (Gerenciador de Arquivos Completo)
- **Árvore de Diretórios Ilimitada**: Crie pastas e subpastas sem limite de profundidade, com cores personalizáveis e navegação por *Breadcrumbs* (migalhas de pão).
- **Deduplicação Inteligente de Pastas**: Algoritmo semântico que identifica pastas padrão, remove duplicatas vazias e preserva com segurança todos os seus arquivos.
- **Upload Inteligente (Drag & Drop)**: Arraste e solte arquivos individuais ou pastas inteiras diretamente para o aplicativo.
- **Upload Manager Flutuante**: Gerenciador de uploads em segundo plano com barra de progresso, taxa de transferência e controle de fila.
- **Modos de Exibição**: Alterne entre **Grade (Cards)** com miniaturas e **Lista Detalhada** com ordenação por Nome, Tamanho, Data e Tipo.
- **Busca e Filtros Rápidos**: Encontre qualquer item instantaneamente e filtre por Vídeos, Áudios, PDFs, Documentos, Imagens, Códigos e Arquivos Compactados.
- **Favoritos e Lixeira Segura**: Marque arquivos importantes com estrela e conte com lixeira para restauração ou exclusão definitiva.
- **Localizador de Duplicados**: Varredura automática para identificar e limpar arquivos repetidos.
- **Movimentação Inteligente**: Mova arquivos e pastas entre diretórios com facilidade.

---

### 🎓 2. Cursos & Estudos (Ambiente Virtual de Aprendizagem - AVA)
- **Estruturação por Módulos & Aulas**: Organize seus cursos em pastas por módulos com contagem automática de aulas e duração total.
- **Reprodução Sequencial Automática (*Autoplay*)**: Contagem regressiva visual de 5 segundos ao término de uma aula antes de avançar para a próxima.
- **Memorização de Progresso**: O sistema memoriza o segundo exato onde você parou de assistir em cada vídeo.
- **Marcadores de Tempo (*Timestamps*)**: Salve capítulos ou momentos importantes da aula com link clicável.
- **Legendas Automáticas (.vtt/.srt)**: Detecção e renderização automática de legendas localizadas na mesma pasta.
- **Materiais de Apoio & PDFs**: Acesso direto a slides e apostilas anexadas ao curso.
- **Bloco de Anotações Sincronizado**: Escreva notas individuais por aula com salvamento em tempo real.
- **Controle de Conclusão**: Marque aulas como concluídas (check verde) e acompanhe a barra de progresso do curso.

---

### 🎬 3. Filmes & Cinema (Catálogo Streaming)
- **Interface Estilo Netflix/Prime**: Pôsteres cinematográficos, badges de qualidade, gêneros, ano e duração.
- **Integração com API OMDb**: Busca automática por título ou código IMDb para preencher sinopse, diretor, elenco, prêmios, classificação indicativa e notas do **IMDb** e **Metascore**.
- **Player de Cinema Avançado**:
  - **Picture-in-Picture (PiP) Contínuo**: Assista em janela flutuante enquanto navega por outras abas. O botão *"Voltar para a Guia"* restaura a tela cheia instantaneamente.
  - **Legendas Customizadas**: Seleção e upload de faixas de legendas.
  - **Capítulos & Timestamps**: Navegação direta por cenas e momentos-chave.
  - **Atalhos de Teclado**: Espaço (Play/Pause), Setas (Avançar/Retroceder 10s), `F` (Tela Cheia), `M` (Mudo).
- **Gerenciador de Categorias**: Crie e personalize seus próprios gêneros cinematográficos.

---

### 📹 4. Vídeos & Mídias Pessoais (Memórias de Família e Vlogs)
- **Biblioteca Dedicada**: Espaço próprio para vídeos de viagens, família, eventos, vlogs e gravações pessoais.
- **Filtros Avançados**: Filtre por Categorias, Pessoas presentes, Local do evento, Data e Tags personalizadas.
- **Player com Histórico**: Retoma cada vídeo do ponto exato onde você pausou.

---

### 🎧 5. Livros & Audiolivros (Estúdio Hi-Fi & Leitor de E-books)
- **Suporte Híbrido**: Áudios (MP3, M4A, AAC, FLAC) + Livros Digitais (PDF, EPUB, CBR, CBZ).
- **3 Modos de Visualização**:
  1. **Modo Apenas Áudio (Padrão)**: Layout adaptativo inteligente estilo *Widescreen de Estúdio Hi-Fi* com capa em destaque, iluminação dinâmica, barra de progresso ampla e seletor de velocidade (`0.75x` a `2x`).
  2. **Modo Ouvir & Ler (Dividido / Split)**: Player de áudio compacto à esquerda e leitor de PDF à direita para leitura acompanhada.
  3. **Modo Leitor de E-book/PDF**: Leitor imersivo de tela cheia.
- **Miniplayer Flutuante Global**: Continue ouvindo o audiolivro em uma barra flutuante enquanto navega em qualquer outra aba.
- **Temporizador de Sono (*Sleep Timer*)**: Pausa o áudio automaticamente após 15, 30, 45 ou 60 minutos.
- **Integração Google Books**: Busca automática de capas e metadados literários.

---

### 📚 6. Quadrinhos, HQs & Mangás (Comics Studio)
- **Suporte Completo a Formatos**: Leitura direta de arquivos **.cbr**, **.cbz**, **.pdf** e **.epub**.
- **Descompactação em Tempo Real**: Descompactação nativa de arquivos compactados no backend via WebAssembly (`node-unrar-js` + `unrar.wasm`) e `jszip`.
- **Ferramenta de Lupa Interativa (Magnifier Tool)**: Lupa com ampliação ajustável sob o cursor ou toque, ideal para ler balões de fala e detalhes de arte no Desktop e no APK Android.
- **Modos de Visualização**: Ajuste de largura, modo tela cheia, navegação por miniaturas e transição suave entre páginas.

---

### 📺 7. Séries & Animes
- **Organização em Temporadas & Episódios**: Painel de exibição com sinopse, capa, contagem de episódios e controle de episódios já assistidos.
- **Histórico de Reprodução**: Retomada automática de onde parou em cada episódio.

---

### 🎙️ 8. Podcasts & Programas de Áudio
- **Gerenciador de Episódios**: Controle de audição, notas, marcadores de tempo e histórico de reprodução.
- **Player Flutuante Dedicado**: Navegue livremente pelo app enquanto ouve seus podcasts favoritos.

---

### 📥 9. Importador do YouTube
- **Download & Envio Direto**: Baixe vídeos ou faixas de áudio do YouTube colando a URL no modal de importação.
- **Destino Personalizado**: Escolha em qual pasta do "Meu Drive" o arquivo será salvo antes de ser sincronizado com a nuvem do Telegram.

---

### 🔐 10. Red Locker (Cofre Seguro)
- **Área Protegida por Senha/PIN**: Acesso restrito com bloqueio automático por tempo de inatividade.
- **Catálogo Especializado**: Gestão de atores/performers, estúdios, categorias e tags personalizadas.
- **Estrutura Isolada**: Mantém mídias confidenciais totalmente separadas da navegação pública.

---

## 🔄 Sincronização Inteligente & Política de Retenção

O DriveGram possui uma arquitetura de sincronização de metadados de última geração:

1. **Startup Sync Ativo**:
   - Ao iniciar o aplicativo (Desktop ou APK Android), se já houver uma sessão ativa do Telegram, o app verifica imediatamente as Mensagens Salvas por manifestos mais recentes (`#drivegram_metadata_sync`), trazendo atualizações feitas em outros dispositivos.
2. **Auto-Backup Reativo**:
   - Sempre que você criar, editar, mover ou excluir um arquivo/pasta, um backup automático em segundo plano é agendado com debounce inteligente (3.5s) e gravado na nuvem.
3. **Política de Retenção & Limpeza de Histórico**:
   - Para não sobrecarregar as Mensagens Salvas com dezenas de mensagens antigas, o DriveGram aplica uma política de retenção configurável (`metadataRetentionCount`, padrão = 1). Ele apaga automaticamente as mensagens de sincronização anteriores, mantendo apenas a versão mais atualizada.
4. **Primeira Inicialização Limpa**:
   - Em novas instalações sem login, a base de dados inicia 100% zerada (0 arquivos, 0 MB), sem carregar dados fictícios antigos. Após o primeiro login, os metadados são restaurados automaticamente da sua nuvem.

---

## 📱 Aplicativo Android Nativo (.APK)

O DriveGram conta com suporte nativo a Android com **Capacitor 8** e **Node.js Mobile**:

- **Servidor Node.js Embutido**: O backend Express + GramJS roda localmente dentro do próprio dispositivo Android através do `libnode.so` (compilado para arquiteturas `arm64-v8a`, `armeabi-v7a` e `x86_64`).
- **Independência Total**: O APK não depende de nenhum computador ligado nem de servidores externos intermediários.
- **Health Check de Inicialização**: A Activity principal do Android monitora o boot do servidor embutido via `/api/health` antes de exibir a interface, evitando telas brancas ou erros de conexão.

### Como Gerar o APK do Android:
```bash
# 1. Compilar o frontend e sincronizar o servidor embutido
npm run mobile:sync

# 2. Gerar o APK de instalação diretamente (requer Android SDK / Gradle)
npm run mobile:apk
```
O arquivo final compilado estará disponível na raiz do projeto como **`DriveGram.apk`**.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Desktop Nativo (Windows)** | **Tauri v2**, Rust 2021, Microsoft Edge WebView2, Node.js Sidecar |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Node.js, Express, TypeScript, GramJS (Telegram MTProto Client), esbuild |
| **Mobile (Android)** | Capacitor 8, Node.js Mobile (`@red-mobile/nodejs-mobile-cordova`), esbuild |
| **Descompactação & Formatos** | WebAssembly `node-unrar-js` (`unrar.wasm`), `jszip`, `pdfjs-dist`, `epubjs` |
| **Banco de Dados Local** | Persistência em JSON com sincronização em nuvem e deduplicação semântica |
| **Streaming** | Protocolo HTTP 206 (Partial Content) com suporte a streaming direto e cache local |
| **APIs Externas** | OMDb API (Filmes), Google Books API (Livros) |

---

## 🚀 Guia de Instalação e Uso

### 💻 1. Como Instalar no Windows (Aplicativo Desktop Nativo)

O DriveGram Desktop foi construído com **Tauri v2**, tornando-o ultraleve: consome apenas **~70 MB a 100 MB de RAM** (ao contrário de aplicativos tradicionais em Electron que exigem mais de 350 MB) e o instalador tem apenas **~4,33 MB**!

1. **Baixar o Instalador**: Baixe o arquivo [**`DriveGram-Setup.exe`**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram-Setup.exe) na [Página de Releases](https://github.com/LuisClaudioBoaventura/DriveGram/releases/tag/v1.2.0) (ou [versão MSI corporativa](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.msi)).
2. **Executar a Instalação**:
   - Dê um duplo clique no arquivo `.exe`.
   - *Nota de Segurança:* Se o Windows SmartScreen exibir um aviso de *"O Windows protegeu o seu computador"*, clique em **"Mais informações"** e depois em **"Executar assim mesmo"** (isso ocorre pois o instalador é novo e de código aberto).
3. **Pronto para Usar**: O DriveGram criará um atalho oficial no seu Menu Iniciar e na Área de Trabalho.
4. **🛠️ Recursos de Diagnóstico & Depuração (Debug)**:
   - **Atalho F12 (DevTools)**: Pressione `F12` em qualquer tela do app para abrir o console de desenvolvedor (DevTools) e inspecionar requisições, erros ou elementos visuais.
   - **Logs do Servidor**: Nas configurações do servidor, clique em **"Pasta de Logs"** para acessar diretamente o arquivo `drivegram.log`.

---

### 📱 2. Como Instalar no Android (.APK)

O aplicativo Android funciona de forma 100% autônoma, sem necessitar de nenhum computador ligado por perto, graças ao seu servidor Node.js embutido.

1. **Baixar o APK**: Baixe o arquivo [**`DriveGram.apk`**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.apk) na [Página de Releases](https://github.com/LuisClaudioBoaventura/DriveGram/releases/tag/v1.2.0) diretamente no seu smartphone Android.
2. **Autorizar Instalação**:
   - Abra o arquivo baixado.
   - Se o Android solicitar, permita a instalação a partir do navegador ou gerenciador de arquivos em *"Instalar apps desconhecidos"*.
3. **Abrir o Aplicativo**:
   - Ao abrir pela primeira vez, o DriveGram aguarda cerca de 3 a 5 segundos enquanto o servidor interno inicializa (`/api/health`).
   - A tela inicial se abrirá pronta para você conectar sua conta do Telegram!

---

### 👨‍💻 3. Execução para Desenvolvedores (Código Fonte)

Se você deseja rodar ou modificar o código-fonte:

#### Pré-requisitos:
- **Node.js (v18+)** e **npm**
- **Rust e Cargo** (necessários para compilar o Tauri Desktop)

#### Comandos Rápidos:
```bash
# 1. Instalar as dependências
npm install

# 2. Rodar o App Desktop em modo Desenvolvimento (Tauri + Hot-reload)
npm run desktop:dev
# (Ou dê dois cliques no arquivo 'iniciar_desktop.bat')

# 3. Rodar a versão Web tradicional no Navegador
npm start
# Acesse http://localhost:3000

# 4. Compilar um novo Instalador Windows Desktop (.exe e .msi)
npm run desktop:build
# (Ou dê dois cliques no arquivo 'build_desktop.bat')
```

---

## 🔑 Conexão com o Telegram

Para utilizar o armazenamento ilimitado em nuvem:

1. Acesse **[my.telegram.org](https://my.telegram.org)** e faça login com seu número de telefone.
2. Acesse **"API Development Tools"** e crie uma aplicação para obter o **`api_id`** e o **`api_hash`**.
3. No DriveGram, clique em **"Conectar Telegram"**:
   - **Opção A (QR Code)**: Escaneie o QR Code diretamente pelo aplicativo do Telegram no celular (*Configurações ➔ Dispositivos ➔ Conectar dispositivo*).
   - **Opção B (Código SMS/Telegram)**: Insira seu telefone com DDD (ex: `+55 11 99999-9999`) e informe o código recebido no app do Telegram (com suporte a senha de 2 Fatores / 2FA).

> 🔒 **Privacidade Absoluta**: O DriveGram roda **100% localmente no seu dispositivo**. Nenhuma credencial, token ou arquivo passa por servidores de terceiros.

---

## ❓ Perguntas Frequentes (FAQ)

<details>
<summary><b>1. Os arquivos realmente ficam salvos no Telegram?</b></summary>
Sim! Todos os arquivos enviados pelo DriveGram são gravados nas suas <i>Mensagens Salvas</i> do Telegram de forma privada, criptografada e ilimitada.
</details>

<details>
<summary><b>2. O que acontece se eu formatar o dispositivo ou mudar de aparelho?</b></summary>
Basta instalar o DriveGram no novo dispositivo e conectar a mesma conta do Telegram. O aplicativo detectará o manifesto <code>#drivegram_metadata_sync</code> e restaurará automaticamente todas as suas pastas, cursos, livros, anotações e mídias.
</details>

<details>
<summary><b>3. Posso criar novas pastas livremente no "Meu Drive"?</b></summary>
Sim! Você pode criar quantas pastas e subpastas quiser na raiz do "Meu Drive" e organizá-las como desejar. As 9 categorias padrão servem apenas para alimentar as abas do catálogo.
</details>

<details>
<summary><b>4. Qual o tamanho máximo por arquivo?</b></summary>
- Contas gratuitas do Telegram: até <b>2.0 GB</b> por arquivo.<br>
- Contas Telegram Premium: até <b>4.0 GB</b> por arquivo.<br>
Não há limite para a quantidade total de arquivos que você pode armazenar.
</details>

<details>
<summary><b>5. O APK Android precisa do computador ligado para funcionar?</b></summary>
Não! O APK do Android possui um motor Node.js embutido de alta performance que roda localmente no smartphone, permitindo uso 100% independente.
</details>

---

## 📄 Licença

Este projeto é de código aberto sob a licença **[MIT](LICENSE)**.

<div align="center">
Feito com dedicação para transformar a forma como você armazena e consome suas mídias. 🚀
</div>

<br />

[ ⬆️ Voltar ao Topo ](#) &nbsp;|&nbsp; [ 🇺🇸 Ir para Versão em Inglês ](#english)

---

<a id="english"></a>
# 🇺🇸 DriveGram - English

## 📖 About the Project

**DriveGram** transforms your **Telegram Saved Messages** into an enterprise-grade, unlimited personal cloud with ultra-fast streaming.

Forget about storage constraints and recurring fees of traditional cloud storage services. With DriveGram you get:
- **100% Unlimited & Free Storage**: Files up to **2 GB** each (or up to **4 GB** per file for Telegram Premium subscribers).
- **Instant Streaming without Prior Download**: Watch movies, video lectures, and listen to music/audiobooks directly from the cloud via the *HTTP 206 (Partial Content)* protocol.
- **Cross-Platform Ecosystem (Desktop & Android APK)**: Runs natively on your computer (Windows/Mac/Linux) and includes an official Android application (`.apk`) powered by an autonomous embedded Node.js engine that runs 100% independently on your phone (no host PC required).
- **Active Sync & Continuous Backup**: Your files, directory trees, and notes are synthesized into secure manifests (`#drivegram_metadata_sync`) stored on Telegram, featuring 1-click cloud restoration and intelligent retention policies.

---

## 📥 Ready-to-Use Downloads (Easy Installation)

Download the official release installers directly from the [**GitHub Releases Page**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/tag/v1.2.0):

| Platform | Package / Installer | Size | Description | Direct Link |
| :--- | :--- | :--- | :--- | :--- |
| 💻 **Windows Desktop** | **`DriveGram-Setup.exe`** | **`4.33 MB`** | **Recommended**. Ultra-lightweight native installer (Tauri v2) with setup wizard and Desktop shortcut. | [⬇️ **Download .EXE**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram-Setup.exe) |
| 🏢 **Windows Enterprise** | **`DriveGram.msi`** | **`13.24 MB`** | Windows Installer enterprise deployment package (native .msi). | [⬇️ **Download .MSI**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.msi) |
| 📱 **Android** | **`DriveGram.apk`** | **`82.8 MB`** | Official Android application featuring an embedded self-hosted Node.js engine. | [⬇️ **Download .APK**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.apk) |

> 🏷️ *All release packages, changelogs, and source code archives are also available on the [Releases Tab](https://github.com/LuisClaudioBoaventura/DriveGram/releases).*

---

## 🌟 All Features & Dedicated Libraries

DriveGram is organized into intelligent, purpose-built modules designed for every media format and workflow:

### 📁 1. My Drive (Comprehensive File Manager)
- **Unlimited Directory Tree**: Create folders and subfolders with no depth limits, custom folder accent colors, and intuitive *Breadcrumbs* navigation.
- **Smart Folder Deduplication**: Semantic algorithm that recognizes default system categories, purges empty duplicates, and safely protects all your stored files.
- **Smart Upload (Drag & Drop)**: Drag and drop individual files or complete directory hierarchies straight into the interface.
- **Floating Upload Manager**: Background transfer monitor with real-time progress bars, transfer speed indicators, and queue controls.
- **Multiple View Modes**: Seamlessly toggle between **Grid Cards** with rich thumbnails and **Detailed List** sorted by Name, Size, Date, and Type.
- **Instant Search & Quick Filters**: Search through files in real time and filter by Videos, Audios, PDFs, Documents, Images, Code, and Compressed Archives.
- **Favorites & Secure Trash**: Star high-priority files for quick retrieval, and rely on the Trash bin for safe restores or permanent deletion.
- **Duplicate Finder**: Automated deep scan to detect and remove identical files across your cloud.
- **Smart File Moving**: Effortlessly relocate files and folders between directories.

---

### 🎓 2. Courses & Learning (Virtual Learning Environment - VLE)
- **Modular Curriculum Structure**: Organize courses into modules and lessons with automated lesson counters and total runtime metrics.
- **Sequential Autoplay**: Visual 5-second countdown timer after a lesson ends before smoothly progressing to the next.
- **Resume Playback**: Automatically remembers the exact second where you paused or stopped each lesson.
- **Timestamp Bookmarks**: Save important chapters or key study moments with interactive, clickable links.
- **Automatic Subtitles (.vtt/.srt)**: Automatic discovery and rendering of subtitle files stored in the same lesson folder.
- **Supporting Materials & PDFs**: Instant inline access to presentation slides, cheat sheets, and course handouts.
- **Synchronized Lesson Notepad**: Dedicated notepad per lesson with instantaneous auto-saving.
- **Completion Tracking**: Mark finished lessons with green completion checks and track your overall course progress bar.

---

### 🎬 3. Movies & Cinema (Streaming Catalog)
- **Netflix / Prime-style UI**: Cinematic posters, resolution badges, genres, release year, and duration.
- **OMDb API Integration**: Automatic metadata lookup by title or IMDb ID to fetch synopsis, director, cast, awards, parental rating, and official scores from **IMDb** and **Metascore**.
- **Advanced Cinema Player**:
  - **Persistent Picture-in-Picture (PiP)**: Keep watching in a floating window while browsing other sections. The *"Back to Tab"* button brings you back to fullscreen instantly.
  - **Custom Subtitles**: Select, upload, and synchronize external subtitle tracks.
  - **Chapters & Timestamps**: Jump straight to scenes and key moments.
  - **Keyboard Shortcuts**: Space (Play/Pause), Arrow keys (Skip/Rewind 10s), `F` (Fullscreen), `M` (Mute).
- **Genre Management**: Create, edit, and organize custom film categories.

---

### 📹 4. Videos & Personal Media (Family Memories & Vlogs)
- **Dedicated Personal Hub**: Dedicated space tailored for travel videos, family milestones, home movies, and personal vlogs.
- **Advanced Filters**: Filter by Categories, People tagged, Location, Date, and Custom tags.
- **Playback History**: Seamlessly resumes each video right from where you left off.

---

### 🎧 5. Books & Audiobooks (Hi-Fi Studio & E-book Reader)
- **Hybrid Support**: Audio formats (MP3, M4A, AAC, FLAC) + Digital Books (PDF, EPUB, CBR, CBZ).
- **3 Specialized View Modes**:
  1. **Audio-Only Mode (Default)**: Smart adaptive *Hi-Fi Studio Widescreen* layout with prominent album artwork, dynamic ambient glow, expansive timeline scrubber, and speed controls (`0.75x` to `2x`).
  2. **Listen & Read Mode (Split View)**: Compact audio player on the left paired with a responsive PDF reader on the right for synchronized study.
  3. **E-book / PDF Reader Mode**: Immersive distraction-free full-screen reader.
- **Global Floating Miniplayer**: Keep enjoying audiobooks in a floating bar while navigating anywhere in the app.
- **Sleep Timer**: Automatically halt audio playback after 15, 30, 45, or 60 minutes.
- **Google Books Integration**: Automated fetching of high-res book covers, authors, and literary metadata.

---

### 📚 6. Comics, Graphic Novels & Manga (Comics Studio)
- **Full Comic Format Support**: Direct native viewing of **.cbr**, **.cbz**, **.pdf**, and **.epub** files.
- **Real-Time Decompression**: Ultra-fast client/server archive extraction powered by WebAssembly (`node-unrar-js` + `unrar.wasm`) and `jszip`.
- **Interactive Magnifier Tool**: Precision loupe with adjustable magnification following your mouse or touch, perfect for reading speech bubbles and intricate artwork on Desktop and Android APK.
- **Reading Modes**: Fit-to-width, full-screen mode, visual thumbnail drawer, and smooth page transitions.

---

### 📺 7. TV Series & Anime
- **Seasons & Episodes Layout**: Dedicated overview with series synopsis, poster art, episode counts, and watched markers.
- **Watch History**: Continuous playback state tracking across all seasons and episodes.

---

### 🎙️ 8. Podcasts & Audio Shows
- **Episode Manager**: Listening status indicators, timestamp notes, and playback history.
- **Dedicated Floating Player**: Multitask freely across your cloud while listening to favorite podcasts.

---

### 📥 9. YouTube Importer
- **Direct Download & Upload**: Download video or audio streams from YouTube by pasting the link into the import modal.
- **Custom Target Destination**: Select which directory in "My Drive" the media is saved to before automatically syncing to Telegram.

---

### 🔐 10. Red Locker (Secure Vault)
- **Password/PIN Protected**: Restricted private area with automated timeout locking upon inactivity.
- **Specialized Cataloging**: Manage performers/actors, studios, custom categories, and tags.
- **Isolated Structure**: Keeps confidential media strictly segregated from public browsing.

---

## 🔄 Smart Synchronization & Retention Policy

DriveGram features a state-of-the-art metadata synchronization architecture:

1. **Active Startup Sync**:
   - When launching the application (Desktop or Android APK) with an active Telegram session, it immediately scans Saved Messages for newer metadata manifests (`#drivegram_metadata_sync`), seamlessly applying changes made on other devices.
2. **Reactive Auto-Backup**:
   - Whenever you create, edit, move, or delete a file or folder, an automated background backup is scheduled with smart debouncing (3.5s) and uploaded directly to your cloud.
3. **Retention Policy & History Cleanup**:
   - To keep your Saved Messages tidy and avoid cluttering your chat with dozens of old sync messages, DriveGram applies a configurable retention policy (`metadataRetentionCount`, default = 1), automatically purging previous sync manifests and retaining only the freshest revision.
4. **Clean First Launch**:
   - On fresh installations without a logged-in account, the local database initializes completely blank (0 files, 0 MB), without loading outdated mock data. Once you sign in, your cloud metadata is restored immediately.

---

## 📱 Native Android App (.APK)

DriveGram delivers a first-class native Android experience powered by **Capacitor 8** and **Node.js Mobile**:

- **Embedded Node.js Engine**: The Express + GramJS backend runs entirely within the Android device through `libnode.so` (compiled for `arm64-v8a`, `armeabi-v7a`, and `x86_64` architectures).
- **100% Autonomous**: The APK requires no external server, proxy, or companion computer to be running.
- **Startup Health Check**: The Android Main Activity monitors the embedded server's lifecycle via `/api/health` before revealing the web view, preventing blank screens or connection errors.

### How to Build the Android APK:
```bash
# 1. Compile the frontend and synchronize the embedded mobile server
npm run mobile:sync

# 2. Build the final installer APK (requires Android SDK / Gradle)
npm run mobile:apk
```
The compiled APK file will be available at the project root as **`DriveGram.apk`**.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Native Desktop (Windows)** | **Tauri v2**, Rust 2021, Microsoft Edge WebView2, Node.js Sidecar |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Node.js, Express, TypeScript, GramJS (Telegram MTProto Client), esbuild |
| **Mobile (Android)** | Capacitor 8, Node.js Mobile (`@red-mobile/nodejs-mobile-cordova`), esbuild |
| **Decompression & Formats** | WebAssembly `node-unrar-js` (`unrar.wasm`), `jszip`, `pdfjs-dist`, `epubjs` |
| **Local Database** | JSON persistence with cloud manifest sync and semantic deduplication |
| **Streaming** | HTTP 206 (Partial Content) protocol with direct byte-range streaming and local caching |
| **External APIs** | OMDb API (Movies), Google Books API (Books) |

---

## 🚀 Installation & Usage Guide

### 💻 1. Installing on Windows (Native Desktop App)

DriveGram Desktop is powered by **Tauri v2**, making it remarkably lightweight: it consumes only **~70 MB to 100 MB of RAM** (unlike Electron apps that easily require 350+ MB) and the installer weighs only **~4.33 MB**!

1. **Download Installer**: Grab the latest [**`DriveGram-Setup.exe`**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram-Setup.exe) from the [Releases Page](https://github.com/LuisClaudioBoaventura/DriveGram/releases/tag/v1.2.0) (or the [enterprise MSI version](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.msi)).
2. **Run the Installer**:
   - Double-click the `.exe` file.
   - *Security Note:* If Windows SmartScreen displays a *"Windows protected your PC"* prompt, click **"More info"** and then **"Run anyway"** (common for new open-source software releases).
3. **Ready to Launch**: DriveGram will automatically place shortcuts in your Start Menu and on your Desktop.
4. **🛠️ Diagnostics & Debugging Tools**:
   - **F12 Shortcut (DevTools)**: Press `F12` on any screen to inspect network requests, console logs, or visual elements.
   - **Server Logs**: In server settings, click **"Logs Folder"** to open `drivegram.log` directly.

---

### 📱 2. Installing on Android (.APK)

The Android application operates 100% autonomously without needing a host computer, thanks to its embedded high-performance Node.js runtime.

1. **Download APK**: Download the [**`DriveGram.apk`**](https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v1.2.0/DriveGram.apk) package from the [Releases Page](https://github.com/LuisClaudioBoaventura/DriveGram/releases/tag/v1.2.0) directly onto your Android device.
2. **Authorize Installation**:
   - Open the downloaded file.
   - When prompted by Android, permit installation from your browser or file manager under *"Install unknown apps"*.
3. **Launch the App**:
   - On first launch, DriveGram will wait 3 to 5 seconds while the internal engine initializes (`/api/health`).
   - The welcome screen will appear, ready for you to connect your Telegram account!

---

### 👨‍💻 3. Developer Setup (Source Code)

If you wish to run or modify the source code:

#### Prerequisites:
- **Node.js (v18+)** and **npm**
- **Rust and Cargo** (required for compiling Tauri Desktop)

#### Quick Commands:
```bash
# 1. Install dependencies
npm install

# 2. Run the Desktop App in Development Mode (Tauri + Hot-reload)
npm run desktop:dev
# (Or double-click 'iniciar_desktop.bat')

# 3. Run the traditional Web version in your Browser
npm start
# Open http://localhost:3000

# 4. Build a fresh Windows Desktop Installer (.exe and .msi)
npm run desktop:build
# (Or double-click 'build_desktop.bat')
```

---

## 🔑 Telegram Connection

To connect your unlimited cloud storage:

1. Visit **[my.telegram.org](https://my.telegram.org)** and log in with your phone number.
2. Navigate to **"API Development Tools"** and create an application to obtain your **`api_id`** and **`api_hash`**.
3. In DriveGram, click **"Connect Telegram"**:
   - **Option A (QR Code)**: Scan the QR Code using your Telegram mobile app (*Settings ➔ Devices ➔ Link Desktop Device*).
   - **Option B (SMS / Telegram Code)**: Enter your phone number with international area code (e.g., `+1 555 123 4567`) and type the verification code received inside your Telegram app (supports 2-Factor Authentication / 2FA password).

> 🔒 **Absolute Privacy**: DriveGram runs **100% locally on your machine**. No credentials, tokens, or personal files ever pass through third-party servers.

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>1. Are my files really stored inside Telegram?</b></summary>
Yes! All files uploaded via DriveGram are securely stored inside your personal Telegram <i>Saved Messages</i> with end-to-end cloud encryption and unlimited storage capacity.
</details>

<details>
<summary><b>2. What happens if I format my computer or switch devices?</b></summary>
Simply install DriveGram on your new device and log in with the same Telegram account. The app will detect your latest <code>#drivegram_metadata_sync</code> manifest and automatically restore all your folders, courses, books, notes, and media catalogs.
</details>

<details>
<summary><b>3. Can I create custom folders freely inside "My Drive"?</b></summary>
Yes! You can create as many directories and subfolders as you wish in the root of "My Drive" and structure your content however you like. The 9 default categories simply help organize the media catalogue tabs.
</details>

<details>
<summary><b>4. What is the maximum file size limit?</b></summary>
- Free Telegram accounts: up to <b>2.0 GB</b> per individual file.<br>
- Telegram Premium accounts: up to <b>4.0 GB</b> per individual file.<br>
There is no limit to the total number of files or overall storage volume you can upload.
</details>

<details>
<summary><b>5. Does the Android APK require a PC running nearby?</b></summary>
No! The Android APK includes an embedded, high-performance Node.js engine running locally on your phone, providing complete independent mobility.
</details>

---

## 📄 License

This project is open-source under the **[MIT](LICENSE)** license.

<div align="center">
Crafted with dedication to transform the way you store, stream, and experience your digital media. 🚀
</div>

<br />

[ ⬆️ Back to Top ](#) &nbsp;|&nbsp; [ 🇧🇷 Ir para Versão em Português ](#portugues)
