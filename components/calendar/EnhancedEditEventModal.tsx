import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { 
  Clock, 
  Target, 
  Calendar, 
  Loader2, 
  Check, 
  AlertCircle,
  Edit2,
  Palette,
  Hash,
  Brush,
  Save,
  CalendarDays,
  ChevronRight,
  Trash2,
  History,
  Timer
} from "lucide-react";
import { endOfDay, format, isAfter, parseISO, set, startOfDay } from "date-fns";
import { CalendarEvent, COLORS, StyleType } from "./types";
import { motion, AnimatePresence } from "framer-motion";

const STYLE_OPTIONS: StyleType[] = [
  'Lifestyle no subject',
  'Lifestyle + Subject', 
  'Emotionally driven',
  'Studio Style',
  'Close-up shot',
  'White background'
];

const STYLE_ICONS: Record<StyleType, React.ElementType> = {
  'Lifestyle no subject': Edit2,
  'Lifestyle + Subject': Target,
  'Emotionally driven': Hash,
  'Studio Style': Brush,
  'Close-up shot': Palette,
  'White background': Check
};

interface EnhancedEditEventModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (eventId: string, updatedEvent: CalendarEvent) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  event: CalendarEvent | null;
}

export function EnhancedEditEventModal({
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  event,
}: EnhancedEditEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerDate, setTriggerDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [dueDate, setDueDate] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("amber");
  const [numberOfVariations, setNumberOfVariations] = useState(1);
  const [styles, setStyles] = useState<StyleType[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Check if event is processing
  const isProcessing = event?.databaseEvent?.status === 'processing';

  // Helper function to handle style toggle
  const handleStyleToggle = (style: StyleType, checked: boolean) => {
    if (checked) {
      setStyles(prev => [...prev, style]);
    } else {
      setStyles(prev => prev.filter(s => s !== style));
    }
    setHasChanges(true);
  };

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      // Prevent editing processing events
      if (event.databaseEvent?.status === 'processing') {
        setError("This event is currently processing and cannot be edited");
        return;
      }
      
      setTitle(event.title || "");
      setDescription(event.description || "");
      setColor(event.color || "amber");
      setAllDay(event.allDay || false);

      // Parse trigger dates and times
      if (event.start) {
        const startDate = parseISO(event.start);
        setTriggerDate(format(startDate, "yyyy-MM-dd"));
        setStartTime(format(startDate, "HH:mm"));
      }

      if (event.end) {
        const endDate = parseISO(event.end);
        setEndTime(format(endDate, "HH:mm"));
      }

      // Set due date from database event if available
      if (event.databaseEvent?.due_date) {
        setDueDate(event.databaseEvent.due_date);
      } else {
        // Fallback to trigger date if no due date
        if (event.start) {
          const startDate = parseISO(event.start);
          setDueDate(format(startDate, "yyyy-MM-dd"));
        }
      }

      // Set number of variations
      setNumberOfVariations(event.number_of_variations || event.databaseEvent?.number_of_variations || 1);

      // Set styles
      setStyles(event.styles || event.databaseEvent?.styles || []);

      // Reset states
      setError(null);
      setSuccess(false);
      setHasChanges(false);
      setActiveTab("details");
    }
  }, [event]);

  // Track changes
  useEffect(() => {
    if (event && !success && !error) {
      const hasAnyChange = 
        title !== event.title ||
        description !== (event.description || "") ||
        color !== (event.color || "amber") ||
        allDay !== (event.allDay || false) ||
        numberOfVariations !== (event.number_of_variations || 1);
      
      setHasChanges(hasAnyChange);
    }
  }, [title, description, color, allDay, numberOfVariations, event, success, error]);

  async function handleUpdate() {
    if (!event) return;

    setError(null);
    setSuccess(false);

    const day = parseISO(`${triggerDate}T00:00:00`);
    const start = allDay
      ? startOfDay(day)
      : set(day, { hours: Number(startTime.slice(0, 2)), minutes: Number(startTime.slice(3, 5)) });
    const end = allDay
      ? endOfDay(day)
      : set(day, { hours: Number(endTime.slice(0, 2)), minutes: Number(endTime.slice(3, 5)) });

    // Validation
    if (!title.trim()) {
      setError("Please enter a title for the event");
      setActiveTab("details");
      return;
    }
    if (!allDay && !isAfter(end, start)) {
      setError("End time must be after start time");
      setActiveTab("timing");
      return;
    }

    setIsUpdating(true);

    try {
      const updatedEvent: CalendarEvent = {
        ...event,
        title: title.trim(),
        description,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay,
        color,
        number_of_variations: numberOfVariations,
        styles,
        databaseEvent: event.databaseEvent ? {
          ...event.databaseEvent,
          summary: title.trim(),
          description,
          due_date: dueDate,
          trigger_start: start.toISOString(),
          trigger_end: end.toISOString(),
          color,
          number_of_variations: numberOfVariations,
          styles
        } : undefined
      };

      await onUpdate(event.id, updatedEvent);

      setSuccess(true);
      setHasChanges(false);
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Error updating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to update event');
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!event || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(event.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setIsUpdating(false);
      setActiveTab("details");
    }
    onOpenChange(open);
  };

  // Get selected color info
  const selectedColor = COLORS.find(c => c.key === color) || COLORS[0];

  // Format last modified date
  const lastModified = event?.databaseEvent?.updated_at 
    ? format(parseISO(event.databaseEvent.updated_at), "MMM d, yyyy 'at' h:mm a")
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          {/* Enhanced Header with Gradient */}
          <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Edit2 className="h-6 w-6" />
                Edit Event
              </DialogTitle>
              <p className="text-white/90 mt-1">
                Update your campaign details
              </p>
            </DialogHeader>
            
            {/* Status Badge */}
            {hasChanges && (
              <Badge className="absolute bottom-4 right-6 bg-white/20 text-white border-white/30">
                Unsaved changes
              </Badge>
            )}
          </div>

          <div className="p-6">
            {/* Processing Warning */}
            {event?.databaseEvent?.status === 'processing' && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                <Timer className="h-5 w-5 text-yellow-600 animate-pulse mt-0.5" />
                <div>
                  <p className="text-yellow-800 font-medium">Event is Processing</p>
                  <p className="text-yellow-700 text-sm mt-0.5">
                    This event is currently being processed and cannot be edited. Please wait for processing to complete.
                  </p>
                </div>
              </div>
            )}

            {/* Status Messages with Animation */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm mt-0.5">{error}</p>
                  </div>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"
                >
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-green-800 font-medium">Success!</p>
                    <p className="text-green-700 text-sm mt-0.5">Event updated successfully</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Last Modified Info */}
            {lastModified && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2 text-sm text-gray-600">
                <History className="h-4 w-4" />
                Last modified {lastModified}
              </div>
            )}

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="details" className="gap-2">
                  <Target className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="timing" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="style" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Style
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Campaign Trigger
                    </Label>
                    <Input 
                      id="title" 
                      value={title} 
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setHasChanges(true);
                      }} 
                      placeholder="e.g., Spring Sale Campaign"
                      className="mt-2 h-12 text-base"
                      disabled={isUpdating || success || isProcessing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-semibold mb-2">
                      Description
                    </Label>
                    <Textarea 
                      id="description"
                      rows={4} 
                      value={description} 
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setHasChanges(true);
                      }} 
                      placeholder="Add campaign details, target audience, goals..."
                      className="mt-2 resize-none"
                      disabled={isUpdating || success || isProcessing}
                    />
                  </div>

                  {/* Current Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-xl">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{numberOfVariations}</p>
                      <p className="text-sm text-gray-600">Variations</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{styles.length}</p>
                      <p className="text-sm text-gray-600">Styles</p>
                    </div>
                    <div className="text-center">
                      <div className="flex justify-center">
                        <div className={cn("h-8 w-8 rounded-full", selectedColor.dot)} />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Color</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Timing Tab */}
              <TabsContent value="timing" className="space-y-6">
                {/* Visual Calendar Preview */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      Event Schedule
                    </Label>
                    <Badge variant="secondary">
                      {allDay ? "All Day Event" : `${startTime} - ${endTime}`}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Trigger Date</Label>
                      <Input 
                        type="date" 
                        value={triggerDate} 
                        onChange={(e) => {
                          setTriggerDate(e.target.value);
                          setHasChanges(true);
                        }}
                        className="mt-1"
                        disabled={isUpdating || success || isProcessing}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Due Date</Label>
                      <Input 
                        type="date" 
                        value={dueDate} 
                        onChange={(e) => {
                          setDueDate(e.target.value);
                          setHasChanges(true);
                        }}
                        className="mt-1"
                        disabled={isUpdating || success || isProcessing}
                      />
                    </div>
                  </div>
                </div>

                {/* All Day Toggle */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch 
                        id="allday" 
                        checked={allDay} 
                        onCheckedChange={(checked) => {
                          setAllDay(checked);
                          setHasChanges(true);
                        }}
                        disabled={isUpdating || success || isProcessing}
                      />
                      <div>
                        <Label htmlFor="allday" className="text-base cursor-pointer">
                          All Day Event
                        </Label>
                        <p className="text-sm text-gray-600">
                          Event spans the entire day
                        </p>
                      </div>
                    </div>
                    <Clock className={cn(
                      "h-8 w-8 transition-colors",
                      allDay ? "text-gray-300" : "text-blue-600"
                    )} />
                  </div>
                </div>

                {/* Time Selection */}
                <AnimatePresence>
                  {!allDay && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="p-4 bg-white border rounded-xl">
                        <Label className="text-sm text-gray-600 flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          Start Time
                        </Label>
                        <Input 
                          type="time" 
                          value={startTime} 
                          onChange={(e) => {
                            setStartTime(e.target.value);
                            setHasChanges(true);
                          }}
                          className="mt-2"
                          disabled={isUpdating || success || isProcessing}
                        />
                      </div>
                      <div className="p-4 bg-white border rounded-xl">
                        <Label className="text-sm text-gray-600 flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          End Time
                        </Label>
                        <Input 
                          type="time" 
                          value={endTime} 
                          onChange={(e) => {
                            setEndTime(e.target.value);
                            setHasChanges(true);
                          }}
                          className="mt-2"
                          disabled={isUpdating || success || isProcessing}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Style Tab */}
              <TabsContent value="style" className="space-y-6">
                {/* Color Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-blue-600" />
                    Event Color
                  </Label>
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => {
                          setColor(c.key);
                          setHasChanges(true);
                        }}
                        disabled={isUpdating || success || isProcessing}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all",
                          color === c.key 
                            ? "border-blue-500 shadow-lg scale-105" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("h-6 w-6 rounded-full", c.dot)} />
                          <span className="text-sm font-medium capitalize">{c.key}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variations */}
                <div>
                  <Label htmlFor="variations" className="text-base font-semibold mb-2 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-600" />
                    Number of Variations
                  </Label>
                  <div className="flex items-center gap-4 mt-3">
                    <Input
                      id="variations"
                      type="number"
                      min="1"
                      max="10"
                      value={numberOfVariations}
                      onChange={(e) => {
                        setNumberOfVariations(Number(e.target.value));
                        setHasChanges(true);
                      }}
                      className="w-24"
                      disabled={isUpdating || success || isProcessing}
                    />
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(numberOfVariations, 10) }).map((_, i) => (
                        <div
                          key={i}
                          className="h-2 w-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                          style={{ opacity: 1 - (i * 0.08) }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Style Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Brush className="h-4 w-4 text-blue-600" />
                    Image Styles
                  </Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {STYLE_OPTIONS.map((style) => {
                      const Icon = STYLE_ICONS[style];
                      const isSelected = styles.includes(style);
                      
                      return (
                        <label
                          key={style}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                            isSelected 
                              ? "bg-blue-50 border-blue-500" 
                              : "bg-white border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleStyleToggle(style, checked as boolean)}
                            disabled={isUpdating || success || isProcessing}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Icon className={cn(
                            "h-5 w-5",
                            isSelected ? "text-blue-600" : "text-gray-400"
                          )} />
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-blue-900" : "text-gray-700"
                          )}>
                            {style}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Enhanced Footer Actions */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t">
              {onDelete && (
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdating || isDeleting || isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button 
                  variant="outline" 
                  className="min-w-[100px]" 
                  onClick={() => handleOpenChange(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button 
                  className={cn(
                    "min-w-[120px]",
                    hasChanges 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      : "bg-gray-400"
                  )}
                  onClick={handleUpdate}
                  disabled={isUpdating || success || !hasChanges || isProcessing}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : success ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Updated!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}