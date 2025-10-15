// test-trial-status.js
import axios from "axios";

async function testTrialStatus() {
  console.log('🧪 Testing trial status endpoint...');
  
  try {
    // Test the new trial-status endpoint
    const response = await axios.get('http://localhost:3001/api/generate/trial-status', {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📊 Response data:', response.data);
    
    if (response.status === 200) {
      console.log('✅ Trial status endpoint working correctly - trial available');
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
      console.log('📊 Error data:', error.response.data);
    } else {
      console.error('❌ Error testing trial status:', error.message);
    }
  }
}

// Run the test
testTrialStatus();
