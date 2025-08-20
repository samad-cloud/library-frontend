import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Target, Palette, Edit, Hash, Brush } from "lucide-react";
import { CalendarEvent, COLORS, StyleType } from "./types";
import { classNames } from "./utils";

interface EventDetailsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
}

export function EventDetailsModal({
  open,
  onOpenChange,
  event,
  onEdit,
}: EventDetailsModalProps) {
  if (!event || !event.databaseEvent) return null;

  const dbEvent = event.databaseEvent;
  const triggerStart = event.start ? parseISO(event.start) : null;
  const triggerEnd = event.end ? parseISO(event.end) : null;
  const dueDate = dbEvent.due_date ? parseISO(dbEvent.due_date) : null;

  // Find the color info for display
  const colorInfo = COLORS.find(c => c.key === event.color) || COLORS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>View the details of this event.</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          {/* Summary/Title */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Trigger
            </Label>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <div className="font-semibold">{event.title}</div>
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label>Description</Label>
            <div className="p-3 bg-slate-50 rounded-lg border min-h-[80px]">
              {event.description || dbEvent.description || (
                <span className="text-slate-500 italic">No description provided</span>
              )}
            </div>
          </div>

          {/* Trigger Date and Times */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trigger Date & Time
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="text-xs text-slate-500 mb-1">Start</div>
                <div className="font-medium">
                  {triggerStart ? (
                    <>
                      <div>{format(triggerStart, "MMM d, yyyy")}</div>
                      <div className="text-sm text-slate-600">{format(triggerStart, "h:mm a")}</div>
                    </>
                  ) : (
                    <span className="text-slate-500">Not set</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="text-xs text-slate-500 mb-1">End</div>
                <div className="font-medium">
                  {triggerEnd ? (
                    <>
                      <div>{format(triggerEnd, "MMM d, yyyy")}</div>
                      <div className="text-sm text-slate-600">{format(triggerEnd, "h:mm a")}</div>
                    </>
                  ) : (
                    <span className="text-slate-500">Not set</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </Label>
            <div className="p-3 bg-slate-50 rounded-lg border">
              {dueDate ? (
                <div className="font-medium">{format(dueDate, "MMM d, yyyy")}</div>
              ) : (
                <span className="text-slate-500 italic">No due date set</span>
              )}
            </div>
          </div>

          {/* Color */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color
            </Label>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className={classNames("h-4 w-4 rounded-full", colorInfo.dot)} />
                <span className="font-medium capitalize">{event.color}</span>
              </div>
            </div>
          </div>

          {/* Number of Variations */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Number of Variations
            </Label>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <div className="font-medium">
                {dbEvent.number_of_variations || event.number_of_variations || 1}
              </div>
            </div>
          </div>

          {/* Styles */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Brush className="h-4 w-4" />
              Styles
            </Label>
            <div className="p-3 bg-slate-50 rounded-lg border">
              {(() => {
                const styles = dbEvent.styles || event.styles || [];
                if (styles.length === 0) {
                  return <span className="text-slate-500 italic">No styles selected</span>;
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {styles.map((style: StyleType) => (
                      <span 
                        key={style}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Event Status */}
          <div className="grid gap-2">
            <Label>Status</Label>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <span className={classNames(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                dbEvent.status === 'completed' ? 'bg-green-100 text-green-800' :
                dbEvent.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                dbEvent.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              )}>
                {dbEvent.status}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <div>
              {onEdit && (
                <Button 
                  variant="outline" 
                  className="rounded-xl" 
                  onClick={() => {
                    onEdit(event);
                    onOpenChange(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </Button>
              )}
            </div>
            <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
