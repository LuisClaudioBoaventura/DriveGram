# 🚀 DriveGram

<div align="center">

<img width="1855" height="917" alt="DriveGram - Home" src="https://github.com/user-attachments/assets/02e37ab8-f9ef-4908-9eff-5abc638a7db4" />

**Seu ecossistema completo de armazenamento em nuvem ilimitado, streaming e bibliotecas digitais — com interface moderna inspirada no Google Drive e OneDrive, potencializado pela infraestrutura do Telegram.**

[![Licença: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram MTProto](https://img.shields.io/badge/Telegram-MTProto%20GramJS-2CA5E0.svg)](https://telegram.org/)
[![Android Capacitor](https://img.shields.io/badge/Android-Capacitor%208-brightgreen.svg)](https://capacitorjs.com/)
[![Node.js Mobile](https://img.shields.io/badge/Node.js%20Mobile-Embedded%20Engine-orange.svg)](https://github.com/red-mobile/nodejs-mobile-cordova)

</div>

---

## 📖 Sobre o Projeto

O **DriveGram** transforma as **Mensagens Salvas (*Saved Messages*)** do seu **Telegram** em uma nuvem pessoal corporativa, ilimitada e com streaming de altíssima velocidade.

Esqueça as limitações de espaço dos serviços tradicionais pagos. No DriveGram você conta com:
- **Armazenamento 100% Ilimitado e Gratuito**: Arquivos de até **2 GB** cada (ou até **4 GB** por arquivo para usuários do Telegram Premium).
- **Streaming Instantâneo sem Download Prévio**: Assista a filmes, aulas e ouça músicas/audiolivros direto da nuvem via protocolo *HTTP 206 (Partial Content)*.
- **Ecossistema Multiplataforma (Desktop & Android APK)**: Funciona no computador (Windows/Mac/Linux) e possui aplicativo nativo Android (`.apk`) com servidor Node.js embutido que roda 100% independente no celular (sem precisar do PC ligado).
- **Sincronização Ativa & Backup Contínuo**: Seus dados e pastas são sintetizados em manifestos seguros (`#drivegram_metadata_sync`) no Telegram, com restauração em 1 clique e política inteligente de retenção.

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
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Node.js, Express, TypeScript, GramJS (Telegram MTProto Client) |
| **Mobile (Android)** | Capacitor 8, Node.js Mobile (`@red-mobile/nodejs-mobile-cordova`), esbuild |
| **Descompactação & Formatos** | WebAssembly `node-unrar-js` (`unrar.wasm`), `jszip`, `pdfjs-dist`, `epubjs` |
| **Banco de Dados Local** | Persistência em JSON com sincronização em nuvem e deduplicação semântica |
| **Streaming** | Protocolo HTTP 206 (Partial Content) com suporte a streaming direto e cache local |
| **APIs Externas** | OMDb API (Filmes), Google Books API (Livros) |

---

## 🚀 Guia de Instalação e Execução (Desktop)

### 📋 Pré-requisitos Básicos
- **Node.js (Versão 18 ou superior)**: [nodejs.org](https://nodejs.org/) (Versão LTS recomendada).
- **Git** (Opcional): [git-scm.com](https://git-scm.com/).

### 📥 1. Clonar ou Baixar o Repositório
```bash
git clone https://github.com/LuisClaudioBoaventura/DriveGram.git
cd DriveGram
```

### 📦 2. Instalar Dependências
```bash
npm install
```

### ⚡ 3. Iniciar o DriveGram
```bash
npm start
```
Acesse no seu navegador: **`http://localhost:3000`** (backend na porta `5000`).

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

## 🖥️ Atalho na Área de Trabalho (Windows)

Para iniciar o aplicativo com apenas 1 clique:
- Dê dois cliques no arquivo **`Criar_Atalho_Desktop.bat`**.
- Um atalho **DriveGram** será criado na sua Área de Trabalho, iniciando automaticamente os servidores e abrindo a aplicação.

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
