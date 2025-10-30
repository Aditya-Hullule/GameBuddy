// DOM Elements
const loader = document.getElementById('loader');
const dealsContainer = document.getElementById('deals-container');
const noResults = document.getElementById('no-results');
const searchBar = document.getElementById('search-bar');
const sortByEl = document.getElementById('sort-by');
const storeFilterEl = document.getElementById('store-filter');
const genreFilterEl = document.getElementById('genre-filter');
const priceFilterEl = document.getElementById('price-filter');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

const infoModal = document.getElementById('info-modal');
const infoModalTitle = document.getElementById('info-modal-title');
const infoContent = document.getElementById('info-content');
const closeInfoModalBtn = infoModal.querySelector('#close-info-modal-btn');
const tabsContainer = infoModal.querySelector('nav');

const allDealsModal = document.getElementById('all-deals-modal');
const allDealsModalTitle = document.getElementById('all-deals-modal-title');
const allDealsContent = document.getElementById('all-deals-content');
const closeAllDealsModalBtn = allDealsModal.querySelector('#close-all-deals-modal-btn');

// App State
let storeInfo = {};
let geminiCache = {};
let activeGameTitle = '';

// --- Core App Logic ---

async function fetchStoresAndFilters() {
    // Fetch Store Info
    try {
        const response = await fetch('https://www.cheapshark.com/api/1.0/stores');
        const stores = await response.json();
        storeFilterEl.innerHTML = '<option value="">All Stores</option>';
        stores.forEach(store => {
            if(store.isActive) {
                storeInfo[store.storeID] = { name: store.storeName, icon: `https://www.cheapshark.com${store.images.icon}` };
                const option = document.createElement('option');
                option.value = store.storeID;
                option.textContent = store.storeName;
                storeFilterEl.appendChild(option);
            }
        });
    } catch (error) { console.error("Error fetching store info:", error); }

    // Populate Sort Options
    const sortOptions = ["Deal Rating", "Price", "Savings", "Metacritic", "Title", "Release"];
    sortByEl.innerHTML = sortOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('');

    // Populate Genre Options
    const genres = ["Action", "Adventure", "RPG", "Strategy", "Simulation", "Sports", "Racing", "Puzzle", "Horror", "MMO"];
    genreFilterEl.innerHTML = '<option value="">All Genres</option>' + genres.map(g => `<option value="${g}">${g}</option>`).join('');
}

