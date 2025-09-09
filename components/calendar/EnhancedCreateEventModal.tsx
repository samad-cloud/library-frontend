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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  Clock, 
  Target, 
  Calendar, 
  Loader2, 
  Check, 
  AlertCircle,
  Sparkles,
  Palette,
  Hash,
  Brush,
  Info,
  CalendarDays,
  ChevronRight,
  X
} from "lucide-react";
import { endOfDay, format, isAfter, parseISO, set, startOfDay } from "date-fns";
import { CalendarEvent, COLORS, StyleType, DepartmentType } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from '@/utils/supabase/client';

const STYLE_OPTIONS: StyleType[] = [
  'Lifestyle no subject',
  'Lifestyle + Subject', 
  'Emotionally driven',
  'Studio Style',
  'Close-up shot',
  'White background'
];

const STYLE_ICONS: Record<StyleType, React.ElementType> = {
  'Lifestyle no subject': Sparkles,
  'Lifestyle + Subject': Target,
  'Emotionally driven': Hash,
  'Studio Style': Brush,
  'Close-up shot': Palette,
  'White background': Check
};


interface EnhancedCreateEventModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (e: CalendarEvent) => void;
  baseDate: Date;
  initialTime?: Date | null;
  calendarId?: string; // Added to get department from calendar
}

