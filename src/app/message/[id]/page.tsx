import { supabase } from '@/lib/supabase'

type Props = { params: { id: string } }

export default async function MessagePage({ params }: Props) {
  const { id } = params

  // тянем запись
  const { data, error } = await supabase
    .from('messages')
    .select('image_url, auto_delete, is_read')
    .eq('id', id)
    .single()

  if (error || !data) {
    return (
      <div style={{
        background:'#000', color:'red',
        minHeight:'100vh', display:'flex',
        justifyContent:'center', alignItems:'center',
        fontSize:'1.5rem'
      }}>
        Message not found
      </div>
    )
  }

  // помечаем или удаляем
  if (!data.is_read) {
    if (data.auto_delete) {
      await supabase.from('messages').delete().eq('id', id)
    } else {
      await supabase.from('messages').update({ is_read:true }).eq('id', id)
    }
  }

  // показываем картинку
  return (
    <div style={{
      background:'#000',
      minHeight:'100vh',
      display:'flex',
      justifyContent:'center',
      alignItems:'center',
      padding:'1rem'
    }}>
      <img
        src={data.image_url}
        alt=""
        style={{
          maxWidth:'100%',
          maxHeight:'100vh',
          objectFit:'contain',
          boxShadow:'0 0 20px #fff'
        }}
      />
    </div>
  )
}
