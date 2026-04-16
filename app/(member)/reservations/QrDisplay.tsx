'use client'

import { useState } from 'react'

export default function QrDisplay({ token }: { token: string }) {
  const [show, setShow] = useState(false)

  return (
    <div className="mb-3">
      <button
        onClick={() => setShow(!show)}
        className="text-xs text-blue-600 hover:underline"
      >
        {show ? 'Hide QR' : 'Show QR code'}
      </button>
      {show && (
        <div className="mt-2 p-3 bg-zinc-50 rounded-xl flex flex-col items-center gap-2">
          {/* QR visual simulation — token displayed as monospace code */}
          <div className="grid grid-cols-8 gap-0.5">
            {Array.from(token).map((char, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-sm"
                style={{ backgroundColor: parseInt(char, 36) % 2 === 0 ? '#000' : '#fff', border: '1px solid #e5e5e5' }}
              />
            ))}
          </div>
          <p className="font-mono text-sm font-medium tracking-widest">{token}</p>
          <p className="text-xs text-zinc-400">Show this to staff for check-in</p>
        </div>
      )}
    </div>
  )
}