export function EnhancedCreateEventModal({
  open,
  onOpenChange,
  onCreate,
  baseDate,
  initialTime,
  calendarId,
}: EnhancedCreateEventModalProps) {
  // Use initialTime if provided, otherwise use baseDate with default times
  const effectiveDate = initialTime || baseDate;
  const defaultStartTime = initialTime ? format(initialTime, "HH:mm") : "09:00";
  const defaultEndTime = initialTime 
    ? format(new Date(initialTime.getTime() + 60 * 60 * 1000), "HH:mm") // Add 1 hour
    : "10:00";
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerDate, setTriggerDate] = useState(format(effectiveDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [dueDate, setDueDate] = useState(format(effectiveDate, "yyyy-MM-dd"));
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("amber");
  const [numberOfVariations, setNumberOfVariations] = useState(1);
  const [styles, setStyles] = useState<StyleType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Update form values when modal opens with a new initialTime
  useEffect(() => {
    if (open && initialTime) {
      setTriggerDate(format(initialTime, "yyyy-MM-dd"));
      setStartTime(format(initialTime, "HH:mm"));
      setEndTime(format(new Date(initialTime.getTime() + 60 * 60 * 1000), "HH:mm"));
      setDueDate(format(initialTime, "yyyy-MM-dd"));
    } else if (open && !initialTime) {
      // Reset to default times if no initialTime provided
      setTriggerDate(format(baseDate, "yyyy-MM-dd"));
      setStartTime("09:00");
      setEndTime("10:00");
      setDueDate(format(baseDate, "yyyy-MM-dd"));
    }
    
    // Reset other fields when modal opens
    if (open) {
      setTitle("");
      setDescription("");
      setAllDay(false);
      setColor("amber");
      setNumberOfVariations(1);
      setStyles([]);
      setError(null);
      setSuccess(false);
      setActiveTab("details");
    }
  }, [open, initialTime, baseDate]);

  const handleStyleToggle = (style: StyleType, checked: boolean) => {
    if (checked) {
      setStyles(prev => [...prev, style]);
    } else {
      setStyles(prev => prev.filter(s => s !== style));
    }
  };

  async function handleCreate() {
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
      setActiveTab("details");
      return;
    }

    setIsCreating(true);

    try {
      // Get department from calendar if calendarId is provided
      let department: DepartmentType = 'email_marketing'; // default
      
      if (calendarId) {
        const supabase = createClient();
        const { data: calendar, error: calendarError } = await supabase
          .from('calendars')
          .select('department')
          .eq('id', calendarId)
          .single();
          
        if (calendarError) {
          console.warn('Could not fetch calendar department:', calendarError);
        } else if (calendar?.department) {
          department = calendar.department as DepartmentType;
        }
      }
      await onCreate({ 
        id: "temp", 
        title: title.trim(), 
        description, 
        start: start.toISOString(), 
        end: end.toISOString(), 
        allDay, 
        color,
        number_of_variations: numberOfVariations,
        styles,
        department,
        databaseEvent: {
          summary: title.trim(),
          description,
          due_date: dueDate,
          trigger_start: start.toISOString(),
          trigger_end: end.toISOString(),
          color,
          status: 'pending',
          number_of_variations: numberOfVariations,
          styles,
          department
        }
      });

      setSuccess(true);
      
      setTimeout(() => {
        // Reset all form fields
        setTitle("");
        setDescription("");
        setTriggerDate(format(baseDate, "yyyy-MM-dd"));
        setDueDate(format(baseDate, "yyyy-MM-dd"));
        setStartTime("09:00");
        setEndTime("10:00");
        setAllDay(false);
        setColor("amber");
        setNumberOfVariations(1);
        setStyles([]);
        setError(null);
        setSuccess(false);
        setIsCreating(false);
        setActiveTab("details");
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Error creating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to create event');
      setIsCreating(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setIsCreating(false);
      setActiveTab("details");
    }
    onOpenChange(open);
  };

  // Get selected color info
  const selectedColor = COLORS.find(c => c.key === color) || COLORS[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        {/* Enhanced Header with Gradient */}
        <div className="relative bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Create New Event
            </DialogTitle>
            <p className="text-white/90 mt-1">
              Schedule your image generation campaign
            </p>
          </DialogHeader>
        </div>

        <div className="p-6">
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
                  <p className="text-green-700 text-sm mt-0.5">Event created successfully</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                    <Target className="h-4 w-4 text-purple-600" />
                    Campaign Trigger
                  </Label>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g., Spring Sale Campaign"
                    className="mt-2 h-12 text-base"
                    disabled={isCreating || success}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    This will be the main identifier for your campaign
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-semibold mb-2">
                    Description
                  </Label>
                  <Textarea 
                    id="description"
                    rows={4} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Add campaign details, target audience, goals..."
                    className="mt-2 resize-none"
                    disabled={isCreating || success}
                  />
                </div>


                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{numberOfVariations}</p>
                    <p className="text-sm text-gray-600">Variations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{styles.length}</p>
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
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-purple-600" />
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
                      onChange={(e) => setTriggerDate(e.target.value)}
                      className="mt-1"
                      disabled={isCreating || success}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Due Date</Label>
                    <Input 
                      type="date" 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1"
                      disabled={isCreating || success}
                    />
                  </div>
                </div>
              </div>

              {/* All Day Toggle with Visual Feedback */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch 
                      id="allday" 
                      checked={allDay} 
                      onCheckedChange={setAllDay} 
                      disabled={isCreating || success}
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
                    allDay ? "text-gray-300" : "text-purple-600"
                  )} />
                </div>
              </div>

              {/* Time Selection with Animation */}
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
                        {initialTime && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            <Clock className="w-3 h-3 mr-1" />
                            Pre-filled
                          </Badge>
                        )}
                      </Label>
                      <Input 
                        type="time" 
                        value={startTime} 
                        onChange={(e) => setStartTime(e.target.value)} 
                        className="mt-2"
                        disabled={isCreating || success}
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
                        onChange={(e) => setEndTime(e.target.value)} 
                        className="mt-2"
                        disabled={isCreating || success}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-6">
              {/* Color Selection with Visual Preview */}
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-600" />
                  Event Color
                </Label>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {COLORS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setColor(c.key)}
                      disabled={isCreating || success}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all",
                        color === c.key 
                          ? "border-purple-500 shadow-lg scale-105" 
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

              {/* Variations with Visual Counter */}
              <div>
                <Label htmlFor="variations" className="text-base font-semibold mb-2 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-purple-600" />
                  Number of Variations
                </Label>
                <div className="flex items-center gap-4 mt-3">
                  <Input
                    id="variations"
                    type="number"
                    min="1"
                    max="10"
                    value={numberOfVariations}
                    onChange={(e) => setNumberOfVariations(Number(e.target.value))}
                    className="w-24"
                    disabled={isCreating || success}
                  />
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(numberOfVariations, 10) }).map((_, i) => (
                      <div
                        key={i}
                        className="h-2 w-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                        style={{ opacity: 1 - (i * 0.08) }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Generate multiple versions of your campaign images
                </p>
              </div>

              {/* Style Selection with Icons */}
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Brush className="h-4 w-4 text-purple-600" />
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
                            ? "bg-purple-50 border-purple-500" 
                            : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleStyleToggle(style, checked as boolean)}
                          disabled={isCreating || success}
                          className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <Icon className={cn(
                          "h-5 w-5",
                          isSelected ? "text-purple-600" : "text-gray-400"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-purple-900" : "text-gray-700"
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
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4" />
              <span>All fields are saved automatically</span>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="min-w-[100px]" 
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                className="min-w-[120px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={handleCreate}
                disabled={isCreating || success}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : success ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Created!
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}