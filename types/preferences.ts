export type StyleType = 
  | 'Lifestyle no subject'
  | 'Lifestyle + Subject'
  | 'Emotionally driven'
  | 'Studio Style'
  | 'Close-up shot'
  | 'White background'

export interface WorkingHoursSchedule {
  start: string // "09:00"
  end: string   // "18:00"
  enabled: boolean
}

export interface CustomSchedule {
  monday?: WorkingHoursSchedule
  tuesday?: WorkingHoursSchedule
  wednesday?: WorkingHoursSchedule
  thursday?: WorkingHoursSchedule
  friday?: WorkingHoursSchedule
  saturday?: WorkingHoursSchedule
  sunday?: WorkingHoursSchedule
}

export interface UserPreferences {
  id?: string
  user_id?: string
  trigger_timing: string
  styles: StyleType[]
  number_of_variations: number
  // Working hours fields
  working_hours_start?: string // "09:00:00" or "09:00"
  working_hours_end?: string   // "18:00:00" or "18:00"
  working_days?: number[]      // [1,2,3,4,5] for Mon-Fri
  timezone?: string             // "UTC", "America/New_York", etc.
  highlight_working_hours?: boolean
  custom_schedule?: CustomSchedule | null
  created_at?: string
  updated_at?: string
}

export interface Database {
  public: {
    Tables: {
      user_preferences: {
        Row: UserPreferences
        Insert: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Enums: {
      style_type: StyleType
    }
  }
}
