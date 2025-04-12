import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

function Chatnav({user,isNav}) {
  return (
    <div className={`flex gap-4  items-center ${isNav ? "p-2":"p-0"}`}>
      <Avatar>
          <AvatarImage src={user?.profileImage} alt={`${user?.username[0]+user?.username[user?.username.length-1]}`} />
          <AvatarFallback>{user?.username[0]}</AvatarFallback>
      </Avatar>
      <div className='font-semibold'>{user?.username}</div>
    </div>
  )
}

export default Chatnav