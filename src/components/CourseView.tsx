import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  ChevronDown, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Maximize, 
  BookOpen, 
  FileText, 
  Edit3, 
  Layers, 
  Check, 
  Clock, 
  ListOrdered, 
  Sparkles,
  ArrowLeft,
  Settings2,
  Repeat,
  Tv,
  Subtitles,
  BookmarkPlus,
  Plus,
  Trash2,
  MoreVertical,
  X,
  Upload,
  Image as ImageIcon,
  FolderPlus,
  Download,
  Eye,
  Cast,
  Airplay,
  Copy,
  ExternalLink,
  Radio,
  Share2,
  Shuffle,
  LayoutGrid,
  List
} from 'lucide-react';
import { Course, Lesson, CourseModule, DriveItem, VideoTimestamp, VideoSubtitle } from '../types/index.js';

interface CourseViewProps {
  course: Course;
  activeLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleCompletion: (lessonId: string) => void;
  onSaveNotes: (lessonId: string, notes: string) => void;
  onUpdateCourse: (updatedCourse: Course) => Promise<void>;
  onDeleteCourse: (courseId: string) => Promise<void>;
  onBackToDrive: () => void;
  onOpenFileViewer?: (file: DriveItem) => void;
  onUpdateLessonProgress?: (lessonId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  getNextLesson: () => Lesson | null;
  getPreviousLesson: () => Lesson | null;
  allFiles: DriveItem[];
  isPiPHidden?: boolean;
  onEnterPiP?: () => void;
  onLeavePiP?: () => void;
  onRestoreToTab?: () => void;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}

function parseSubtitleContent(content: string): SubtitleCue[] {
  const clean = content.replace(/\r\n|\r/g, '\n');
  const blocks = clean.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        const timeMatch = lines[i].split('-->');
        if (timeMatch.length === 2) {
          const start = parseTimeToSeconds(timeMatch[0]);
          const end = parseTimeToSeconds(timeMatch[1]);
          const text = lines.slice(i + 1).join('\n').replace(/<[^>]*>/g, '').trim();
          if (text && !isNaN(start) && !isNaN(end)) {
            cues.push({ start, end, text });
          }
        }
      }
    }
  }
  return cues;
}

interface CastDevice {
  id: string;
  name: string;
  ip: string;
  type: 'chromecast' | 'smart_tv_samsung' | 'smart_tv_lg' | 'roku' | 'dlna' | 'generic';
  model?: string;
  status: 'online' | 'ready';
}

