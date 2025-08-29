// scripts\content.js

class ElementFinder {
    regexValues;
    constructor() {
        this.allElements = document.getElementsByTagName("*");
        this.count = 0;
    }
    
    findClosestInputElement(element) {
        let $element = $(element);
        let $ancestor = $element.parent();
        let loopCount = 0;
        while (loopCount < 5 && $ancestor.length > 0 && $ancestor.find("input").length === 0) {
            $ancestor = $ancestor.parent();
            loopCount++;
        }
        let $closestInput = $ancestor.find("input");
        if ($closestInput.length != 1) {
            return null;
        }
        return $closestInput;
    }

    matchRegexAndSetValue(element) {
        let textContent = element.textContent.trim();
    
        for (let i = 0; i < this.regexValues.length; i++) {
            let regexValue = this.regexValues[i];
            let regex = new RegExp(regexValue.regex, "i");
    
            // Check input attributes directly
            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
                let id = element.getAttribute("id") || "";
                let name = element.getAttribute("name") || "";
                let placeholder = element.getAttribute("placeholder") || "";
                let autocomplete = element.getAttribute("autocomplete") || "";
                let type = element.getAttribute("type") || "";
                let label = element.getAttribute("aria-label") || "";
    
                // Skip file inputs to avoid security issues
                if (type === "file") continue;
    
                if (regex.test(id) || regex.test(name) || regex.test(placeholder) || 
                    regex.test(autocomplete) || regex.test(label)) {
                    $(element).val(regexValue.value).trigger("input");
                    this.count++;
                    return;
                }
            }
    
            // Check nearby label text
            if (regex.test(textContent)) {
                let closestInputElement = this.findClosestInputElement(element);
                if (closestInputElement) {
                    closestInputElement.val(regexValue.value);
                    closestInputElement.trigger("input");
                    this.count++;
                } else {
                    console.log("No input element found: " + regexValue.name);
                }
                break;
            }
        }
    }
    
    searchElements() {
        for (let i = 0; i < this.allElements.length; i++) {
            let element = this.allElements[i];
            let childElements = element.getElementsByTagName("*");
            if (element.textContent.trim().length < 50) { // Increased character limit for better matching
                if (childElements.length < 1) {
                    this.matchRegexAndSetValue(element);
                } else if (childElements.length < 2) {
                    this.matchRegexAndSetValue(element);
                } else if (childElements.length < 3) {
                    this.matchRegexAndSetValue(element);
                }
            }
        }
    }
}

class Operator {
    constructor(finder) {
        this.finder = finder;
        this.resumeUploaded = false;
    }
    