async function fetchDeals() {
    loader.style.display = 'flex';
    dealsContainer.innerHTML = '';
    noResults.classList.add('hidden');

    const searchTerm = searchBar.value;
    const sortBy = sortByEl.value;
    const storeID = storeFilterEl.value;
    const upperPrice = priceFilterEl.value;
    const genre = genreFilterEl.value;

    // Combine search term with genre for title search
    let titleQuery = searchTerm;
    if (genre) {
        titleQuery = titleQuery ? `${titleQuery} ${genre}` : genre;
    }

    let url = `https://www.cheapshark.com/api/1.0/deals?onSale=1&pageSize=30&sortBy=${sortBy}`;
    if (titleQuery) url += `&title=${encodeURIComponent(titleQuery)}`;
    if (storeID) url += `&storeID=${storeID}`;
    if (upperPrice) url += `&upperPrice=${upperPrice}`;

    try {
        const response = await fetch(url);
        let deals = await response.json();
        displayDeals(deals);
    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Could not load deals.</p>`;
    } finally {
        loader.style.display = 'none';
    }
}

// --- UI Rendering ---

function displayDeals(deals) {
    dealsContainer.innerHTML = '';
    if (deals.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');

    deals.forEach(deal => {
        const dealCard = document.createElement('div');
        dealCard.className = `deal-card bg-gray-800 rounded-lg overflow-hidden flex flex-col`;
        
        const metacriticScore = deal.metacriticScore;
        let metacriticColor = 'bg-gray-600';
        if (metacriticScore >= 75) metacriticColor = 'bg-green-600';
        else if (metacriticScore >= 50) metacriticColor = 'bg-yellow-600';
        else if (metacriticScore > 0) metacriticColor = 'bg-red-600';

        dealCard.innerHTML = `
            <img src="${deal.thumb}" alt="${deal.title}" class="w-full h-32 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/300x150/1f2937/ffffff?text=No+Image';">
            <div class="p-3 flex flex-col flex-grow">
                <h3 class="text-sm font-semibold text-white mb-1 truncate" title="${deal.title}">${deal.title}</h3>
                <div class="flex items-center mb-2 text-xs text-gray-400">
                    ${storeInfo[deal.storeID] ? `<img src="${storeInfo[deal.storeID].icon}" alt="${storeInfo[deal.storeID].name}" class="w-4 h-4 mr-1.5 rounded-sm">` : ''}
                    <span>${storeInfo[deal.storeID] ? storeInfo[deal.storeID].name : 'Unknown Store'}</span>
                </div>
                <div class="flex justify-between items-center mb-2 text-xs">
                    <span class="font-bold ${metacriticColor} text-white py-1 px-2 rounded">MC: ${metacriticScore > 0 ? metacriticScore : 'N/A'}</span>
                    <span class="font-bold bg-blue-600 text-white py-1 px-2 rounded">${Math.round(deal.savings)}% OFF</span>
                </div>
                <div class="mt-auto pt-2">
                    <div class="flex justify-between items-center mb-3">
                        <p class="text-gray-500 line-through text-md">$${deal.normalPrice}</p>
                        <p class="text-xl font-bold text-green-400">$${deal.salePrice}</p>
                    </div>
                    <a href="https://www.cheapshark.com/redirect?dealID=${deal.dealID}" target="_blank" rel="noopener noreferrer" class="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-center text-sm transition-colors mb-2">
                        Buy Now
                    </a>
                    <button data-game-id="${deal.gameID}" data-title="${deal.title}" class="other-deals-btn block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-md text-center text-sm transition-colors mb-2">Other Stores</button>
                    <button data-title="${deal.title}" class="insights-btn block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-md text-center text-sm transition-colors">
                        About
                    </button>
                </div>
            </div>
        `;
        
        dealsContainer.appendChild(dealCard);
    });
}

// --- Gemini API Integration (NOTE: API Key is a placeholder and managed externally in a secure environment) ---

function setContentLoading(element) {
    element.innerHTML = `<div class="flex justify-center items-center p-8"><div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-600 h-12 w-12"></div></div>`;
}

// --- Replacement for callGeminiAPI function in script.js ---

async function callGeminiAPI(prompt) {
    // 1. Define the endpoint of YOUR local proxy server
    const proxyUrl = '${PROXY_BASE_URL}/api/gemini'; 

    // 2. The API key is NO longer used or needed here!

    const payload = { prompt: prompt };

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Proxy Server Error:", errorBody);
            throw new Error(`API request failed: ${response.status} - ${errorBody.error || 'Unknown error'}`);
        }
        
        const result = await response.json();
        
        // The server now sends back a clean { text: "..." } object
        if (result.text) {
            return result.text;
        }
        throw new Error("Invalid response structure from proxy server.");
    } catch (error) {
        console.error("Front-end failed to reach proxy:", error);
        throw new Error(`Could not connect to the insight service.`);
    }
}

async function handleTabContent(tab) {
    if (geminiCache[activeGameTitle] && geminiCache[activeGameTitle][tab]) {
        infoContent.innerHTML = geminiCache[activeGameTitle][tab];
        return;
    }

    setContentLoading(infoContent);
    let prompt = '';
    let contentHtml = '';

    try {
        switch(tab) {
            case 'summary':
                prompt = `Provide a short, exciting summary for the video game titled '${activeGameTitle}'. Focus on the gameplay, story, and what makes it unique. Keep it to 2-4 sentences. Format it as a single paragraph.`;
                const summary = await callGeminiAPI(prompt);
                contentHtml = `<p class="text-lg leading-relaxed">${summary}</p>`;
                break;
            case 'pros-cons':
                prompt = `List the top 3 pros and top 3 cons for the video game '${activeGameTitle}'. Use markdown bullet points. Format as: ### Pros\n- Point\n\n### Cons\n- Point`;
                let prosCons = await callGeminiAPI(prompt);
                // Basic markdown to HTML conversion
                prosCons = prosCons
                    .replace(/### Pros/g, '<h4 class="text-lg font-semibold text-green-400 mt-2 mb-1">Pros</h4>')
                    .replace(/### Cons/g, '<h4 class="text-lg font-semibold text-red-400 mt-4 mb-1">Cons</h4>')
                    .replace(/\* (.*?)\n/g, '<li class="ml-4">$1</li>')
                    .replace(/- (.*?)\n/g, '<li class="ml-4">$1</li>')
                    .replace(/\n/g, '<br>');
                contentHtml = `<ul class="list-disc list-inside space-y-1">${prosCons}</ul>`;
                break;
            case 'similar':
                prompt = `List 5 popular games that are very similar to '${activeGameTitle}'. Only list the titles, separated by commas.`;
                const similarGames = await callGeminiAPI(prompt);
                const gamesList = similarGames.split(',').map(g => g.trim());
                contentHtml = '<h4 class="text-lg font-semibold text-purple-400 mb-2">You might also like:</h4><ul class="list-disc list-inside space-y-1">';
                gamesList.forEach(game => {
                    contentHtml += `<li>${game}</li>`;
                });
                contentHtml += '</ul>';
                break;
        }
        infoContent.innerHTML = contentHtml;
        if (!geminiCache[activeGameTitle]) geminiCache[activeGameTitle] = {};
        geminiCache[activeGameTitle][tab] = contentHtml;
    } catch (error) {
        console.error(`Error fetching ${tab}:`, error);
        infoContent.innerHTML = `<p class="text-red-400">Sorry, I couldn't generate insights. ${error.message}</p>`;
    }
}

// --- Modals and Event Handlers ---

function openModal(modal) {
    modal.classList.remove('hidden', 'modal-enter');
    document.body.classList.add('overflow-hidden');
}

function closeModal(modal) {
    modal.classList.add('modal-enter');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }, 200);
}

