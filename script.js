// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Modal elements
    const modal = document.getElementById('amendmentModal');
    const openBtn = document.getElementById('openAmendmentBtn');
    const closeBtn = document.querySelector('.close');

    // Legislator lookup elements
    const findRepsBtn = document.getElementById('findRepsBtn');
    const detectLocationBtn = document.getElementById('detectLocationBtn');
    const zipCodeInput = document.getElementById('zipCodeInput');
    const representativesResults = document.getElementById('representativesResults');
    const repsList = document.getElementById('repsList');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');

    // API keys
    const GOOGLE_API_KEY = 'AIzaSyBjdHFb5WA4VE9d4HruWzMvr4cPAby2TvI';
    const OPENSTATES_API_KEY = 'e8350a02-aa9c-4ab8-a5c7-f6a0cf015828';

    // Event listeners for modal
    if (openBtn && modal) {
        openBtn.onclick = () => {
            modal.style.display = "block";
        };
        
        closeBtn.onclick = () => {
            modal.style.display = "none";
        };
        
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        };
    }

    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Generate email template with legislator's name and title
    function generateEmailTemplate(name, title = '') {
        // Create a simpler email template to ensure it works properly
        let greeting = 'Dear ';
        
        // Add title if available
        if (title && title.trim() !== '') {
            greeting += `${title} `;
        }
        
        greeting += name;
        
        const template = `${greeting},

I am writing to urge you to support a constitutional amendment establishing the right of voters to recall members of Congress.

Public trust in Congress is at historic lows, and we need accountability measures beyond impeachment and ethics investigations.

An Article V Convention to propose a Congressional Recall Amendment would give voters the power to remove legislators through a democratic process.

Eighteen states already allow recall elections for state officials. This same power should extend to federal legislators.

More information can be found at congressionalrecall.org.

Thank you for your time and service.`;
        
        return template;
    }
    
    // Function to open email client directly
    function openEmailClient(email, name, title) {
        if (!email) return;
        
        try {
            const subject = 'Support for Congressional Recall Amendment';
            const body = generateEmailTemplate(name, title);
            
            // Check if email is actually a URL (some representatives use contact forms instead of direct emails)
            if (email.startsWith('http')) {
                // Open the contact form in a new tab
                window.open(email, '_blank');
                return;
            }
            
            // Make sure email is properly formatted
            email = email.trim();
            
            // Create the mailto URL
            const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            // Try both methods for maximum browser compatibility
            const mailWindow = window.open(mailtoUrl, '_blank');
            if (!mailWindow || mailWindow.closed || typeof mailWindow.closed === 'undefined') {
                window.location.href = mailtoUrl;
            }
        } catch (error) {
            console.error("Error opening email client:", error);
        }
    }

    // Show loading indicator
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        representativesResults.classList.add('hidden');
    }

    // Hide loading indicator
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }

    // Show error message
    function showError(message) {
        repsList.innerHTML = `<p class="text-center py-3 text-red-400">${escapeHtml(message)}</p>`;
        representativesResults.classList.remove('hidden');
    }

    // Find representatives by ZIP code using OpenStates API
    async function findRepresentatives(zipCode) {
        showLoading();
        repsList.innerHTML = '<p class="text-center">Loading state legislators...</p>';

        // Validate ZIP code format
        const zipPattern = /^\d{5}(-\d{4})?$/;
        if (!zipPattern.test(zipCode)) {
            showError("Please enter a valid 5-digit ZIP code");
            hideLoading();
            return;
        }

        try {
            // First, get the lat/lng for the ZIP code using Google's Geocoding API
            const geocodeResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&key=${GOOGLE_API_KEY}`);
            
            if (!geocodeResponse.ok) {
                throw new Error(`Geocoding error: ${geocodeResponse.status}`);
            }
            
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData.status !== 'OK' || !geocodeData.results || geocodeData.results.length === 0) {
                throw new Error('Could not find location for this ZIP code');
            }
            
            const location = geocodeData.results[0].geometry.location;
            const { lat, lng } = location;
            
            // Get state from address components
            let state = '';
            for (const component of geocodeData.results[0].address_components) {
                if (component.types.includes('administrative_area_level_1')) {
                    state = component.short_name; // Get state abbreviation (e.g., TX, CA)
                    break;
                }
            }
            
            if (!state) {
                throw new Error('Could not determine state from ZIP code');
            }
            
            console.log(`Found state: ${state} for ZIP: ${zipCode}`);
            console.log(`Coordinates: lat=${lat}, lng=${lng}`);
            
            // Use OpenStates API to get legislators by geographic point
            const geoUrl = `https://v3.openstates.org/people.geo?lat=${lat}&lng=${lng}&include=offices`;
            console.log(`Fetching from: ${geoUrl}`);
            
            const geoResponse = await fetch(geoUrl, {
                method: 'GET',
                headers: {
                    'X-API-KEY': OPENSTATES_API_KEY,
                    'Accept': 'application/json'
                }
            });
            
            if (!geoResponse.ok) {
                throw new Error(`OpenStates Geo API error: ${geoResponse.status}`);
            }
            
            const geoData = await geoResponse.json();
            console.log("Geo API response:", geoData);
            
            // Filter for state legislators only
            const districtLegislators = geoData.results.filter(legislator => {
                // Check if they are state-level legislators (not federal)
                return legislator.current_role && 
                       (legislator.current_role.org_classification === 'legislature' || 
                        legislator.current_role.title.toLowerCase().includes('senator') ||
                        legislator.current_role.title.toLowerCase().includes('representative') ||
                        legislator.current_role.title.toLowerCase().includes('assembly'));
            });
            
            console.log(`Found ${districtLegislators.length} district-specific legislators`);
            
            // If we have district legislators, display them
            if (districtLegislators.length > 0) {
                displayDistrictLegislators(districtLegislators, state);
            } else {
                // Fallback: Get all state legislators
                console.log(`No district legislators found. Getting all state legislators for ${state}`);
                const stateUrl = `https://v3.openstates.org/people?jurisdiction=${state.toLowerCase()}&include=offices`;
                
                const stateResponse = await fetch(stateUrl, {
                    method: 'GET',
                    headers: {
                        'X-API-KEY': OPENSTATES_API_KEY,
                        'Accept': 'application/json'
                    }
                });
                
                if (!stateResponse.ok) {
                    throw new Error(`OpenStates API error: ${stateResponse.status}`);
                }
                
                const stateData = await stateResponse.json();
                console.log(`Found ${stateData.results.length} total state legislators`);
                displayAllStateLegislators(stateData.results, state, districtLegislators);
            }
        } catch (error) {
            console.error('Error fetching representatives:', error);
            showError(`Error: ${error.message}. Please try a different ZIP code.`);
        } finally {
            hideLoading();
        }
    }
    
    // Display district-specific legislators
    function displayDistrictLegislators(legislators, state) {
        // Clear previous results
        repsList.innerHTML = '';
        
        // Add a note at the top of the results
        const noteElement = document.createElement('div');
        noteElement.className = 'bg-blue-900 p-3 rounded-lg mb-4 text-sm col-span-full';
        noteElement.innerHTML = `
            <p><strong>Your State Legislators</strong>: Showing ${legislators.length} state legislators who directly represent your district.</p>
            <p class="mt-1 text-xs">These officials can vote on state applications for an Article V convention.</p>
            <div class="mt-2">
                <button id="showAllStateReps" class="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded">
                    Show All ${state} Legislators
                </button>
            </div>
        `;
        repsList.appendChild(noteElement);
        
        // Add each legislator to the grid
        legislators.forEach(legislator => {
            const repCard = document.createElement('div');
            repCard.className = 'bg-gray-700 p-4 rounded-lg relative border-2 border-green-400';
            
            // Determine party color
            const partyColor = legislator.party === 'Democratic' ? 'text-blue-400' : 
                            legislator.party === 'Republican' ? 'text-red-400' : 'text-gray-400';
            
            // Get contact information
            const email = legislator.email || 'No email available';
            
            // Extract phone number
            let phone = 'No phone available';
            if (legislator.offices && Array.isArray(legislator.offices)) {
                for (const office of legislator.offices) {
                    if (office && office.voice) {
                        phone = office.voice;
                        break;
                    }
                }
            }
            
            // Get district information
            let districtInfo = '';
            if (legislator.current_role && legislator.current_role.district) {
                districtInfo = `District ${legislator.current_role.district}`;
            } else if (legislator.district) {
                districtInfo = `District ${legislator.district}`;
            }
            
            // Determine if email is available for styling
            const emailAvailable = legislator.email;
            const emailBtnClass = emailAvailable 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed';
            
            repCard.innerHTML = `
                <div class="absolute top-0 right-0 bg-green-400 text-white px-2 py-1 rounded-bl-lg text-xs font-bold">Your District</div>
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="text-lg font-medium">${escapeHtml(legislator.name)}</h5>
                        <p class="text-sm ${partyColor}">${escapeHtml(legislator.party || 'Unknown Party')}</p>
                        <p class="text-sm text-gray-300">${escapeHtml(legislator.current_role ? legislator.current_role.title : 'State Legislator')}</p>
                        ${districtInfo ? `<p class="text-sm text-gray-300">${escapeHtml(districtInfo)}</p>` : ''}
                    </div>
                </div>
                <div class="mt-3 text-sm">
                    <div class="flex items-center mb-1">
                        <span class="mr-2">📞</span>
                        <span class="${phone === 'No phone available' ? 'text-gray-500' : 'text-gray-300'}">
                            ${phone !== 'No phone available' ? 
                                `<a href="tel:${escapeHtml(phone.replace(/\D/g, ''))}" class="hover:underline">${escapeHtml(phone)}</a>` : 
                                'No phone available'}
                        </span>
                    </div>
                    <div class="flex items-center mb-1">
                        <span class="mr-2">✉️</span>
                        <span class="${email === 'No email available' ? 'text-gray-500' : 'text-gray-300'}">${escapeHtml(email)}</span>
                    </div>
                </div>
                <div class="mt-4 flex space-x-2">
                    <button class="email-btn ${emailBtnClass} font-medium py-2 px-4 rounded-lg w-full block text-center" 
                       data-email="${emailAvailable ? escapeHtml(email) : ''}"
                       data-name="${escapeHtml(legislator.name)}"
                       data-title="${escapeHtml(legislator.current_role ? legislator.current_role.title : 'State Legislator')}"
                       ${!emailAvailable ? 'disabled' : ''}>
                        Email Representative
                    </button>
                </div>
            `;
            
            repsList.appendChild(repCard);
        });
        
        // Add event listener for the "Show All" button
        const showAllButton = document.getElementById('showAllStateReps');
        if (showAllButton) {
            showAllButton.addEventListener('click', function() {
                // Fetch all state legislators
                const stateUrl = `https://v3.openstates.org/people?jurisdiction=${state.toLowerCase()}&include=offices`;
                
                showLoading();
                fetch(stateUrl, {
                    method: 'GET',
                    headers: {
                        'X-API-KEY': OPENSTATES_API_KEY,
                        'Accept': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`OpenStates API error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(stateData => {
                    console.log(`Found ${stateData.results.length} total state legislators`);
                    displayAllStateLegislators(stateData.results, state, legislators);
                })
                .catch(error => {
                    console.error('Error fetching all state legislators:', error);
                    showError(`Error: ${error.message}`);
                })
                .finally(() => {
                    hideLoading();
                });
            });
        }
        
        representativesResults.classList.remove('hidden');
    }
    
    // Display all state legislators
    function displayAllStateLegislators(allLegislators, state, districtLegislators = []) {
        // Clear previous results
        repsList.innerHTML = '';

        // Create a set of district legislator IDs for quick lookup
        const districtLegislatorIds = new Set(districtLegislators.map(leg => leg.id));
        
        // Add a note at the top of the results
        const noteElement = document.createElement('div');
        noteElement.className = 'bg-blue-900 p-3 rounded-lg mb-4 text-sm col-span-full';
        
        if (districtLegislators.length > 0) {
            noteElement.innerHTML = `
                <p><strong>All State Legislators for ${state}</strong>: Showing all state-level legislators. Your district representatives are highlighted with a green border.</p>
                <p class="mt-1 text-xs">These officials can vote on state applications for an Article V convention. Federal officials are not shown.</p>
                <div class="mt-2">
                    <button id="showDistrictOnly" class="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded">
                        Show Only My District (${districtLegislators.length})
                    </button>
                </div>
            `;
        } else {
            noteElement.innerHTML = `
                <p><strong>State Legislators for ${state}</strong>: Showing all state-level legislators (State Senators, Representatives, Assemblymembers, etc.) for ${state}.</p>
                <p class="mt-1 text-xs">These officials can vote on state applications for an Article V convention. Federal officials are not shown.</p>
            `;
        }
        
        repsList.appendChild(noteElement);
        
        // Add each legislator to the grid
        allLegislators.forEach(legislator => {
            const repCard = document.createElement('div');
            repCard.className = 'bg-gray-700 p-4 rounded-lg relative';
            
            // Check if this is a district legislator
            const isDistrictLegislator = districtLegislatorIds.has(legislator.id);
            if (isDistrictLegislator) {
                repCard.classList.add('border-2', 'border-green-400');
            }
            
            // Determine party color
            const partyColor = legislator.party === 'Democratic' ? 'text-blue-400' : 
                            legislator.party === 'Republican' ? 'text-red-400' : 'text-gray-400';
            
            // Get contact information
            const email = legislator.email || 'No email available';
            
            // Extract phone number
            let phone = 'No phone available';
            if (legislator.offices && Array.isArray(legislator.offices)) {
                for (const office of legislator.offices) {
                    if (office && office.voice) {
                        phone = office.voice;
                        break;
                    }
                }
            }
            
            // Get district information
            let districtInfo = '';
            if (legislator.current_role && legislator.current_role.district) {
                districtInfo = `District ${legislator.current_role.district}`;
            } else if (legislator.district) {
                districtInfo = `District ${legislator.district}`;
            }
            
            // Determine if email is available for styling
            const emailAvailable = legislator.email;
            const emailBtnClass = emailAvailable 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed';
            
            // Add district indicator if applicable
            const districtIndicator = isDistrictLegislator ? `
                <div class="absolute top-0 right-0 bg-green-400 text-white px-2 py-1 rounded-bl-lg text-xs font-bold">Your District</div>
            ` : '';
            
            repCard.innerHTML = `
                ${districtIndicator}
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="text-lg font-medium">${escapeHtml(legislator.name)}</h5>
                        <p class="text-sm ${partyColor}">${escapeHtml(legislator.party || 'Unknown Party')}</p>
                        <p class="text-sm text-gray-300">${escapeHtml(legislator.current_role ? legislator.current_role.title : 'State Legislator')}</p>
                        ${districtInfo ? `<p class="text-sm text-gray-300">${escapeHtml(districtInfo)}</p>` : ''}
                    </div>
                </div>
                <div class="mt-3 text-sm">
                    <div class="flex items-center mb-1">
                        <span class="mr-2">📞</span>
                        <span class="${phone === 'No phone available' ? 'text-gray-500' : 'text-gray-300'}">
                            ${phone !== 'No phone available' ? 
                                `<a href="tel:${escapeHtml(phone.replace(/\D/g, ''))}" class="hover:underline">${escapeHtml(phone)}</a>` : 
                                'No phone available'}
                        </span>
                    </div>
                    <div class="flex items-center mb-1">
                        <span class="mr-2">✉️</span>
                        <span class="${email === 'No email available' ? 'text-gray-500' : 'text-gray-300'}">${escapeHtml(email)}</span>
                    </div>
                </div>
                <div class="mt-4 flex space-x-2">
                    <button class="email-btn ${emailBtnClass} font-medium py-2 px-4 rounded-lg w-full block text-center" 
                       data-email="${emailAvailable ? escapeHtml(email) : ''}"
                       data-name="${escapeHtml(legislator.name)}"
                       data-title="${escapeHtml(legislator.current_role ? legislator.current_role.title : 'State Legislator')}"
                       ${!emailAvailable ? 'disabled' : ''}>
                        Email Representative
                    </button>
                </div>
            `;
            
            repsList.appendChild(repCard);
        });
        
        // Add event listener for the "Show District Only" button
        if (districtLegislators.length > 0) {
            const showDistrictOnlyButton = document.getElementById('showDistrictOnly');
            if (showDistrictOnlyButton) {
                showDistrictOnlyButton.addEventListener('click', function() {
                    displayDistrictLegislators(districtLegislators, state);
                });
            }
        }
        
        representativesResults.classList.remove('hidden');
    }

    // Display representatives from Google Civic API
    function displayRepresentatives(data) {
        // Clear previous results
        repsList.innerHTML = '';

        console.log("API response:", data);

        // Create a mapping of officials to their offices
        const officials = data.officials || [];
        const offices = data.offices || [];
        
        if (offices.length === 0 || officials.length === 0) {
            repsList.innerHTML = `
                <p class="text-center py-3">No representatives found for this location. Please try a different ZIP code.</p>
            `;
            representativesResults.classList.remove('hidden');
            return;
        }
        
        // Filter for state legislators only
        let stateReps = [];
        let filteredOutReps = []; // Track filtered out representatives for debugging
        
        // First, let's show ALL representatives for debugging
        let allReps = [];
        
        offices.forEach(office => {
            // Check if this is a state-level legislative office
            const officeName = office.name.toLowerCase();
            const divisionId = office.divisionId || '';
            const levels = office.levels || [];
            
            office.officialIndices.forEach(index => {
                if (officials[index]) {
                    const rep = {
                        office: office,
                        official: officials[index]
                    };
                    
                    allReps.push(rep);
                    
                    // Check various conditions
                    const isStateLevel = levels.includes('administrativeArea1') || 
                                        divisionId.includes('state:') ||
                                        officeName.includes('state');
                    
                    // Specifically exclude federal positions
                    const isNotFederal = 
                        !levels.includes('country') &&
                        !officeName.includes('united states') && 
                        !officeName.includes('u.s.') &&
                        !officeName.includes('us senator') &&
                        !officeName.includes('us representative') &&
                        !divisionId.includes('country:us');
                    
                    // More strictly check for state legislative positions
                    const isStateLegislator = 
                        (officeName.includes('state') && 
                         (officeName.includes('senate') || 
                          officeName.includes('senator') ||
                          officeName.includes('house') || 
                          officeName.includes('representative') ||
                          officeName.includes('assembly') ||
                          officeName.includes('delegate'))) ||
                        (divisionId.includes('/sld') && 
                         (officeName.includes('senate') || 
                          officeName.includes('senator') ||
                          officeName.includes('house') || 
                          officeName.includes('representative') ||
                          officeName.includes('assembly') ||
                          officeName.includes('delegate')));
                    
                    const isNotJudicial = 
                        !officeName.includes('judge') && 
                        !officeName.includes('justice') && 
                        !officeName.includes('court');
                    
                    const isNotExecutive = 
                        !officeName.includes('governor') && 
                        !officeName.includes('attorney general') && 
                        !officeName.includes('treasurer') && 
                        !officeName.includes('secretary of state');
                    
                    // Special case for Texas State Senate/House
                    const isTexasStateLegislator = 
                        (officeName.includes('texas') && 
                         (officeName.includes('senate') || 
                          officeName.includes('house')) &&
                         !officeName.includes('united states'));
                    
                    // Special case for other states that might not include "state" in the title
                    const isStateSpecificLegislator = 
                        ((divisionId.includes('state:') || levels.includes('administrativeArea1')) &&
                         (officeName.includes('senate') || 
                          officeName.includes('senator') ||
                          officeName.includes('house') || 
                          officeName.includes('representative') ||
                          officeName.includes('assembly') ||
                          officeName.includes('delegate')) &&
                         !officeName.includes('united states') &&
                         !officeName.includes('u.s.'));
                    
                    // Add debugging info to the representative
                    rep.debug = {
                        officeName,
                        divisionId,
                        levels,
                        isStateLevel,
                        isNotFederal,
                        isStateLegislator,
                        isNotJudicial,
                        isNotExecutive,
                        isTexasStateLegislator,
                        isStateSpecificLegislator
                    };
                    
                    // Combine all criteria to determine if this is a state legislator
                    const isStateRepresentative = 
                        isNotFederal && 
                        ((isStateLegislator || isTexasStateLegislator || isStateSpecificLegislator) ||
                         // Less strict fallback: any state-level legislative position
                         (isStateLevel && 
                          (officeName.includes('senate') || 
                           officeName.includes('senator') ||
                           officeName.includes('house') || 
                           officeName.includes('representative') ||
                           officeName.includes('assembly') ||
                           officeName.includes('delegate'))));
                    
                    if (isStateRepresentative) {
                        stateReps.push(rep);
                    } else {
                        filteredOutReps.push(rep);
                    }
                }
            });
        });
        
        console.log("All representatives:", allReps);
        console.log("Filtered state legislators:", stateReps);
        console.log("Filtered OUT representatives:", filteredOutReps);
        
        // TEMPORARY: If no state legislators found, show all representatives for debugging
        if (stateReps.length === 0 && allReps.length > 0) {
            // Add a note at the top of the results
            const noteElement = document.createElement('div');
            noteElement.className = 'bg-red-900 p-3 rounded-lg mb-4 text-sm col-span-full';
            noteElement.innerHTML = `
                <p><strong>DEBUG MODE:</strong> No state legislators were found with our filtering criteria. Showing ALL representatives for debugging purposes.</p>
                <p class="mt-1 text-xs">Please check the console for detailed filtering information.</p>
            `;
            repsList.appendChild(noteElement);
            
            // Add each representative to the grid
            allReps.forEach(rep => {
                const repCard = document.createElement('div');
                repCard.className = 'bg-gray-700 p-4 rounded-lg';
                
                // Determine party color
                const partyColor = rep.official.party === 'Democratic Party' || rep.official.party === 'Democrat' ? 'text-blue-400' : 
                                rep.official.party === 'Republican Party' || rep.official.party === 'Republican' ? 'text-red-400' : 'text-gray-400';
                
                // Get contact information
                const email = rep.official.emails && rep.official.emails[0] ? rep.official.emails[0] : 'No email available';
                const phone = rep.official.phones && rep.official.phones[0] ? rep.official.phones[0] : 'No phone available';
                
                // Determine if email is available for styling
                const emailAvailable = rep.official.emails && rep.official.emails[0];
                const emailBtnClass = emailAvailable 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed';
                
                // Add debug info to the card
                const debugInfo = `
                    <div class="mt-2 text-xs border-t border-gray-600 pt-2">
                        <p class="text-yellow-400">Debug Info:</p>
                        <p>Office: ${escapeHtml(rep.debug.officeName)}</p>
                        <p>Division: ${escapeHtml(rep.debug.divisionId)}</p>
                        <p>Levels: ${escapeHtml(rep.debug.levels ? rep.debug.levels.join(', ') : 'none')}</p>
                        <p>
                            State: ${rep.debug.isStateLevel ? '✓' : '✗'} | 
                            Not Federal: ${rep.debug.isNotFederal ? '✓' : '✗'} | 
                            Legislative: ${rep.debug.isStateLegislator ? '✓' : '✗'}
                        </p>
                    </div>
                `;
                
                repCard.innerHTML = `
                    ${debugInfo}
                    <div class="flex justify-between items-start">
                        <div>
                            <h5 class="text-lg font-medium">${escapeHtml(rep.official.name)}</h5>
                            <p class="text-sm ${partyColor}">${escapeHtml(rep.official.party || 'Unknown Party')}</p>
                            <p class="text-sm text-gray-300">${escapeHtml(rep.office.name)}</p>
                        </div>
                    </div>
                    <div class="mt-3 text-sm">
                        <div class="flex items-center mb-1">
                            <span class="mr-2">📞</span>
                            <span class="${phone === 'No phone available' ? 'text-gray-500' : 'text-gray-300'}">
                                ${phone !== 'No phone available' ? 
                                    `<a href="tel:${escapeHtml(phone.replace(/\D/g, ''))}" class="hover:underline">${escapeHtml(phone)}</a>` : 
                                    'No phone available'}
                            </span>
                        </div>
                        <div class="flex items-center mb-1">
                            <span class="mr-2">✉️</span>
                            <span class="${email === 'No email available' ? 'text-gray-500' : 'text-gray-300'}">${escapeHtml(email)}</span>
                        </div>
                        ${rep.official.urls && rep.official.urls[0] ? `
                        <div class="flex items-center">
                            <span class="mr-2">🌐</span>
                            <a href="${escapeHtml(rep.official.urls[0])}" target="_blank" class="text-blue-400 hover:text-blue-300">Official Website</a>
                        </div>` : ''}
                    </div>
                    <div class="mt-3">
                        <button class="email-btn ${emailBtnClass} font-medium py-2 px-4 rounded-lg w-full block text-center" 
                           data-email="${emailAvailable ? escapeHtml(email) : ''}"
                           data-name="${escapeHtml(rep.official.name)}"
                           data-title="${escapeHtml(rep.office.name)}"
                           ${!emailAvailable ? 'disabled' : ''}>
                            Email Representative
                        </button>
                    </div>
                `;
                
                repsList.appendChild(repCard);
            });
            
            representativesResults.classList.remove('hidden');
            return;
        }
        
        if (stateReps.length === 0) {
            // If no state legislators found, provide a more detailed message
            let debugInfo = '';
            if (filteredOutReps.length > 0) {
                debugInfo = `
                    <div class="mt-4 p-3 bg-gray-800 rounded-lg">
                        <h5 class="text-yellow-400 mb-2">Debug: Representatives found but filtered out</h5>
                        <ul class="text-sm">
                            ${filteredOutReps.slice(0, 5).map(rep => `
                                <li class="mb-2 pb-2 border-b border-gray-700">
                                    <strong>${escapeHtml(rep.official.name)}</strong> - ${escapeHtml(rep.office.name)}<br>
                                    <span class="text-xs">
                                        Division: ${escapeHtml(rep.debug.divisionId)}<br>
                                        Levels: ${escapeHtml(rep.debug.levels ? rep.debug.levels.join(', ') : 'none')}<br>
                                        State: ${rep.debug.isStateLevel ? '✓' : '✗'} | 
                                        Federal: ${rep.debug.isNotFederal ? '✓' : '✗'} | 
                                        Legislative: ${rep.debug.isStateLegislator ? '✓' : '✗'}
                                    </span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
            
            repsList.innerHTML = `
                <div class="col-span-full text-center">
                    <p class="text-center py-3">No state legislators found for this location. Please try a different ZIP code.</p>
                    <p class="text-center text-sm">Note: We only display state-level legislators (State Senators, Representatives, Assemblymembers, etc.).</p>
                    ${debugInfo}
                </div>
            `;
            representativesResults.classList.remove('hidden');
            return;
        }
        
        // Add a note at the top of the results
        const noteElement = document.createElement('div');
        noteElement.className = 'bg-blue-900 p-3 rounded-lg mb-4 text-sm col-span-full';
        noteElement.innerHTML = `
            <p><strong>State Legislators Only:</strong> Showing only state-level legislators (State Senators, State Representatives, State Assembly members, etc.). These officials can vote on state applications for an Article V convention.</p>
            <p class="mt-1 text-xs">Federal officials like U.S. Senators and U.S. Representatives are not shown.</p>
        `;
        repsList.appendChild(noteElement);
        
        // Add each representative to the grid
        stateReps.forEach(rep => {
            const repCard = document.createElement('div');
            repCard.className = 'bg-gray-700 p-4 rounded-lg';
            
            // Determine party color
            const partyColor = rep.official.party === 'Democratic Party' || rep.official.party === 'Democrat' ? 'text-blue-400' : 
                            rep.official.party === 'Republican Party' || rep.official.party === 'Republican' ? 'text-red-400' : 'text-gray-400';
            
            // Get contact information
            const email = rep.official.emails && rep.official.emails[0] ? rep.official.emails[0] : 'No email available';
            const phone = rep.official.phones && rep.official.phones[0] ? rep.official.phones[0] : 'No phone available';
            
            // Determine if email is available for styling
            const emailAvailable = rep.official.emails && rep.official.emails[0];
            const emailBtnClass = emailAvailable 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed';
            
            repCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="text-lg font-medium">${escapeHtml(rep.official.name)}</h5>
                        <p class="text-sm ${partyColor}">${escapeHtml(rep.official.party || 'Unknown Party')}</p>
                        <p class="text-sm text-gray-300">${escapeHtml(rep.office.name)}</p>
                    </div>
                </div>
                <div class="mt-3 text-sm">
                    <div class="flex items-center mb-1">
                        <span class="mr-2">📞</span>
                        <span class="${phone === 'No phone available' ? 'text-gray-500' : 'text-gray-300'}">
                            ${phone !== 'No phone available' ? 
                                `<a href="tel:${escapeHtml(phone.replace(/\D/g, ''))}" class="hover:underline">${escapeHtml(phone)}</a>` : 
                                'No phone available'}
                        </span>
                    </div>
                    <div class="flex items-center mb-1">
                        <span class="mr-2">✉️</span>
                        <span class="${email === 'No email available' ? 'text-gray-500' : 'text-gray-300'}">${escapeHtml(email)}</span>
                    </div>
                    ${rep.official.urls && rep.official.urls[0] ? `
                    <div class="flex items-center">
                        <span class="mr-2">🌐</span>
                        <a href="${escapeHtml(rep.official.urls[0])}" target="_blank" class="text-blue-400 hover:text-blue-300">Official Website</a>
                    </div>` : ''}
                </div>
                <div class="mt-3">
                    <button class="email-btn ${emailBtnClass} font-medium py-2 px-4 rounded-lg w-full block text-center" 
                       data-email="${emailAvailable ? escapeHtml(email) : ''}"
                       data-name="${escapeHtml(rep.official.name)}"
                       data-title="${escapeHtml(rep.office.name)}"
                       ${!emailAvailable ? 'disabled' : ''}>
                        Email Representative
                    </button>
                </div>
            `;
            
            repsList.appendChild(repCard);
        });
        
        representativesResults.classList.remove('hidden');
    }

    // Detect user's location
    function detectLocation() {
        if (navigator.geolocation) {
            showLoading();
            navigator.geolocation.getCurrentPosition(
                position => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    getZipCodeFromCoordinates(latitude, longitude);
                },
                error => {
                    hideLoading();
                    showError('Error detecting location: ' + error.message);
                }
            );
        } else {
            showError('Geolocation is not supported by your browser');
        }
    }

    // Get ZIP code from coordinates using reverse geocoding
    async function getZipCodeFromCoordinates(latitude, longitude) {
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`);
            const data = await response.json();

            if (data.status === 'OK') {
                let zipCode = '';
                for (const result of data.results) {
                    for (const component of result.address_components) {
                        if (component.types.includes('postal_code')) {
                            zipCode = component.short_name;
                            break;
                        }
                    }
                    if (zipCode) break;
                }

                if (zipCode) {
                    zipCodeInput.value = zipCode;
                    findRepresentatives(zipCode);
                } else {
                    showError('Could not find ZIP code for your location');
                    hideLoading();
                }
            } else {
                showError('Error getting location data: ' + data.status);
                hideLoading();
            }
        } catch (error) {
            showError('Error getting location data: ' + error.message);
            hideLoading();
        }
    }

    // Initialize the application
    function init() {
        if (findRepsBtn) {
            findRepsBtn.addEventListener('click', () => {
                const zipCode = zipCodeInput.value.trim();
                if (zipCode) {
                    findRepresentatives(zipCode);
                } else {
                    showError('Please enter a valid ZIP code');
                }
            });
        }

        if (detectLocationBtn) {
            detectLocationBtn.addEventListener('click', detectLocation);
        }

        if (zipCodeInput) {
            zipCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const zipCode = zipCodeInput.value.trim();
                    if (zipCode) {
                        findRepresentatives(zipCode);
                    } else {
                        showError('Please enter a valid ZIP code');
                    }
                }
            });
        }

        // Add event delegation for email buttons
        document.addEventListener('click', function(event) {
            // Check if the clicked element has the 'email-btn' class
            if (event.target.classList.contains('email-btn') && !event.target.disabled) {
                const email = event.target.getAttribute('data-email');
                const name = event.target.getAttribute('data-name');
                const title = event.target.getAttribute('data-title');
                
                if (email) {
                    openEmailClient(email, name, title);
                }
            }
        });
    }

    // Initialize the application when the DOM is loaded
    init();

});