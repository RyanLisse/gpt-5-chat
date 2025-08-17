// Lucide React icon mappings - tree-shakeable and lightweight
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  CheckCircle,
  ChevronDown,
  RotateCcw as ClockRewind,
  Code,
  Copy,
  Download,
  Edit3,
  Eye,
  File,
  FileText,
  GitBranch,
  Globe,
  Home,
  Info,
  Loader2,
  Image as LucideImage,
  Lock as LucideLock,
  MapPin,
  Maximize,
  Menu,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Paperclip,
  Pen,
  Play,
  Plus,
  Receipt,
  Redo2,
  Route,
  Share2,
  SidebarOpen,
  Sparkles,
  Square,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Undo2,
  Upload,
  User,
  X,
} from 'lucide-react';

// Type for icon props to ensure consistency
type IconProps = {
  size?: number;
  className?: string;
};

// Exported icon components using Lucide React
export const BotIcon = ({ size = 16, className }: IconProps) => (
  <Bot className={className} size={size} />
);

export const UserIcon = ({ size = 16, className }: IconProps) => (
  <User className={className} size={size} />
);

export const AttachmentIcon = ({ size = 16, className }: IconProps) => (
  <Paperclip className={className} size={size} />
);

export const FileIcon = ({ size = 16, className }: IconProps) => (
  <File className={className} size={size} />
);

export const LoaderIcon = ({ size = 16, className }: IconProps) => (
  <Loader2 className={`animate-spin ${className || ''}`} size={size} />
);

export const UploadIcon = ({ size = 16, className }: IconProps) => (
  <Upload className={className} size={size} />
);

export const MenuIcon = ({ size = 16, className }: IconProps) => (
  <Menu className={className} size={size} />
);

export const PencilEditIcon = ({ size = 16, className }: IconProps) => (
  <Edit3 className={className} size={size} />
);

export const MoreIcon = ({ size = 16, className }: IconProps) => (
  <MoreVertical className={className} size={size} />
);

export const MoreHorizontalIcon = ({ size = 16, className }: IconProps) => (
  <MoreHorizontal className={className} size={size} />
);

export const TrashIcon = ({ size = 16, className }: IconProps) => (
  <Trash2 className={className} size={size} />
);

export const InfoIcon = ({ size = 16, className }: IconProps) => (
  <Info className={className} size={size} />
);

export const ArrowUpIcon = ({ size = 16, className }: IconProps) => (
  <ArrowUp className={className} size={size} />
);

export const StopIcon = ({ size = 16, className }: IconProps) => (
  <Square className={className} size={size} />
);

export const PaperclipIcon = ({ size = 16, className }: IconProps) => (
  <Paperclip className={className} size={size} />
);

export const MessageIcon = ({ size = 16, className }: IconProps) => (
  <MessageSquare className={className} size={size} />
);

export const CrossIcon = ({ size = 16, className }: IconProps) => (
  <X className={className} size={size} />
);

export const CrossSmallIcon = ({ size = 16, className }: IconProps) => (
  <X className={className} size={size} />
);

export const UndoIcon = ({ size = 16, className }: IconProps) => (
  <Undo2 className={className} size={size} />
);

export const RedoIcon = ({ size = 16, className }: IconProps) => (
  <Redo2 className={className} size={size} />
);

export const PenIcon = ({ size = 16, className }: IconProps) => (
  <Pen className={className} size={size} />
);

export const SummarizeIcon = ({ size = 16, className }: IconProps) => (
  <FileText className={className} size={size} />
);

export const SidebarLeftIcon = ({ size = 16, className }: IconProps) => (
  <SidebarOpen className={className} size={size} />
);

export const PlusIcon = ({ size = 16, className }: IconProps) => (
  <Plus className={className} size={size} />
);

export const CopyIcon = ({ size = 16, className }: IconProps) => (
  <Copy className={className} size={size} />
);

export const ThumbUpIcon = ({ size = 16, className }: IconProps) => (
  <ThumbsUp className={className} size={size} />
);

export const ThumbDownIcon = ({ size = 16, className }: IconProps) => (
  <ThumbsDown className={className} size={size} />
);

export const ChevronDownIcon = ({ size = 16, className }: IconProps) => (
  <ChevronDown className={className} size={size} />
);

export const SparklesIcon = ({ size = 16, className }: IconProps) => (
  <Sparkles className={className} size={size} />
);

export const CheckCircleFillIcon = ({ size = 16, className }: IconProps) => (
  <CheckCircle className={className} size={size} />
);

export const GlobeIcon = ({ size = 16, className }: IconProps) => (
  <Globe className={className} size={size} />
);

export const LockIcon = ({ size = 16, className }: IconProps) => (
  <LucideLock className={className} size={size} />
);

export const EyeIcon = ({ size = 16, className }: IconProps) => (
  <Eye className={className} size={size} />
);

export const ShareIcon = ({ size = 16, className }: IconProps) => (
  <Share2 className={className} size={size} />
);

export const CodeIcon = ({ size = 16, className }: IconProps) => (
  <Code className={className} size={size} />
);

export const PlayIcon = ({ size = 16, className }: IconProps) => (
  <Play className={className} size={size} />
);

export const TerminalIcon = ({ size = 16, className }: IconProps) => (
  <Terminal className={className} size={size} />
);

export const DownloadIcon = ({ size = 16, className }: IconProps) => (
  <Download className={className} size={size} />
);

export const LineChartIcon = ({ size = 16, className }: IconProps) => (
  <TrendingUp className={className} size={size} />
);

export const WarningIcon = ({ size = 16, className }: IconProps) => (
  <AlertTriangle className={className} size={size} />
);

export const ImageIcon = ({ size = 16, className }: IconProps) => (
  <LucideImage className={className} size={size} />
);

export const FullscreenIcon = ({ size = 16, className }: IconProps) => (
  <Maximize className={className} size={size} />
);

export const HomeIcon = ({ size = 16, className }: IconProps) => (
  <Home className={className} size={size} />
);

export const GPSIcon = ({ size = 16, className }: IconProps) => (
  <MapPin className={className} size={size} />
);

export const InvoiceIcon = ({ size = 16, className }: IconProps) => (
  <Receipt className={className} size={size} />
);

export const RouteIcon = ({ size = 16, className }: IconProps) => (
  <Route className={className} size={size} />
);

export const GitIcon = ({ size = 16, className }: IconProps) => (
  <GitBranch className={className} size={size} />
);

export const ClockRewindIcon = ({ size = 16, className }: IconProps) => (
  <ClockRewind className={className} size={size} />
);
