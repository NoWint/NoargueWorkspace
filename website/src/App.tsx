import { RouterProvider } from 'react-router-dom'
import { Providers } from './app/providers'
import { ErrorBoundary } from './app/ErrorBoundary'
import { router } from './app/router'

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </ErrorBoundary>
  )
}
