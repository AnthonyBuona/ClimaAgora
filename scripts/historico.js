const searchForm = document.querySelector("#search-form-hist");
const cityInput = searchForm.querySelector("input[type='search']");
const dateInput = searchForm.querySelector("#date-input");
const cityNameElement = document.querySelector("#city-name");
const selectedDateElement = document.querySelector("#selected-date");
const container = document.querySelector("#historical-data-container");

const searchHistoricalWeather = async (city, date) => {
    sessionStorage.setItem('lastSearchedCity', city);
    cityNameElement.textContent = "Carregando...";
    container.innerHTML = `<div class="d-flex justify-content-center align-items-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

    const location = await getCoordinates(city);
    if (location) {
        getHistoricalData(location, date);
    } else {
        cityNameElement.textContent = "Cidade não encontrada";
        container.innerHTML = "<p>Não foi possível encontrar dados para a cidade informada.</p>";
    }
};

const getCoordinates = async (city) => {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        if (!data.results) {
            throw new Error("Cidade não encontrada.");
        }
        const { latitude, longitude, name, admin1 } = data.results[0];
        return { latitude, longitude, name, state: admin1 || '' };
    } catch (error) {
        console.error(error);
        return null;
    }
};

const getHistoricalData = async (location, date) => {
    const historicalUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${date}&end_date=${date}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&wind_speed_unit=kmh&timezone=auto`;

    try {
        const response = await fetch(historicalUrl);
        const data = await response.json();
        if (!data.daily || !data.daily.time.length) {
            throw new Error("Não há dados para a data selecionada.");
        }
        updateHistoricalUI(data, location, date);
    } catch (error) {
        alert(error.message);
        console.error(error);
        cityNameElement.textContent = `${location.name}, ${location.state}`;
        container.innerHTML = `<p>Não foram encontrados dados históricos para a data selecionada.</p>`;
    }
};

const updateHistoricalUI = (data, location, date) => {
    cityNameElement.textContent = `${location.name}, ${location.state}`;
    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    selectedDateElement.textContent = formattedDate;

    const daily = data.daily;
    const iconClass = getWeatherIcon(daily.weather_code[0]);
    const description = getWeatherDescription(daily.weather_code[0]);
    const maxTemp = Math.round(daily.temperature_2m_max[0]);
    const minTemp = Math.round(daily.temperature_2m_min[0]);
    const precipitation = daily.precipitation_sum[0].toFixed(1);
    const wind = daily.wind_speed_10m_max[0].toFixed(1);

    container.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-4 text-center mb-4 mb-md-0">
                <i class="bi ${iconClass} display-1"></i>
                <p class="fs-4 mt-2">${description}</p>
            </div>
            <div class="col-md-8">
                <div class="row text-center">
                    <div class="col-6 mb-3">
                        <p class="mb-1">Máxima</p>
                        <p class="fw-bold fs-3 mb-0">${maxTemp}°C</p>
                    </div>
                    <div class="col-6 mb-3">
                        <p class="mb-1">Mínima</p>
                        <p class="fw-bold fs-3 mb-0">${minTemp}°C</p>
                    </div>
                    <div class="col-6">
                        <p class="mb-1">Precipitação</p>
                        <p class="fw-bold fs-3 mb-0">${precipitation} mm</p>
                    </div>
                    <div class="col-6">
                        <p class="mb-1">Vento Máx.</p>
                        <p class="fw-bold fs-3 mb-0">${wind} km/h</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const getWeatherDescription = (code) => {
    const descriptions = {
        0: "Céu limpo", 1: "Principalmente limpo", 2: "Parcialmente nublado", 3: "Nublado",
        45: "Nevoeiro", 48: "Nevoeiro com geada",
        51: "Garoa leve", 53: "Garoa moderada", 55: "Garoa densa",
        61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte",
        80: "Pancadas de chuva", 81: "Pancadas de chuva", 82: "Pancadas de chuva",
        95: "Trovoada", 96: "Trovoada", 99: "Trovoada"
    };
    return descriptions[code] || "Condição desconhecida";
};

const getWeatherIcon = (code) => {
    if ([0, 1].includes(code)) return "bi-sun-fill";
    if ([2].includes(code)) return "bi-cloud-sun-fill";
    if ([3].includes(code)) return "bi-cloud-fill";
    if ([45, 48].includes(code)) return "bi-cloud-fog2-fill";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "bi-cloud-rain-heavy-fill";
    if ([95, 96, 99].includes(code)) return "bi-cloud-lightning-rain-fill";
    return "bi-question-circle-fill";
};

searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    const date = dateInput.value;
    if (!city) {
        alert("Por favor, insira o nome de uma cidade.");
        return;
    }
    if (!date) {
        alert("Por favor, selecione uma data.");
        return;
    }
    searchHistoricalWeather(city, date);
});

const themeToggleButton = document.getElementById('theme-toggle');
const themeToggleIcon = themeToggleButton.querySelector('i');
const body = document.body;

const applyTheme = (theme) => {
    if (theme === 'dark') {
        body.classList.add('dark');
        themeToggleIcon.className = 'bi bi-sun-fill';
    } else {
        body.classList.remove('dark');
        themeToggleIcon.className = 'bi bi-moon-fill';
    }
};

themeToggleButton.addEventListener('click', () => {
    const isDarkMode = body.classList.contains('dark');
    const newTheme = isDarkMode ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    dateInput.value = yesterday.toISOString().split('T')[0];
    dateInput.max = yesterday.toISOString().split('T')[0];

    const lastCity = sessionStorage.getItem('lastSearchedCity') || "Presidente Prudente";
    cityInput.value = lastCity;
});

