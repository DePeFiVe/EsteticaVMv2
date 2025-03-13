// Simple Cloudinary configuration test script (CommonJS version)
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET,
});

// Helper function to log results
const logResult = (test, success, message, data) => {
  console.log(`\n${success ? '✅' : '❌'} ${test}`);
  console.log(`  ${message}`);
  if (data) {
    console.log('  Data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
};

// Test Cloudinary configuration
async function testCloudinaryConfig() {
  try {
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.VITE_CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Missing Cloudinary credentials in .env file');
    }
    
    logResult(
      'Cloudinary Configuration', 
      true, 
      'Cloudinary environment variables are set',
      { cloudName, apiKey: apiKey ? '✓ Set' : '✗ Missing', apiSecret: apiSecret ? '✓ Set' : '✗ Missing', uploadPreset }
    );

    // Test Cloudinary connection by getting account info
    const accountResult = await cloudinary.api.ping();
    
    logResult(
      'Cloudinary Connection', 
      true, 
      'Successfully connected to Cloudinary API',
      accountResult
    );
    
    return true;
  } catch (err) {
    logResult(
      'Cloudinary Configuration', 
      false, 
      `Failed to verify Cloudinary configuration: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}

// Run the test
console.log('🔍 Testing Cloudinary Configuration...');
testCloudinaryConfig()
  .then(success => {
    if (success) {
      console.log('\n✅ Cloudinary configuration is valid and working!');
    } else {
      console.log('\n❌ Cloudinary configuration test failed. Please check the errors above.');
    }
  })
  .catch(err => {
    console.error('Error running test:', err);
  });