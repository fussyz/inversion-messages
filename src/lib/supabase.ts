import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://pmhudpgyogvkkpymdplo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtaHVkcGd5b2d2a2tweW1kcGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjYxMzYsImV4cCI6MjA2NzU0MjEzNn0.4xMtBJDw_Ijel0U3K82f9QcuhdlSRSwPPBDRsQ1kejI'
)
