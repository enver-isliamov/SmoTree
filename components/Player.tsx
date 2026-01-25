
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, ProjectAsset, Comment, CommentStatus, User, UserRole } from '../types';
import { Play, Pause, ChevronLeft, Send, CheckCircle, Search, Mic, MicOff, Trash2, Pencil, Save, X as XIcon, Layers, FileVideo, Upload, CheckSquare, Flag, Columns, Monitor, RotateCcw, RotateCw, Maximize, Minimize, MapPin, Gauge, GripVertical, Download, FileJson, FileSpreadsheet, FileText, MoreHorizontal, Film, AlertTriangle, Cloud, CloudOff, Loader2, HardDrive, Lock, Unlock, Clapperboard } from 'lucide-react';
import { generateEDL, generateCSV, generateResolveXML, downloadFile } from '../services/exportService';
import { generateId, stringToColor } from '../services/utils';
import { ToastType } from './Toast';

interface PlayerProps {
  asset: ProjectAsset;
  project: Project;
  currentUser: User;
  onBack: () => void;
  users: User[];
  onUpdateProject: (project: Project, skipSync?: boolean) => void;
  isSyncing: boolean;
  notify: (msg: string, type: ToastType) => void;
}

const VALID_FPS = [23.976, 24, 25, 29.97, 30, 50, 60];

const canManageProject = (user: User, project: Project) => {
    if (user.role === UserRole.GUEST) return false;
    const isOwner = project.ownerId === user.id;
    const isTeamMember = project.team.some(m => m.id === user.id);
    return isOwner || isTeamMember;
};

