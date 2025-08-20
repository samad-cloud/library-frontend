export type StyleType = 
  | 'Lifestyle no subject'
  | 'Lifestyle + Subject'
  | 'Emotionally driven'
  | 'Studio Style'
  | 'Close-up shot'
  | 'White background'

export interface UserPreferences {
  id?: string
  user_id?: string
  trigger_timing: string
  styles: StyleType[]
  number_of_variations: number
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
