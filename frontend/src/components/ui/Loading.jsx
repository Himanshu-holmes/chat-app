import React from 'react'
import { Spinner } from './spinner'

function Loading({message}) {
  return (
      <div className='fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center'>
        <div>

   <Spinner show={true} />
    <p className='text-center mt-4 text-white font-semibold'>{message}</p>
        </div>
    </div>
  )
}

export default Loading