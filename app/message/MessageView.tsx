'use client'
import { useEffect } from 'react'

export default function MessageView({ id, url }:{id:string,url:string}) {

  /* пуск звука один раз */
  useEffect(()=>{ new Audio('/sfx/woosh.mp3').play().catch(()=>{}) },[])

  return (
    <div style={{background:'#000',minHeight:'100vh',
                 display:'flex',flexDirection:'column',
                 alignItems:'center',justifyContent:'center',gap:'2rem'}}>
      <h1 className="glitch" data-text="IN:VERSION"
          style={{fontSize:'3rem',letterSpacing:'0.15em'}}>IN:VERSION</h1>

      <img src={url}
           style={{maxWidth:'100%',maxHeight:'80vh',objectFit:'contain'}} />
    </div>
  )
}
