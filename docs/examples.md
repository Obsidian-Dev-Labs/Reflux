# Examples

Complete working examples for common use cases.

## Basic Examples

### Hello World Plugin

The simplest possible plugin:

```javascript
await api.addPlugin({
  name: "com.example.hello",
  sites: ["*"],
  function: `
    /* @browser */
    console.log('Hello from Reflux!');
    alert('Plugin is running on: ' + url);
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.example.hello");
```

### Page Title Modifier

Change the title of specific pages:

```javascript
await api.addPlugin({
  name: "com.example.title-modifier",
  sites: ["example.com"],
  function: `
    if (body.includes('<title>')) {
      return body.replace('<title>', '<title>[MODIFIED] ');
    }
    return body;
  `
});

await api.enablePlugin("com.example.title-modifier");
```

### Visual Indicator

Add a visual indicator to show Reflux is active:

```javascript
await api.addPlugin({
  name: "com.example.indicator",
  sites: ["*"],
  function: `
    /* @browser */
    const indicator = document.createElement('div');
    indicator.textContent = '🚀 Reflux Active';
    indicator.style.cssText = \`
      position: fixed; bottom: 10px; right: 10px;
      background: #0066cc; color: white;
      padding: 8px 12px; border-radius: 5px;
      font-family: monospace; font-size: 12px;
      z-index: 999999; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    \`;
    document.body.appendChild(indicator);
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.example.indicator");
```

## Styling Examples

### Dark Mode Injector

Add dark mode to any website:

```javascript
await api.addPlugin({
  name: "com.style.dark-mode",
  sites: ["*"],
  function: `
    if (body.includes('</head>')) {
      const darkMode = \`
        <style>
          * {
            background-color: #1a1a1a !important;
            color: #e0e0e0 !important;
            border-color: #444 !important;
          }
          a { color: #4a9eff !important; }
          img, video { filter: brightness(0.8) contrast(1.2); }
          input, textarea, select {
            background-color: #2d2d2d !important;
            color: #e0e0e0 !important;
          }
        </style>
      \`;
      return body.replace('</head>', darkMode + '</head>');
    }
    return body;
  `
});

await api.enablePlugin("com.style.dark-mode");
```

### Custom Theme

Apply a custom color scheme:

```javascript
await api.addPlugin({
  name: "com.style.custom-theme",
  sites: ["example.com"],
  function: `
    if (body.includes('</head>')) {
      const theme = \`
        <style>
          :root {
            --primary: #667eea;
            --secondary: #764ba2;
            --accent: #f093fb;
          }
          
          body {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            font-family: 'Segoe UI', Tahoma, sans-serif;
          }
          
          a { color: var(--accent) !important; }
          button {
            background: var(--primary) !important;
            color: white !important;
            border: none !important;
            border-radius: 5px !important;
            padding: 8px 16px !important;
          }
        </style>
      \`;
      return body.replace('</head>', theme + '</head>');
    }
    return body;
  `
});

await api.enablePlugin("com.style.custom-theme");
```

### Font Replacer

Change fonts across a website:

```javascript
await api.addPlugin({
  name: "com.style.font-replacer",
  sites: ["*"],
  function: `
    if (body.includes('</head>')) {
      const fontCSS = \`
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
        </style>
      \`;
      return body.replace('</head>', fontCSS + '</head>');
    }
    return body;
  `
});

await api.enablePlugin("com.style.font-replacer");
```

## Content Modification Examples

### Ad Blocker

Remove advertisements:

```javascript
await api.addPlugin({
  name: "com.filter.ad-blocker",
  sites: ["*"],
  function: `
    // Server-side: Remove ad elements from HTML
    const adPatterns = [
      /<div[^>]*class="[^"]*advertisement[^"]*"[^>]*>.*?<\\/div>/gs,
      /<div[^>]*id="[^"]*ad-[^"]*"[^>]*>.*?<\\/div>/gs,
      /<iframe[^>]*src="[^"]*ads[^"]*"[^>]*>.*?<\\/iframe>/gs
    ];
    
    adPatterns.forEach(pattern => {
      body = body.replace(pattern, '');
    });
    
    /* @browser */
    // Browser-side: Remove dynamically loaded ads
    const adSelectors = [
      '[class*="advertisement"]',
      '[class*="ad-"]',
      '[id*="ad-"]',
      '[class*="sponsored"]'
    ];
    
    function removeAds() {
      adSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.remove();
        });
      });
    }
    
    // Remove on load
    removeAds();
    
    // Watch for new ads
    const observer = new MutationObserver(removeAds);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.filter.ad-blocker");
```

### Text Replacer

Replace specific text across pages:

```javascript
await api.addPlugin({
  name: "com.filter.text-replacer",
  sites: ["example.com"],
  function: `
    // Server-side replacements
    const replacements = {
      'old word': 'new word',
      'Company Name': 'My Company',
      'product': 'service'
    };
    
    Object.entries(replacements).forEach(([old, newText]) => {
      const regex = new RegExp(old, 'gi');
      body = body.replace(regex, newText);
    });
    
    return body;
  `
});

await api.enablePlugin("com.filter.text-replacer");
```

### Link Modifier

Modify all links on a page:

```javascript
await api.addPlugin({
  name: "com.filter.link-modifier",
  sites: ["*"],
  function: `
    /* @browser */
    document.querySelectorAll('a').forEach(link => {
      // Open external links in new tab
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
      
      // Add icon to external links
      if (link.hostname !== window.location.hostname) {
        link.innerHTML += ' 🔗';
      }
      
      // Highlight links
      link.style.textDecoration = 'underline';
      link.style.color = '#0066cc';
    });
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.filter.link-modifier");
```

## UI Enhancement Examples

### Custom Toolbar

Add a custom toolbar to pages:

```javascript
await api.addPlugin({
  name: "com.ui.toolbar",
  sites: ["*"],
  function: `
    /* @browser */
    const toolbar = document.createElement('div');
    toolbar.innerHTML = \`
      <div style="
        position: fixed; bottom: 0; left: 0; right: 0;
        background: linear-gradient(to right, #667eea, #764ba2);
        padding: 10px; display: flex; gap: 10px;
        justify-content: center; align-items: center;
        z-index: 999999; box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
      ">
        <button onclick="window.scrollTo(0,0)" style="
          background: white; border: none; padding: 8px 16px;
          border-radius: 5px; cursor: pointer; font-weight: bold;
        ">↑ Top</button>
        
        <button onclick="window.scrollTo(0,document.body.scrollHeight)" style="
          background: white; border: none; padding: 8px 16px;
          border-radius: 5px; cursor: pointer; font-weight: bold;
        ">↓ Bottom</button>
        
        <button onclick="window.print()" style="
          background: white; border: none; padding: 8px 16px;
          border-radius: 5px; cursor: pointer; font-weight: bold;
        ">🖨 Print</button>
      </div>
    \`;
    
    document.body.appendChild(toolbar);
    document.body.style.marginBottom = '50px';
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.ui.toolbar");
```

### Image Zoom

Add click-to-zoom functionality to images:

```javascript
await api.addPlugin({
  name: "com.ui.image-zoom",
  sites: ["*"],
  function: `
    /* @browser */
    // Add zoom overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = \`
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9); display: none;
      justify-content: center; align-items: center;
      z-index: 999999; cursor: pointer;
    \`;
    
    const zoomedImg = document.createElement('img');
    zoomedImg.style.cssText = \`
      max-width: 90%; max-height: 90%;
      object-fit: contain;
    \`;
    
    overlay.appendChild(zoomedImg);
    document.body.appendChild(overlay);
    
    // Add click handlers to images
    document.querySelectorAll('img').forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomedImg.src = img.src;
        overlay.style.display = 'flex';
      });
    });
    
    // Close on click
    overlay.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.ui.image-zoom");
```

### Reading Mode

Create a distraction-free reading mode:

```javascript
await api.addPlugin({
  name: "com.ui.reading-mode",
  sites: ["*"],
  function: `
    /* @browser */
    // Add toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '📖 Reading Mode';
    toggleBtn.style.cssText = \`
      position: fixed; top: 10px; right: 10px;
      background: #0066cc; color: white;
      border: none; padding: 10px 15px;
      border-radius: 5px; cursor: pointer;
      z-index: 999999; font-weight: bold;
    \`;
    
    let readingMode = false;
    
    toggleBtn.addEventListener('click', () => {
      readingMode = !readingMode;
      
      if (readingMode) {
        // Enable reading mode
        document.body.style.maxWidth = '800px';
        document.body.style.margin = '0 auto';
        document.body.style.padding = '20px';
        document.body.style.background = '#f5f5f5';
        document.body.style.fontSize = '18px';
        document.body.style.lineHeight = '1.6';
        
        // Hide distractions
        document.querySelectorAll('aside, nav, header, footer').forEach(el => {
          el.style.display = 'none';
        });
        
        toggleBtn.textContent = '📖 Exit Reading Mode';
      } else {
        // Disable reading mode
        document.body.style.maxWidth = '';
        document.body.style.margin = '';
        document.body.style.padding = '';
        document.body.style.background = '';
        document.body.style.fontSize = '';
        document.body.style.lineHeight = '';
        
        document.querySelectorAll('aside, nav, header, footer').forEach(el => {
          el.style.display = '';
        });
        
        toggleBtn.textContent = '📖 Reading Mode';
      }
    });
    
    document.body.appendChild(toggleBtn);
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.ui.reading-mode");
```

## Analytics & Monitoring Examples

### Page Performance Monitor

Track page load performance:

```javascript
await api.addPlugin({
  name: "com.analytics.performance",
  sites: ["*"],
  function: `
    /* @browser */
    window.addEventListener('load', () => {
      const perfData = performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      
      console.log('📊 Performance Metrics:', {
        'Page Load': pageLoadTime + 'ms',
        'Network': connectTime + 'ms',
        'Render': renderTime + 'ms',
        'DOM Elements': document.querySelectorAll('*').length
      });
      
      // Show notification
      const notice = document.createElement('div');
      notice.textContent = \`⚡ Loaded in \${(pageLoadTime / 1000).toFixed(2)}s\`;
      notice.style.cssText = \`
        position: fixed; top: 10px; left: 10px;
        background: #28a745; color: white;
        padding: 8px 12px; border-radius: 5px;
        z-index: 999999; font-size: 12px;
      \`;
      document.body.appendChild(notice);
      
      setTimeout(() => notice.remove(), 5000);
    });
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.analytics.performance");
```

### Click Tracker

Track user clicks:

```javascript
await api.addPlugin({
  name: "com.analytics.click-tracker",
  sites: ["example.com"],
  function: `
    /* @browser */
    let clickCount = 0;
    
    document.addEventListener('click', (e) => {
      clickCount++;
      const target = e.target;
      
      console.log('🖱 Click #' + clickCount, {
        'Element': target.tagName,
        'Class': target.className,
        'ID': target.id,
        'Text': target.textContent?.substring(0, 50)
      });
    });
    
    // Show click counter
    const counter = document.createElement('div');
    counter.style.cssText = \`
      position: fixed; top: 10px; left: 10px;
      background: #0066cc; color: white;
      padding: 8px 12px; border-radius: 5px;
      z-index: 999999; font-family: monospace;
    \`;
    
    setInterval(() => {
      counter.textContent = '🖱 Clicks: ' + clickCount;
    }, 100);
    
    document.body.appendChild(counter);
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.analytics.click-tracker");
```

## Complete Application Example

### Full-Featured Site Enhancer

A comprehensive plugin combining multiple features:

```javascript
await api.addPlugin({
  name: "com.example.site-enhancer",
  sites: ["example.com"],
  function: `
    // Server-side: Inject custom styles and scripts
    if (body.includes('</head>')) {
      const enhancements = \`
        <style>
          /* Custom theme */
          body {
            font-family: 'Inter', sans-serif !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          /* Smooth animations */
          * { transition: all 0.3s ease; }
          
          /* Enhanced links */
          a {
            color: #4a9eff !important;
            text-decoration: none !important;
          }
          a:hover {
            text-decoration: underline !important;
          }
          
          /* Card styling */
          .enhanced-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin: 20px 0;
          }
        </style>
      \`;
      
      body = body.replace('</head>', enhancements + '</head>');
    }
    
    /* @browser */
    console.log('🚀 Site Enhancer Active');
    
    // Wait for DOM
    function init() {
      // 1. Wrap main content
      const main = document.querySelector('main') || document.body;
      if (!main.classList.contains('enhanced')) {
        main.classList.add('enhanced-card');
        main.classList.add('enhanced');
      }
      
      // 2. Add navigation shortcuts
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'h') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (e.ctrlKey && e.key === 'b') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      });
      
      // 3. Enhanced images
      document.querySelectorAll('img').forEach(img => {
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      });
      
      // 4. Add toolbar
      const toolbar = document.createElement('div');
      toolbar.innerHTML = \`
        <div style="
          position: fixed; bottom: 20px; right: 20px;
          background: white; padding: 15px;
          border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 999999;
        ">
          <h4 style="margin: 0 0 10px 0;">🚀 Reflux Tools</h4>
          <button id="darkModeBtn" style="
            display: block; width: 100%; margin: 5px 0;
            padding: 8px; border: none; border-radius: 5px;
            background: #667eea; color: white; cursor: pointer;
          ">Toggle Dark Mode</button>
          <button id="printBtn" style="
            display: block; width: 100%; margin: 5px 0;
            padding: 8px; border: none; border-radius: 5px;
            background: #764ba2; color: white; cursor: pointer;
          ">Print Page</button>
        </div>
      \`;
      document.body.appendChild(toolbar);
      
      // 5. Dark mode toggle
      let darkMode = false;
      document.getElementById('darkModeBtn').addEventListener('click', () => {
        darkMode = !darkMode;
        if (darkMode) {
          document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        } else {
          document.body.style.filter = '';
        }
      });
      
      // 6. Print button
      document.getElementById('printBtn').addEventListener('click', () => {
        window.print();
      });
      
      // 7. Performance indicator
      window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(\`⚡ Page loaded in \${(loadTime/1000).toFixed(2)}s\`);
      });
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    /* @/browser */
    
    return body;
  `
});

await api.enablePlugin("com.example.site-enhancer");
```

## Next Steps

- [Plugin System](./plugin-system.md) - Deep dive into plugin architecture
- [API Reference](./api-reference.md) - Complete API documentation
- [Getting Started](./getting-started.md) - Setup guide
