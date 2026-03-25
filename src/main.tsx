import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import './index.css'
import App from './app/App.tsx'
import { PlanPage } from './pages/PlanPage.tsx'
import { EmbedPage } from './app/EmbedPage.tsx'
import { TutorialLayout } from './pages/tutorials/TutorialLayout.tsx'
import { TutorialsHub } from './pages/tutorials/TutorialsHub.tsx'
import { GettingStarted } from './pages/tutorials/GettingStarted.tsx'
import { VisualElements } from './pages/tutorials/features/VisualElements.tsx'
import { Tracing } from './pages/tutorials/features/Tracing.tsx'
import { InteractiveMode } from './pages/tutorials/features/InteractiveMode.tsx'
import { SelectionSort } from './pages/tutorials/algorithms/SelectionSort.tsx'
import { BubbleSort } from './pages/tutorials/algorithms/BubbleSort.tsx'
import { TrappingRain } from './pages/tutorials/algorithms/TrappingRain.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/embed" element={<EmbedPage />} />
          <Route path="/tutorials" element={<TutorialLayout />}>
            <Route index element={<TutorialsHub />} />
            <Route path="getting-started" element={<GettingStarted />} />
            <Route path="visual-elements" element={<VisualElements />} />
            <Route path="tracing" element={<Tracing />} />
            <Route path="interactive-mode" element={<InteractiveMode />} />
            <Route path="algorithms/selection-sort" element={<SelectionSort />} />
            <Route path="algorithms/bubble-sort" element={<BubbleSort />} />
            <Route path="algorithms/trapping-rain" element={<TrappingRain />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
