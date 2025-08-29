// // background.js


// async function loadProfileFromJSON() {
//   try {
//     const response = await fetch(chrome.runtime.getURL('profiles.json'));
//     if (!response.ok) {
//       throw new Error('profiles.json not found');
//     }
    
//     const profileData = await response.json();
//     const profile = {
//       firstName: profileData.FirstName || "",
//       lastName: profileData.LastName || "",
//       email: profileData.Email || "",
//       phone: profileData.Phone || "",
//       salary: profileData.Salary || "",
//       location: profileData.Location || "",
//       gender: profileData.Gender || "",
//       linkedin: profileData.Linkedin || "",
//       workAuth: profileData.WorkAuth || "No",
//       jobSource: profileData.JobSource || []
//     };
    
//     return profile;
//   } catch (error) {
//     console.log('Error loading profiles.json:', error);
//     // Return empty profile if file doesn't exist
//     return {
//       firstName: "",
//       lastName: "",
//       email: "",
//       phone: "",
//       salary: "",
//       location: "",
//       gender: "",
//       linkedin: "",
//       workAuth: "No",
//       jobSource: []
//     };
//   }
// }

// // Load default profile on installation and update
// chrome.runtime.onInstalled.addListener(async () => {
//   // Set default settings
//   chrome.storage.local.set({
//     autoFill: true,
//     settings: {
//       highlightFields: true,
//       showNotifications: true,
//       autoUpload: false,
//       watchProfileJSON: true  // New setting to watch for profile.json changes
//     }
//   });
  
//   // Load profile from profiles.json
//   const profile = await loadProfileFromJSON();
//   chrome.storage.local.set({ profile });
// });

