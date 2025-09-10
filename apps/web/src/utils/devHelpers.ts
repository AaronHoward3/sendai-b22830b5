// Development helper to reset trial status
// Add this to your browser console or create a simple admin page

function resetTrialStatus() {
  // Clear localStorage
  localStorage.removeItem('freemium_trial_used');
  
  // Clear any cached trial data
  if (window.trialCache) {
    window.trialCache.clear();
  }
  
  console.log('✅ Trial status reset! Refresh the page to test.');
  return true;
}

// Usage: resetTrialStatus()
console.log('🔧 Development helper loaded. Run resetTrialStatus() to clear trial status.');
