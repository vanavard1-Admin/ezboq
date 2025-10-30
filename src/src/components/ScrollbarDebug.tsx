import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';

export function ScrollbarDebug() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    containerWidth: 0,
    contentWidth: 0,
    hasOverflow: false
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && contentRef.current) {
        const container = containerRef.current;
        const content = contentRef.current;
        setDimensions({
          containerWidth: container.offsetWidth,
          contentWidth: content.scrollWidth,
          hasOverflow: content.scrollWidth > container.offsetWidth
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-950">
      <h1 className="text-2xl font-bold">🔍 Scrollbar Debug Tool</h1>

      {/* Test 1: Basic Scrollbar */}
      <Card className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">Test 1: Basic Scrollbar (scrollbar-visible class)</h2>
        <div 
          className="w-full overflow-x-scroll scrollbar-visible border-2 border-blue-500"
          style={{ maxWidth: '400px' }}
        >
          <div className="flex gap-2 p-2" style={{ width: '800px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Button key={i} variant="outline" className="shrink-0">
                Button {i}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          ✅ Should show BLUE scrollbar (width: 800px in 400px container)
        </p>
      </Card>

      {/* Test 2: Min-w-max */}
      <Card className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">Test 2: Min-w-max Pattern</h2>
        <div 
          className="w-full overflow-x-scroll scrollbar-visible border-2 border-green-500"
          style={{ maxWidth: '400px' }}
        >
          <div className="flex gap-2 p-2 min-w-max">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Button key={i} variant="outline" className="shrink-0 whitespace-nowrap">
                Long Button Text {i}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          ✅ Should show GREEN scrollbar (min-w-max forces wide content)
        </p>
      </Card>

      {/* Test 3: Actual Template Structure */}
      <Card className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">Test 3: Template Selector Structure</h2>
        <div 
          ref={containerRef}
          className="flex-shrink-0 border-2 border-purple-500 bg-gray-50/50 dark:bg-gray-900/50 overflow-x-scroll scrollbar-visible pb-1"
          style={{ maxWidth: '500px' }}
        >
          <div ref={contentRef} className="flex gap-1 p-2 min-w-max">
            {['ทั้งหมด', 'บ้านเดี่ยว', 'ห้องต่างๆ', 'รีโนเวท/ต่อเติม', 'งานบิ้วอิน', 'งานภูมิทัศน์', 'งานเฉพาะทาง', 'คำนวณจากงบประมาณ', 'คำนวณจากพื้นที่'].map((label, i) => (
              <Button 
                key={i}
                variant={i === 0 ? 'default' : 'outline'}
                className="shrink-0 whitespace-nowrap px-3 py-2"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">
            📏 Container Width: <span className="font-mono font-bold text-purple-600">{dimensions.containerWidth}px</span>
          </p>
          <p className="text-muted-foreground">
            📏 Content Width: <span className="font-mono font-bold text-purple-600">{dimensions.contentWidth}px</span>
          </p>
          <p className="text-muted-foreground">
            {dimensions.hasOverflow ? (
              <span className="text-green-600 font-bold">✅ HAS OVERFLOW - Should show scrollbar!</span>
            ) : (
              <span className="text-red-600 font-bold">❌ NO OVERFLOW - Content fits in container</span>
            )}
          </p>
        </div>
      </Card>

      {/* Test 4: Default Scrollbar */}
      <Card className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">Test 4: Default Browser Scrollbar (no custom styles)</h2>
        <div 
          className="w-full overflow-x-scroll border-2 border-orange-500"
          style={{ maxWidth: '400px' }}
        >
          <div className="flex gap-2 p-2" style={{ width: '800px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Button key={i} variant="outline" className="shrink-0">
                Button {i}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          ✅ Should show ORANGE border + default browser scrollbar
        </p>
      </Card>

      {/* CSS Check */}
      <Card className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">🎨 CSS Class Check</h2>
        <div className="space-y-2 text-sm font-mono">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
            <code>.scrollbar-visible</code> - Custom scrollbar class
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
            <code>overflow-x-auto</code> - Enable horizontal scroll
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
            <code>min-w-max</code> - Force content width
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300">
        <h2 className="text-lg font-semibold mb-2">📋 Debug Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Test 1 & 2 should show colored scrollbars at the bottom</li>
          <li>Test 3 mimics the actual Template Selector structure</li>
          <li>Test 4 uses default browser scrollbar (should always work)</li>
          <li>If Test 4 works but Test 1-3 don't → CSS problem</li>
          <li>If nothing shows scrollbar → Overflow not happening</li>
          <li>Check the dimensions in Test 3 to see actual sizes</li>
        </ol>
      </Card>
    </div>
  );
}