// // Listen for messages from content script and popup
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "fill-job" || request.action === "fill-signup") {
//     chrome.scripting.executeScript({
//       target: { tabId: sender.tab.id },
//       files: ["scripts/content.js"]
//     }, () => {
//       if (chrome.runtime.lastError) {
//         sendResponse({ success: false, error: chrome.runtime.lastError.message });
//       } else {
//         chrome.tabs.sendMessage(sender.tab.id, request);
//         sendResponse({ success: true });
//       }
//     });
//     return true; // Keep the message channel open for async response
//   }
  
//   // Handle resume upload to server
//   if (request.action === "uploadResumeToServer") {
//     uploadResumeToServer(request.resumeData, request.profileData)
//       .then(response => {
//         sendResponse({ success: true, message: response });
//       })
//       .catch(error => {
//         sendResponse({ success: false, message: error.toString() });
//       });
//     return true;
//   }
  
//   // Handle export data request
//   if (request.action === "exportData") {
//     exportUserData()
//       .then(() => {
//         sendResponse({ success: true, message: "Data exported successfully" });
//       })
//       .catch(error => {
//         sendResponse({ success: false, message: error.toString() });
//       });
//     return true;
//   }
  
//   // Handle import data request
//   if (request.action === "importData") {
//     importUserData(request.data)
//       .then(() => {
//         sendResponse({ success: true, message: "Data imported successfully" });
//       })
//       .catch(error => {
//         sendResponse({ success: false, message: error.toString() });
//       });
//     return true;
//   }
  
//   // Handle reload profile request
//   if (request.action === "reloadProfileJSON") {
//     loadProfileFromJSON()
//       .then(profile => {
//         chrome.storage.local.set({ profile }, () => {
//           sendResponse({ success: true, message: "Profile reloaded from JSON" });
//         });
//       })
//       .catch(error => {
//         sendResponse({ success: false, message: error.toString() });
//       });
//     return true;
//   }
// });

// // Function to upload resume to the server
// async function uploadResumeToServer(resumeData, profileData) {
//   try {
//     // Convert base64 to blob
//     const base64Response = await fetch(resumeData.content);
//     const blob = await base64Response.blob();
    
//     // Create form data
//     const formData = new FormData();
//     formData.append("fileUpload", blob, resumeData.name);
    
//     // Add profile data
//     if (profileData) {
//       formData.append("first_name", profileData.firstName || "");
//       formData.append("last_name", profileData.lastName || "");
//       formData.append("city", profileData.location || "");
//     }
    
//     // Send to server
//     const response = await fetch("http://localhost:4567/upload", {
//       method: "POST",
//       body: formData
//     });
    
//     if (!response.ok) {
//       throw new Error(`Server returned ${response.status}: ${response.statusText}`);
//     }
    
//     return await response.text();
//   } catch (error) {
//     console.error("Error uploading resume to server:", error);
//     throw error;
//   }
// }

// // Function to export user data
// async function exportUserData() {
//   return new Promise((resolve, reject) => {
//     chrome.storage.local.get(null, (data) => {
//       try {
//         const dataStr = JSON.stringify(data, null, 2);
//         const blob = new Blob([dataStr], { type: 'application/json' });
//         const url = URL.createObjectURL(blob);
        
//         // Use downloads API to save the file
//         chrome.downloads.download({
//           url: url,
//           filename: 'job-helper-backup.json',
//           saveAs: true,
//           conflictAction: 'uniquify'
//         }, (downloadId) => {
//           if (chrome.runtime.lastError) {
//             reject(chrome.runtime.lastError);
//           } else {
//             // Revoke the object URL after a short delay
//             setTimeout(() => URL.revokeObjectURL(url), 1000);
//             resolve();
//           }
//         });
//       } catch (error) {
//         reject(error);
//       }
//     });
//   });
// }

// // Function to import user data
// async function importUserData(data) {
//   return new Promise((resolve, reject) => {
//     try {
//       // Validate the data structure
//       if (!data.profile || typeof data.profile !== 'object') {
//         throw new Error("Invalid data format: profile missing");
//       }
      
//       // Set the imported data
//       chrome.storage.local.set(data, () => {
//         if (chrome.runtime.lastError) {
//           reject(chrome.runtime.lastError);
//         } else {
//           resolve();
//         }
//       });
//     } catch (error) {
//       reject(error);
//     }
//   });
// }

// // Watch for changes to profiles.json (simulated with periodic checking)
// let lastProfileCheck = 0;
// const PROFILE_CHECK_INTERVAL = 5000; // Check every 5 seconds

// // Function to check if profiles.json has been updated
// async function checkProfileJSONUpdate() {
//   try {
//     const response = await fetch(chrome.runtime.getURL('profiles.json') + '?t=' + Date.now());
//     if (!response.ok) return;
    
//     const lastModified = new Date(response.headers.get('last-modified') || 0).getTime();
    
//     // If file has been modified since last check
//     if (lastModified > lastProfileCheck) {
//       lastProfileCheck = lastModified;
      
//       // Check if user wants auto-reload
//       chrome.storage.local.get(['settings'], async ({ settings }) => {
//         if (settings.watchProfileJSON) {
//           const profile = await loadProfileFromJSON();
//           chrome.storage.local.set({ profile });
          
//           // Notify popup if it's open
//           chrome.runtime.sendMessage({
//             action: "profileJSONUpdated",
//             profile: profile
//           });
//         }
//       });
//     }
//   } catch (error) {
//     console.log('Error checking profiles.json update:', error);
//   }
// }

// // Start checking for profile updates
// setInterval(checkProfileJSONUpdate, PROFILE_CHECK_INTERVAL);
  // =========================



  // background.js

async function loadProfileFromJSON() {
  try {
    const response = await fetch(chrome.runtime.getURL('profiles.json'));
    if (!response.ok) {
      throw new Error('profiles.json not found');
    }
    
    const profileData = await response.json();
    const profile = {
      firstName: profileData.FirstName || "",
      lastName: profileData.LastName || "",
      email: profileData.Email || "",
      phone: profileData.Phone || "",
      salary: profileData.Salary || "",
      location: profileData.Location || "",
      gender: profileData.Gender || "",
      linkedin: profileData.Linkedin || "",
      workAuth: profileData.WorkAuth || "No",
      visaSponsorship: profileData.VisaSponsorship || "No",
      relocation: profileData.Relocation || "No",
      jobSource: profileData.JobSource || []
    };
    
    return profile;
  } catch (error) {
    console.log('Error loading profiles.json:', error);
    // Return empty profile if file doesn't exist
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      salary: "",
      location: "",
      gender: "",
      linkedin: "",
      workAuth: "No",
      visaSponsorship: "No",
      relocation: "No",
      jobSource: []
    };
  }
}