async function showAllDeals(gameID, title) {
    allDealsModalTitle.textContent = `Other Deals for ${title}`;
    openModal(allDealsModal);
    setContentLoading(allDealsContent);

    try {
        const response = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${gameID}`);
        const data = await response.json();
        
        let dealsHtml = '<div class="space-y-3">';
        if (data.deals && data.deals.length > 0) {
            data.deals.forEach(deal => {
                const store = storeInfo[deal.storeID];
                const savings = Math.round(((deal.retailPrice - deal.price) / deal.retailPrice) * 100);
                dealsHtml += `
                    <div class="flex justify-between items-center bg-gray-700/50 p-3 rounded-md">
                        <div class="flex items-center">
                            ${store ? `<img src="${store.icon}" class="w-6 h-6 mr-3 rounded-sm">` : ''}
                            <div>
                                <p class="font-semibold">${store ? store.name : 'Unknown Store'}</p>
                                <p class="text-xs text-gray-400">Retail: <span class="line-through">$${deal.retailPrice}</span></p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                               <span class="font-bold bg-blue-600 text-white text-xs py-1 px-2 rounded">${savings > 0 ? `${savings}% OFF` : 'Standard'}</span>
                            <div class="text-right">
                                <p class="text-lg font-bold text-green-400">$${deal.price}</p>
                                <a href="https://www.cheapshark.com/redirect?dealID=${deal.dealID}" target="_blank" class="text-sm text-indigo-400 hover:underline">Go to Deal</a>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            dealsHtml += `<p class="text-gray-400">No other deals found for this game at the moment.</p>`;
        }
        dealsHtml += `</div>`;
        allDealsContent.innerHTML = dealsHtml;
    } catch (error) {
        console.error("Error fetching all deals:", error);
        allDealsContent.innerHTML = `<p class="text-red-500 text-center">Could not load deals.</p>`;
    }
}

function handleTabClick(e) {
    const clickedTab = e.target.closest('.tab-btn');
    if (!clickedTab) return;

    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
    clickedTab.classList.add('active-tab');
    handleTabContent(clickedTab.dataset.tab);
}

function setupEventListeners() {
    let searchTimeout;
    searchBar.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchDeals, 500);
    });
    
    [sortByEl, storeFilterEl, priceFilterEl, genreFilterEl].forEach(el => {
        el.addEventListener('change', fetchDeals);
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchBar.value = '';
        sortByEl.value = 'Deal Rating';
        storeFilterEl.value = '';
        priceFilterEl.value = '';
        genreFilterEl.value = '';
        fetchDeals();
    });

    dealsContainer.addEventListener('click', (e) => {
        const insightsBtn = e.target.closest('.insights-btn');
        const otherDealsBtn = e.target.closest('.other-deals-btn');

        if (insightsBtn) {
            activeGameTitle = insightsBtn.dataset.title;
            infoModalTitle.textContent = `${activeGameTitle}: AI Insights`;
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
            tabsContainer.querySelector('[data-tab="summary"]').classList.add('active-tab');
            openModal(infoModal);
            handleTabContent('summary');
        }

        if (otherDealsBtn) {
            showAllDeals(otherDealsBtn.dataset.gameId, otherDealsBtn.dataset.title);
        }
    });
    
    // Modal listeners
    closeInfoModalBtn.addEventListener('click', () => closeModal(infoModal));
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) closeModal(infoModal);
    });
    tabsContainer.addEventListener('click', handleTabClick);

    closeAllDealsModalBtn.addEventListener('click', () => closeModal(allDealsModal));
    allDealsModal.addEventListener('click', (e) => {
        if (e.target === allDealsModal) closeModal(allDealsModal);
    });
}

// Initial Load
async function init() {
    setupEventListeners();
    await fetchStoresAndFilters();
    await fetchDeals();
}

init();