import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Editor from './pages/Editor'

function App() {
  const nav = [
    { name: 'Home', to: '/' },
    { name: 'Editor', to: '/editor' },
  ]

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-icon">
              <img
                src="/logo.png"
                alt="Wignn Studio Logo"
                style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              />
            </span>
            wignn Studio
          </h1>
        </div>
        <nav className="header-nav">
          {nav.map((item) => (
            <Link key={item.name} to={item.to} className="header-link">
              {item.name}
            </Link>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
