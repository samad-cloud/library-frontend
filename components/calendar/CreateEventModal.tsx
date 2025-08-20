import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Clock, Target, Calendar, Loader2, Check, AlertCircle } from "lucide-react";
import { endOfDay, format, isAfter, parseISO, set, startOfDay } from "date-fns";
import { CalendarEvent, COLORS, StyleType } from "./types";

const STYLE_OPTIONS: StyleType[] = [
  'Lifestyle no subject',
  'Lifestyle + Subject', 
  'Emotionally driven',
  'Studio Style',
  'Close-up shot',
  'White background'
];
import { classNames } from "./utils";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (e: CalendarEvent) => void;
  baseDate: Date;
}

export function CreateEventModal({
  open,
  onOpenChange,
  onCreate,
  baseDate,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerDate, setTriggerDate] = useState(format(baseDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [dueDate, setDueDate] = useState(format(baseDate, "yyyy-MM-dd"));
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("amber");
  const [numberOfVariations, setNumberOfVariations] = useState(1);
  const [styles, setStyles] = useState<StyleType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Helper function to handle style toggle
  const handleStyleToggle = (style: StyleType, checked: boolean) => {
    if (checked) {
      setStyles(prev => [...prev, style]);
    } else {
      setStyles(prev => prev.filter(s => s !== style));
    }
  };

  async function handleCreate() {
    // Reset previous states
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
      return;
    }
    if (!allDay && !isAfter(end, start)) {
      setError("End time must be after start time");
      return;
    }

    setIsCreating(true);

    try {
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
        databaseEvent: {
          summary: title.trim(),
          description,
          due_date: dueDate,
          trigger_start: start.toISOString(),
          trigger_end: end.toISOString(),
          color,
          status: 'pending',
          number_of_variations: numberOfVariations,
          styles
        }
      });

      // Show success state
      setSuccess(true);
      
      // Auto-close after showing success
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
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Error creating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to create event');
      setIsCreating(false);
    }
  }

  // Reset states when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setIsCreating(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>Fill in the details below to add an event.</DialogDescription>
        </DialogHeader>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-green-700 text-sm">Event created successfully!</span>
          </div>
        )}
        <div className="grid gap-4 py-2">
          {/* Title under trigger label */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Trigger
            </Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g., Sprint planning"
              disabled={isCreating || success}
            />
          </div>

          {/* Trigger Date and Time Section */}
          <div className="grid gap-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trigger Date & Time
            </Label>
            
            {/* Date and Color Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm text-slate-600">Date</Label>
                <Input 
                  type="date" 
                  value={triggerDate} 
                  onChange={(e) => setTriggerDate(e.target.value)}
                  disabled={isCreating || success}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm text-slate-600">Color</Label>
                <Select value={color} onValueChange={setColor} disabled={isCreating || success}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        <div className="flex items-center gap-2">
                          <span className={classNames("h-3 w-3 rounded-full", c.dot)} /> {c.key}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="allday" checked={allDay} onCheckedChange={setAllDay} disabled={isCreating || success} />
                <Label htmlFor="allday">All day</Label>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                {allDay ? "00:00 – 23:59" : `${startTime} – ${endTime}`}
              </div>
            </div>

            {/* Time Inputs */}
            {!allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-sm text-slate-600">Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isCreating || success} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-slate-600">End Time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={isCreating || success} />
                </div>
              </div>
            )}
          </div>

          {/* Due Date Section */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isCreating || success} />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" disabled={isCreating || success} />
          </div>

          {/* Number of Variations */}
          <div className="grid gap-2">
            <Label htmlFor="variations">Number of Variations</Label>
            <Input
              id="variations"
              type="number"
              min="1"
              max="10"
              value={numberOfVariations}
              onChange={(e) => setNumberOfVariations(Number(e.target.value))}
              disabled={isCreating || success}
            />
          </div>

          {/* Styles */}
          <div className="grid gap-2">
            <Label>Styles</Label>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_OPTIONS.map((style) => (
                <div key={style} className="flex items-center space-x-2">
                  <Checkbox
                    id={style}
                    checked={styles.includes(style)}
                    onCheckedChange={(checked) => handleStyleToggle(style, checked as boolean)}
                    disabled={isCreating || success}
                  />
                  <Label htmlFor={style} className="text-sm font-normal">
                    {style}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="ghost" 
              className="rounded-xl" 
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              className="rounded-xl" 
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
                'Create'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
