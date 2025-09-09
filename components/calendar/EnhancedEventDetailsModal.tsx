import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { 
  Calendar, 
  Clock, 
  Target, 
  Palette, 
  Edit2, 
  Hash, 
  Brush,
  CalendarCheck,
  CalendarX,
  Info,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Timer,
  Eye,
  ImageIcon,
  ExternalLink
} from "lucide-react";
import { CalendarEvent, COLORS, StyleType } from "./types";
import { motion } from "framer-motion";

const STYLE_ICONS: Record<StyleType, React.ElementType> = {
  'Lifestyle no subject': Sparkles,
  'Lifestyle + Subject': Target,
  'Emotionally driven': Hash,
  'Studio Style': Brush,
  'Close-up shot': Palette,
  'White background': CheckCircle2
};

interface EnhancedEventDetailsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
}

export function EnhancedEventDetailsModal({
  open,
  onOpenChange,
  event,
  onEdit,
}: EnhancedEventDetailsModalProps) {
  if (!event || !event.databaseEvent) return null;

  const dbEvent = event.databaseEvent;
  const triggerStart = event.start ? parseISO(event.start) : null;
  const triggerEnd = event.end ? parseISO(event.end) : null;
  const dueDate = dbEvent.due_date ? parseISO(dbEvent.due_date) : null;

  // Find the color info for display
  const colorInfo = COLORS.find(c => c.key === event.color) || COLORS[0];

  // Calculate days until due
  const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;
  
  // Determine status
  const getStatus = () => {
    if (dbEvent.status === 'completed') return { label: 'Completed', color: 'bg-green-500', icon: CheckCircle2 };
    if (dbEvent.status === 'failed') return { label: 'Failed', color: 'bg-red-500', icon: AlertCircle };
    if (daysUntilDue !== null && daysUntilDue < 0) return { label: 'Overdue', color: 'bg-red-500', icon: CalendarX };
    if (daysUntilDue !== null && daysUntilDue <= 3) return { label: 'Due Soon', color: 'bg-orange-500', icon: Timer };
    return { label: 'Pending', color: 'bg-blue-500', icon: CalendarCheck };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Enhanced Header with Status */}
        <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6" />
              Event Details
            </DialogTitle>
            <p className="text-white/90 mt-1">
              View complete campaign information
            </p>
          </DialogHeader>
          
          {/* Status Badge */}
          <div className="absolute top-6 right-6">
            <Badge className={cn("text-white border-0", status.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>
        
        <motion.div 
          className="flex-1 overflow-y-auto p-6 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Quick Overview Cards */}
          <motion.div 
            className="grid grid-cols-3 gap-4"
            variants={itemVariants}
          >
            <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("h-8 w-8 rounded-full", colorInfo.dot)} />
                <div>
                  <p className="text-xs text-gray-600">Color</p>
                  <p className="font-semibold capitalize">{event.color}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <Hash className="h-6 w-6 text-blue-600 mb-2" />
              <p className="text-xs text-gray-600">Variations</p>
              <p className="text-2xl font-bold text-blue-900">
                {event.number_of_variations || dbEvent.number_of_variations || 1}
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <Brush className="h-6 w-6 text-green-600 mb-2" />
              <p className="text-xs text-gray-600">Styles</p>
              <p className="text-2xl font-bold text-green-900">
                {(event.styles || dbEvent.styles || []).length}
              </p>
            </div>
          </motion.div>

          {/* Title Section */}
          <motion.div variants={itemVariants}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold">Campaign Trigger</h3>
                </div>
                <p className="text-xl font-bold text-gray-900">{event.title}</p>
              </div>
              {onEdit && dbEvent.status !== 'processing' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(event)}
                  className="ml-4"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onEdit && dbEvent.status === 'processing' && (
                <div className="ml-4 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
                  <Timer className="h-4 w-4 text-yellow-600 animate-pulse" />
                  <span className="text-sm text-yellow-700 font-medium">Processing</span>
                </div>
              )}
            </div>
          </motion.div>

          <Separator />

          {/* Description */}
          {(event.description || dbEvent.description) && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Description</h3>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {event.description || dbEvent.description}
                </p>
              </div>
            </motion.div>
          )}

          {/* Schedule Information */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">Schedule</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Trigger Time */}
              <div className="p-4 bg-white border rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Trigger Time</span>
                </div>
                {triggerStart && triggerEnd ? (
                  <div>
                    <p className="font-semibold text-gray-900">
                      {format(triggerStart, "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {event.allDay ? "All Day" : `${format(triggerStart, "h:mm a")} - ${format(triggerEnd, "h:mm a")}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">Not set</p>
                )}
              </div>

              {/* Due Date */}
              <div className="p-4 bg-white border rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarCheck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">Due Date</span>
                </div>
                {dueDate ? (
                  <div>
                    <p className="font-semibold text-gray-900">
                      {format(dueDate, "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {daysUntilDue === 0 
                        ? "Due today"
                        : daysUntilDue && daysUntilDue > 0 
                        ? `In ${daysUntilDue} days`
                        : `${Math.abs(daysUntilDue || 0)} days overdue`}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">Not set</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Styles Section */}
          {(event.styles || dbEvent.styles) && (event.styles || dbEvent.styles).length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Image Styles</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {(event.styles || dbEvent.styles || []).map((style) => {
                  const Icon = STYLE_ICONS[style as StyleType] || Sparkles;
                  return (
                    <div
                      key={style}
                      className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200"
                    >
                      <Icon className="h-5 w-5 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">{style}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Generated Images Section - Compact Layout */}
          {event.images && event.images.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Generated Images</h3>
                <Badge variant="secondary" className="ml-auto">
                  {event.images.length}
                </Badge>
              </div>
              
              {/* Horizontal scrolling layout for better space usage */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                {event.images.slice(0, 6).map((image) => (
                  <div
                    key={image.id}
                    className="flex-shrink-0 w-32 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {image.thumb_url || image.storage_url ? (
                        <img 
                          src={image.thumb_url || image.storage_url} 
                          alt={image.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 capitalize truncate">
                          {image.generation_source}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {format(parseISO(image.created_at), "MMM d")}
                        </span>
                        
                        <a
                          href={image.storage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                
                {event.images.length > 6 && (
                  <div className="flex-shrink-0 w-32 h-32 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">
                        +{event.images.length - 6} more
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Metadata */}
          <motion.div variants={itemVariants}>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Additional Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-700">
                    {dbEvent.created_at 
                      ? format(parseISO(dbEvent.created_at), "MMM d, yyyy 'at' h:mm a")
                      : 'Unknown'}
                  </span>
                </div>
                {dbEvent.updated_at && (
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="ml-2 text-gray-700">
                      {format(parseISO(dbEvent.updated_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                )}
                {dbEvent.generation_id && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Generation ID:</span>
                    <span className="ml-2 font-mono text-xs text-gray-600">
                      {dbEvent.generation_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Footer Actions */}
          <motion.div 
            className="flex justify-end gap-3 pt-4 border-t"
            variants={itemVariants}
          >
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(event)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            )}
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Close
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}