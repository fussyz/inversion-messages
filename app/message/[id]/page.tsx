import { supabase } from '@/lib/supabase'
import MessageView   from '../MessageView'

export default async function Page({ params }:{params:{id:string}}) {
  const id = params.id

  const { data, error } = await supabase
    .from('messages')
    .select('image_url, expire_at')
    .eq('id', id)
    .single()

  const expired = data?.expire_at && new Date(data.expire_at) < new Date()

  if (error || !data || expired) {
    return (
      <div style={{background:'#000',color:'red',minHeight:'100vh',
                   display:'flex',justifyContent:'center',alignItems:'center'}}>
        Message not found
      </div>
    )
  }

  return <MessageView id={id} url={data.image_url}/>
}
