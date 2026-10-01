// Tipos do banco (formato esperado pelo client tipado do supabase-js).
// Para regenerar a partir do projeto: `npx supabase gen types typescript`.

export type MessageRole = 'user' | 'assistant'

// `type` (e não `interface`): o supabase-js exige tipos compatíveis com Record<string, unknown>.
export type ConversationRow = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  conversation_id: string
  user_id: string
  role: MessageRole
  content: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: ConversationRow
        Insert: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: MessageRow
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role: MessageRole
          content: string
          created_at?: string
        }
        Update: { [_ in never]: never }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
