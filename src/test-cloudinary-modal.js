// Test script for Cloudinary modal integration
import { uploadImage } from './lib/cloudinary';

/**
 * This script tests the Cloudinary modal integration
 * It simulates the behavior of the AddImageModal component
 * Run with: node src/test-cloudinary-modal.js
 */

// Mock file for testing
class MockFile {
  constructor(name, type, content) {
    this.name = name;
    this.type = type;
    this.content = content;
    this.size = content.length;
  }

  // Minimal implementation to make it work with FormData
  slice() {
    return this.content;
  }

  stream() {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(this.content));
        controller.close();
      }
    });
  }
}

// Test modal integration
async function testModalIntegration() {
  console.log('🔍 Testing Cloudinary Modal Integration...');
  
  try {
    // Check environment variables
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    console.log('Environment variables check:');
    console.log(`- Cloud Name: ${cloudName ? '✅ Set' : '❌ Missing'}`);
    console.log(`- API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`- Upload Preset: ${uploadPreset ? '✅ Set' : '❌ Missing'}`);
    
    // Create a test file
    const testFile = new MockFile(
      'test-modal-image.jpg',
      'image/jpeg',
      'This is a mock image content for testing the modal integration'
    );
    
    console.log('\nTest file created:', {
      name: testFile.name,
      type: testFile.type,
      size: testFile.size
    });
    
    // Test the uploadImage function with debugging
    console.log('\nAttempting to upload image...');
    
    // Add debugging to track FormData creation
    const originalFormData = window.FormData;
    let formDataEntries = [];
    
    window.FormData = class extends originalFormData {
      append(key, value) {
        console.log(`FormData.append: ${key} = ${value instanceof File ? value.name : value}`);
        formDataEntries.push({ key, value: value instanceof File ? value.name : value });
        super.append(key, value);
      }
    };
    
    // Add debugging to track fetch calls
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      console.log(`Fetch called with URL: ${url}`);
      console.log('Fetch options:', JSON.stringify(options, (key, value) => {
        if (key === 'body' && value instanceof FormData) return '[FormData]';
        return value;
      }));
      
      try {
        const response = await originalFetch(url, options);
        console.log(`Fetch response status: ${response.status}`);
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };
    
    try {
      const result = await uploadImage(testFile, {
        folder: 'test-modal',
        tags: ['test']
      });
      
      console.log('\n✅ Upload successful!');
      console.log('Result:', result);
    } catch (error) {
      console.error('\n❌ Upload failed!');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
    
    // Restore original functions
    window.FormData = originalFormData;
    window.fetch = originalFetch;
    
    console.log('\nFormData entries:', formDataEntries);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testModalIntegration().catch(console.error);