    dataURLToBlob(dataURL) {
        const arr = dataURL.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {
            type: mime,
        });
    }
    
    fill() {
        chrome.storage.local.get(["profile", "resume", "settings"], (result) => {
            let regexValues = [
                // JobRight.ai specific field mappings
                {
                    name: "first name",
                    regex: "\\bfirst[\\s_-]*name\\b|\\bfirst\\b|\\bfname\\b|\\bgiven[\\s_-]*name\\b",
                    value: result.profile.firstName,
                }, {
                    name: "last name",
                    regex: "\\blast[\\s_-]*name\\b|\\blast\\b|\\blname\\b|\\bfamily[\\s_-]*name\\b|\\bsurname\\b",
                    value: result.profile.lastName,
                }, {
                    name: "full name",
                    regex: "\\bfull[\\s_-]*name\\b|\\bname\\b|\\bapplicant[\\s_-]*name\\b|\\byour[\\s_-]*name\\b",
                    value: [result.profile.firstName, result.profile.lastName].filter(Boolean).join(" "),
                }, {
                    name: "email",
                    regex: "\\bemail\\b|\\bemail[\\s_-]*address\\b|\\be-?mail\\b|\\bcontact[\\s_-]*email\\b",
                    value: result.profile.email,
                }, {
                    name: "phone",
                    regex: "\\bphone\\b|\\btelephone\\b|\\bmobile\\b|\\bcell\\b|\\bcontact[\\s_-]*number\\b|\\bphone[\\s_-]*number\\b",
                    value: result.profile.phone,
                }, {
                    name: "salary",
                    regex: "\\bsalary\\b|\\bpay\\b|\\bcompensation\\b|\\bexpected[\\s_-]*salary\\b|\\bdesired[\\s_-]*salary\\b|\\bwage\\b",
                    value: result.profile.salary,
                }, {
                    name: "location (city)",
                    regex: "\\bcity\\b|\\blocation\\b|\\baddress\\b|\\bcurrent[\\s_-]*location\\b|\\bresidence\\b|\\bplace\\b",
                    value: result.profile.location,
                }, {
                    name: "gender",
                    regex: "\\bgender\\b|\\bsex\\b",
                    value: result.profile.gender,
                }, {
                    name: "linkedin",
                    regex: "\\blinkedin\\b|\\bprofile\\b|\\bsocial[\\s_-]*media\\b|\\bprofessional[\\s_-]*profile\\b",
                    value: result.profile.linkedin,
                }, {
                    name: "work authorization",
                    regex: "authorized\\s*to\\s*work|legal\\s*right\\s*to\\s*work|lawfully\\s*in\\s*the\\s*united\\s*states|work\\s*authorization|work\\s*visa|work\\s*status|employment\\s*eligibility|us\\s*work\\s*authorization",
                    value: result.profile.workAuth || "No"
                }, {
                    name: "visa sponsorship",
                    regex: "visa\\s*sponsorship|require.*visa|need.*visa|sponsorship.*required|will.*you.*need.*sponsorship|do.*you.*need.*sponsorship",
                    value: result.profile.visaSponsorship || "No"
                }, {
                    name: "relocation",
                    regex: "relocat|willing.*to.*move|able.*to.*move|open.*to.*relocation|willingness.*to.*relocate",
                    value: result.profile.relocation || "No"
                }, {
                    name: "years of experience",
                    regex: "years?\\s*of\\s*experience|experience\\s*level|years?\\s*in\\s*field|professional\\s*experience",
                    value: result.profile.experience || "5" // Default value if not set
                }, {
                    name: "education level",
                    regex: "education|degree|highest\\s*education|qualification|educational\\s*background",
                    value: result.profile.education || "Bachelor's Degree" // Default value if not set
                }
            ];
            
            // JobRight.ai specific field handling
            this.handleJobRightAISpecificFields(result.profile);
            
            this.finder.regexValues = regexValues;
            this.finder.searchElements();
            
            // Handle resume upload after a short delay
            setTimeout(() => {
                this.handleResumeUpload(result.resume, result.settings);
            }, 1000);
        });
    }
    
    // Special handling for JobRight.ai specific fields
    handleJobRightAISpecificFields(profile) {
        // Look for specific JobRight.ai field patterns
        const specificSelectors = [
            // Add JobRight.ai specific selectors here if known
            // Example: '[data-testid="first-name-input"]'
        ];
        
        specificSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // You would need to map selectors to profile fields
                // This is just a placeholder for JobRight.ai specific logic
            });
        });
    }
    
    handleResumeUpload(resume, settings) {
        if (!resume) {
            console.log("No resume found in storage");
            if (settings && settings.showNotifications) {
                this.showNotification("Please add a resume in the extension popup first", "error");
            }
            return;
        }
        
        // First try to upload to server if auto-upload is enabled
        if (settings && settings.autoUpload) {
            chrome.storage.local.get(["profile"], (result) => {
                this.uploadResumeToServer(resume, result.profile);
            });
        }
        
        // JobRight.ai specific resume upload handling
        this.handleJobRightAIResumeUpload(resume, settings);
        
        // Also handle local file inputs for manual upload
        const fileInputs = document.querySelectorAll("input[type=file]");
        if (fileInputs.length === 0) {
            console.log("No file inputs found on page");
            return;
        }
        
        // Highlight and focus on file inputs
        fileInputs.forEach(input => {
            if (settings && settings.highlightFields) {
                input.style.outline = "3px solid red";
                input.style.outlineOffset = "2px";
            }
            
            input.dataset.resumeName = resume.name;
            
            // Add guidance label
            if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('resume-upload-help')) {
                const label = document.createElement("div");
                label.className = "resume-upload-help";
                label.innerHTML = `📎 Please upload your resume: ${resume.name}`;
                label.style.color = "red";
                label.style.fontWeight = "bold";
                label.style.marginTop = "5px";
                label.style.fontSize = "12px";
                label.style.padding = "5px";
                label.style.backgroundColor = "#fff3cd";
                label.style.border = "1px solid #ffeaa7";
                label.style.borderRadius = "4px";
                
                input.parentNode.insertBefore(label, input.nextSibling);
            }
            
            // Add event listener to detect when user uploads a file
            input.addEventListener("change", (e) => {
                if (e.target.files.length > 0) {
                    this.resumeUploaded = true;
                    if (settings && settings.showNotifications) {
                        this.showNotification("Resume uploaded successfully!", "success");
                    }
                    
                    // Remove the highlight
                    if (settings && settings.highlightFields) {
                        input.style.outline = "";
                    }
                    const label = input.nextElementSibling;
                    if (label && label.classList.contains('resume-upload-help')) {
                        label.innerHTML = "✓ Resume uploaded";
                        label.style.color = "green";
                        label.style.backgroundColor = "#d4edda";
                        label.style.border = "1px solid #c3e6cb";
                    }
                }
            });
        });
        
        // Scroll to the first file input
        fileInputs[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    
    // JobRight.ai specific resume upload handling
    handleJobRightAIResumeUpload(resume, settings) {
        // Look for JobRight.ai specific resume upload elements
        const resumeUploadElements = document.querySelectorAll('[data-qa="resume-upload"], .resume-upload, [class*="resume"], [class*="cv"]');
        
        if (resumeUploadElements.length > 0) {
            resumeUploadElements.forEach(element => {
                if (settings && settings.highlightFields) {
                    element.style.outline = "3px solid blue";
                    element.style.outlineOffset = "2px";
                }
                
                // Add specific guidance for JobRight.ai
                const label = document.createElement("div");
                label.className = "jobright-resume-help";
                label.innerHTML = `📎 JobRight.ai Resume Upload: ${resume.name}`;
                label.style.color = "blue";
                label.style.fontWeight = "bold";
                label.style.marginTop = "5px";
                label.style.fontSize = "12px";
                label.style.padding = "5px";
                label.style.backgroundColor = "#e3f2fd";
                label.style.border = "1px solid #bbdefb";
                label.style.borderRadius = "4px";
                
                element.parentNode.insertBefore(label, element.nextSibling);
            });
        }
    }
    
    uploadResumeToServer(resumeData, profileData) {
        // Send message to background script to handle the upload
        chrome.runtime.sendMessage({
            action: "uploadResumeToServer",
            resumeData: resumeData,
            profileData: profileData
        }, (response) => {
            if (response && response.success) {
                chrome.storage.local.get(["settings"], (result) => {
                    if (result.settings && result.settings.showNotifications) {
                        this.showNotification("Resume automatically uploaded to server!", "success");
                    }
                });
            } else if (response && !response.success) {
                console.log("Failed to upload resume to server:", response.message);
            }
        });
    }
    
    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.style.position = "fixed";
        notification.style.top = "20px";
        notification.style.left = "50%";
        notification.style.transform = "translateX(-50%)";
        notification.style.padding = "10px 20px";
        notification.style.borderRadius = "4px";
        notification.style.zIndex = "10001";
        notification.style.fontWeight = "bold";
        notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
        
        if (type === "error") {
            notification.style.backgroundColor = "#f8d7da";
            notification.style.color = "#721c24";
            notification.style.border = "1px solid #f5c6cb";
        } else if (type === "success") {
            notification.style.backgroundColor = "#d4edda";
            notification.style.color = "#155724";
            notification.style.border = "1px solid #c3e6cb";
        } else if (type === "warning") {
            notification.style.backgroundColor = "#fff3cd";
            notification.style.color = "#856404";
            notification.style.border = "1px solid #ffeaa7";
        } else {
            notification.style.backgroundColor = "#d1ecf1";
            notification.style.color = "#0c5460";
            notification.style.border = "1px solid #bee5eb";
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize operator
let operator = new Operator(new ElementFinder());

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fill-job" || request.action === "fill") {
        operator.fill();
        sendResponse({status: "filling_started"});
    }
    return true;
});

