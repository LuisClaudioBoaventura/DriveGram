# 🚀 DriveGram

<div align="center">

![DriveGram Banner]()
<img width="1855" height="917" alt="DriveGram - Home" src="https://github.com/user-attachments/assets/02e37ab8-f9ef-4908-9eff-5abc638a7db4" />


**Seu ecossistema completo de armazenamento em nuvem ilimitado, streaming e bibliotecas digitais — com interface moderna inspirada no Google Drive e OneDrive, potencializado pela infraestrutura do Telegram.**

[![Licença: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram MTProto](https://img.shields.io/badge/Telegram-MTProto%20GramJS-2CA5E0.svg)](https://telegram.org/)

</div>

---

## 📖 Sobre o Projeto

O **DriveGram** transforma as **Mensagens Salvas (*Saved Messages*)** do seu **Telegram** em uma nuvem pessoal corporativa, ilimitada e com streaming de altíssima velocidade.

Esqueça as limitações de espaço dos serviços tradicionais pagos. No DriveGram você conta com:
- **Armazenamento 100% Ilimitado e Gratuito**: Arquivos de até **2 GB** cada (ou até **4 GB** por arquivo para usuários do Telegram Premium).
- **Streaming Instantâneo sem Download**: Assista a vídeos e ouça áudios direto da nuvem via protocolo *HTTP 206 (Partial Content)*.
- **Zero Risco de Perda de Dados**: Seus arquivos ficam salvos nos servidores seguros do Telegram. O DriveGram mantém um manifesto de sincronização (`#drivegram_metadata_sync`) para reconstruir toda a sua estrutura de pastas, cursos e bibliotecas em qualquer novo dispositivo com 1 clique.

---

## 🌟 Todas as Funcionalidades e Bibliotecas

O DriveGram é dividido em módulos inteligentes e dedicados para cada tipo de mídia e necessidade:

### 📁 1. Meu Drive (Gerenciador de Arquivos Completo)
- **Árvore de Diretórios Ilimitada**: Crie pastas e subpastas sem limite de profundidade, com cores personalizáveis e navegação por *Breadcrumbs* (migalhas de pão).
- **Upload Inteligente (Drag & Drop)**: Arraste e solte arquivos individuais ou pastas inteiras diretamente para o navegador.
- **Upload Manager Flutuante**: Gerenciador de uploads em segundo plano com barra de progresso, taxa de transferência e controle de fila.
- **Modos de Exibição**: Alterne entre **Grade (Cards)** com miniaturas e **Lista Detalhada** com ordenação por Nome, Tamanho, Data e Tipo.
- **Busca e Filtros Rápidos**: Encontre qualquer item instantaneamente e filtre por Vídeos, Áudios, PDFs, Documentos, Imagens, Códigos e Arquivos Compactados.
- **Favoritos e Lixeira Segura**: Marque arquivos importantes com estrela e conte com lixeira para restauração ou exclusão definitiva.
- **Localizador de Duplicados**: Varredura automática para identificar e limpar arquivos repetidos.
- **Movimentação Inteligente**: Mova arquivos e pastas entre diretórios com facilidade.

---

### 🎓 2. Cursos & Estudos (Ambiente Virtual de Aprendizagem)
- **Estruturação por Módulos & Aulas**: Organize seus cursos em pastas por módulos com contagem automática de aulas e duração total.
- **Reprodução Sequencial Automática (*Autoplay*)**:
  - Contagem regressiva visual de 5 segundos ao término de uma aula antes de passar automaticamente para a próxima.
  - Botões rápidos "Aula Anterior" e "Próxima Aula".
- **Memorização de Progresso**: O sistema memoriza o segundo exato onde você parou de assistir em cada vídeo.
- **Marcadores de Tempo (*Timestamps*)**: Salve capítulos ou momentos importantes da aula com link clicável.
- **Suporte a Legendas (.vtt/.srt)**: Renderização de legendas personalizadas sincronizadas.
- **Materiais de Apoio**: Acesso direto a PDFs de slides e materiais complementares anexados ao curso.
- **Bloco de Anotações Sincronizado**: Escreva notas de estudo individuais por aula que ficam salvas em tempo real.
- **Controle de Conclusão**: Marque aulas como concluídas (check verde) e acompanhe a barra de progresso do curso.

---

### 🎬 3. Filmes & Cinema (Catálogo Streaming)
- **Interface Estilo Netflix/Prime**: Pôsteres cinematográficos, badges de qualidade, gêneros, ano e duração.
- **Integração com API OMDb**: Busca automática por título ou código IMDb para preencher sinopse, diretor, elenco, prêmios, classificação indicativa e notas do **IMDb** e **Metascore**.
- **Player de Cinema Avançado**:
  - **Picture-in-Picture (PiP) Contínuo**: Coloque o filme em janela flutuante e navegue livremente por outras abas. O botão *"Voltar para a Guia"* restaura a tela cheia instantaneamente sem recarregar nem travar.
  - **Legendas Customizadas**: Adicione ou selecione faixas de legenda.
  - **Capítulos & Timestamps**: Navegação direta por cenas.
  - **Atalhos de Teclado**: Espaço (Play/Pause), Setas (Avançar/Retroceder 10s), `F` (Tela Cheia), `M` (Mudo).
- **Gerenciador de Categorias**: Crie e personalize seus próprios gêneros (Ficção, Ação, Clássicos, etc.).

---

### 📹 4. Vídeos & Mídias Pessoais (Memórias de Família e Vlogs)
- **Biblioteca Dedicada**: Espaço próprio para vídeos de viagens, família, eventos, vlogs e gravações pessoais.
- **Filtros Avançados**: Filtre por Categorias, Pessoas presentes, Local do evento, Data e Tags personalizadas.
- **Banner Padronizado**: Visual clean e premium integrado ao tema.
- **Player com Histórico**: Retoma o vídeo do ponto exato onde você pausou.

---

### 🎧 5. Livros & Audiolivros (Estúdio Hi-Fi & Leitor de E-books)
- **Suporte Híbrido**: Áudios (MP3, M4A, AAC) + Livros Digitais (PDF, EPUB, CBR, CBZ).
- **3 Modos de Visualização**:
  1. **Modo Apenas Áudio (Padrão)**:
     - **Layout Adaptativo Inteligente**: Quando a coluna de capítulos é colapsada, a tela se expande em um formato *Widescreen de Estúdio Hi-Fi* de 2 colunas com capa em destaque, iluminação dinâmica no play, barra de progresso ampla e botões de transporte grandes.
     - Seletor rápido de velocidade (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`).
     - Criador direto de marcadores/citações por tempo.
  2. **Modo Ouvir & Ler (Dividido / Split)**: Player de áudio compacto à esquerda e leitor de PDF à direita para leitura acompanhada.
  3. **Modo Leitor PDF/E-book**: Leitor de tela cheia para leitura sem áudio.
- **Miniplayer Flutuante Global**: Continue ouvindo o audiolivro em uma barra flutuante no canto da tela enquanto navega em outras páginas do DriveGram.
- **Temporizador de Sono (*Sleep Timer*)**: Programe para pausar o áudio automaticamente após 15, 30, 45 ou 60 minutos.

---

### 📚 6. Quadrinhos, HQs & Mangás
- **Leitor Dedicado**: Suporte a leitura de PDFs, imagens e arquivos de quadrinhos `.cbr` e `.cbz`.
- **Modo Leitura**: Ajuste de zoom, modo noturno e transição suave entre páginas.

---

### 📺 7. Séries & Animes
- **Organização em Temporadas & Episódios**: Painel de exibição com sinopse, capa, contagem de episódios e controle de episódios já assistidos.

---

### 🎙️ 8. Podcasts & Programas de Áudio
- **Gerenciador de Episódios**: Controle de audição, notas, marcadores e histórico de reprodução.

---

### 🔒 9. Cofre Privado (Pasta Segura)
- **Proteção por Senha**: Área restrita com senha e bloqueio automático para proteger arquivos e pastas confidenciais.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Node.js, Express, TypeScript, GramJS (Telegram MTProto Client) |
| **Banco de Dados Local** | SQLite com persistência em JSON e sincronização em nuvem |
| **Streaming** | Suporte a HTTP 206 (Partial Content) para streaming sem buffering |
| **APIs Externas** | OMDb API (Open Movie Database) |

---

## 🚀 Guia de Instalação e Execução Passo a Passo (Para Iniciantes)

Este guia foi feito para que **qualquer pessoa, mesmo sem conhecimento prévio de programação**, consiga instalar e rodar o DriveGram no seu computador em poucos minutos.

### 📋 Pré-requisitos Básicos

Antes de começar, você precisa ter instalado no seu computador:

1. **Node.js (Versão 18 ou superior)**:
   - Acesse [nodejs.org](https://nodejs.org/) e baixe a versão **LTS** (Recomendada).
   - Execute o instalador baixado e avance clicando em *Next* até concluir.
2. **Git (Opcional, mas recomendado)**:
   - Acesse [git-scm.com](https://git-scm.com/) e instale a versão para seu sistema operacional.

---

### 📥 Passo 1: Baixar o Projeto

#### Opção A (Com Git - Mais Rápido):
Abra o **Prompt de Comando (CMD)** ou o **PowerShell** no Windows (ou Terminal no Mac/Linux) e execute:
```bash
git clone https://github.com/LuisClaudioBoaventura/DriveGram.git
```

#### Opção B (Sem Git - Download Direto):
1. No topo desta página do GitHub, clique no botão verde **`<> Code`**.
2. Clique em **`Download ZIP`**.
3. Extraia o arquivo `.zip` para uma pasta de sua preferência (ex: em `Documentos` ou `Downloads`).

---

### 📦 Passo 2: Acessar a Pasta e Instalar as Dependências

1. Abra o terminal (PowerShell, CMD ou Terminal) dentro da pasta onde o projeto foi descompactado/clonado:
   ```bash
   cd "caminho/para/o/Projeto - DriveGram"
   ```
2. Execute o comando para baixar todas as dependências automaticamente:
   ```bash
   npm install
   ```
   > ⏳ *Aguarde alguns instantes enquanto o instalador baixa os pacotes necessários.*

---

### ⚡ Passo 3: Iniciar o DriveGram

Para rodar o backend e o frontend juntos com um único comando, digite no terminal:
```bash
npm start
```
*(ou se preferir o modo de desenvolvimento: `npm run dev`)*

Assim que os servidores iniciarem, você verá mensagens parecidas com:
- `Backend rodando na porta 5000: http://localhost:5000`
- `Frontend disponível em: http://localhost:3000`

---

### 🌐 Passo 4: Acessar no Navegador

Abra o seu navegador de internet (Google Chrome, Edge, Firefox, Brave, Safari, etc.) e acesse o endereço:
👉 **[http://localhost:3000](http://localhost:3000)**

Pronto! O DriveGram estará aberto e pronto para uso! 🎉

---

## 🔑 Passo 5: Conectar sua Conta do Telegram

Para utilizar o armazenamento ilimitado em nuvem:

1. Acesse o portal oficial do Telegram: **[my.telegram.org](https://my.telegram.org)**.
2. Faça login informando seu número de telefone (com código do país e DDD, ex: `+55 11 99999-9999`) e confirme com o código recebido no seu aplicativo Telegram.
3. Clique na opção **"API Development Tools"**.
4. Crie uma aplicação preenchendo os campos básicos (App title e Short name podem ser `DriveGram`).
5. Copie os dois valores gerados:
   - **`api_id`** (número)
   - **`api_hash`** (código de letras e números)
6. No DriveGram, clique no botão **"Conectar Telegram"** no canto superior direito:
   - Insira o `api_id`, `api_hash` e o seu número de telefone.
   - Digite o código de confirmação que o Telegram enviará para o seu app.
   - *(Se você tiver autenticação de 2 fatores ativada, insira sua senha quando solicitado).*

> 🔒 **Sua privacidade é total**: O DriveGram roda **100% localmente na sua máquina**. Suas credenciais e dados nunca são enviados para servidores de terceiros.

---

## 🎬 Passo 6: Configurar a Chave do OMDb (Opcional - Para Pôsteres de Filmes)

Para que o DriveGram busque automaticamente sinopses, pôsteres e notas do IMDb para os seus filmes:

1. Acesse **[omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)**.
2. Selecione **"FREE (1,000 daily requests)"**, digite seu e-mail e nome.
3. Você receberá a chave no seu e-mail (clique no link de ativação enviado).
4. Na biblioteca de **Filmes** do DriveGram, clique em **"Chave OMDb"** e cole sua chave.

---

## ❓ Perguntas Frequentes (FAQ & Dicas)

<details>
<summary><b>1. Os arquivos realmente ficam salvos no Telegram?</b></summary>
Sim! Todos os arquivos enviados pelo DriveGram são gravados nas suas <i>Mensagens Salvas</i> do Telegram de forma privada, segura e ilimitada.
</details>

<details>
<summary><b>2. O que acontece se eu formatar o computador ou mudar de PC?</b></summary>
Basta instalar o DriveGram no novo computador, conectar a mesma conta do Telegram e clicar em <b>"Restaurar do Telegram"</b>. O DriveGram lerá o manifesto <code>#drivegram_metadata_sync</code> e restaurará instantaneamente todas as suas pastas, cursos, anotações e filmes.
</details>

<details>
<summary><b>3. Qual o tamanho máximo por arquivo?</b></summary>
- Contas gratuitas do Telegram: até <b>2.0 GB</b> por arquivo individual.<br>
- Contas Telegram Premium: até <b>4.0 GB</b> por arquivo individual.<br>
Não há limite para a quantidade total de arquivos que você pode armazenar.
</details>

<details>
<summary><b>4. Como parar a aplicação quando terminar de usar?</b></summary>
Basta ir no terminal onde o comando foi executado e pressionar as teclas <code>Ctrl + C</code> no teclado.
</details>

---

## 📄 Licença

Este projeto é de código aberto sob a licença **[MIT](LICENSE)**. Sinta-se livre para usar, estudar, modificar e distribuir!

---

<div align="center">
Feito com dedicação para transformar a forma como você armazena e consome suas mídias. 🚀
</div>
