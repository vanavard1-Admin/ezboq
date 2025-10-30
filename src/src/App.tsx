import "./styles/globals.css";
import React, { useState } from "react";
import AppWithAuth from "./AppWithAuth";
import './utils/apiTest';  // Load API test utilities for debugging
import './utils/createAffiliateCode';  // Load affiliate code utilities
import { ScrollbarDebug } from "./components/ScrollbarDebug";
import { CacheDebugger } from "./components/CacheDebugger";
import { CacheWarmupIndicator } from "./components/CacheWarmupIndicator";
import { Button } from "./components/ui/button";

function App() {
  const [debugMode, setDebugMode] = useState(false);
  
  // Toggle debug mode with Ctrl+Shift+D
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDebugMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  if (debugMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="sticky top-0 z-50 bg-yellow-100 dark:bg-yellow-900 p-2 border-b-2 border-yellow-400">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <span className="font-bold">Debug Mode</span>
            </div>
            <Button onClick={() => setDebugMode(false)} variant="outline" size="sm">
              Exit Debug
            </Button>
          </div>
        </div>
        <ScrollbarDebug />
        <CacheDebugger />
      </div>
    );
  }
  
  return (
    <>
      <AppWithAuth />
      <CacheDebugger />
      {/* <CacheWarmupIndicator /> */}
      {/* ❌ DISABLED - CacheWarmupIndicator causes infinite loop and page flicker */}
    </>
  );
}

export default App;
