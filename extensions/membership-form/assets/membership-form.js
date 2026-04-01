let signaturePadActive = !1,
    isDrawing = !1,
    ctx, countdownInterval, currentEmail = "";
document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("membership-signature-pad");
    if (canvas) {
        ctx = canvas.getContext("2d");
        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);
        canvas.addEventListener("mouseout", stopDrawing);
        canvas.addEventListener("touchstart", e => startDrawing(e.touches[0]));
        canvas.addEventListener("touchmove", e => { e.preventDefault(); draw(e.touches[0]); });
        canvas.addEventListener("touchend", stopDrawing);
        document.getElementById("membership-clear-signature").addEventListener("click", () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            signaturePadActive = !1;
            document.getElementById("membership-signature-data").value = "";
        });
        const googleBtn = document.getElementById("membership-btn-google-auth");
        const facebookBtn = document.getElementById("membership-btn-facebook-auth");
        
        if (googleBtn) {
            googleBtn.addEventListener("click", function() {
                const form = document.getElementById("membership-reg-form");
                const shopDomain = form.getAttribute("data-shop");
                const proxyUrl = form.getAttribute("data-proxy-url");
                if (!shopDomain) {
                    alert("Shop domain not found. Please refresh.");
                    return;
                }
                
                // Redirect user to the proxy route that initiates Google OAuth
                const returnTo = window.location.pathname + window.location.search;
                window.location.href = `${proxyUrl}/google/login?shop=${encodeURIComponent(shopDomain)}&return_to=${encodeURIComponent(returnTo)}`;
            });
        }

        if (facebookBtn) {
            facebookBtn.addEventListener("click", function() {
                const form = document.getElementById("membership-reg-form");
                const shopDomain = form.getAttribute("data-shop");
                const proxyUrl = form.getAttribute("data-proxy-url");
                if (!shopDomain) {
                    alert("Shop domain not found. Please refresh.");
                    return;
                }
                
                // Redirect user to the proxy route that initiates Facebook OAuth
                const returnTo = window.location.pathname + window.location.search;
                window.location.href = `${proxyUrl}/facebook/login?shop=${encodeURIComponent(shopDomain)}&return_to=${encodeURIComponent(returnTo)}`;
            });
        }
    }

    // --- CHECK FOR OAUTH RETURN ---
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('oauth_token');
    if (oauthToken) {
        handleOAuthReturn(oauthToken);
        
        // Clean the URL so the token doesn't stay in the address bar
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    // --- AGGRESSIVE BACK-NAVIGATION CLEARING ---
    window.addEventListener('pageshow', function(event) {
        // If the page is loaded from the cache (e.g. Back button)
        if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
            resetRegistrationForm();
        }
    });

});

function resetRegistrationForm() {
    const form = document.getElementById("membership-reg-form");
    const canvasEl = document.getElementById("membership-signature-pad");
    
    if (form) form.reset();
    if (ctx && canvasEl) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    signaturePadActive = !1;
    const sigData = document.getElementById("membership-signature-data");
    if (sigData) sigData.value = "";
    document.body.removeAttribute('data-oauth-token');
    
    // Remove readOnly if it was set by OAuth
    const fields = ["membership-firstName", "membership-lastName", "membership-email"];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = false;
            el.value = ""; // Force clear even if reset() misses it
        }
    });
}

async function handleOAuthReturn(token) {
    showGlobalSuccess("Google account linked. Please complete the signature below.");
    try {
        const proxyUrl = document.getElementById("membership-reg-form").getAttribute("data-proxy-url");
        const response = await fetch(`${proxyUrl}/oauth-data?token=${token}`);
        const result = await response.json();
        
        if (result.success) {
            const { firstName, lastName, email } = result.data;
            
            // Fill and Lock Fields
            const fnField = document.getElementById("membership-firstName");
            const lnField = document.getElementById("membership-lastName");
            const emailField = document.getElementById("membership-email");
            
            if (fnField) { 
                fnField.value = firstName; 
                if (firstName) fnField.readOnly = true; 
            }
            if (lnField) { 
                lnField.value = lastName; 
                if (lastName) lnField.readOnly = true; 
            }
            if (emailField) { 
                emailField.value = email; 
                if (email) emailField.readOnly = true; 
            }

            
            // Store token for submission
            document.body.setAttribute('data-oauth-token', token);
            
            // Highlight the signature pad to guide the user
            document.querySelector('.signature-box-container').style.border = '2px solid #000';
        } else {
            showGlobalError(result.message || "Failed to load Google profile data.");
        }
    } catch (err) {
        console.error("OAuth Data Fetch Error:", err);
        showGlobalError("Server error loading Google data.");
    }
}


function startDrawing(e) {
    isDrawing = !0, signaturePadActive = !0, draw(e)
}

function draw(e) {
    if (!isDrawing) return;
    const rect = document.getElementById("membership-signature-pad").getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top;
    ctx.lineWidth = 2, ctx.lineCap = "round", ctx.strokeStyle = "#000", ctx.lineTo(x, y), ctx.stroke(), ctx.beginPath(), ctx.moveTo(x, y)
}

function stopDrawing() {
    isDrawing = !1, ctx.beginPath();
    const canvas = document.getElementById("membership-signature-pad");
    document.getElementById("membership-signature-data").value = canvas.toDataURL()
}

function clearErrors() {
    document.querySelectorAll(".error-message").forEach(el => el.innerText = "");
    const global = document.getElementById("membership-global-message");
    global && (global.className = "message-container hidden", global.innerText = "")
}

function showError(id, message) {
    const el = document.getElementById(id);
    el && (el.innerText = message)
}

function showGlobalSuccess(message) {
    const global = document.getElementById("membership-global-message");
    global && (global.className = "message-container success-message", global.innerText = message)
}

