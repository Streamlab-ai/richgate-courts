'use client'
import { useState } from 'react'

interface Props { qrDataUrl: string; token: string }

export default function QrDisplay({ qrDataUrl, token }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="mb-3">
      <button
        onClick={() => setShow(s => !s)}
        className="text-xs text-zinc-500 underline-offset-2 hover:underline"
      >
        {show ? 'Hide QR code' : 'Show QR code'}
      </button>
      {show && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <img src={qrDataUrl} alt="Check-in QR code" className="w-40 h-40 rounded-lg" />
          <p className="text-[10px] font-mono text-zinc-400 break-all text-center max-w-[160px]">{token}</p>
          <p className="text-xs text-zinc-500">Show this to security for check-in</p>
        </div>
      )}
    </div>
  )
}
