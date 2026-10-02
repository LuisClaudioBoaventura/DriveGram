export type AppLanguage = 'pt' | 'en' | 'es';

export interface Translations {
  common: {
    save: string;
    cancel: string;
    close: string;
    delete: string;
    edit: string;
    back: string;
    loading: string;
    success: string;
    error: string;
    search: string;
    confirm: string;
    refresh: string;
    all: string;
    details: string;
    copy: string;
    download: string;
    upload: string;
    remove: string;
    clear: string;
    actions: string;
    settings: string;
    rename: string;
    move: string;
    duplicate: string;
    favorite: string;
    unfavorite: string;
    select: string;
    none: string;
    yes: string;
    no: string;
    done: string;
    retry: string;
    version: string;
  };
  nav: {
    searchPlaceholder: string;
    all: string;
    videos: string;
    comics: string;
    ebooks: string;
    pdfs: string;
    documents: string;
    images: string;
    audios: string;
    archives: string;
    code: string;
    cloudSyncTitle: string;
    darkMode: string;
    lightMode: string;
    openMobileMenu: string;
    closeMobileMenu: string;
    connected: string;
    disconnected: string;
    syncNow: string;
    syncing: string;
    uploadsFolder: string;
    apiKeys: string;
    youtubeImport: string;
    serverSettings: string;
  };
  sidebar: {
    mainSection: string;
    librariesSection: string;
    otherSection: string;
    myDrive: string;
    courses: string;
    books: string;
    comics: string;
    moviesVideos: string;
    personalVideos: string;
    series: string;
    podcasts: string;
    redLocker: string;
    favorites: string;
    trash: string;
    newButton: string;
    uploadFiles: string;
    uploadFolder: string;
    newFolder: string;
    cloudStorage: string;
    storageUsed: string;
    updateAvailable: string;
    clickToUpdate: string;
    collapseSidebar: string;
    expandSidebar: string;
  };
  bottomNav: {
    drive: string;
    courses: string;
    media: string;
    menu: string;
    actions: string;
    newFolder: string;
    uploadFiles: string;
    uploadFolder: string;
    newCourse: string;
    newBook: string;
    newComic: string;
    newVideo: string;
    newPersonalVideo: string;
    newSeries: string;
    newAudio: string;
    youtubeImport: string;
  };
  syncModal: {
    title: string;
    subtitle: string;
    back: string;
    selectFunction: string;
    manifestSynced: string;
    inCloud: string;
    syncingManifest: string;
    syncNow: string;
    seeDetails: string;
    filesCataloged: string;
    menuPlayback: string;
    menuThemes: string;
    menuLanguage: string;
    menuPending: string;
    menuAudit: string;
    menuSync: string;
    menuApiKeys: string;
    menuDiagnostic: string;
    menuBackupJson: string;
    themesTitle: string;
    themesSubtitle: string;
    currentThemeBadge: string;
    themeSwitchSuccess: string;
    themeSwitchNote: string;
    languageTitle: string;
    languageSubtitle: string;
    currentLangBadge: string;
    ptTitle: string;
    ptSubtitle: string;
    ptDesc: string;
    enTitle: string;
    enSubtitle: string;
    enDesc: string;
    esTitle: string;
    esSubtitle: string;
    esDesc: string;
    langSwitchNote: string;
    langSwitchSuccess: string;
    playbackTitle: string;
    playbackSubtitle: string;
    streamingCloud: string;
    cacheTemp: string;
    cacheLocal: string;
    playbackModeDesc: string;
    cloudDirectTitle: string;
    cloudDirectBadge: string;
    cloudDirectDesc: string;
    cloudDirectRec: string;
    tempCacheTitle: string;
    tempCacheBadge: string;
    tempCacheDesc: string;
    tempCacheRec: string;
    localCacheTitle: string;
    localCacheBadge: string;
    localCacheDesc: string;
    localCacheRec: string;
    cacheRetentionTitle: string;
    cacheRetentionDesc: string;
    customTime: string;
    saveRetention: string;
    saving: string;
    clearCacheTitle: string;
    clearCacheDesc: string;
    clearCacheButton: string;
    clearingCache: string;
    pendingTitle: string;
    pendingSubtitle: string;
    allSaved: string;
    pendingCount: string;
    auditTitle: string;
    auditSubtitle: string;
    syncTitle: string;
    syncSubtitle: string;
    apiKeysTitle: string;
    apiKeysSubtitle: string;
    diagnosticTitle: string;
    diagnosticSubtitle: string;
    backupJsonTitle: string;
    backupJsonSubtitle: string;
    minutesUnit: string;
    hoursUnit: string;
    daysUnit: string;
  };
  breadcrumbs: {
    myDrive: string;
    favorites: string;
    trash: string;
  };
  deleteModal: {
    confirmTitle: string;
    confirmPermanentTitle: string;
    confirmMessage: string;
    confirmPermanentMessage: string;
    deleteButton: string;
    deletePermanentButton: string;
    cancelButton: string;
  };
}

