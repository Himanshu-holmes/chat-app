import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Phone, Video } from 'lucide-react'

function Chatnav({user,isNav}) {
  return (
    <div className={`flex justify-between gap-4  items-center ${isNav ? "p-2":"p-0"}`}>
      <div className='flex gap-4 items-center'>
      <Avatar>
          <AvatarImage src={user?.profileImage} alt={`${user?.username[0]+user?.username[user?.username.length-1]}`} />
          <AvatarFallback>{user?.username[0]}</AvatarFallback>
      </Avatar>
      <div className='font-semibold'>{user?.username}</div>
      </div>
      {
        isNav && (
          
      <div className='flex gap-4'>
        <div>
          <Phone className='text-slate-900' size={20} />
        </div>
        <div>
          <Video className='text-slate-900' size={20} />
        </div>
      </div>
        )
      }
    </div>
  )
}

export default Chatnav