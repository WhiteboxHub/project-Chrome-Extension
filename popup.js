// popup.js

document.addEventListener("DOMContentLoaded", () => {
    const firstNameInput = document.getElementById("first-name");
    const lastNameInput = document.getElementById("last-name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const salaryInput = document.getElementById("salary");
    const locationInput = document.getElementById("location");
    const genderInput = document.getElementById("gender");
    const linkedinInput = document.getElementById("linkedin");
    const resumeInput = document.getElementById("resume");
    const uploadedResumeInput = document.getElementById("uploaded-resume");
    const workAuthInput = document.getElementById("work-authorization");
    const visaSponsorshipInput = document.getElementById("visa-sponsorship");
    const relocationInput = document.getElementById("relocation");
    const jobSourceInputs = document.querySelectorAll("input[name='jobSource']");
    const saveButton = document.querySelector(".btn-save");
    const autoFillToggle = document.getElementById("auto-fill");
    const refillButton = document.getElementById("fill-it");
    const statusDiv = document.getElementById("status");
    
    // Settings toggles
    const highlightFieldsToggle = document.getElementById("highlight-fields");
    const showNotificationsToggle = document.getElementById("show-notifications");
    const autoUploadToggle = document.getElementById("auto-upload");
    const watchProfileJSONToggle = document.getElementById("watch-profile-json");
    
    // Function to update form fields from profile data
    function updateFormFromProfile(profile) {
        firstNameInput.value = profile.firstName || "";
        lastNameInput.value = profile.lastName || "";
        emailInput.value = profile.email || "";
        phoneInput.value = profile.phone || "";
        salaryInput.value = profile.salary || "";
        locationInput.value = profile.location || "";
        genderInput.value = profile.gender || "";
        linkedinInput.value = profile.linkedin || "";
        workAuthInput.value = profile.workAuth || "";
        visaSponsorshipInput.value = profile.visaSponsorship || "";
        relocationInput.value = profile.relocation || "";
        
        if (profile.jobSource && Array.isArray(profile.jobSource)) {
            jobSourceInputs.forEach(cb => {
                cb.checked = profile.jobSource.includes(cb.value);
            });
        }
    }
    
    // Load profile + resume + settings from storage
    chrome.storage.local.get(["profile", "resume", "autoFill", "settings"], ({ profile, resume, autoFill, settings }) => {
        if (profile) {
            updateFormFromProfile(profile);
        }
        
        if (resume) {
            uploadedResumeInput.textContent = `Current: ${resume.name}`;
        }
        
        if (autoFill !== undefined) {
            autoFillToggle.checked = autoFill;
        }
        
        if (settings) {
            highlightFieldsToggle.checked = settings.highlightFields !== false;
            showNotificationsToggle.checked = settings.showNotifications !== false;
            autoUploadToggle.checked = settings.autoUpload || false;
            watchProfileJSONToggle.checked = settings.watchProfileJSON !== false;
        }
    });
    
    // Listen for profile updates from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "profileJSONUpdated") {
            updateFormFromProfile(request.profile);
            showStatus("Profile updated from profiles.json", "info");
        }
    });
    
    // Convert file → base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // Resume input change handler
    resumeInput.addEventListener("change", async () => {
        const file = resumeInput.files[0];
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showStatus("File size too large. Please choose a file under 5MB.", "error");
                resumeInput.value = "";
                return;
            }
            
            const base64 = await fileToBase64(file);
            const resume = { 
                name: file.name, 
                type: file.type, 
                content: base64,
                lastModified: file.lastModified,
                size: file.size
            };
            
            chrome.storage.local.set({ resume }, () => {
                uploadedResumeInput.textContent = `Saved: ${file.name}`;
                showStatus("Resume saved successfully!", "success");
            });
        }
    });
    
    // Save profile
    saveButton.addEventListener("click", () => {
        const selectedSources = Array.from(jobSourceInputs)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const profile = {
            firstName: firstNameInput.value,
            lastName: lastNameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            salary: salaryInput.value,
            location: locationInput.value,
            gender: genderInput.value,
            linkedin: linkedinInput.value,
            workAuth: workAuthInput.value,
            visaSponsorship: visaSponsorshipInput.value,
            relocation: relocationInput.value,
            jobSource: selectedSources
        };
        
        chrome.storage.local.set({ profile }, () => {
            showStatus("Profile saved successfully!", "success");
        });
    });
    
    // Auto-fill toggle
    autoFillToggle.addEventListener("change", () => {
        chrome.storage.local.set({ autoFill: autoFillToggle.checked });
    });
    
    // Settings toggles
    highlightFieldsToggle.addEventListener("change", () => {
        chrome.storage.local.get(["settings"], ({ settings }) => {
            chrome.storage.local.set({ 
                settings: {
                    ...settings,
                    highlightFields: highlightFieldsToggle.checked
                }
            });
        });
    });
    
    showNotificationsToggle.addEventListener("change", () => {
        chrome.storage.local.get(["settings"], ({ settings }) => {
            chrome.storage.local.set({ 
                settings: {
                    ...settings,
                    showNotifications: showNotificationsToggle.checked
                }
            });
        });
    });
    
    autoUploadToggle.addEventListener("change", () => {
        chrome.storage.local.get(["settings"], ({ settings }) => {
            chrome.storage.local.set({ 
                settings: {
                    ...settings,
                    autoUpload: autoUploadToggle.checked
                }
            });
        });
    });
    
    watchProfileJSONToggle.addEventListener("change", () => {
        chrome.storage.local.get(["settings"], ({ settings }) => {
            chrome.storage.local.set({ 
                settings: {
                    ...settings,
                    watchProfileJSON: watchProfileJSONToggle.checked
                }
            });
        });
    });
    
    // Refill button → tells content.js to run autofill
    refillButton.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                showStatus("No active tab found", "error");
                return;
            }
            
            chrome.tabs.sendMessage(tabs[0].id, { action: "fill-job" }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus("Error: Could not communicate with content script. Make sure you're on a job application page.", "error");
                    return;
                }
                
                if (response && response.status) {
                    showStatus("Filling started...", "info");
                }
            });
        });
    });
    
    // Upload resume button
    document.getElementById("upload-resume").addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                showStatus("No active tab found", "error");
                return;
            }
            
            // Get the current resume and profile data
            chrome.storage.local.get(["resume", "profile"], (result) => {
                if (!result.resume) {
                    showStatus("No resume found. Please upload a resume first.", "error");
                    return;
                }
                
                // Send message to background script to upload the resume
                chrome.runtime.sendMessage({
                    action: "uploadResumeToServer",
                    resumeData: result.resume,
                    profileData: result.profile
                }, (response) => {
                    if (response && response.success) {
                        showStatus("Resume uploaded to server!", "success");
                    } else {
                        showStatus("Failed to upload resume: " + (response ? response.message : "Unknown error"), "error");
                    }
                });
            });
        });
    });
    
    // Export data button
    document.getElementById("export-data").addEventListener("click", () => {
        chrome.runtime.sendMessage({
            action: "exportData"
        }, (response) => {
            if (response && response.success) {
                showStatus("Data exported successfully!", "success");
            } else {
                showStatus("Failed to export data: " + (response ? response.message : "Unknown error"), "error");
            }
        });
    });
    
    // Import data button
    document.getElementById("import-data").addEventListener("click", () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        // Send message to background script to import the data
                        chrome.runtime.sendMessage({
                            action: "importData",
                            data: data
                        }, (response) => {
                            if (response && response.success) {
                                showStatus("Data imported successfully!", "success");
                                // Reload the page to reflect changes
                                location.reload();
                            } else {
                                showStatus("Failed to import data: " + (response ? response.message : "Unknown error"), "error");
                            }
                        });
                    } catch (error) {
                        showStatus("Error parsing JSON file: " + error.message, "error");
                    }
                };
                reader.readAsText(file);
            }
        });
        
        fileInput.click();
    });
    
    // Reload profile from JSON button
    document.getElementById("reload-profile").addEventListener("click", () => {
        chrome.runtime.sendMessage({
            action: "reloadProfileJSON"
        }, (response) => {
            if (response && response.success) {
                showStatus("Profile reloaded from JSON!", "success");
                // Reload the storage to update the form
                chrome.storage.local.get(["profile"], ({ profile }) => {
                    updateFormFromProfile(profile);
                });
            } else {
                showStatus("Failed to reload profile: " + (response ? response.message : "Unknown error"), "error");
            }
        });
    });
    
    // Import JSON functionality
    document.getElementById("import-json").addEventListener("click", () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const profileData = JSON.parse(e.target.result);
                        
                        // Map JSON data to form fields
                        document.getElementById("first-name").value = profileData.FirstName || "";
                        document.getElementById("last-name").value = profileData.LastName || "";
                        document.getElementById("email").value = profileData.Email || "";
                        document.getElementById("phone").value = profileData.Phone || "";
                        document.getElementById("salary").value = profileData.Salary || "";
                        document.getElementById("location").value = profileData.Location || "";
                        document.getElementById("gender").value = profileData.Gender || "";
                        document.getElementById("linkedin").value = profileData.Linkedin || "";
                        document.getElementById("work-authorization").value = profileData.WorkAuth || "";
                        document.getElementById("visa-sponsorship").value = profileData.VisaSponsorship || "";
                        document.getElementById("relocation").value = profileData.Relocation || "";
                        
                        // Auto-save the imported profile
                        const profile = {
                            firstName: profileData.FirstName,
                            lastName: profileData.LastName,
                            email: profileData.Email,
                            phone: profileData.Phone,
                            salary: profileData.Salary,
                            location: profileData.Location,
                            gender: profileData.Gender,
                            linkedin: profileData.Linkedin,
                            workAuth: profileData.WorkAuth,
                            visaSponsorship: profileData.VisaSponsorship,
                            relocation: profileData.Relocation
                        };
                        
                        chrome.storage.local.set({ profile }, () => {
                            showStatus("Profile imported successfully!", "success");
                        });
                    } catch (error) {
                        showStatus("Error parsing JSON file: " + error.message, "error");
                    }
                };
                reader.readAsText(file);
            }
        });
        
        fileInput.click();
    });
    
    // Account form handling
    document.getElementById("accountForm").addEventListener("submit", (e) => {
        e.preventDefault();
        
        const email = document.getElementById("account-email").value.trim();
        const password = document.getElementById("account-password").value.trim();
        const confirmPassword = document.getElementById("account-confirm-password").value.trim();
        
        // Basic validation
        if (password !== confirmPassword) {
            showStatus("Passwords do not match.", "error");
            return;
        }
        
        if (password.length < 8) {
            showStatus("Password must be at least 8 characters.", "error");
            return;
        }
        
        // Save data into chrome storage
        chrome.storage.local.set({
            account: { email, password }
        }, () => {
            showStatus("Account info saved!", "success");
        });
    });
    
    // Status display function
    function showStatus(message, type = "info") {
        statusDiv.textContent = message;
        statusDiv.className = `status-${type}`;
        
        // Clear status after 3 seconds
        setTimeout(() => {
            statusDiv.textContent = "";
            statusDiv.className = "";
        }, 3000);
    }
});