function showGlobalError(message) {
    const global = document.getElementById("membership-global-message");
    global && (global.className = "message-container error-message-global", global.innerText = message)
}
async function handleRegistrationSubmit(event) {
    event.preventDefault(), clearErrors();
    let isValid = !0;
    const firstName = document.getElementById("membership-firstName").value.trim(),
        lastName = document.getElementById("membership-lastName").value.trim(),
        email = document.getElementById("membership-email").value.trim(),
        agreement = document.getElementById("membership-agreement-confirm").checked;
    if (firstName || (showError("membership-error-firstName", "First name is required"), isValid = !1), lastName || (showError("membership-error-lastName", "Last name is required"), isValid = !1), email ? /^\S+@\S+\.\S+$/.test(email) || (showError("membership-error-email", "Please enter a valid email"), isValid = !1) : (showError("membership-error-email", "Email is required"), isValid = !1), signaturePadActive || (showError("membership-error-signature", "Signature is required."), isValid = !1), agreement || (showError("membership-error-agreement", "You must accept the terms"), isValid = !1), !isValid) return;
    const submitBtn = document.getElementById("membership-submit-registration");
    submitBtn.disabled = !0, submitBtn.innerText = "Processing...";
    try {
        const oauthToken = document.body.getAttribute('data-oauth-token');

        const requestData = {
                firstName,
                lastName,
                email,
                signature: document.getElementById("membership-signature-data").value,
                agreement,
                oauthToken: oauthToken || null
            },
            proxyUrl = document.getElementById("membership-reg-form").getAttribute("data-proxy-url"),
            response = await fetch(`${proxyUrl}/initiate`, {

                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });
        console.log("Response status:", response.status);
        const text = await response.text();
        console.log("Raw response (first 300 chars):", text.substring(0, 300));
        let result;
        try {
            result = JSON.parse(text)
        } catch {
            throw console.error("Failed to parse JSON - likely HTML error page"), new Error("Server returned invalid response")
        }
        console.log("API Result:", result);
        
        if (result.success) {
            // Check if backend wants an immediate redirect (e.g. Google registration finished)
            if (result.redirect) {
                showGlobalSuccess(result.message || "Registration complete! Redirecting...");
                resetRegistrationForm(); // Clear data before redirecting
                setTimeout(() => {
                    window.location.href = result.redirect;
                }, 1500);
                return;
            }

            // Normal OTP Flow
            currentEmail = email;
            document.getElementById("membership-reg-form").classList.add("hidden");
            document.getElementById("membership-otp-verification-container").classList.remove("hidden");
            showGlobalSuccess(result.message || "Verification code sent successfully!");
            startOtpTimer();
            resetRegistrationForm(); // Clear data so it's empty if they go back
        } else {
            showGlobalError(result.message || "Failed to initiate registration.")
        }
    } catch (error) {

        console.error("Registration error:", error), showGlobalError("Server error. Please try again or contact support.")
    } finally {
        submitBtn.disabled = !1, submitBtn.innerText = "Submit"
    }
}

function startOtpTimer() {
    clearInterval(countdownInterval);
    let timeLeft = 60;
    const resendBtn = document.getElementById("membership-resend-otp-btn");
    resendBtn.classList.add("hidden");
    
    const countdownSpan = document.getElementById("membership-countdown");
    if(countdownSpan) countdownSpan.innerText = timeLeft;
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        if(countdownSpan) countdownSpan.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            resendBtn.classList.remove("hidden");
            showError("membership-error-otp", "OTP expired. Please click Resend OTP.");
        }
    }, 1000);
}

async function handleOtpSubmit(event) {
    event.preventDefault();
    clearErrors();
    const otpCode = document.getElementById("membership-otp-code").value.trim();
    if (!otpCode || otpCode.length !== 6) {
        showError("membership-error-otp", "Please enter a valid 6-digit OTP.");
        return;
    }
    
    const verifyBtn = document.getElementById("membership-verify-otp-btn");
    verifyBtn.disabled = true;
    verifyBtn.innerText = "Verifying...";
    
    try {
        const proxyUrl = document.getElementById("membership-reg-form").getAttribute("data-proxy-url");
        const response = await fetch(`${proxyUrl}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentEmail, otpCode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showGlobalSuccess(result.message);
            clearInterval(countdownInterval);
            document.getElementById("membership-otp-form").classList.add("hidden");
            document.getElementById("membership-resend-otp-btn").classList.add("hidden");
            document.getElementById("membership-timer-display").classList.add("hidden");
            
            // Redirect seamlessly to Shopify Login page
            verifyBtn.innerText = "Redirecting...";
            setTimeout(() => {
                window.location.href = "/account/login";
            }, 1000);
        } else {
            showError("membership-error-otp", result.message);
        }
    } catch (error) {
        console.error("Verify Error:", error);
        showError("membership-error-otp", "Server error during verification.");
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerText = "Verify OTP";
    }
}

async function handleResendOtp() {
    clearErrors();
    const resendBtn = document.getElementById("membership-resend-otp-btn");
    resendBtn.disabled = true;
    resendBtn.innerText = "Resending...";
    
    try {
        const proxyUrl = document.getElementById("membership-reg-form").getAttribute("data-proxy-url");
        const response = await fetch(`${proxyUrl}/resend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentEmail })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showGlobalSuccess(result.message);
            document.getElementById("membership-otp-code").value = ""; // clear old OTP
            startOtpTimer(); // restarts 1-min timer
        } else {
            showGlobalError(result.message);
        }
    } catch (error) {
        console.error("Resend Error:", error);
        showGlobalError("Server error. Please try again or contact support.");
    } finally {
        resendBtn.disabled = false;
        resendBtn.innerText = "Resend OTP";
    }
}