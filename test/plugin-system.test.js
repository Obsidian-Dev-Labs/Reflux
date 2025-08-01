import { RefluxAPI, RefluxTransport } from '../src/index.js';

// Test the plugin system
async function testPluginSystem() {
  console.log('Testing Reflux Plugin System...');
  
  // Create message channel for communication
  const channel = new MessageChannel();
  
  // Create a mock transport for testing
  const transport = new RefluxTransport({
    transport: 'mock-transport',
    controlPort: channel.port1
  });
  
  // Initialize API
  const api = new RefluxAPI(channel.port2);
  
  try {
    // Test 1: Add a simple plugin
    console.log('Test 1: Adding simple plugin...');
    await api.addPlugin({
      function: `console.log('Test plugin executed on:', url);`,
      name: 'com.test.simple',
      sites: ['*']
    });
    console.log('✓ Simple plugin added successfully');
    
    // Test 2: Add site-specific plugin
    console.log('Test 2: Adding site-specific plugin...');
    await api.addPlugin({
      function: `
        if (body.includes('<title>')) {
          return body.replace('<title>', '<title>[TEST] ');
        }
        return body;
      `,
      name: 'com.test.title-modifier',
      sites: ['example.com']
    });
    console.log('✓ Site-specific plugin added successfully');
    
    // Test 3: List plugins
    console.log('Test 3: Listing plugins...');
    const plugins = await api.listPlugins();
    console.log('✓ Found plugins:', plugins);
    
    // Test 4: Remove plugin
    console.log('Test 4: Removing plugin...');
    await api.removePlugin('com.test.simple');
    console.log('✓ Plugin removed successfully');
    
    // Test 5: List plugins after removal
    console.log('Test 5: Listing plugins after removal...');
    const remainingPlugins = await api.listPlugins();
    console.log('✓ Remaining plugins:', remainingPlugins);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPluginSystem();
}

export { testPluginSystem };
