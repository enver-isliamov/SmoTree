import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Get the key from environment variables (Vite specific)
const PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY;

const root = ReactDOM.createRoot(rootElement);

if (!PUBLISHABLE_KEY) {
  // Render a friendly error UI if the key is missing
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY. App cannot start.");
  root.render(
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#09090b', 
      color: '#e4e4e7',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid #27272a', borderRadius: '1rem', backgroundColor: '#18181b' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Configuration Error</h2>
        <p><code>VITE_CLERK_PUBLISHABLE_KEY</code> is missing.</p>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#a1a1aa' }}>
          Check your <code>.env</code> file and restart the server.
        </p>
      </div>
    </div>
  );
} else {
  // Correctly wrap the App with ClerkProvider for Vite/React
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}