// Load default profile on installation and update
chrome.runtime.onInstalled.addListener(async () => {
  // Set default settings
  chrome.storage.local.set({
    autoFill: true,
    settings: {
      highlightFields: true,
      showNotifications: true,
      autoUpload: false,
      watchProfileJSON: true  // New setting to watch for profile.json changes
    }
  });
  
  // Load profile from profiles.json
  const profile = await loadProfileFromJSON();
  chrome.storage.local.set({ profile });
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fill-job" || request.action === "fill-signup") {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ["scripts/content.js"]
    }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        chrome.tabs.sendMessage(sender.tab.id, request);
        sendResponse({ success: true });
      }
    });
    return true; // Keep the message channel open for async response
  }
  
  // Handle resume upload to server
  if (request.action === "uploadResumeToServer") {
    uploadResumeToServer(request.resumeData, request.profileData)
      .then(response => {
        sendResponse({ success: true, message: response });
      })
      .catch(error => {
        sendResponse({ success: false, message: error.toString() });
      });
    return true;
  }
  
  // Handle export data request
  if (request.action === "exportData") {
    exportUserData()
      .then(() => {
        sendResponse({ success: true, message: "Data exported successfully" });
      })
      .catch(error => {
        sendResponse({ success: false, message: error.toString() });
      });
    return true;
  }
  
  // Handle import data request
  if (request.action === "importData") {
    importUserData(request.data)
      .then(() => {
        sendResponse({ success: true, message: "Data imported successfully" });
      })
      .catch(error => {
        sendResponse({ success: false, message: error.toString() });
      });
    return true;
  }
  
  // Handle reload profile request
  if (request.action === "reloadProfileJSON") {
    loadProfileFromJSON()
      .then(profile => {
        chrome.storage.local.set({ profile }, () => {
          sendResponse({ success: true, message: "Profile reloaded from JSON" });
        });
      })
      .catch(error => {
        sendResponse({ success: false, message: error.toString() });
      });
    return true;
  }
});

// Function to upload resume to the server
async function uploadResumeToServer(resumeData, profileData) {
  try {
    // Convert base64 to blob
    const base64Response = await fetch(resumeData.content);
    const blob = await base64Response.blob();
    
    // Create form data
    const formData = new FormData();
    formData.append("fileUpload", blob, resumeData.name);
    
    // Add profile data
    if (profileData) {
      formData.append("first_name", profileData.firstName || "");
      formData.append("last_name", profileData.lastName || "");
      formData.append("city", profileData.location || "");
      formData.append("visa_sponsorship", profileData.visaSponsorship || "");
      formData.append("relocation", profileData.relocation || "");
    }
    
    // Send to server
    const response = await fetch("http://localhost:4567/upload", {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error("Error uploading resume to server:", error);
    throw error;
  }
}

// Function to export user data
async function exportUserData() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (data) => {
      try {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Use downloads API to save the file
        chrome.downloads.download({
          url: url,
          filename: 'job-helper-backup.json',
          saveAs: true,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            // Revoke the object URL after a short delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Function to import user data
async function importUserData(data) {
  return new Promise((resolve, reject) => {
    try {
      // Validate the data structure
      if (!data.profile || typeof data.profile !== 'object') {
        throw new Error("Invalid data format: profile missing");
      }
      
      // Set the imported data
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Watch for changes to profiles.json (simulated with periodic checking)
let lastProfileCheck = 0;
const PROFILE_CHECK_INTERVAL = 5000; // Check every 5 seconds

// Function to check if profiles.json has been updated
async function checkProfileJSONUpdate() {
  try {
    const response = await fetch(chrome.runtime.getURL('profiles.json') + '?t=' + Date.now());
    if (!response.ok) return;
    
    const lastModified = new Date(response.headers.get('last-modified') || 0).getTime();
    
    // If file has been modified since last check
    if (lastModified > lastProfileCheck) {
      lastProfileCheck = lastModified;
      
      // Check if user wants auto-reload
      chrome.storage.local.get(['settings'], async ({ settings }) => {
        if (settings.watchProfileJSON) {
          const profile = await loadProfileFromJSON();
          chrome.storage.local.set({ profile });
          
          // Notify popup if it's open
          chrome.runtime.sendMessage({
            action: "profileJSONUpdated",
            profile: profile
          });
        }
      });
    }
  } catch (error) {
    console.log('Error checking profiles.json update:', error);
  }
}

// Start checking for profile updates
setInterval(checkProfileJSONUpdate, PROFILE_CHECK_INTERVAL);



