import React from 'react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-8 bg-white rounded shadow">
        <h1 className="text-xl font-bold mb-4">Sign in</h1>
        <a href="/api/auth/signin/discord" className="px-4 py-2 bg-indigo-600 text-white rounded">Sign in with Discord</a>
      </div>
    </div>
  )
}