export const CourseView: React.FC<CourseViewProps> = ({
  course,
  activeLesson,
  onSelectLesson,
  onToggleCompletion,
  onSaveNotes,
  onUpdateCourse,
  onDeleteCourse,
  onBackToDrive,
  onOpenFileViewer,
  onUpdateLessonProgress,
  getNextLesson,
  getPreviousLesson,
  allFiles,
  isPiPHidden = false,
  onEnterPiP,
  onLeavePiP,
  onRestoreToTab
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlayNext, setIsAutoPlayNext] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'index' | 'timestamps' | 'notes' | 'materials' | 'subtitles'>('index');
  const [lessonNotes, setLessonNotes] = useState('');
  const [openModules, setOpenModules] = useState<{ [key: string]: boolean }>({
    [course.modules[0]?.id || '']: true
  });
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [lessonViewMode, setLessonViewMode] = useState<'list' | 'grid'>('list');

  const handlePlayRandomLesson = () => {
    const allLessons = course.modules.flatMap(m => m.lessons);
    const uncompleted = allLessons.filter(l => !l.isCompleted);
    const pool = uncompleted.length > 0 ? uncompleted : allLessons;
    if (pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      onSelectLesson(pool[idx]);
    }
  };

  // Video current time for subtitles
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);

  // Subtitles state
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const currentSub = activeLesson?.subtitles?.find(s => s.id === selectedSubtitleId);

  // Sync native HTML5 textTrack mode with selectedSubtitleId
  useEffect(() => {
    if (videoRef.current && videoRef.current.textTracks) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (selectedSubtitleId && (track.label === currentSub?.label || track.language === currentSub?.srclang)) {
          track.mode = 'showing';
        } else {
          track.mode = 'disabled';
        }
      }
    }
  }, [selectedSubtitleId, currentSub]);

  // Editing state for Course, Modules & Lessons
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseTitleInput, setCourseTitleInput] = useState(course.title);
  const [courseDescInput, setCourseDescInput] = useState(course.description);
  
  // Cover Image Editing Modal state
  const [isChangingCover, setIsChangingCover] = useState(false);
  const [coverImageUrlInput, setCoverImageUrlInput] = useState(course.coverImage || '');
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitleInput, setModuleTitleInput] = useState('');

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitleInput, setLessonTitleInput] = useState('');

  // Timestamps state
  const [newTimestampLabel, setNewTimestampLabel] = useState('');
  const [isAddingTimestamp, setIsAddingTimestamp] = useState(false);

  // Materials Drag & Drop state
  const [isDraggingMaterial, setIsDraggingMaterial] = useState(false);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  // Lesson Drag & Drop Reordering state
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null);
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null);

  // Video Transmission & Cast state
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  const [copiedStreamUrl, setCopiedStreamUrl] = useState(false);
  const [castDevices, setCastDevices] = useState<CastDevice[]>([]);
  const [isScanningCast, setIsScanningCast] = useState(false);
  const [activeCastingDevice, setActiveCastingDevice] = useState<CastDevice | null>(null);
  const [castFeedback, setCastFeedback] = useState<string | null>(null);
  const [networkLanIp, setNetworkLanIp] = useState<string>('');

  const activeMediaFile = activeLesson?.fileId
    ? allFiles.find(f => f.id === activeLesson.fileId)
    : allFiles.find(f => f.name === activeLesson?.title || f.name.includes(activeLesson?.title || ''));

  const streamUrl = activeMediaFile
    ? `${window.location.origin}/api/stream/${activeMediaFile.id}`
    : '';

  const lanStreamUrl = networkLanIp && activeMediaFile
    ? `${networkLanIp}/api/stream/${activeMediaFile.id}`
    : streamUrl;

  const fetchNetworkDevices = async () => {
    setIsScanningCast(true);
    setCastFeedback(null);
    try {
      const [devRes, ipRes] = await Promise.all([
        fetch('/api/cast/devices'),
        fetch('/api/cast/network-ip')
      ]);
      if (devRes.ok) {
        const data = await devRes.json();
        setCastDevices(data);
      }
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        setNetworkLanIp(ipData.baseUrl);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningCast(false);
    }
  };

  useEffect(() => {
    if (isCastModalOpen) {
      fetchNetworkDevices();
    }
  }, [isCastModalOpen]);

  const handleCastToDevice = async (device: CastDevice) => {
    setActiveCastingDevice(device);
    setCastFeedback(`Conectando a "${device.name}" (${device.ip})...`);

    // Try native remote playback in browser if supported
    try {
      if ((videoRef.current as any).remote?.prompt) {
        (videoRef.current as any).remote.prompt().catch(() => {});
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/cast/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: device.id,
          mediaUrl: lanStreamUrl,
          title: activeLesson?.title || course.title
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCastFeedback(`✅ ${data.message}`);
      }
    } catch (err) {
      setCastFeedback(`Transmissão iniciada no aparelho ${device.name}`);
    }
  };

  const handleTriggerCast = async () => {
    setIsCastModalOpen(true);
    if (videoRef.current) {
      try {
        if ((videoRef.current as any).remote?.prompt) {
          (videoRef.current as any).remote.prompt().catch(() => {});
        } else if ((videoRef.current as any).webkitShowPlaybackTargetPicker) {
          (videoRef.current as any).webkitShowPlaybackTargetPicker();
        }
      } catch (e) {}
    }
  };

  const handleTogglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  // Listen to native Picture-in-Picture enter / exit (e.g. "Voltar para a guia")
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleEnterPiP = () => {
      if (onEnterPiP) onEnterPiP();
    };

    const handleLeavePiP = () => {
      if (onLeavePiP) onLeavePiP();
      if (onRestoreToTab) onRestoreToTab();
    };

    videoEl.addEventListener('enterpictureinpicture', handleEnterPiP);
    videoEl.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      videoEl.removeEventListener('leavepictureinpicture', handleLeavePiP);
      videoEl.removeEventListener('enterpictureinpicture', handleEnterPiP);
    };
  }, [activeLesson?.id, onEnterPiP, onLeavePiP, onRestoreToTab]);

  const handleCopyStreamUrl = () => {
    const urlToCopy = lanStreamUrl || streamUrl;
    if (!urlToCopy) return;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedStreamUrl(true);
    setTimeout(() => setCopiedStreamUrl(false), 2500);
  };

  // Sync lesson notes, subtitles and auto-resume position when active lesson changes
  useEffect(() => {
    if (activeLesson) {
      setLessonNotes(activeLesson.notes || '');
      setCountdown(null);
      setIsPlaying(true);
      
      if (activeLesson.subtitles && activeLesson.subtitles.length > 0) {
        setSelectedSubtitleId(activeLesson.subtitles[0].id);
      } else {
        setSelectedSubtitleId(null);
      }

      if (videoRef.current) {
        const resumePos = activeLesson.lastPositionSeconds || 0;
        if (resumePos > 0) {
          videoRef.current.currentTime = resumePos;
        }
        videoRef.current.playbackRate = playbackSpeed;
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [activeLesson?.id]);

  const onUpdateLessonProgressRef = useRef(onUpdateLessonProgress);
  useEffect(() => {
    onUpdateLessonProgressRef.current = onUpdateLessonProgress;
  }, [onUpdateLessonProgress]);

  const lastSavedLessonTimeRef = useRef<number>(-1);

  // Periodic auto-save progress for active lesson
  useEffect(() => {
    if (!activeLesson?.id) return;

    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && activeLesson) {
        const curr = Math.floor(videoRef.current.currentTime);
        if (curr !== lastSavedLessonTimeRef.current && curr > 0) {
          lastSavedLessonTimeRef.current = curr;
          onUpdateLessonProgressRef.current?.(activeLesson.id, curr, false);
        }
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      if (videoRef.current && activeLesson) {
        const curr = Math.floor(videoRef.current.currentTime);
        if (curr > 0 && curr !== lastSavedLessonTimeRef.current) {
          lastSavedLessonTimeRef.current = curr;
          onUpdateLessonProgressRef.current?.(activeLesson.id, curr, false);
        }
      }
    };
  }, [activeLesson?.id]);

  // Autoplay countdown timer
  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      const next = getNextLesson();
      if (next) {
        onSelectLesson(next);
      }
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, getNextLesson, onSelectLesson]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (activeLesson) {
      onUpdateLessonProgress?.(activeLesson.id, videoRef.current?.duration || videoCurrentTime, true);
      if (!activeLesson.isCompleted) {
        onToggleCompletion(activeLesson.id);
      }

      if (isAutoPlayNext) {
        const next = getNextLesson();
        if (next) {
          setCountdown(5);
        }
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ---------------- LESSON REORDERING VIA DRAG AND DROP ----------------
  const handleMoveLesson = async (sourceLessonId: string, sourceModId: string, targetModId: string, targetLessonId?: string) => {
    let sourceLesson: Lesson | null = null;
    const updatedModules = course.modules.map(mod => {
      if (mod.id === sourceModId) {
        const found = mod.lessons.find(l => l.id === sourceLessonId);
        if (found) sourceLesson = found;
        return {
          ...mod,
          lessons: mod.lessons.filter(l => l.id !== sourceLessonId)
        };
      }
      return mod;
    });

    if (!sourceLesson) return;

    const finalModules = updatedModules.map(mod => {
      if (mod.id === targetModId) {
        let newLessons = [...mod.lessons];
        if (targetLessonId && targetLessonId !== sourceLessonId) {
          const targetIdx = newLessons.findIndex(l => l.id === targetLessonId);
          if (targetIdx !== -1) {
            newLessons.splice(targetIdx, 0, sourceLesson!);
          } else {
            newLessons.push(sourceLesson!);
          }
        } else {
          newLessons.push(sourceLesson!);
        }
        return {
          ...mod,
          lessons: newLessons.map((l, idx) => ({ ...l, order: idx + 1 }))
        };
      }
      return mod;
    });

    const updatedCourse: Course = {
      ...course,
      modules: finalModules,
      updatedAt: new Date().toISOString()
    };
    await onUpdateCourse(updatedCourse);
  };

  // ---------------- COVER IMAGE CHANGE ----------------
  const handleSaveCoverImage = async () => {
    await onUpdateCourse({
      ...course,
      coverImage: coverImageUrlInput.trim() || course.coverImage
    });
    setIsChangingCover(false);
  };

  const handleUploadCoverImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setCoverImageUrlInput(dataUrl);
      await onUpdateCourse({
        ...course,
        coverImage: dataUrl
      });
      setIsChangingCover(false);
    };
    reader.readAsDataURL(file);
  };

  // ---------------- TIMESTAMPS HANDLERS ----------------
  const handleAddTimestamp = async () => {
    if (!activeLesson || !videoRef.current) return;
    const currentSeconds = Math.floor(videoRef.current.currentTime);
    const timeFormatted = formatSeconds(currentSeconds);
    const label = newTimestampLabel.trim() || `Ponto de estudo em ${timeFormatted}`;

    const newTs: VideoTimestamp = {
      id: 'ts-' + Date.now(),
      seconds: currentSeconds,
      timeFormatted,
      label
    };

    const currentTimestamps = activeLesson.timestamps || [];
    const updatedTimestamps = [...currentTimestamps, newTs].sort((a, b) => a.seconds - b.seconds);

    const updatedModules = course.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(l => 
        l.id === activeLesson.id ? { ...l, timestamps: updatedTimestamps } : l
      )
    }));

    const updatedCourse = { ...course, modules: updatedModules };
    await onUpdateCourse(updatedCourse);
    setNewTimestampLabel('');
    setIsAddingTimestamp(false);
  };

  const handleSeekTimestamp = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleDeleteTimestamp = async (tsId: string) => {
    if (!activeLesson) return;
    const updatedTimestamps = (activeLesson.timestamps || []).filter(t => t.id !== tsId);

    const updatedModules = course.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(l => 
        l.id === activeLesson.id ? { ...l, timestamps: updatedTimestamps } : l
      )
    }));

    await onUpdateCourse({ ...course, modules: updatedModules });
  };

  // ---------------- SUBTITLES HANDLERS ----------------
  const handleAddSubtitleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLesson) return;

    const text = await file.text();
    let vttContent = text;

    if (file.name.endsWith('.srt')) {
      vttContent = 'WEBVTT\n\n' + text.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
    }

    const vttDataUrl = 'data:text/vtt;charset=utf-8,' + encodeURIComponent(vttContent);

    const newSub: VideoSubtitle = {
      id: 'sub-' + Date.now(),
      label: file.name.replace(/\.[^/.]+$/, ""),
      srclang: 'pt',
      url: vttDataUrl
    };

    const currentSubs = activeLesson.subtitles || [];
    const updatedSubs = [...currentSubs, newSub];

    const updatedModules = course.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(l => 
        l.id === activeLesson.id ? { ...l, subtitles: updatedSubs } : l
      )
    }));

    await onUpdateCourse({ ...course, modules: updatedModules });
    setSelectedSubtitleId(newSub.id);
  };

  // ---------------- MATERIALS DRAG & DROP / UPLOAD HANDLER ----------------
  const handleMaterialDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMaterial(false);
    if (!activeLesson || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    await processMaterialFiles(e.dataTransfer.files);
  };

  const processMaterialFiles = async (files: FileList) => {
    if (!activeLesson) return;
    const fileArray = Array.from(files);

    // 1. Ensure "Materiais" folder exists inside course folder
    let materialsFolderId = course.folderId || null;
    try {
      const foldersRes = await fetch('/api/folders?all=true');
      const allFolders: any[] = await foldersRes.json();
      
      let matFolder = allFolders.find(f => 
        (f.parentId === course.folderId || (!course.folderId && !f.parentId)) && 
        f.name.toLowerCase().includes('materiais') && !f.isTrash
      );

      if (!matFolder) {
        const createRes = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '📁 Materiais',
            parentId: course.folderId || null,
            color: '#ea4335'
          })
        });
        matFolder = await createRes.json();
      }
      materialsFolderId = matFolder.id;
    } catch (e) {}

    // 2. Upload file and attach to lesson materials
    for (const file of fileArray) {
      const formData = new FormData();
      formData.append('file', file);
      if (materialsFolderId) formData.append('parentId', materialsFolderId);

      try {
        const uploadRes = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        });
        const savedFile = await uploadRes.json();

        const newMaterial = {
          id: 'mat-' + Date.now(),
          name: file.name,
          fileId: savedFile.id,
          type: file.name.endsWith('.pdf') ? ('pdf' as const) : ('file' as const)
        };

        const currentMaterials = activeLesson.materials || [];
        const updatedMaterials = [...currentMaterials, newMaterial];

        const updatedModules = course.modules.map(mod => ({
          ...mod,
          lessons: mod.lessons.map(l => 
            l.id === activeLesson.id ? { ...l, materials: updatedMaterials } : l
          )
        }));

        await onUpdateCourse({ ...course, modules: updatedModules });
      } catch (err) {
        console.error('Error uploading material:', err);
      }
    }
  };

  // ---------------- EDITING COURSE / MODULES / LESSONS ----------------
  const handleSaveCourseInfo = async () => {
    await onUpdateCourse({
      ...course,
      title: courseTitleInput.trim() || course.title,
      description: courseDescInput.trim() || course.description
    });
    setIsEditingCourse(false);
  };

  const handleSaveModuleTitle = async (moduleId: string) => {
    if (!moduleTitleInput.trim()) return;
    const updatedModules = course.modules.map(m => 
      m.id === moduleId ? { ...m, title: moduleTitleInput.trim() } : m
    );
    await onUpdateCourse({ ...course, modules: updatedModules });
    setEditingModuleId(null);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm('Tem certeza que deseja excluir este módulo e todas as suas aulas?')) {
      const updatedModules = course.modules.filter(m => m.id !== moduleId);
      await onUpdateCourse({ ...course, modules: updatedModules });
    }
  };

  const handleSaveLessonTitle = async (lessonId: string) => {
    if (!lessonTitleInput.trim()) return;
    const updatedModules = course.modules.map(m => ({
      ...m,
      lessons: m.lessons.map(l => 
        l.id === lessonId ? { ...l, title: lessonTitleInput.trim() } : l
      )
    }));
    await onUpdateCourse({ ...course, modules: updatedModules });
    setEditingLessonId(null);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm('Deseja excluir esta aula do curso?')) {
      const updatedModules = course.modules.map(m => ({
        ...m,
        lessons: m.lessons.filter(l => l.id !== lessonId)
      }));
      await onUpdateCourse({ ...course, modules: updatedModules });
      if (activeLesson?.id === lessonId) {
        const next = course.modules.flatMap(m => m.lessons).find(l => l.id !== lessonId);
        if (next) onSelectLesson(next);
      }
    }
  };

  const handleAddNewModule = async () => {
    const newMod: CourseModule = {
      id: 'mod-' + Date.now(),
      title: `Módulo ${course.modules.length + 1}: Novo Módulo`,
      order: course.modules.length + 1,
      lessons: []
    };
    await onUpdateCourse({
      ...course,
      modules: [...course.modules, newMod]
    });
    setOpenModules(prev => ({ ...prev, [newMod.id]: true }));
  };

  const handleAddNewLessonToModule = async (moduleId: string) => {
    const targetMod = course.modules.find(m => m.id === moduleId);
    const newLesson: Lesson = {
      id: 'lesson-' + Date.now(),
      title: `Aula ${(targetMod?.lessons.length || 0) + 1}`,
      duration: '10:00',
      order: (targetMod?.lessons.length || 0) + 1,
      isCompleted: false
    };

    const updatedModules = course.modules.map(m => 
      m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m
    );

    await onUpdateCourse({ ...course, modules: updatedModules });
    onSelectLesson(newLesson);
  };

  // Calculate course progress
  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = course.modules.reduce((acc, m) => acc + m.lessons.filter(l => l.isCompleted).length, 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div
      className={
        isPiPHidden
          ? 'fixed bottom-0 right-0 w-px h-px opacity-0 pointer-events-none -z-50 overflow-hidden'
          : 'flex flex-col h-full bg-drive-lightBg dark:bg-drive-darkBg'
      }
    >
      {/* Top Course Bar with Inline Editing & Change Cover Button */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (document.pictureInPictureElement && document.exitPictureInPicture) {
                document.exitPictureInPicture().catch(() => {});
              }
              if (videoRef.current && activeLesson) {
                onUpdateLessonProgress?.(activeLesson.id, videoRef.current.currentTime, false);
                videoRef.current.pause();
              }
              onBackToDrive();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors border border-gray-200 dark:border-drive-darkBorder"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Drive</span>
          </button>
          
          <div className="h-4 w-px bg-gray-300 dark:bg-drive-darkBorder hidden sm:block" />

          {isEditingCourse ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={courseTitleInput}
                onChange={(e) => setCourseTitleInput(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-50 dark:bg-drive-darkBg border border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSaveCourseInfo}
                className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-500"
                title="Salvar Título"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditingCourse(false)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-md">
                {course.title}
              </h1>
              <button
                onClick={() => {
                  setCourseTitleInput(course.title);
                  setCourseDescInput(course.description);
                  setIsEditingCourse(true);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                title="Editar Título do Curso"
              >
                <Edit3 className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  setCoverImageUrlInput(course.coverImage || '');
                  setIsChangingCover(true);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-200 dark:border-drive-darkBorder transition-colors"
                title="Trocar Imagem de Capa do Curso"
              >
                <ImageIcon className="w-3 h-3 text-indigo-500" />
                <span>Mudar Capa</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Course Progress Bar & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end gap-1 min-w-[130px]">
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {completedLessons}/{totalLessons} aulas ({progressPercent}%)
            </span>
          </div>

          {/* Cast Video to TV / Chromecast / Airplay Button */}
          <button
            onClick={() => setIsCastModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Transmitir vídeo para Smart TV, Chromecast, AirPlay ou VLC"
          >
            <Cast className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">Transmitir</span>
          </button>

          {/* Picture-in-Picture Mini Player */}
          <button
            onClick={handleTogglePiP}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder transition-colors"
            title="Janela Flutuante (Picture-in-Picture) - Assista enquanto usa outros programas"
          >
            <Airplay className="w-4 h-4 text-purple-500" />
          </button>

          {/* Cinema Mode Toggle */}
          <button
            onClick={() => setIsCinemaMode(!isCinemaMode)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder transition-colors"
            title={isCinemaMode ? 'Exibir Índice Lateral' : 'Modo Cinema'}
          >
            <Tv className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Main Studio Layout */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto min-h-0">
        {/* Left: Video Player, Subtitles, Timestamps & Materials Area */}
        <div className="flex-1 flex flex-col lg:overflow-y-auto p-3 sm:p-4 lg:p-6 min-w-0 shrink-0 lg:shrink">
          {/* Video Container with Track Subtitles */}
          <div className="relative w-full aspect-video shrink-0 rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800 flex items-center justify-center">
            {activeLesson ? (
              <>
                {!activeMediaFile && (activeLesson.embedUrl || (activeLesson.videoUrl && (activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be')))) ? (
                  <iframe
                    key={activeLesson.id}
                    src={activeLesson.embedUrl || (activeLesson.videoUrl ? `https://www.youtube.com/embed/${activeLesson.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i)?.[1] || ''}?autoplay=1&enablejsapi=1` : '')}
                    title={activeLesson.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    key={activeLesson.id}
                    className="w-full h-full object-contain"
                    controls
                    crossOrigin="anonymous"
                    playsInline
                    src={activeMediaFile ? `/api/stream/${activeMediaFile.id}` : (activeLesson.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
                    onLoadedMetadata={() => {
                      if (videoRef.current && (activeLesson.lastPositionSeconds || 0) > 0) {
                        videoRef.current.currentTime = activeLesson.lastPositionSeconds || 0;
                      }
                    }}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => {
                      setIsPlaying(false);
                      if (videoRef.current && activeLesson) {
                        onUpdateLessonProgress?.(activeLesson.id, videoRef.current.currentTime, false);
                      }
                    }}
                  >
                    {/* Embedded WebVTT Subtitle Tracks */}
                    {activeLesson.subtitles?.map((sub) => (
                      <track
                        key={sub.id}
                        kind="subtitles"
                        src={sub.url}
                        srcLang={sub.srclang || 'pt'}
                        label={sub.label || 'Português'}
                        default={sub.id === selectedSubtitleId}
                      />
                    ))}
                  </video>
                )}
              </>
            ) : (
              <div className="text-center text-gray-400 p-8">
                <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Selecione uma aula no índice ao lado para iniciar</p>
              </div>
            )}

            {/* Countdown Overlay for Continuous Autoplay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 mb-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
                  <Repeat className="w-4 h-4 animate-spin" />
                  <span>Reprodução em Sequência</span>
                </div>
                <h3 className="text-lg font-bold mb-1">Próxima Aula em {countdown} segundos</h3>
                <p className="text-xs text-gray-300 mb-6 max-w-sm text-center">
                  {getNextLesson()?.title || 'Próximo conteúdo'}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const next = getNextLesson();
                      if (next) onSelectLesson(next);
                      setCountdown(null);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/30"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Reproduzir Agora</span>
                  </button>

                  <button
                    onClick={() => setCountdown(null)}
                    className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs border border-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Toolbar: Sequential Autoplay, Timestamps Action, Subtitles */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 p-3 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prev = getPreviousLesson();
                  if (prev) onSelectLesson(prev);
                }}
                disabled={!getPreviousLesson()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-drive-darkHover text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                onClick={() => {
                  const next = getNextLesson();
                  if (next) onSelectLesson(next);
                }}
                disabled={!getNextLesson()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors shadow-sm shadow-blue-500/20"
              >
                <span>Próxima</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timestamps & Subtitle Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsAddingTimestamp(true);
                  setActiveTab('timestamps');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-all"
                title="Criar marcador no tempo atual do vídeo"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
                <span>+ Inserir Timestamp</span>
              </button>

              <button
                onClick={() => setIsAutoPlayNext(!isAutoPlayNext)}
                title="Reproduzir automaticamente a próxima aula ao terminar"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  isAutoPlayNext
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                    : 'bg-gray-100 dark:bg-drive-darkHover text-gray-500 border-transparent'
                }`}
              >
                <Repeat className={`w-3.5 h-3.5 ${isAutoPlayNext ? 'text-sky-500 animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Sequência: <strong>{isAutoPlayNext ? 'ON' : 'OFF'}</strong></span>
              </button>

              {/* Speed Controls */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-drive-darkHover p-1 rounded-xl">
                {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                      playbackSpeed === s
                        ? 'bg-white dark:bg-drive-darkSurface text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Mark Completed Button */}
              {activeLesson && (
                <button
                  onClick={() => onToggleCompletion(activeLesson.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeLesson.isCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-gray-100 dark:bg-drive-darkHover text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle className={`w-4 h-4 ${activeLesson.isCompleted ? 'fill-emerald-500 text-white' : ''}`} />
                  <span className="hidden sm:inline">{activeLesson.isCompleted ? 'Concluída' : 'Concluir'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Lesson Tabs */}
          {activeLesson && (
            <div className="mt-6 shrink-0">
              <div className="flex items-center justify-between">
                {editingLessonId === activeLesson.id ? (
                  <div className="flex items-center gap-2 w-full max-w-md mb-2">
                    <input
                      type="text"
                      value={lessonTitleInput}
                      onChange={(e) => setLessonTitleInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm font-bold rounded-xl bg-white dark:bg-drive-darkSurface border border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveLessonTitle(activeLesson.id)}
                      className="p-1.5 rounded-lg bg-blue-600 text-white"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Green dot on title if completed */}
                    {activeLesson.isCompleted && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse shrink-0" title="Aula Concluída" />
                    )}
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {activeLesson.title}
                    </h2>
                    <button
                      onClick={() => {
                        setLessonTitleInput(activeLesson.title);
                        setEditingLessonId(activeLesson.id);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500"
                      title="Editar Título da Aula"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tabs header */}
              <div className="flex border-b border-gray-200 dark:border-drive-darkBorder mt-4 mb-4 gap-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab(prev => prev === 'timestamps' ? 'index' : 'timestamps')}
                  className={`pb-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeTab === 'timestamps'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Timestamps ({activeLesson.timestamps?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab(prev => prev === 'subtitles' ? 'index' : 'subtitles')}
                  className={`pb-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeTab === 'subtitles'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Subtitles className="w-3.5 h-3.5 text-sky-500" />
                  <span>Legendas ({activeLesson.subtitles?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab(prev => prev === 'materials' ? 'index' : 'materials')}
                  className={`pb-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeTab === 'materials'
                      ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>Materiais ({activeLesson.materials?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab(prev => prev === 'notes' ? 'index' : 'notes')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === 'notes'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Anotações
                </button>
              </div>

              {/* TAB 1: TIMESTAMPS */}
              {activeTab === 'timestamps' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40">
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 px-2 py-1 bg-white dark:bg-drive-darkBg rounded-lg border border-amber-200 dark:border-amber-800">
                      ⏱️ {videoRef.current ? formatSeconds(videoRef.current.currentTime) : '00:00'}
                    </span>
                    <input
                      type="text"
                      value={newTimestampLabel}
                      onChange={(e) => setNewTimestampLabel(e.target.value)}
                      placeholder="Descrição do ponto / capítulo (ex: Instalação do banco)..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleAddTimestamp}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Salvar Timestamp</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {activeLesson.timestamps && activeLesson.timestamps.length > 0 ? (
                      [...activeLesson.timestamps].sort((a, b) => a.seconds - b.seconds).map((ts) => (
                        <div
                          key={ts.id}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-drive-darkHover border border-gray-100 dark:border-drive-darkBorder group transition-colors"
                        >
                          <button
                            onClick={() => handleSeekTimestamp(ts.seconds)}
                            className="flex items-center gap-3 text-left flex-1"
                          >
                            <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-colors">
                              ▶ {ts.timeFormatted}
                            </span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              {ts.label}
                            </span>
                          </button>

                          <button
                            onClick={() => handleDeleteTimestamp(ts.id)}
                            className="p-1 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir Timestamp"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">
                        Nenhum timestamp adicionado nesta aula ainda. Pause o vídeo e clique em "Salvar Timestamp" para criar capítulos!
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SUBTITLES (LEGENDAS) */}
              {activeTab === 'subtitles' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Legendas / Closed Captions</h4>
                      <p className="text-[11px] text-gray-500">Legendas na mesma pasta do vídeo são carregadas automaticamente</p>
                    </div>

                    <button
                      onClick={() => subtitleInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Carregar Legenda (.vtt/.srt)</span>
                    </button>
                    <input
                      type="file"
                      ref={subtitleInputRef}
                      onChange={handleAddSubtitleFile}
                      accept=".vtt,.srt"
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    {activeLesson.subtitles && activeLesson.subtitles.length > 0 ? (
                      activeLesson.subtitles.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedSubtitleId(sub.id === selectedSubtitleId ? null : sub.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedSubtitleId === sub.id
                              ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 text-sky-800 dark:text-sky-200 font-bold'
                              : 'hover:bg-gray-50 dark:hover:bg-drive-darkHover border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Subtitles className="w-4 h-4 text-sky-500" />
                            <span className="text-xs">{sub.label} ({sub.srclang})</span>
                          </div>

                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-drive-darkBg">
                            {selectedSubtitleId === sub.id ? 'Ativa no Vídeo ✅' : 'Clique para Ativar'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">
                        Nenhuma legenda vinculada a esta aula.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: MATERIAIS WITH AUTO-FOLDER CREATION & DRAG-DROP */}
              {activeTab === 'materials' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder space-y-4">
                  {/* Dedicated Materials Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingMaterial(true);
                    }}
                    onDragLeave={() => setIsDraggingMaterial(false)}
                    onDrop={handleMaterialDrop}
                    onClick={() => materialFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDraggingMaterial
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                        : 'border-gray-300 dark:border-drive-darkBorder hover:border-rose-400 hover:bg-rose-50/20 dark:hover:bg-rose-950/10'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                      Arraste e solte arquivos aqui (PDF, Apostilas, Códigos)
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Uma pasta <strong>"📁 Materiais"</strong> será criada automaticamente dentro do curso no Telegram.
                    </p>
                    <input
                      type="file"
                      ref={materialFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processMaterialFiles(e.target.files);
                        }
                      }}
                      multiple
                      className="hidden"
                    />
                  </div>

                  {/* Materials List */}
                  <div className="space-y-2">
                    {activeLesson.materials && activeLesson.materials.length > 0 ? (
                      activeLesson.materials.map((mat) => (
                        <div
                          key={mat.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-xs"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {mat.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                const file = allFiles.find(f => f.id === mat.fileId);
                                if (file && onOpenFileViewer) onOpenFileViewer(file);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100"
                            >
                              <Eye className="w-3.5 h-3.5" /> Visualizar
                            </button>
                            <a
                              href={mat.fileId ? `/api/stream/${mat.fileId}` : '#'}
                              download={mat.name}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              title="Baixar Material"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">
                        Nenhum material complementar adicionado a esta aula ainda.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: NOTES */}
              {activeTab === 'notes' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder">
                  <textarea
                    value={lessonNotes}
                    onChange={(e) => {
                      setLessonNotes(e.target.value);
                      onSaveNotes(activeLesson.id, e.target.value);
                    }}
                    placeholder="Escreva suas anotações desta aula aqui..."
                    rows={6}
                    className="w-full p-3 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 font-mono"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Index Sidebar with Green Dots on Completed Lessons */}
        {!isCinemaMode && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-200 dark:border-drive-darkBorder space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ListOrdered className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    Aulas ({course.modules.reduce((acc, m) => acc + m.lessons.length, 0)})
                  </h3>
                </div>

                {/* View Mode Toggle: Lista vs Grade */}
                <div className="flex items-center bg-gray-100 dark:bg-drive-darkBg p-0.5 rounded-lg border border-gray-200 dark:border-drive-darkBorder">
                  <button
                    onClick={() => setLessonViewMode('list')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      lessonViewMode === 'list'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                    title="Visualizar em Lista"
                  >
                    <List className="w-3 h-3" />
                    <span>Lista</span>
                  </button>
                  <button
                    onClick={() => setLessonViewMode('grid')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      lessonViewMode === 'grid'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                    title="Visualizar em Grade"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>Grade</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Aleatório, Autoplay e + Módulo */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePlayRandomLesson}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-900/50 hover:bg-amber-500/25 transition-all"
                  title="Assistir aula aleatória"
                >
                  <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Aleatório</span>
                </button>

                <button
                  onClick={() => setIsAutoPlayNext(!isAutoPlayNext)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    isAutoPlayNext
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-800'
                      : 'bg-gray-100 dark:bg-drive-darkBg text-gray-500 border-gray-200 dark:border-drive-darkBorder hover:text-gray-800'
                  }`}
                  title={isAutoPlayNext ? 'Autoplay ativado (toca a próxima aula automaticamente)' : 'Autoplay desativado'}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAutoPlayNext ? 'text-emerald-500' : ''}`} />
                  <span>{isAutoPlayNext ? 'Autoplay: On' : 'Autoplay: Off'}</span>
                </button>

                <button
                  onClick={handleAddNewModule}
                  className="p-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 transition-all shrink-0"
                  title="Adicionar Novo Módulo"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modules and Lessons Accordion with Bolinha Verde Indicator */}
            <div className="lg:flex-1 lg:overflow-y-auto p-3 space-y-3 max-h-[500px] lg:max-h-none">
              {course.modules.map((module) => {
                const isOpen = openModules[module.id] ?? true;
                const modCompleted = module.lessons.filter(l => l.isCompleted).length;
                return (
                  <div 
                    key={module.id}
                    className="rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 overflow-hidden"
                  >
                    {/* Module Header */}
                    <div className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors group">
                      {editingModuleId === module.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={moduleTitleInput}
                            onChange={(e) => setModuleTitleInput(e.target.value)}
                            className="w-full px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-drive-darkSurface border border-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveModuleTitle(module.id)}
                            className="p-1 rounded bg-blue-600 text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setOpenModules(prev => ({ ...prev, [module.id]: !prev[module.id] }))}
                          className="flex items-center gap-2 overflow-hidden flex-1 text-left"
                        >
                          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                              {module.title}
                            </h4>
                            <span className="text-[10px] text-gray-400">
                              {modCompleted}/{module.lessons.length} aulas
                            </span>
                          </div>
                        </button>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setModuleTitleInput(module.title);
                            setEditingModuleId(module.id);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500"
                          title="Editar Título do Módulo"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleAddNewLessonToModule(module.id)}
                          className="p-1 text-gray-400 hover:text-indigo-500"
                          title="Adicionar Aula neste Módulo"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(module.id)}
                          className="p-1 text-gray-400 hover:text-rose-500"
                          title="Excluir Módulo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Lessons List or Grid with Drag & Drop Reordering */}
                    {isOpen && (
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverModuleId(module.id);
                        }}
                        onDragLeave={() => setDragOverModuleId(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverModuleId(null);
                          const rawData = e.dataTransfer.getData('application/json');
                          if (rawData) {
                            try {
                              const payload = JSON.parse(rawData);
                              if (payload.lessonId) {
                                await handleMoveLesson(payload.lessonId, payload.moduleId, module.id);
                              }
                            } catch (err) {}
                          }
                        }}
                        className={`border-t border-gray-200/60 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface transition-colors ${
                          lessonViewMode === 'grid' ? 'p-2 grid grid-cols-2 gap-2' : 'divide-y divide-gray-100 dark:divide-drive-darkBorder/60'
                        } ${
                          dragOverModuleId === module.id ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        {module.lessons.map((lesson) => {
                          const isActive = activeLesson?.id === lesson.id;
                          const isBeingDragged = draggedLessonId === lesson.id;
                          const isDragTarget = dragOverLessonId === lesson.id;

                          if (lessonViewMode === 'grid') {
                            return (
                              <div
                                key={lesson.id}
                                onClick={() => onSelectLesson(lesson)}
                                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none relative group ${
                                  isActive
                                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-sm font-bold'
                                    : lesson.isCompleted
                                    ? 'bg-gray-50/70 dark:bg-drive-darkBg/60 border-gray-200 dark:border-drive-darkBorder text-gray-500'
                                    : 'bg-white dark:bg-drive-darkSurface border-gray-200 dark:border-drive-darkBorder hover:border-blue-400'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-blue-500">
                                      #{lesson.order || 1}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleCompletion(lesson.id);
                                      }}
                                      className="text-gray-400 hover:text-emerald-500"
                                    >
                                      {lesson.isCompleted ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  <h5 className={`text-xs line-clamp-2 leading-tight ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {lesson.title}
                                  </h5>
                                </div>
                                <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100 dark:border-drive-darkBorder/40 text-[10px] text-gray-400">
                                  <span>{lesson.duration || '10:00'}</span>
                                  <Play className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity fill-current" />
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={lesson.id}
                              draggable={true}
                              onDragStart={(e) => {
                                setDraggedLessonId(lesson.id);
                                e.dataTransfer.setData('application/json', JSON.stringify({ lessonId: lesson.id, moduleId: module.id }));
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => {
                                setDraggedLessonId(null);
                                setDragOverLessonId(null);
                                setDragOverModuleId(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                setDragOverLessonId(lesson.id);
                              }}
                              onDragLeave={(e) => {
                                e.stopPropagation();
                                if (dragOverLessonId === lesson.id) setDragOverLessonId(null);
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverLessonId(null);
                                setDraggedLessonId(null);
                                const rawData = e.dataTransfer.getData('application/json');
                                if (rawData) {
                                  try {
                                    const payload = JSON.parse(rawData);
                                    if (payload.lessonId && payload.lessonId !== lesson.id) {
                                      await handleMoveLesson(payload.lessonId, payload.moduleId, module.id, lesson.id);
                                    }
                                  } catch (err) {}
                                }
                              }}
                              onClick={() => onSelectLesson(lesson)}
                              className={`flex items-center justify-between p-3 text-xs cursor-grab active:cursor-grabbing group transition-all select-none ${
                                isBeingDragged ? 'opacity-40 bg-blue-50/30' : ''
                              } ${
                                isDragTarget
                                  ? 'bg-blue-100/80 dark:bg-blue-900/40 border-t-2 border-blue-500 font-bold'
                                  : isActive
                                  ? 'bg-blue-50/80 dark:bg-blue-900/30 font-bold text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                                  : 'hover:bg-gray-50 dark:hover:bg-drive-darkHover text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleCompletion(lesson.id);
                                  }}
                                  className="text-gray-400 hover:text-emerald-500 shrink-0"
                                >
                                  {lesson.isCompleted ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>

                                {/* Prominent Green Dot Indicator beside Lesson Name */}
                                {lesson.isCompleted && (
                                  <span 
                                    className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 shrink-0" 
                                    title="Aula Concluída"
                                  />
                                )}

                                <span className="truncate leading-tight">
                                  {lesson.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {lesson.duration || '10:00'}
                                </span>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLesson(lesson.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Excluir Aula"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Change Course Cover Image */}
      {isChangingCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-drive-darkBorder mb-4">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm">Alterar Capa do Curso</h3>
              </div>
              <button onClick={() => setIsChangingCover(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Preview */}
              <div className="h-40 rounded-2xl overflow-hidden bg-gray-100 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder">
                <img
                  src={coverImageUrlInput || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'}
                  alt="Prévia da Capa"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  URL da Imagem
                </label>
                <input
                  type="url"
                  value={coverImageUrlInput}
                  onChange={(e) => setCoverImageUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Ou Carregar Imagem do Computador</span>
                </button>
                <input
                  type="file"
                  ref={coverFileInputRef}
                  onChange={handleUploadCoverImageFile}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                <button
                  type="button"
                  onClick={() => setIsChangingCover(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCoverImage}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20"
                >
                  Salvar Nova Capa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Video Transmission Studio (Cast & Stream Multi-Device) */}
      {isCastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                  <Cast className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Central de Transmissão para Aparelhos</h3>
                  <p className="text-[11px] text-gray-500 truncate max-w-sm">
                    {activeLesson?.title || 'Escolha a Smart TV ou receptor para transmitir a aula'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCastModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Device Selector on Local Network */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                    <Radio className={`w-4 h-4 ${isScanningCast ? 'text-sky-500 animate-spin' : 'text-sky-500'}`} />
                    <span>Aparelhos Detectados na Rede Wi-Fi ({castDevices.length})</span>
                  </div>
                  <button
                    onClick={fetchNetworkDevices}
                    disabled={isScanningCast}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-50"
                  >
                    <span>{isScanningCast ? 'Buscando...' : 'Escanear Rede'}</span>
                  </button>
                </div>

                {/* Device List Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {castDevices.map((device) => {
                    const isSelected = activeCastingDevice?.id === device.id;
                    return (
                      <div
                        key={device.id}
                        onClick={() => handleCastToDevice(device)}
                        className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all group ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 shadow-md ring-2 ring-sky-500/20'
                            : 'bg-gray-50/70 dark:bg-drive-darkBg/60 border-gray-200 dark:border-drive-darkBorder hover:border-sky-300 dark:hover:border-sky-700 hover:bg-white dark:hover:bg-drive-darkSurface'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-sky-600 text-white' : 'bg-gray-200 dark:bg-drive-darkHover text-gray-600 dark:text-gray-300'}`}>
                            <Tv className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block">
                              {device.name}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              IP: {device.ip}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCastToDevice(device);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'bg-white dark:bg-drive-darkHover text-sky-600 dark:text-sky-400 border border-gray-200 dark:border-drive-darkBorder group-hover:bg-sky-600 group-hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Transmitindo' : 'Transmitir'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Feedback Alert */}
                {castFeedback && (
                  <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-800 dark:text-sky-200 flex items-center justify-between animate-in fade-in">
                    <span>{castFeedback}</span>
                  </div>
                )}
              </div>

              {/* Native Cast & Picture-in-Picture Quick Tools */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                {/* Native Browser Cast Prompt */}
                <button
                  onClick={handleTriggerCast}
                  className="p-3.5 rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/40 hover:border-sky-400 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Cast className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100 block">
                      Chromecast / AirPlay Nativo
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Abrir diálogo do navegador
                    </span>
                  </div>
                </button>

                {/* Picture in Picture */}
                <button
                  onClick={() => {
                    setIsCastModalOpen(false);
                    handleTogglePiP();
                  }}
                  className="p-3.5 rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/40 hover:border-purple-400 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Airplay className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100 block">
                      Janela Flutuante (PiP)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Mini-player suspenso na tela
                    </span>
                  </div>
                </button>
              </div>

              {/* Direct Wi-Fi LAN Stream Link (for TV Browsers / VLC / Kodi) */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                  <ExternalLink className="w-4 h-4 text-emerald-500" />
                  <span>Link de Streaming da Rede Local (IP do Computador)</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Abra este endereço no navegador da sua Smart TV, celular ou aplicativo como VLC / Kodi na mesma rede Wi-Fi:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={lanStreamUrl || 'Carregando stream...'}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-[11px] font-mono text-gray-700 dark:text-gray-300 focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyStreamUrl}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow shrink-0 transition-all active:scale-95"
                  >
                    {copiedStreamUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedStreamUrl ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 shrink-0">
              <span className="text-[11px] text-gray-400">
                Certifique-se de que a Smart TV está conectada na mesma rede Wi-Fi.
              </span>
              <button
                onClick={() => setIsCastModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-drive-darkHover text-gray-700 dark:text-gray-200 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