export const Player: React.FC<PlayerProps> = ({ asset, project, currentUser, onBack, users, onUpdateProject, isSyncing, notify }) => {
  const [currentVersionIdx, setCurrentVersionIdx] = useState(asset.currentVersionIndex);
  const version = asset.versions[currentVersionIdx] || asset.versions[0];
  
  // Project-level lock takes precedence, then Version-level lock
  const isLocked = project.isLocked || version.isLocked || false;
  const isGuest = currentUser.role === UserRole.GUEST;
  
  // View State
  const [viewMode, setViewMode] = useState<'single' | 'side-by-side' | 'overlay'>('single');
  const [showMobileViewMenu, setShowMobileViewMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoFps, setVideoFps] = useState(30); 
  const [isFpsDetected, setIsFpsDetected] = useState(false);
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);
  
  // Scrubbing State
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubStartDataRef = useRef<{ x: number, time: number, wasPlaying: boolean } | null>(null);
  const isDragRef = useRef(false); 
  
  // Floating Controls State (Persisted)
  const [controlsPos, setControlsPos] = useState(() => {
    try {
        const saved = localStorage.getItem('smotree_controls_pos');
        return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
        return { x: 0, y: 0 };
    }
  });
  const isDraggingControls = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Export State
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Local File Fallback State
  const [videoError, setVideoError] = useState(false);
  const [localFileSrc, setLocalFileSrc] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const localFileRef = useRef<HTMLInputElement>(null);

  // Comments & Local State
  const [comments, setComments] = useState<Comment[]>(version.comments || []);
  const [swipeCommentId, setSwipeCommentId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Comment Creation & Editing State
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Voice Modal State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  
  // Range Marker State
  const [markerInPoint, setMarkerInPoint] = useState<number | null>(null);
  const [markerOutPoint, setMarkerOutPoint] = useState<number | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const compareVideoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null); 
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const sidebarInputRef = useRef<HTMLInputElement>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const fpsDetectionRef = useRef<{ frames: number[], lastTime: number, active: boolean }>({ frames: [], lastTime: 0, active: false });

  const isManager = canManageProject(currentUser, project);

  // --- SAVE FLOATING POS ---
  useEffect(() => {
    localStorage.setItem('smotree_controls_pos', JSON.stringify(controlsPos));
  }, [controlsPos]);

  // Helper for precise seeking
  const seekByFrame = (frames: number) => {
      if (!videoRef.current) return;
      
      const frameDuration = 1 / videoFps;
      const newTime = Math.min(Math.max(videoRef.current.currentTime + (frames * frameDuration), 0), duration);
      
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (compareVideoRef.current) compareVideoRef.current.currentTime = newTime;
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isLocked) return;
        
        // Don't trigger shortcuts if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        
        // Ignore system shortcuts with modifiers
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // Use e.code for layout-independent shortcuts (works in RU/EN/JP etc)
        switch (e.code) {
            case 'Space':
                e.preventDefault(); // Prevent scrolling
                togglePlay();
                break;
            case 'KeyI':
                setMarkerInPoint(currentTime);
                if (markerOutPoint !== null && markerOutPoint <= currentTime) setMarkerOutPoint(null);
                break;
            case 'KeyO':
                // Set Out Point and Trigger Input
                const outTime = currentTime;
                if (markerInPoint !== null && outTime > markerInPoint) setMarkerOutPoint(outTime);
                else {
                    if (markerInPoint === null) setMarkerInPoint(Math.max(0, outTime - 5));
                    setMarkerOutPoint(outTime);
                }
                if (isPlaying) togglePlay();
                if (isFullscreen) setShowVoiceModal(true);
                else setTimeout(() => sidebarInputRef.current?.focus(), 100);
                startListening();
                break;
            case 'KeyM':
                // Quick Marker
                setMarkerInPoint(currentTime);
                setMarkerOutPoint(null);
                if (isPlaying) togglePlay();
                if (isFullscreen) setShowVoiceModal(true);
                else setTimeout(() => sidebarInputRef.current?.focus(), 100);
                startListening();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (isPlaying) togglePlay(); // Pause to step precisely
                seekByFrame(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (isPlaying) togglePlay(); // Pause to step precisely
                seekByFrame(1);
                break;
            case 'KeyJ':
                 // Optional: Shuttle rewind if needed
                 seek(-5);
                 break;
            case 'KeyL':
                 // Optional: Shuttle forward
                 seek(5);
                 break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, isPlaying, currentTime, markerInPoint, markerOutPoint, isFullscreen, videoFps, duration]);

  const syncCommentAction = async (action: 'create' | 'update' | 'delete', payload: any) => {
    try {
        const token = localStorage.getItem('smotree_auth_token');
        const headers: any = { 'Content-Type': 'application/json' };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else if (currentUser.role === UserRole.GUEST) {
            headers['X-Guest-ID'] = currentUser.id;
        }

        await fetch('/api/comment', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                projectId: project.id,
                assetId: asset.id,
                versionId: version.id,
                action,
                payload
            })
        });
    } catch (e) {
        console.error("Failed to sync comment action", e);
        notify("Failed to sync comment to server", "error");
    }
  };

  useEffect(() => {
    setComments(version.comments || []);
  }, [version.comments]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setSelectedCommentId(null);
    setEditingCommentId(null);
    setMarkerInPoint(null);
    setMarkerOutPoint(null);
    setVideoError(false);
    setShowVoiceModal(false);
    setIsFpsDetected(false);
    setIsVerticalVideo(false);
    
    if (version.localFileUrl) {
        setLocalFileSrc(version.localFileUrl);
        setLocalFileName(version.localFileName || 'Local File');
    } else {
        setLocalFileSrc(null);
        setLocalFileName(null);
        setVideoError(false);
    }

    if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.load();
    }
  }, [version.id]);

  useEffect(() => {
    const handleFsChange = () => {
        const isFs = !!document.fullscreenElement;
        setIsFullscreen(isFs);
        if (!isFs) {
            setShowVoiceModal(false);
        }
    };

    const handleOrientationChange = () => {
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isMobile && isLandscape) toggleFullScreen(true);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
        document.removeEventListener('fullscreenchange', handleFsChange);
        window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying && !isScrubbing) return;
    const activeComment = comments.find(c => {
         const duration = c.duration || 3;
         return currentTime >= c.timestamp && currentTime < (c.timestamp + duration);
    });
    if (activeComment) {
        const el = document.getElementById(`comment-${activeComment.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentTime, isPlaying, isScrubbing, comments]);

  const startFpsDetection = () => {
      if (isFpsDetected) return;
      fpsDetectionRef.current = { frames: [], lastTime: performance.now(), active: true };
  };

  const updateTimeLoop = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      if (fpsDetectionRef.current.active) {
          const now = performance.now();
          const delta = now - fpsDetectionRef.current.lastTime;
          fpsDetectionRef.current.lastTime = now;
          if (delta > 5 && delta < 100) {
              fpsDetectionRef.current.frames.push(delta);
          }
          if (fpsDetectionRef.current.frames.length > 30) {
              const avgDelta = fpsDetectionRef.current.frames.reduce((a, b) => a + b, 0) / fpsDetectionRef.current.frames.length;
              const estimatedFps = 1000 / avgDelta;
              const closest = VALID_FPS.reduce((prev, curr) => 
                Math.abs(curr - estimatedFps) < Math.abs(prev - estimatedFps) ? curr : prev
              );
              setVideoFps(closest);
              setIsFpsDetected(true);
              fpsDetectionRef.current.active = false;
          }
      }
      if (compareVideoRef.current && Math.abs(compareVideoRef.current.currentTime - videoRef.current.currentTime) > 0.1) {
         compareVideoRef.current.currentTime = videoRef.current.currentTime;
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateTimeLoop);
  }, [isFpsDetected]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTimeLoop);
      if (!isFpsDetected) startFpsDetection();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      fpsDetectionRef.current.active = false;
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, updateTimeLoop, isFpsDetected]);

  const filteredComments = comments.filter(c => {
    return c.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeOverlayComments = comments.filter(c => {
      const startTime = c.timestamp;
      const endTime = c.duration ? (startTime + c.duration) : (startTime + 4);
      return currentTime >= startTime && currentTime <= endTime;
  });

  const handleVideoError = () => {
    setVideoError(true);
    setIsPlaying(false);
  };

  const persistLocalFile = (url: string, name: string) => {
    const updatedVersions = [...asset.versions];
    updatedVersions[currentVersionIdx] = { 
        ...updatedVersions[currentVersionIdx], 
        localFileUrl: url,
        localFileName: name
    };
    const updatedAssets = project.assets.map(a => a.id === asset.id ? { ...a, versions: updatedVersions } : a);
    let updatedTeam = project.team;
    if (!updatedTeam.some(u => u.id === currentUser.id)) {
       updatedTeam = [...updatedTeam, currentUser];
    }
    onUpdateProject({ ...project, assets: updatedAssets, team: updatedTeam });
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        if (file.name !== version.filename) {
            const confirmed = window.confirm(
                `Filename Mismatch Warning!\n\nExpected: "${version.filename}"\nSelected: "${file.name}"\n\nThe comments might be out of sync. Continue?`
            );
            if (!confirmed) {
                if (localFileRef.current) localFileRef.current.value = ''; 
                return;
            }
        }
        const url = URL.createObjectURL(file);
        setLocalFileSrc(url);
        setLocalFileName(file.name);
        setVideoError(false);
        persistLocalFile(url, file.name);
        notify("Local file linked successfully", "success");
    }
  };

  const startListening = () => {
     if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      notify("Voice input is not supported in this browser.", "error");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) setNewCommentText(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
      recognitionRef.current?.stop();
      setIsListening(false);
  };

  const toggleListening = () => {
    if (isLocked) return;
    if (isListening) stopListening();
    else {
      if (isPlaying) togglePlay(); 
      startListening();
    }
  };

  const handleTimeUpdate = () => {
    if (!isPlaying && videoRef.current && !isScrubbing) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    const shouldPlay = !isPlaying;
    setIsPlaying(shouldPlay);
    if (shouldPlay) setSelectedCommentId(null);
    
    if (videoRef.current) {
      shouldPlay ? videoRef.current.play().catch(() => setIsPlaying(false)) : videoRef.current.pause();
    }
    if (viewMode !== 'single' && compareVideoRef.current) {
       shouldPlay ? compareVideoRef.current.play().catch(() => {}) : compareVideoRef.current.pause();
    }
  };

  const toggleFullScreen = (forceEnter?: boolean) => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isIOS && document.fullscreenEnabled) {
        if (forceEnter || !document.fullscreenElement) {
            playerContainerRef.current?.requestFullscreen().catch(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen();
        }
    } else {
        setIsFullscreen(prev => forceEnter ? true : !prev);
    }
  };

  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    if (compareVideoRef.current) compareVideoRef.current.currentTime = newTime;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
    if (viewMode !== 'single' && compareVideoRef.current) compareVideoRef.current.currentTime = time;
  };

  const cycleFps = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      const idx = VALID_FPS.indexOf(videoFps);
      setVideoFps(VALID_FPS[(idx + 1) % VALID_FPS.length]);
      setIsFpsDetected(true);
      notify(`FPS set to ${VALID_FPS[(idx + 1) % VALID_FPS.length]}`, "info");
  };

  const handleDragStart = (e: React.PointerEvent) => {
    isDraggingControls.current = true;
    dragStartPos.current = { x: e.clientX - controlsPos.x, y: e.clientY - controlsPos.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDraggingControls.current) return;
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    setControlsPos({ x: newX, y: newY });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    isDraggingControls.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const handleExport = (type: 'edl' | 'csv' | 'xml') => {
      const filename = asset.title.replace(/\s+/g, '_');
      if (type === 'edl') {
          const content = generateEDL(project.name, version.versionNumber, comments);
          downloadFile(`${filename}_v${version.versionNumber}.edl`, content, 'text/plain');
      } else if (type === 'csv') {
          const content = generateCSV(comments);
          downloadFile(`${filename}_v${version.versionNumber}.csv`, content, 'text/csv');
      } else if (type === 'xml') {
          const content = generateResolveXML(project.name, version.versionNumber, comments);
          downloadFile(`${filename}_v${version.versionNumber}.xml`, content, 'text/xml');
      }
      setShowExportMenu(false);
      notify("Markers exported successfully", "success");
  };

  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (videoError || showVoiceModal) return;
    if ((e.target as HTMLElement).closest('.floating-controls')) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    scrubStartDataRef.current = { x: clientX, time: currentTime, wasPlaying: isPlaying };
    isDragRef.current = false; 
    if (isPlaying) {
        setIsPlaying(false);
        videoRef.current?.pause();
    }
  };

  const handlePointerMove = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (!scrubStartDataRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const diffX = clientX - scrubStartDataRef.current.x;
    if (Math.abs(diffX) > 5) {
        isDragRef.current = true;
        if (!isScrubbing) setIsScrubbing(true);
    }
    if (isScrubbing) {
        const frameTime = 1 / videoFps;
        const framesMoved = diffX / 10; 
        const timeDiff = framesMoved * frameTime;
        const newTime = Math.max(0, Math.min(duration, scrubStartDataRef.current.time + timeDiff));
        setCurrentTime(newTime);
        if (videoRef.current) videoRef.current.currentTime = newTime;
    }
  };

  const handlePointerUp = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (!scrubStartDataRef.current) return;
    if (!isDragRef.current) togglePlay();
    setIsScrubbing(false);
    scrubStartDataRef.current = null;
    isDragRef.current = false;
  };

  const formatTimecode = (seconds: number) => {
    const fps = videoFps;
    const totalFrames = Math.floor(seconds * fps);
    const hh = Math.floor(totalFrames / (3600 * fps)).toString().padStart(2, '0');
    const mm = Math.floor((totalFrames % (3600 * fps)) / (60 * fps)).toString().padStart(2, '0');
    const ss = Math.floor((totalFrames % (60 * fps)) / fps).toString().padStart(2, '0');
    const ff = (totalFrames % fps).toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  const handleSetInPoint = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setMarkerInPoint(currentTime);
    if (markerOutPoint !== null && markerOutPoint <= currentTime) setMarkerOutPoint(null);
  };

  const handleSetOutPoint = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    const outTime = currentTime;
    if (markerInPoint !== null && outTime > markerInPoint) setMarkerOutPoint(outTime);
    else {
      if (markerInPoint === null) setMarkerInPoint(Math.max(0, outTime - 5));
      setMarkerOutPoint(outTime);
    }
    if (isPlaying) togglePlay();
    if (isFullscreen) setShowVoiceModal(true);
    else setTimeout(() => sidebarInputRef.current?.focus(), 100);
    startListening(); 
  };
  
  const handleQuickMarker = (e: React.MouseEvent) => {
      if (isLocked) return;
      e.stopPropagation();
      setMarkerInPoint(currentTime);
      setMarkerOutPoint(null);
      if (isPlaying) togglePlay();
      if (isFullscreen) setShowVoiceModal(true);
      else setTimeout(() => sidebarInputRef.current?.focus(), 100);
      startListening();
  };

  const closeVoiceModal = (save: boolean) => {
      stopListening();
      if (save) handleAddComment();
      else {
          setMarkerInPoint(null);
          setMarkerOutPoint(null);
          setNewCommentText('');
      }
      setShowVoiceModal(false);
  };

  const clearMarkers = () => {
      setMarkerInPoint(null);
      setMarkerOutPoint(null);
  };

  // UPDATED: persistComments handles LOCAL updates, but calls onUpdateProject with skipSync=true for comments.
  const persistComments = (updatedComments: Comment[]) => {
    setComments(updatedComments);
    const updatedVersions = [...asset.versions];
    updatedVersions[currentVersionIdx] = { ...updatedVersions[currentVersionIdx], comments: updatedComments };
    const updatedAssets = project.assets.map(a => a.id === asset.id ? { ...a, versions: updatedVersions } : a);
    let updatedTeam = project.team;
    if (!updatedTeam.some(u => u.id === currentUser.id)) {
       updatedTeam = [...updatedTeam, currentUser];
    }
    
    // IMPORTANT: Skip forceSync for comments to prevent overwriting server state with stale client data.
    // The separate syncCommentAction API handles persistence.
    onUpdateProject({ ...project, assets: updatedAssets, team: updatedTeam }, true);
  };

  const handleAddComment = () => {
    if (!newCommentText.trim() || isLocked) return;
    const timestamp = markerInPoint !== null ? markerInPoint : currentTime;
    let commentDuration = undefined;
    if (markerOutPoint !== null && markerInPoint !== null) commentDuration = markerOutPoint - markerInPoint;

    const newComment: Comment = {
      id: `nc-${generateId()}`,
      userId: currentUser.id,
      authorName: currentUser.name, 
      timestamp: timestamp,
      duration: commentDuration,
      text: newCommentText,
      status: CommentStatus.OPEN,
      createdAt: 'Just now'
    };

    persistComments([...comments, newComment]);
    syncCommentAction('create', newComment); 
    notify("Comment added", "success");
    setNewCommentText('');
    setMarkerInPoint(null);
    setMarkerOutPoint(null);
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const startEditing = (comment: Comment) => {
    if (isLocked) return;
    setEditingCommentId(comment.id);
    setEditText(comment.text);
    setSwipeCommentId(null);
    setSwipeOffset(0);
    if (isPlaying) togglePlay();
  };

  const saveEdit = (commentId: string) => {
    const updated = comments.map(c => c.id === commentId ? { ...c, text: editText } : c);
    persistComments(updated);
    syncCommentAction('update', { id: commentId, text: editText });
    setEditingCommentId(null);
    setEditText('');
    notify("Comment updated", "success");
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (isLocked) return;
    if (!confirm("Delete comment?")) {
        setSwipeCommentId(null);
        setSwipeOffset(0);
        return;
    }
    const updated = comments.filter(c => c.id !== commentId);
    persistComments(updated);
    syncCommentAction('delete', { id: commentId });
    if (selectedCommentId === commentId) setSelectedCommentId(null);
    setSwipeCommentId(null);
    setSwipeOffset(0);
    notify("Comment deleted", "info");
  };

  const handleResolveComment = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    const updated = comments.map(c => {
        if (c.id === commentId) {
             const newStatus = c.status === CommentStatus.OPEN ? CommentStatus.RESOLVED : CommentStatus.OPEN;
             syncCommentAction('update', { id: commentId, status: newStatus }); 
             return { ...c, status: newStatus };
        }
        return c;
    });
    persistComments(updated);
  };
  
  const handleBulkResolve = () => {
      if (!confirm(`Mark ${filteredComments.filter(c => c.status === CommentStatus.OPEN).length} comments as resolved?`)) return;
      const updated = comments.map(c => {
          const isVisible = filteredComments.some(fc => fc.id === c.id);
          if (isVisible && c.status === CommentStatus.OPEN) {
              syncCommentAction('update', { id: c.id, status: CommentStatus.RESOLVED }); 
              return { ...c, status: CommentStatus.RESOLVED };
          }
          return c;
      });
      persistComments(updated);
      notify("Bulk resolve successful", "success");
  };

  const handleToggleLock = () => {
      if (!isManager) return;
      // Note: This function only locks the VERSION, not the project.
      const newLockState = !version.isLocked;
      const updatedVersions = [...asset.versions];
      updatedVersions[currentVersionIdx] = { ...updatedVersions[currentVersionIdx], isLocked: newLockState };
      const updatedAssets = project.assets.map(a => a.id === asset.id ? { ...a, versions: updatedVersions } : a);
      
      // Locking is a structural change, so we ALLOW sync here (skipSync=false)
      onUpdateProject({ ...project, assets: updatedAssets });
      notify(newLockState ? "Version locked" : "Version unlocked", "info");
  };

  const handleTouchStart = (e: React.TouchEvent, commentId: string) => {
    if (editingCommentId || isLocked) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setSwipeCommentId(commentId);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !swipeCommentId) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartRef.current.x;
    const diffY = currentY - touchStartRef.current.y;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 10) e.preventDefault(); 
        const limitedOffset = Math.max(-100, Math.min(100, diffX));
        setSwipeOffset(limitedOffset);
    }
  };

  const handleTouchEnd = (commentId: string) => {
      if (!swipeCommentId) return;
      const isOwner = comments.find(c => c.id === commentId)?.userId === currentUser.id;
      const canDelete = isManager || isOwner;
      const canEdit = isOwner || (isManager && currentUser.role === UserRole.ADMIN);

      if (swipeOffset < -60) {
          if (canDelete) handleDeleteComment(commentId);
          else setSwipeOffset(0);
      } else if (swipeOffset > 60) {
          if (canEdit) {
              const c = comments.find(com => com.id === commentId);
              if (c) startEditing(c);
          } else {
             setSwipeOffset(0);
          }
      } else {
          setSwipeOffset(0);
          setSwipeCommentId(null);
      }
      touchStartRef.current = null;
  };

  const getAuthorDisplay = (comment: Comment): { name: string, role: UserRole | 'Unknown' } => {
      if (comment.authorName) {
           const teamMember = users.find(u => u.id === comment.userId);
           return { 
               name: comment.authorName, 
               role: teamMember ? teamMember.role : 'Unknown'
           };
      }
      const teamMember = users.find(u => u.id === comment.userId);
      if (teamMember) return { name: teamMember.name, role: teamMember.role };
      if (comment.userId === currentUser.id) return { name: currentUser.name, role: currentUser.role };
      return { name: 'Unknown User', role: 'Unknown' };
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 overflow-hidden select-none fixed inset-0">
      {!isFullscreen && (
        <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 z-20">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white shrink-0 p-1">
                <div className="flex items-center justify-center w-8 h-8 bg-zinc-800 rounded-lg shrink-0 border border-zinc-700">
                    <Clapperboard size={16} className="text-zinc-400" />
                </div>
            </button>
            
            {(!isSearchOpen || window.innerWidth > 768) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <span onClick={onBack} className="cursor-pointer hover:text-zinc-200 transition-colors">{project.name}</span> <span className="text-zinc-600">/</span> {isGuest ? 'Shared' : 'Asset'}
                </span>
                <div className="flex items-center gap-2 text-sm text-zinc-100 font-semibold leading-none truncate">
                   <span>{localFileName || asset.title}</span>
                   <span className="bg-indigo-900/50 text-indigo-200 px-1.5 py-0.5 rounded text-[10px]">v{version.versionNumber}</span>
                   
                   {isSyncing ? (
                      <div className="flex items-center gap-1 text-zinc-500 animate-pulse" title="Syncing changes...">
                          <Cloud size={12} />
                      </div>
                   ) : (
                      <div className="flex items-center gap-1 text-zinc-600" title="All changes saved">
                          <CheckCircle size={12} />
                      </div>
                   )}

                   <button 
                        onClick={() => localFileRef.current?.click()}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors text-[10px] ${localFileName ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                        title="Link Local File (High Quality / Offline)"
                    >
                        <HardDrive size={10} />
                        <span>{localFileName ? 'Local' : 'Cloud'}</span>
                    </button>

                   {videoError && !localFileName && <span className="text-red-400 flex items-center gap-1 text-[10px]"><Flag size={8}/> Source Missing</span>}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
             <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'w-40 md:w-64 bg-zinc-950 border border-zinc-800 rounded-lg px-2' : 'w-8 justify-end'}`}>
                {isSearchOpen && (
                   <input 
                     autoFocus
                     className="w-full bg-transparent text-xs text-white outline-none py-1.5"
                     placeholder="Search..."
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     onBlur={() => !searchQuery && setIsSearchOpen(false)}
                   />
                )}
                <button 
                  onClick={() => {
                    if (isSearchOpen && searchQuery) setSearchQuery('');
                    else setIsSearchOpen(!isSearchOpen);
                  }} 
                  className={`p-1.5 text-zinc-400 hover:text-white ${isSearchOpen ? 'text-white' : ''}`}
                >
                  {isSearchOpen && searchQuery ? <XIcon size={16} /> : <Search size={18} />}
                </button>
             </div>
             
             <div className="h-6 w-px bg-zinc-800 mx-1"></div>

             <div className="relative">
                <button 
                  onClick={() => setShowMobileViewMenu(!showMobileViewMenu)}
                  className="p-1.5 md:p-2 rounded text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  {viewMode === 'single' && <Monitor size={18} />}
                  {viewMode === 'side-by-side' && <Columns size={18} />}
                  {viewMode === 'overlay' && <Layers size={18} />}
                </button>

                {showMobileViewMenu && (
                   <div 
                     className="absolute top-full right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-1 flex flex-col gap-1 z-50 min-w-[120px]"
                     onMouseLeave={() => setShowMobileViewMenu(false)}
                   >
                      <button 
                        onClick={() => { setViewMode('single'); setShowMobileViewMenu(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-zinc-800 ${viewMode === 'single' ? 'text-indigo-400' : 'text-zinc-400'}`}
                      >
                        <Monitor size={14} /> Single
                      </button>
                      <button 
                        onClick={() => { setViewMode('side-by-side'); setShowMobileViewMenu(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-zinc-800 ${viewMode === 'side-by-side' ? 'text-indigo-400' : 'text-zinc-400'}`}
                      >
                        <Columns size={14} /> Split
                      </button>
                      <button 
                        onClick={() => { setViewMode('overlay'); setShowMobileViewMenu(false); }}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-zinc-800 ${viewMode === 'overlay' ? 'text-indigo-400' : 'text-zinc-400'}`}
                      >
                        <Layers size={14} /> Overlay
                      </button>
                   </div>
                )}
             </div>
          </div>
        </header>
      )}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* ... (Rest of the video player logic remains the same, removed for brevity as requested change was primarily navigation) ... */}
        
        <div 
            ref={playerContainerRef} 
            className={`flex-1 flex flex-col bg-black lg:border-r border-zinc-800 group/fullscreen overflow-hidden transition-all duration-300
                ${isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen' : 'relative'}
            `}
        >
          
          <div className="flex-1 relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden group/player">
             
             {/* Fullscreen Button in Overlay */}
             <div className="absolute bottom-4 right-4 z-50 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
                <button 
                    onClick={() => toggleFullScreen()} 
                    className="p-2 bg-black/60 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg backdrop-blur-sm transition-colors shadow-lg"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
             </div>

             <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-px bg-black/50 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg z-30 select-none overflow-hidden">
                <div className="px-3 py-1 text-white font-mono text-lg tracking-widest">
                    {formatTimecode(currentTime)}
                </div>
                <div className="h-6 w-px bg-white/20"></div>
                <button 
                    onClick={cycleFps}
                    className="px-2 py-1 hover:bg-white/10 transition-colors flex items-center gap-1.5 group/fps"
                    title="Toggle FPS"
                >
                     <span className={`text-[10px] font-mono font-bold ${isFpsDetected ? 'text-indigo-400' : 'text-zinc-400 group-hover/fps:text-zinc-200'}`}>
                        {Number.isInteger(videoFps) ? videoFps : videoFps.toFixed(2)} FPS
                     </span>
                </button>
             </div>

             <div className="absolute bottom-24 lg:bottom-12 left-4 z-20 flex flex-col items-start gap-2 pointer-events-none w-[80%] md:w-[60%] lg:w-[40%]">
                 {activeOverlayComments.map(c => {
                    const author = getAuthorDisplay(c);
                    const color = stringToColor(c.userId);
                    return (
                        <div key={c.id} className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 border border-white/5 shadow-lg max-w-full break-words">
                            <span style={{ color: color }} className="font-bold mr-2 text-xs uppercase">{author.name.split(' ')[0]}:</span>
                            <span className="text-zinc-100">{c.text}</span>
                        </div>
                    );
                 })}
             </div>

             {showVoiceModal && isFullscreen && (
                 <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md md:max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-2xl flex flex-col md:flex-row md:items-stretch gap-4 md:gap-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex flex-col items-center justify-center md:w-1/3 shrink-0">
                            <h3 className="text-base md:text-lg font-bold text-white mb-2 text-center">
                                {markerOutPoint ? 'Range Comment' : 'Point Marker'}
                            </h3>
                            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs md:text-sm mb-4 md:mb-0 bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-500/20">
                                <span>{formatTimecode(markerInPoint || currentTime)}</span>
                                {markerOutPoint && (
                                    <>
                                        <span>→</span>
                                        <span>{formatTimecode(markerOutPoint)}</span>
                                    </>
                                )}
                            </div>
                            <div 
                                className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${isListening ? 'bg-red-500/20 ring-4 ring-red-500/20 scale-110' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                                onClick={toggleListening}
                            >
                                <Mic size={24} className={`md:w-8 md:h-8 ${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
                            </div>
                        </div>
                        <div className="flex flex-col justify-center flex-1 w-full">
                            <p className="text-[10px] md:text-xs text-zinc-500 mb-2 uppercase tracking-wider text-center md:text-left">
                                {isListening ? 'Listening...' : 'Transcript'}
                            </p>
                            <textarea 
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder={isListening ? "Speak now..." : "Type or record a comment..."}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white text-base md:text-sm focus:border-indigo-500 outline-none h-24 md:h-32 mb-4 resize-none"
                                autoFocus
                            />
                            <div className="flex w-full gap-3">
                                <button 
                                    onClick={() => closeVoiceModal(false)}
                                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 font-medium transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => closeVoiceModal(true)}
                                    disabled={!newCommentText.trim() || isLocked}
                                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>
             )}

             {!isPlaying && !isScrubbing && !videoError && !showVoiceModal && (
               <div 
                 className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
               >
                 <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center shadow-xl animate-in fade-in zoom-in duration-200">
                     {isPlaying ? <Pause size={32} fill="white" className="text-white"/> : <Play size={32} fill="white" className="ml-1 text-white" />}
                 </div>
               </div>
             )}

             {/* Moved Offline UI Here */}
             {videoError && (
                 <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center animate-in fade-in duration-300">
                     <div className="bg-zinc-800 p-4 rounded-full mb-4 ring-1 ring-zinc-700">
                        <FileVideo size={32} className="text-zinc-400" />
                    </div>
                     <p className="text-zinc-300 font-bold text-lg mb-2">Media Offline</p>
                     <p className="text-xs text-zinc-500 max-w-[280px] mb-6 leading-relaxed">
                        The source file <strong>"{localFileName || version.filename}"</strong> is no longer accessible. Please re-select it to continue.
                    </p>
                    <button 
                        onClick={() => localFileRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors text-sm shadow-lg shadow-indigo-900/20"
                    >
                        <Upload size={16} /> Link Local File
                    </button>
                 </div>
             )}

             <div className="relative w-full h-full flex items-center justify-center cursor-col-resize select-none">
                <video
                  ref={videoRef}
                  src={localFileSrc || version.url}
                  className="w-full h-full object-contain pointer-events-none"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={(e) => {
                      setDuration(e.currentTarget.duration);
                      setVideoError(false);
                      setIsFpsDetected(false); 
                      setIsVerticalVideo(e.currentTarget.videoHeight > e.currentTarget.videoWidth);
                  }}
                  onError={handleVideoError}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  controls={false}
                />
                
                <div 
                   className="absolute inset-0 z-30 touch-none"
                   onPointerDown={handlePointerDown}
                   onPointerMove={handlePointerMove}
                   onPointerUp={handlePointerUp}
                   onPointerLeave={handlePointerUp}
                ></div>
             </div>
          </div>

          {/* Player Bar - Compacted */}
          <div className={`
             ${isVerticalVideo ? 'absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/80 to-transparent pb-6 pt-10' : 'bg-zinc-900 border-t border-zinc-800 pb-2'} 
             p-2 lg:p-4 shrink-0 transition-transform duration-300
          `}>
             <div className="relative h-6 md:h-8 group cursor-pointer flex items-center touch-none">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={videoError}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 disabled:cursor-not-allowed"
                />
                <div className="w-full h-1.5 bg-zinc-700/50 rounded-full overflow-hidden relative">
                   <div className="h-full bg-indigo-500" style={{ width: `${(currentTime / duration) * 100}%` }} />
                </div>
                {filteredComments.map(c => {
                  const left = (c.timestamp / duration) * 100;
                  const width = c.duration ? (c.duration / duration) * 100 : 0.5;
                  const colorClass = c.status === 'resolved' ? 'bg-green-500' : 'bg-yellow-500';
                  // Use unique color for timeline marker
                  const userColor = stringToColor(c.userId);
                  
                  return (
                    <div 
                      key={c.id}
                      className={`absolute top-1/2 -translate-y-1/2 h-2.5 rounded-sm z-10 opacity-80 pointer-events-none`}
                      style={{ 
                          left: `${left}%`, 
                          width: `${Math.max(0.5, width)}%`, 
                          minWidth: '4px',
                          backgroundColor: c.status === 'resolved' ? '#22c55e' : userColor
                      }}
                    />
                  );
                })}
                {markerInPoint !== null && (
                   <div className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white z-20 pointer-events-none shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ left: `${(markerInPoint / duration) * 100}%` }}>
                     <div className="absolute -top-5 -left-2 text-[9px] bg-indigo-600 text-white px-1 rounded font-bold">IN</div>
                   </div>
                )}
                {markerOutPoint !== null && (
                   <div className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white z-20 pointer-events-none shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ left: `${(markerOutPoint / duration) * 100}%` }}>
                     <div className="absolute -top-5 -left-2 text-[9px] bg-indigo-600 text-white px-1 rounded font-bold">OUT</div>
                   </div>
                )}
                {markerInPoint !== null && markerOutPoint !== null && (
                    <div 
                        className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-indigo-500/50 z-10 pointer-events-none"
                        style={{ 
                            left: `${(markerInPoint / duration) * 100}%`,
                            width: `${((markerOutPoint - markerInPoint) / duration) * 100}%`
                        }}
                    />
                )}
             </div>
          </div>
        </div>

        {!isFullscreen && (
        <div className="w-full lg:w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 h-[45vh] lg:h-auto z-10 shadow-2xl lg:shadow-none pb-20 lg:pb-0 relative">
             <>
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Comments ({filteredComments.length})</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         {isManager && (
                             <>
                                <button 
                                    onClick={handleToggleLock}
                                    className={`p-1.5 rounded transition-colors ${version.isLocked ? 'bg-red-900/20 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                    title={version.isLocked ? "Unlock Comments" : "Lock Comments"}
                                >
                                    {version.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>
                                 <div className="relative">
                                     <button 
                                         onClick={() => setShowExportMenu(!showExportMenu)}
                                         className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                         title="Export Markers"
                                     >
                                         <Download size={16} />
                                     </button>
                                     
                                     {showExportMenu && (
                                         <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                                             <button onClick={() => handleExport('xml')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left">
                                                 <Film size={14} className="text-indigo-400" />
                                                 DaVinci Resolve (.xml)
                                             </button>
                                             <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left">
                                                 <FileSpreadsheet size={14} className="text-green-400" />
                                                 Premiere Pro (.csv)
                                             </button>
                                              <button onClick={() => handleExport('edl')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white text-left">
                                                 <FileText size={14} className="text-orange-400" />
                                                 EDL Generic (.edl)
                                             </button>
                                         </div>
                                     )}
                                     
                                     {showExportMenu && (
                                         <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                                     )}
                                 </div>
                             </>
                         )}

                        {isManager && filteredComments.some(c => c.status === CommentStatus.OPEN) && (
                            <button 
                                onClick={handleBulkResolve}
                                className="flex items-center gap-1 text-[10px] bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40 px-2 py-1 rounded transition-colors"
                            >
                                <CheckSquare size={12} />
                                Resolve All
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 overflow-x-hidden">
                    {filteredComments.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-zinc-500 text-sm">
                            <p>No comments yet.</p>
                        </div>
                    )}
                    
                    {filteredComments.map(comment => {
                        const isSelected = selectedCommentId === comment.id;
                        const author = getAuthorDisplay(comment);
                        const canResolve = isManager;
                        const isEditing = editingCommentId === comment.id;
                        const isGuestComment = author.role === UserRole.GUEST;
                        
                        const isSwiping = swipeCommentId === comment.id;
                        const offset = isSwiping ? swipeOffset : 0;

                        const isActive = currentTime >= comment.timestamp && currentTime < (comment.timestamp + (comment.duration || 3));
                        
                        // Generate consistent color for this user
                        const userColor = stringToColor(comment.userId);

                        return (
                        <div key={comment.id} className="relative group/wrapper" id={`comment-${comment.id}`}>
                            
                            <div className="absolute inset-0 rounded-lg flex items-center justify-between px-4">
                                <div className="flex items-center text-blue-500 gap-2 font-bold text-xs uppercase opacity-0 transition-opacity duration-200" style={{ opacity: offset > 20 ? 1 : 0 }}>
                                    <Pencil size={16} /> Edit
                                </div>
                                <div className="flex items-center text-red-500 gap-2 font-bold text-xs uppercase opacity-0 transition-opacity duration-200" style={{ opacity: offset < -20 ? 1 : 0 }}>
                                    Delete <Trash2 size={16} />
                                </div>
                            </div>

                            <div 
                                onTouchStart={(e) => handleTouchStart(e, comment.id)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={() => handleTouchEnd(comment.id)}
                                
                                style={{ transform: `translateX(${offset}px)` }}
                                
                                onClick={() => {
                                    if (isEditing) return;
                                    setSelectedCommentId(comment.id);
                                    if (videoRef.current && !videoError) {
                                        videoRef.current.currentTime = comment.timestamp;
                                        setCurrentTime(comment.timestamp);
                                        setIsPlaying(false);
                                        videoRef.current.pause();
                                    }
                                }}
                                className={`rounded-lg p-3 border text-sm cursor-pointer transition-all relative z-10 
                                    ${isSelected ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'}
                                    ${isGuestComment && !isSelected ? 'border-orange-500/20' : ''}
                                    ${isActive && !isSelected ? 'border-l-4 border-l-indigo-500 bg-zinc-800 shadow-md ring-1 ring-inset ring-indigo-500/20' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold" style={{ color: userColor }}>
                                            {author.name.split(' ')[0]}
                                        </span>
                                        
                                        {isGuestComment && (
                                            <span className="text-[9px] uppercase font-bold text-orange-400 border border-orange-500/30 px-1 rounded">Guest</span>
                                        )}

                                        <span className={`font-mono text-xs px-1 rounded flex items-center gap-1 ${isActive ? 'text-indigo-300 bg-indigo-950 border border-indigo-500/30' : 'text-indigo-400 bg-indigo-950/50'}`}>
                                        {formatTimecode(comment.timestamp)}
                                        {comment.duration && <span className="opacity-50">→ {formatTimecode(comment.timestamp + comment.duration)}</span>}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canResolve && !isEditing && (
                                            <button onClick={(e) => handleResolveComment(e, comment.id)} className={comment.status==='resolved'?'text-green-500':'text-zinc-600 hover:text-green-500'}>
                                            <CheckCircle size={14} />
                                            </button>
                                        )}
                                        {!canResolve && !isEditing && (
                                            <div className={`w-2 h-2 rounded-full ${comment.status==='resolved'?'bg-green-500':'bg-yellow-500'}`} />
                                        )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                                    <textarea 
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-base md:text-sm text-white focus:border-indigo-500 outline-none mb-2"
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        rows={3}
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={cancelEdit} className="px-2 py-1 text-xs text-zinc-400 hover:text-white">Cancel</button>
                                        <button onClick={() => saveEdit(comment.id)} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs flex items-center gap-1">
                                            <Save size={12} /> Save
                                        </button>
                                    </div>
                                    </div>
                                ) : (
                                    <p className={`text-zinc-300 mb-1 whitespace-pre-wrap ${comment.status === CommentStatus.RESOLVED ? 'line-through opacity-50' : ''}`}>{comment.text}</p>
                                )}
                        </div>
                        </div>
                        );
                    })}
                    <div ref={commentsEndRef} />
                </div>

                <div className="fixed bottom-0 left-0 right-0 lg:static lg:w-full bg-zinc-900 border-t border-zinc-800 z-50 p-3 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                    
                    {(markerInPoint !== null || markerOutPoint !== null) && (
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <div className="text-[10px] text-indigo-400 flex items-center gap-1 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span>Targeting Range: {formatTimecode(markerInPoint || currentTime)} - {markerOutPoint ? formatTimecode(markerOutPoint) : '...'}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 items-center pb-[env(safe-area-inset-bottom)]">
                        <div className="relative flex-1">
                            <input
                            ref={sidebarInputRef}
                            disabled={isLocked}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-3 pr-12 py-3 md:py-2.5 text-base md:text-sm text-white focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={isLocked ? "Comments are locked" : (isListening ? "Listening..." : "Add a comment...")}
                            value={newCommentText}
                            onChange={e => setNewCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                            onFocus={(e) => {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 300);
                            }}
                            />
                            <button 
                            onClick={toggleListening}
                            disabled={isLocked}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-zinc-500 hover:text-white disabled:opacity-30'}`}
                            >
                            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                            </button>
                        </div>
                        <button 
                            onClick={handleAddComment} 
                            disabled={!newCommentText.trim() || isLocked} 
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3 md:p-2.5 rounded-lg transition-colors shrink-0 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
             </>
        </div>
        )}

      </div>
      
      <input 
          type="file" 
          accept=".mp4,.mov,.mkv,.webm,video/mp4,video/quicktime"
          className="hidden" 
          ref={localFileRef}
          onChange={handleLocalFileSelect}
      />

      <div 
        className="fixed z-[9999] floating-controls touch-none"
        style={{ 
            transform: `translate(${controlsPos.x}px, ${controlsPos.y}px)`,
            bottom: '40px', 
            left: '50%',
            marginLeft: '-110px'
        }}
      >
        <div className={`flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md rounded-xl p-1.5 border border-zinc-800 shadow-2xl ring-1 ring-white/5 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            
            <div 
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                className="p-1.5 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing border-r border-zinc-800 mr-1 pointer-events-auto"
            >
                <GripVertical size={14} />
            </div>

            <button 
                onClick={handleQuickMarker}
                className="text-zinc-400 hover:text-indigo-400 px-2 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Quick Marker (M)"
            >
                <MapPin size={18} />
            </button>

            <button 
                onClick={(e) => { e.stopPropagation(); seek(-10); }} 
                className="text-zinc-400 hover:text-white px-2 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors pointer-events-auto"
            >
                <RotateCcw size={18} />
            </button>

            <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>

            <button 
                onClick={handleSetInPoint} 
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${markerInPoint !== null ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title="Set In Point (I)"
            >
                IN
            </button>
            <button 
                onClick={handleSetOutPoint}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${markerOutPoint !== null ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title="Set Out Point (O)"
            >
                OUT
            </button>

            <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>

            <button 
                onClick={(e) => { e.stopPropagation(); seek(10); }} 
                className="text-zinc-400 hover:text-white px-2 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors pointer-events-auto"
            >
                <RotateCw size={18} />
            </button>

            {(markerInPoint !== null || markerOutPoint !== null) && (
                <button onClick={clearMarkers} className="ml-1 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors border-l border-zinc-800 pointer-events-auto">
                    <XIcon size={14} />
                </button>
            )}
        </div>
     </div>
    </div>
  );
};
