import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles.css'
import './dashboard.css'
import './commands.css'
import './premium.css'
import './type-motion.css'
import './pointer-effects.css'
import './navigation-motion.css'
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 }, mutations: { retry: 0 } } })
createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={client}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></StrictMode>)