// JobRight.ai specific detection and handling
const isJobRightAI = window.location.hostname.includes('jobright.ai') || 
                     window.location.hostname.includes('jobright');

if (isJobRightAI) {
    console.log("JobRight.ai detected - applying specialized form filling");
    
    // Additional JobRight.ai specific initialization
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for JobRight.ai's dynamic content to load
        setTimeout(() => {
            // Check if we should auto-fill on JobRight.ai
            chrome.storage.local.get(["autoFill"], (result) => {
                const shouldAutoFill = result.autoFill !== false;
                
                if (shouldAutoFill) {
                    operator.fill();
                }
            });
        }, 3000); // Longer delay for JobRight.ai to ensure all dynamic content is loaded
    });
}

// Auto-run on page load for certain job sites (including JobRight.ai)
const jobSitePatterns = [
    /jobright\.ai/,
    /jobright/,
    /linkedin\.com\/jobs/,
    /indeed\.com/,
    /ziprecruiter\.com/,
    /monster\.com/,
    /careerbuilder\.com/,
    /glassdoor\.com\/job/,
    /simplyhired\.com/,
    /careers\./,
    /application\./,
    /apply\./
];

// Check if we should auto-fill
chrome.storage.local.get(["autoFill"], (result) => {
    const shouldAutoFill = result.autoFill !== false;
    const currentUrl = window.location.href;
    
    if (shouldAutoFill && jobSitePatterns.some(pattern => pattern.test(currentUrl))) {
        // Wait for page to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Longer delay for JobRight.ai to ensure all dynamic content is loaded
                const delay = isJobRightAI ? 3000 : 2000;
                setTimeout(() => operator.fill(), delay);
            });
        } else {
            const delay = isJobRightAI ? 3000 : 2000;
            setTimeout(() => operator.fill(), delay);
        }
    }
});