export const translations: Record<AppLanguage, Translations> = {
  pt: {
    common: {
      save: 'Salvar',
      cancel: 'Cancelar',
      close: 'Fechar',
      delete: 'Excluir',
      edit: 'Editar',
      back: 'Voltar',
      loading: 'Carregando...',
      success: 'Sucesso',
      error: 'Erro',
      search: 'Pesquisar',
      confirm: 'Confirmar',
      refresh: 'Atualizar',
      all: 'Todos',
      details: 'Detalhes',
      copy: 'Copiar',
      download: 'Baixar',
      upload: 'Enviar',
      remove: 'Remover',
      clear: 'Limpar',
      actions: 'Ações',
      settings: 'Configurações',
      rename: 'Renomear',
      move: 'Mover',
      duplicate: 'Duplicar',
      favorite: 'Favoritar',
      unfavorite: 'Desfavoritar',
      select: 'Selecionar',
      none: 'Nenhum',
      yes: 'Sim',
      no: 'Não',
      done: 'Concluído',
      retry: 'Tentar novamente',
      version: 'Versão'
    },
    nav: {
      searchPlaceholder: 'Pesquisar em todas as pastas e arquivos...',
      all: 'Tudo',
      videos: 'Vídeos',
      comics: 'HQs & Mangás',
      ebooks: 'E-books',
      pdfs: 'PDFs',
      documents: 'Documentos',
      images: 'Imagens',
      audios: 'Áudios',
      archives: 'Compactados',
      code: 'Código',
      cloudSyncTitle: 'Gerenciamento de Nuvem',
      darkMode: 'Ativar Modo Noturno',
      lightMode: 'Ativar Modo Claro',
      openMobileMenu: 'Abrir Menu Lateral',
      closeMobileMenu: 'Fechar Menu',
      connected: 'Conectada',
      disconnected: 'Desconectada',
      syncNow: 'Sincronizar Agora',
      syncing: 'Sincronizando...',
      uploadsFolder: 'Abrir Pasta de Uploads',
      apiKeys: 'Gerenciar Chaves de API',
      youtubeImport: 'Importar do YouTube',
      serverSettings: 'Configurações do Servidor'
    },
    sidebar: {
      mainSection: 'Principal',
      librariesSection: 'Bibliotecas',
      otherSection: 'Outros',
      myDrive: 'Meu Drive',
      courses: 'Cursos & Aulas',
      books: 'Livros & Audiolivros',
      comics: 'HQs & Quadrinhos',
      moviesVideos: 'Filmes & Vídeos',
      personalVideos: 'Vídeos Pessoais',
      series: 'Séries & Programas',
      podcasts: 'Músicas & Podcasts',
      redLocker: 'Red Locker',
      favorites: 'Favoritos',
      trash: 'Lixeira',
      newButton: 'Novo',
      uploadFiles: 'Enviar arquivos',
      uploadFolder: 'Enviar pasta',
      newFolder: 'Nova pasta',
      cloudStorage: 'Armazenamento Nuvem',
      storageUsed: 'Usado',
      updateAvailable: 'Atualização disponível',
      clickToUpdate: 'Clique para atualizar',
      collapseSidebar: 'Recolher menu lateral',
      expandSidebar: 'Expandir menu lateral'
    },
    bottomNav: {
      drive: 'Drive',
      courses: 'Cursos',
      media: 'Mídias',
      menu: 'Menu',
      actions: 'Criar ou Enviar',
      newFolder: 'Nova Pasta',
      uploadFiles: 'Enviar Arquivos',
      uploadFolder: 'Enviar Pasta',
      newCourse: 'Novo Curso',
      newBook: 'Novo Livro',
      newComic: 'Nova HQ / Mangá',
      newVideo: 'Novo Vídeo / Filme',
      newPersonalVideo: 'Novo Vídeo Pessoal',
      newSeries: 'Nova Série',
      newAudio: 'Novo Áudio / Música',
      youtubeImport: 'Importar do YouTube'
    },
    syncModal: {
      title: 'Gerenciamento de Nuvem',
      subtitle: 'Configure como suas mídias são reproduzidas, armazenadas e sincronizadas com o Telegram',
      back: 'Voltar',
      selectFunction: 'Selecione uma função:',
      manifestSynced: 'Manifesto JSON Sincronizado',
      inCloud: 'Em Nuvem',
      syncingManifest: 'Atualizando Manifesto JSON',
      syncNow: 'Sincronizar',
      seeDetails: 'Ver detalhes ➔',
      filesCataloged: 'arquivos catalogados',
      menuPlayback: 'Reprodução (Áudio e Vídeo)',
      menuThemes: 'Temas & Aparência',
      menuLanguage: 'Idioma da Interface (Language)',
      menuPending: 'Arquivos Pendentes de Envio',
      menuAudit: 'Auditoria & Reconciliação (Mensagens Salvas)',
      menuSync: 'Sincronização Ativa & Backup de Metadados',
      menuApiKeys: 'Central de Chaves de API',
      menuDiagnostic: 'Diagnóstico do Sistema Desktop',
      menuBackupJson: 'Exportação e Importação Manual (JSON)',
      themesTitle: 'Temas & Aparência',
      themesSubtitle: 'Personalize as cores, contraste e estilo visual do DriveGram',
      currentThemeBadge: 'Tema Ativo',
      themeSwitchSuccess: 'Tema alterado com sucesso!',
      themeSwitchNote: '✨ As opções de tema são aplicadas instantaneamente e ficam salvas nas suas preferências deste dispositivo.',
      languageTitle: 'Idioma da Interface (Language)',
      languageSubtitle: 'Escolha o idioma de preferência do DriveGram',
      currentLangBadge: 'Idioma Ativo',
      ptTitle: 'Português (Brasil)',
      ptSubtitle: 'Português Brasileiro (Padrão)',
      ptDesc: 'Interface completa em português com todos os menus, catálogos e ferramentas traduzidos.',
      enTitle: 'English (US)',
      enSubtitle: 'English (United States)',
      enDesc: 'Full English interface translation for navigation, media catalogs, dialogs, and settings.',
      esTitle: 'Español',
      esSubtitle: 'Español (Castellano / Internacional)',
      esDesc: 'Traducción completa al español para menús, reproductores, catálogos y opciones de nube.',
      langSwitchNote: '✨ A alteração de idioma é instantânea e fica salva nas suas preferências locais e no servidor.',
      langSwitchSuccess: 'Idioma alterado com sucesso!',
      playbackTitle: 'Modo de Reprodução & Cache (Vídeos e Áudios)',
      playbackSubtitle: 'Estratégias de streaming, retenção temporária e armazenamento local',
      streamingCloud: '⚡ Streaming Nuvem',
      cacheTemp: '⏳ Cache Temporário',
      cacheLocal: '💾 Cache Permanente',
      playbackModeDesc: 'Configure como suas mídias são reproduzidas no DriveGram. Escolha a estratégia ideal para economizar espaço ou acelerar o buffer, ajuste o tempo de retenção do cache temporário e limpe o armazenamento em disco:',
      cloudDirectTitle: '1. Streaming Direto da Nuvem',
      cloudDirectBadge: 'Economiza Disco',
      cloudDirectDesc: 'O vídeo ou áudio é transmitido sob demanda direto do Telegram. O arquivo é mantido temporariamente em cache e removido após o tempo limite.',
      cloudDirectRec: 'Recomendado para economizar espaço em disco',
      tempCacheTitle: '2. Cache Temporário com Auto-Limpeza',
      tempCacheBadge: 'Buffer Rápido',
      tempCacheDesc: 'O arquivo é baixado para a pasta de cache local para reprodução sem travamentos. É excluído automaticamente após o tempo limite configurado.',
      tempCacheRec: 'Ideal para conexões lentas com espaço moderado',
      localCacheTitle: '3. Cache Permanente (Baixar Tudo)',
      localCacheBadge: 'Offline Total',
      localCacheDesc: 'O arquivo é baixado e mantido no armazenamento local indefinidamente. Permite reprodução instantânea e offline.',
      localCacheRec: 'Máximo desempenho com bastante espaço livre',
      cacheRetentionTitle: 'Tempo de Retenção do Cache Temporário',
      cacheRetentionDesc: 'Defina quanto tempo os arquivos de mídia em cache temporário permanecem no disco antes de serem excluídos automaticamente:',
      customTime: 'Tempo Personalizado:',
      saveRetention: 'Salvar Tempo',
      saving: 'Salvando...',
      clearCacheTitle: 'Limpar Cache de Mídias Agora',
      clearCacheDesc: 'Libere espaço em disco apagando todos os arquivos de mídia baixados temporariamente no cache local. Seus arquivos continuam 100% seguros na nuvem do Telegram.',
      clearCacheButton: 'Limpar Todo o Cache de Mídias',
      clearingCache: 'Limpando cache...',
      pendingTitle: 'Arquivos Pendentes de Envio ao Telegram',
      pendingSubtitle: 'Upload de arquivos locais para as Mensagens Salvas do Telegram',
      allSaved: 'Tudo salvo na nuvem',
      pendingCount: 'pendente(s)',
      auditTitle: 'Auditoria & Reconciliação das Mensagens Salvas',
      auditSubtitle: 'Comparação de catálogo com Telegram, faltantes e reparo de pastas',
      syncTitle: 'Sincronização Ativa & Backup de Metadados',
      syncSubtitle: 'Reconciliação ativa, backup de pastas e política de retenção',
      apiKeysTitle: 'Central de Chaves de API',
      apiKeysSubtitle: 'Configurações de chaves para OMDb, TMDb, Google Books e YouTube',
      diagnosticTitle: 'Diagnóstico do Sistema Desktop',
      diagnosticSubtitle: 'Ferramentas de desenvolvedor, inspeção e logs',
      backupJsonTitle: 'Exportação e Importação Manual (JSON)',
      backupJsonSubtitle: 'Backup físico e restauração local de metadados em formato JSON',
      minutesUnit: 'minuto(s)',
      hoursUnit: 'hora(s)',
      daysUnit: 'dia(s)'
    },
    breadcrumbs: {
      myDrive: 'Meu Drive',
      favorites: 'Favoritos',
      trash: 'Lixeira'
    },
    deleteModal: {
      confirmTitle: 'Mover para a Lixeira',
      confirmPermanentTitle: 'Excluir Permanentemente',
      confirmMessage: 'Tem certeza de que deseja mover este item para a lixeira?',
      confirmPermanentMessage: 'Esta ação não pode ser desfeita. O item será excluído permanentemente da sua nuvem e do banco de dados.',
      deleteButton: 'Mover para a Lixeira',
      deletePermanentButton: 'Excluir Definitivamente',
      cancelButton: 'Cancelar'
    }
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
      search: 'Search',
      confirm: 'Confirm',
      refresh: 'Refresh',
      all: 'All',
      details: 'Details',
      copy: 'Copy',
      download: 'Download',
      upload: 'Upload',
      remove: 'Remove',
      clear: 'Clear',
      actions: 'Actions',
      settings: 'Settings',
      rename: 'Rename',
      move: 'Move',
      duplicate: 'Duplicate',
      favorite: 'Favorite',
      unfavorite: 'Unfavorite',
      select: 'Select',
      none: 'None',
      yes: 'Yes',
      no: 'No',
      done: 'Done',
      retry: 'Retry',
      version: 'Version'
    },
    nav: {
      searchPlaceholder: 'Search all folders and files...',
      all: 'All',
      videos: 'Videos',
      comics: 'Comics & Manga',
      ebooks: 'E-books',
      pdfs: 'PDFs',
      documents: 'Documents',
      images: 'Images',
      audios: 'Audios',
      archives: 'Archives',
      code: 'Code',
      cloudSyncTitle: 'Cloud Management',
      darkMode: 'Enable Dark Mode',
      lightMode: 'Enable Light Mode',
      openMobileMenu: 'Open Sidebar Menu',
      closeMobileMenu: 'Close Menu',
      connected: 'Connected',
      disconnected: 'Disconnected',
      syncNow: 'Sync Now',
      syncing: 'Syncing...',
      uploadsFolder: 'Open Uploads Folder',
      apiKeys: 'Manage API Keys',
      youtubeImport: 'Import from YouTube',
      serverSettings: 'Server Settings'
    },
    sidebar: {
      mainSection: 'Main',
      librariesSection: 'Libraries',
      otherSection: 'Other',
      myDrive: 'My Drive',
      courses: 'Courses & Classes',
      books: 'Books & Audiobooks',
      comics: 'Comics & Manga',
      moviesVideos: 'Movies & Videos',
      personalVideos: 'Personal Videos',
      series: 'Series & TV Shows',
      podcasts: 'Music & Podcasts',
      redLocker: 'Red Locker',
      favorites: 'Favorites',
      trash: 'Trash',
      newButton: 'New',
      uploadFiles: 'Upload files',
      uploadFolder: 'Upload folder',
      newFolder: 'New folder',
      cloudStorage: 'Cloud Storage',
      storageUsed: 'Used',
      updateAvailable: 'Update available',
      clickToUpdate: 'Click to update',
      collapseSidebar: 'Collapse sidebar',
      expandSidebar: 'Expand sidebar'
    },
    bottomNav: {
      drive: 'Drive',
      courses: 'Courses',
      media: 'Media',
      menu: 'Menu',
      actions: 'Create or Upload',
      newFolder: 'New Folder',
      uploadFiles: 'Upload Files',
      uploadFolder: 'Upload Folder',
      newCourse: 'New Course',
      newBook: 'New Book',
      newComic: 'New Comic / Manga',
      newVideo: 'New Video / Movie',
      newPersonalVideo: 'New Personal Video',
      newSeries: 'New Series',
      newAudio: 'New Audio / Music',
      youtubeImport: 'Import from YouTube'
    },
    syncModal: {
      title: 'Cloud Management',
      subtitle: 'Configure how your media is played, stored, and synchronized with Telegram',
      back: 'Back',
      selectFunction: 'Select an option:',
      manifestSynced: 'JSON Manifest Synced',
      inCloud: 'In Cloud',
      syncingManifest: 'Updating JSON Manifest',
      syncNow: 'Sync Now',
      seeDetails: 'See details ➔',
      filesCataloged: 'files cataloged',
      menuPlayback: 'Playback (Audio & Video)',
      menuThemes: 'Themes & Appearance',
      menuLanguage: 'Interface Language',
      menuPending: 'Files Pending Upload',
      menuAudit: 'Audit & Reconciliation (Saved Messages)',
      menuSync: 'Active Sync & Metadata Backup',
      menuApiKeys: 'API Keys Central',
      menuDiagnostic: 'Desktop System Diagnostic',
      menuBackupJson: 'Manual JSON Export & Import',
      themesTitle: 'Themes & Appearance',
      themesSubtitle: 'Customize the visual style, colors, and contrast of DriveGram',
      currentThemeBadge: 'Active Theme',
      themeSwitchSuccess: 'Theme changed successfully!',
      themeSwitchNote: '✨ Theme options are applied instantly and saved to your device preferences.',
      languageTitle: 'Interface Language',
      languageSubtitle: 'Choose your preferred language for DriveGram',
      currentLangBadge: 'Active Language',
      ptTitle: 'Português (Brasil)',
      ptSubtitle: 'Brazilian Portuguese (Standard)',
      ptDesc: 'Complete Portuguese interface with all menus, catalogs, and tools.',
      enTitle: 'English (US)',
      enSubtitle: 'English (United States)',
      enDesc: 'Full English interface translation for navigation, media catalogs, dialogs, and settings.',
      esTitle: 'Español',
      esSubtitle: 'Español (Castellano / Internacional)',
      esDesc: 'Complete Spanish translation for menus, players, media catalogs, and cloud options.',
      langSwitchNote: '✨ The language change is instantaneous and automatically saved in your local preferences and server.',
      langSwitchSuccess: 'Language successfully changed!',
      playbackTitle: 'Playback & Cache Mode (Videos and Audios)',
      playbackSubtitle: 'Streaming strategies, temporary retention and local storage',
      streamingCloud: '⚡ Cloud Streaming',
      cacheTemp: '⏳ Temporary Cache',
      cacheLocal: '💾 Permanent Cache',
      playbackModeDesc: 'Configure how media is played in DriveGram. Choose the ideal strategy to save disk space or speed up buffering, adjust cache retention time, and clear disk storage:',
      cloudDirectTitle: '1. Direct Cloud Streaming',
      cloudDirectBadge: 'Saves Disk',
      cloudDirectDesc: 'Video or audio is streamed on-demand directly from Telegram. Kept temporarily in cache and removed after the retention time.',
      cloudDirectRec: 'Recommended for saving disk space',
      tempCacheTitle: '2. Temporary Cache with Auto-Cleanup',
      tempCacheBadge: 'Fast Buffer',
      tempCacheDesc: 'The file is downloaded to local cache for smooth, stutter-free playback. It is deleted automatically after the configured retention limit.',
      tempCacheRec: 'Ideal for slower connections with moderate disk space',
      localCacheTitle: '3. Permanent Cache (Download All)',
      localCacheBadge: 'Total Offline',
      localCacheDesc: 'The file is downloaded and preserved in local storage indefinitely. Allows instant and offline playback.',
      localCacheRec: 'Maximum performance when you have plenty of storage',
      cacheRetentionTitle: 'Temporary Cache Retention Duration',
      cacheRetentionDesc: 'Set how long temporary cached media files stay on disk before being purged automatically:',
      customTime: 'Custom Duration:',
      saveRetention: 'Save Retention',
      saving: 'Saving...',
      clearCacheTitle: 'Clear Media Cache Now',
      clearCacheDesc: 'Free up disk space by deleting all media files downloaded in the local cache. Your files remain 100% safe in the Telegram Cloud.',
      clearCacheButton: 'Clear All Media Cache',
      clearingCache: 'Clearing cache...',
      pendingTitle: 'Files Pending Upload to Telegram',
      pendingSubtitle: 'Upload local files to Telegram Saved Messages',
      allSaved: 'Everything saved in cloud',
      pendingCount: 'pending',
      auditTitle: 'Audit & Reconciliation (Saved Messages)',
      auditSubtitle: 'Compare catalog with Telegram, missing files and folder repair',
      syncTitle: 'Active Sync & Metadata Backup',
      syncSubtitle: 'Active reconciliation, folder backup and retention policy',
      apiKeysTitle: 'API Keys Central',
      apiKeysSubtitle: 'Settings for OMDb, TMDb, Google Books and YouTube API keys',
      diagnosticTitle: 'Desktop System Diagnostic',
      diagnosticSubtitle: 'Developer tools, inspection and logs',
      backupJsonTitle: 'Manual Export & Import (JSON)',
      backupJsonSubtitle: 'Physical backup and local metadata restore in JSON format',
      minutesUnit: 'minute(s)',
      hoursUnit: 'hour(s)',
      daysUnit: 'day(s)'
    },
    breadcrumbs: {
      myDrive: 'My Drive',
      favorites: 'Favorites',
      trash: 'Trash'
    },
    deleteModal: {
      confirmTitle: 'Move to Trash',
      confirmPermanentTitle: 'Delete Permanently',
      confirmMessage: 'Are you sure you want to move this item to the trash?',
      confirmPermanentMessage: 'This action cannot be undone. The item will be permanently removed from your cloud and database.',
      deleteButton: 'Move to Trash',
      deletePermanentButton: 'Delete Permanently',
      cancelButton: 'Cancel'
    }
  },
  es: {
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      close: 'Cerrar',
      delete: 'Eliminar',
      edit: 'Editar',
      back: 'Volver',
      loading: 'Cargando...',
      success: 'Éxito',
      error: 'Error',
      search: 'Buscar',
      confirm: 'Confirmar',
      refresh: 'Actualizar',
      all: 'Todos',
      details: 'Detalles',
      copy: 'Copiar',
      download: 'Descargar',
      upload: 'Subir',
      remove: 'Eliminar',
      clear: 'Limpiar',
      actions: 'Acciones',
      settings: 'Ajustes',
      rename: 'Renombrar',
      move: 'Mover',
      duplicate: 'Duplicar',
      favorite: 'Favorito',
      unfavorite: 'Quitar favorito',
      select: 'Seleccionar',
      none: 'Ninguno',
      yes: 'Sí',
      no: 'No',
      done: 'Completado',
      retry: 'Reintentar',
      version: 'Versión'
    },
    nav: {
      searchPlaceholder: 'Buscar en todas las carpetas y archivos...',
      all: 'Todo',
      videos: 'Videos',
      comics: 'Cómics y Manga',
      ebooks: 'E-books',
      pdfs: 'PDFs',
      documents: 'Documentos',
      images: 'Imágenes',
      audios: 'Audios',
      archives: 'Comprimidos',
      code: 'Código',
      cloudSyncTitle: 'Gestión de Nube',
      darkMode: 'Activar Modo Oscuro',
      lightMode: 'Activar Modo Claro',
      openMobileMenu: 'Abrir Menú Lateral',
      closeMobileMenu: 'Cerrar Menú',
      connected: 'Conectada',
      disconnected: 'Desconectada',
      syncNow: 'Sincronizar Ahora',
      syncing: 'Sincronizando...',
      uploadsFolder: 'Abrir Carpeta de Subidas',
      apiKeys: 'Gestionar Claves de API',
      youtubeImport: 'Importar de YouTube',
      serverSettings: 'Ajustes del Servidor'
    },
    sidebar: {
      mainSection: 'Principal',
      librariesSection: 'Bibliotecas',
      otherSection: 'Otros',
      myDrive: 'Mi Drive',
      courses: 'Cursos y Clases',
      books: 'Libros y Audiolibros',
      comics: 'Cómics y Manga',
      moviesVideos: 'Películas y Videos',
      personalVideos: 'Videos Personales',
      series: 'Series y Programas',
      podcasts: 'Música y Podcasts',
      redLocker: 'Red Locker',
      favorites: 'Favoritos',
      trash: 'Papelera',
      newButton: 'Nuevo',
      uploadFiles: 'Subir archivos',
      uploadFolder: 'Subir carpeta',
      newFolder: 'Nueva carpeta',
      cloudStorage: 'Almacenamiento en Nube',
      storageUsed: 'Usado',
      updateAvailable: 'Actualización disponible',
      clickToUpdate: 'Haz clic para actualizar',
      collapseSidebar: 'Contraer barra lateral',
      expandSidebar: 'Expandir barra lateral'
    },
    bottomNav: {
      drive: 'Drive',
      courses: 'Cursos',
      media: 'Medios',
      menu: 'Menú',
      actions: 'Crear o Subir',
      newFolder: 'Nueva Carpeta',
      uploadFiles: 'Subir Archivos',
      uploadFolder: 'Subir Carpeta',
      newCourse: 'Nuevo Curso',
      newBook: 'Nuevo Libro',
      newComic: 'Nuevo Cómic / Manga',
      newVideo: 'Nuevo Video / Película',
      newPersonalVideo: 'Nuevo Video Personal',
      newSeries: 'Nueva Serie',
      newAudio: 'Nuevo Audio / Música',
      youtubeImport: 'Importar de YouTube'
    },
    syncModal: {
      title: 'Gestión de Nube',
      subtitle: 'Configura cómo se reproducen, almacenan y sincronizan tus medios con Telegram',
      back: 'Volver',
      selectFunction: 'Selecciona una función:',
      manifestSynced: 'Manifiesto JSON Sincronizado',
      inCloud: 'En la Nube',
      syncingManifest: 'Actualizando Manifiesto JSON',
      syncNow: 'Sincronizar',
      seeDetails: 'Ver detalles ➔',
      filesCataloged: 'archivos catalogados',
      menuPlayback: 'Reproducción (Audio y Video)',
      menuThemes: 'Temas y Apariencia',
      menuLanguage: 'Idioma de la Interfaz (Language)',
      menuPending: 'Archivos Pendientes de Subida',
      menuAudit: 'Auditoría y Reconciliación (Mensajes Guardados)',
      menuSync: 'Sincronización Activa y Respaldo de Metadatos',
      menuApiKeys: 'Central de Claves de API',
      menuDiagnostic: 'Diagnóstico del Sistema Desktop',
      menuBackupJson: 'Exportación e Importación Manual (JSON)',
      themesTitle: 'Temas y Apariencia',
      themesSubtitle: 'Personaliza el estilo visual, colores y contraste de DriveGram',
      currentThemeBadge: 'Tema Activo',
      themeSwitchSuccess: '¡Tema cambiado con éxito!',
      themeSwitchNote: '✨ Las opciones de tema se aplican al instante y se guardan en tus preferencias locales.',
      languageTitle: 'Idioma de la Interfaz (Language)',
      languageSubtitle: 'Elige tu idioma de preferencia para DriveGram',
      currentLangBadge: 'Idioma Activo',
      ptTitle: 'Português (Brasil)',
      ptSubtitle: 'Portugués de Brasil (Predeterminado)',
      ptDesc: 'Interfaz completa en portugués con todos los menús, catálogos y herramientas.',
      enTitle: 'English (US)',
      enSubtitle: 'Inglés (Estados Unidos)',
      enDesc: 'Traducción completa en inglés para navegación, catálogos, diálogos y ajustes.',
      esTitle: 'Español',
      esSubtitle: 'Español (Castellano / Internacional)',
      esDesc: 'Traducción completa al español para menús, reproductores, catálogos y opciones de nube.',
      langSwitchNote: '✨ El cambio de idioma es instantáneo y se guarda en tus preferencias locales y en el servidor.',
      langSwitchSuccess: '¡Idioma cambiado con éxito!',
      playbackTitle: 'Modo de Reproducción y Caché (Videos y Audios)',
      playbackSubtitle: 'Estrategias de streaming, retención temporal y almacenamiento local',
      streamingCloud: '⚡ Streaming en Nube',
      cacheTemp: '⏳ Caché Temporal',
      cacheLocal: '💾 Caché Permanente',
      playbackModeDesc: 'Configura cómo se reproducen tus medios en DriveGram. Elige la estrategia ideal para ahorrar espacio o acelerar el búfer, ajusta el tiempo de retención y limpia el almacenamiento en disco:',
      cloudDirectTitle: '1. Streaming Directo de la Nube',
      cloudDirectBadge: 'Ahorra Disco',
      cloudDirectDesc: 'El video o audio se transmite bajo demanda directamente desde Telegram. Se guarda temporalmente en caché y se borra tras el tiempo límite.',
      cloudDirectRec: 'Recomendado para ahorrar espacio en disco',
      tempCacheTitle: '2. Caché Temporal con Auto-Limpieza',
      tempCacheBadge: 'Búfer Rápido',
      tempCacheDesc: 'El archivo se descarga en el caché local para una reproducción fluida sin cortes. Se elimina automáticamente tras el tiempo configurado.',
      tempCacheRec: 'Ideal para conexiones lentas con espacio moderado',
      localCacheTitle: '3. Caché Permanente (Descargar Todo)',
      localCacheBadge: 'Total Offline',
      localCacheDesc: 'El archivo se descarga y se mantiene en el almacenamiento local de forma indefinida. Permite reproducción instantánea y sin conexión.',
      localCacheRec: 'Máximo rendimiento cuando tienes mucho espacio libre',
      cacheRetentionTitle: 'Tiempo de Retención del Caché Temporal',
      cacheRetentionDesc: 'Define cuánto tiempo permanecen los archivos en caché en el disco antes de eliminarse automáticamente:',
      customTime: 'Tiempo Personalizado:',
      saveRetention: 'Guardar Tiempo',
      saving: 'Guardando...',
      clearCacheTitle: 'Limpiar Caché de Medios Ahora',
      clearCacheDesc: 'Libera espacio en disco eliminando todos los archivos descargados temporalmente en el caché local. Tus archivos permanecen 100% seguros en la nube de Telegram.',
      clearCacheButton: 'Limpiar Todo el Caché de Medios',
      clearingCache: 'Limpiando caché...',
      pendingTitle: 'Archivos Pendientes de Subida a Telegram',
      pendingSubtitle: 'Subida de archivos locales a los Mensajes Guardados de Telegram',
      allSaved: 'Todo guardado en la nube',
      pendingCount: 'pendiente(s)',
      auditTitle: 'Auditoría y Reconciliación (Mensajes Guardados)',
      auditSubtitle: 'Comparación del catálogo con Telegram, faltantes y reparación de carpetas',
      syncTitle: 'Sincronización Activa y Respaldo de Metadatos',
      syncSubtitle: 'Reconciliación activa, copia de seguridad de carpetas y política de retención',
      apiKeysTitle: 'Central de Claves de API',
      apiKeysSubtitle: 'Ajustes de claves para OMDb, TMDb, Google Books y YouTube',
      diagnosticTitle: 'Diagnóstico del Sistema Desktop',
      diagnosticSubtitle: 'Herramientas de desarrollador, inspección y registros',
      backupJsonTitle: 'Exportación e Importación Manual (JSON)',
      backupJsonSubtitle: 'Copia de seguridad física y restauración local de metadados en formato JSON',
      minutesUnit: 'minuto(s)',
      hoursUnit: 'hora(s)',
      daysUnit: 'día(s)'
    },
    breadcrumbs: {
      myDrive: 'Mi Drive',
      favorites: 'Favoritos',
      trash: 'Papelera'
    },
    deleteModal: {
      confirmTitle: 'Mover a la Papelera',
      confirmPermanentTitle: 'Eliminar Permanentemente',
      confirmMessage: '¿Estás seguro de que deseas mover este elemento a la papelera?',
      confirmPermanentMessage: 'Esta acción no se puede deshacer. El elemento se eliminará permanentemente de tu nube y de la base de datos.',
      deleteButton: 'Mover a la Papelera',
      deletePermanentButton: 'Eliminar Definitivamente',
      cancelButton: 'Cancelar'
    }
  }
};
