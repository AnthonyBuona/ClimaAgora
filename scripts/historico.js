const searchFormHist = document.querySelector("#search-form-hist");
const cityInputHist = searchFormHist.querySelector("input[type='search']");
const dateInput = searchFormHist.querySelector("#date-input");
const cityNameElementHist = document.querySelector("#city-name");
const selectedDateElement = document.querySelector("#selected-date");
const container = document.querySelector("#historical-data-container");
const themeToggleButtonHist = document.getElementById('theme-toggle');
const animationBgHist = document.getElementById('animation-bg');
let historicalChart = null;
let starsGeneratedHist = false;

const searchHistoricalWeather = async (city, date) => {
    sessionStorage.setItem('lastSearchedCity', city);
    cityNameElementHist.textContent = "Carregando...";
    container.innerHTML = `<div class="d-flex justify-content-center align-items-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    const location = await getCoordinatesHist(city);
    if (location) {
        getHistoricalData(location, date);
    } else {
        cityNameElementHist.textContent = "Cidade não encontrada";
        container.innerHTML = "<p class='text-center'>Não foi possível encontrar dados para a cidade informada.</p>";
    }
};

const getCoordinatesHist = async (city) => {
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
    const historicalUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${date}&end_date=${date}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max&hourly=temperature_2m&wind_speed_unit=kmh&timezone=auto`;
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
        cityNameElementHist.textContent = `${location.name}, ${location.state}`;
        container.innerHTML = `<p class='text-center'>Não foram encontrados dados históricos para a data selecionada.</p>`;
    }
};

const updateHistoricalUI = (data, location, date) => {
    cityNameElementHist.textContent = `${location.name}, ${location.state}`;
    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    selectedDateElement.textContent = formattedDate;
    const daily = data.daily;
    const iconClass = getWeatherIconHist(daily.weather_code[0]);
    const description = getWeatherDescriptionHist(daily.weather_code[0]);
    const maxTemp = Math.round(daily.temperature_2m_max[0]);
    const minTemp = Math.round(daily.temperature_2m_min[0]);
    const precipitation = daily.precipitation_sum[0].toFixed(1);
    const wind = daily.wind_speed_10m_max[0].toFixed(1);
    const sunrise = new Date(daily.sunrise[0]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(daily.sunset[0]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    container.innerHTML = `
        <div class="row align-items-center mb-4">
            <div class="col-lg-4 text-center mb-4 mb-lg-0">
                <i class="bi ${iconClass} display-1"></i>
                <p class="fs-4 mt-2 mb-0">${description}</p>
            </div>
            <div class="col-lg-8">
                <div class="row text-center">
                    <div class="col-6 col-sm-3 mb-3"><p class="mb-1"><i class="bi bi-thermometer-high me-1"></i> Máx.</p><p class="fw-bold fs-4 mb-0">${maxTemp}°C</p></div>
                    <div class="col-6 col-sm-3 mb-3"><p class="mb-1"><i class="bi bi-thermometer-low me-1"></i> Mín.</p><p class="fw-bold fs-4 mb-0">${minTemp}°C</p></div>
                    <div class="col-6 col-sm-3 mb-3"><p class="mb-1"><i class="bi bi-cloud-drizzle-fill me-1"></i> Chuva</p><p class="fw-bold fs-4 mb-0">${precipitation} mm</p></div>
                    <div class="col-6 col-sm-3 mb-3"><p class="mb-1"><i class="bi bi-wind me-1"></i> Vento</p><p class="fw-bold fs-4 mb-0">${wind} km/h</p></div>
                    <div class="col-6"><p class="mb-1"><i class="bi bi-sunrise-fill me-1"></i> Nascer do Sol</p><p class="fw-bold fs-5 mb-0">${sunrise}</p></div>
                    <div class="col-6"><p class="mb-1"><i class="bi bi-sunset-fill me-1"></i> Pôr do Sol</p><p class="fw-bold fs-5 mb-0">${sunset}</p></div>
                </div>
            </div>
        </div>
        <hr>
        <h5 class="text-center my-4">Temperatura ao Longo do Dia</h5>
        <div class="chart-container"><canvas id="historical-chart"></canvas></div>
    `;
    renderChart(data.hourly);
};

const renderChart = (hourlyData) => {
    const ctx = document.getElementById('historical-chart').getContext('2d');
    const labels = hourlyData.time.map(t => new Date(t).getHours() + 'h');
    const temperatures = hourlyData.temperature_2m.map(temp => Math.round(temp));
    const isDark = document.body.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const fontColor = isDark ? '#e0e0e0' : '#333';
    const pointColor = isDark ? '#6dd5ed' : '#2193b0';
    const pointBorderColor = isDark ? '#1a2a3a' : '#ffffff';
    if (historicalChart) {
        historicalChart.destroy();
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    if (isDark) {
        gradient.addColorStop(0, 'rgba(109, 213, 237, 0.5)');
        gradient.addColorStop(1, 'rgba(109, 213, 237, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(33, 147, 176, 0.5)');
        gradient.addColorStop(1, 'rgba(33, 147, 176, 0)');
    }
    historicalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperatura',
                data: temperatures,
                fill: true,
                borderColor: pointColor,
                backgroundColor: gradient,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: pointColor,
                pointBorderColor: pointBorderColor,
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: pointColor,
                pointHoverBorderColor: pointBorderColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: isDark ? 'rgba(20, 35, 49, 0.85)' : 'rgba(255,255,255,0.9)',
                    titleColor: fontColor,
                    bodyColor: fontColor,
                    borderColor: pointColor,
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (context) => `Às ${context[0].label}`,
                        label: (context) => `Temperatura: ${context.parsed.y}°C`
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: fontColor, padding: 10, callback: (value) => value + '°C' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: fontColor, padding: 10, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }
                }
            }
        }
    });
}

const getWeatherDescriptionHist = (code) => {
    const descriptions = {0: "Céu limpo", 1: "Principalmente limpo", 2: "Parcialmente nublado", 3: "Nublado", 45: "Nevoeiro", 48: "Nevoeiro com geada", 51: "Garoa leve", 53: "Garoa moderada", 55: "Garoa densa", 61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte", 80: "Pancadas de chuva", 81: "Pancadas de chuva", 82: "Pancadas de chuva", 95: "Trovoada", 96: "Trovoada", 99: "Trovoada"};
    return descriptions[code] || "Condição desconhecida";
};

const getWeatherIconHist = (code) => {
    if ([0, 1].includes(code)) return "bi-sun-fill";
    if ([2].includes(code)) return "bi-cloud-sun-fill";
    if ([3].includes(code)) return "bi-cloud-fill";
    if ([45, 48].includes(code)) return "bi-cloud-fog2-fill";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "bi-cloud-rain-heavy-fill";
    if ([95, 96, 99].includes(code)) return "bi-cloud-lightning-rain-fill";
    return "bi-question-circle-fill";
};

const generateStarLayersHist = () => {
    if (starsGeneratedHist) return;
    const generateShadows = (n) => {
        let shadows = '';
        for (let i = 0; i < n; i++) {
            shadows += `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF, `;
        }
        return shadows.slice(0, -2);
    };
    const stars1 = document.getElementById('stars');
    const stars2 = document.getElementById('stars2');
    const stars3 = document.getElementById('stars3');
    if (stars1) stars1.style.boxShadow = generateShadows(700);
    if (stars2) stars2.style.boxShadow = generateShadows(200);
    if (stars3) stars3.style.boxShadow = generateShadows(100);
    starsGeneratedHist = true;
};

const updateBackgroundFromStorageHist = () => {
    const code = parseInt(sessionStorage.getItem('lastWeatherCode'));
    const windSpeed = parseFloat(sessionStorage.getItem('lastWindSpeed'));
    const isDay = parseInt(sessionStorage.getItem('lastIsDay'));
    if (isNaN(code) || isNaN(windSpeed) || isNaN(isDay)) return;
    animationBgHist.className = '';
    const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
    const isSkyVisible = [0, 1, 2, 3].includes(code);
    const isWindy = windSpeed > 15;
    const isNight = isDay === 0;
    const isDarkMode = document.body.classList.contains('dark');

    if (isRain) {
        animationBgHist.classList.add('rain');
    } else if (isSkyVisible && !isDarkMode) {
        animationBgHist.classList.add('sunny');
    } else if (isSkyVisible && isDarkMode) {
        animationBgHist.classList.add('stars');
        generateStarLayersHist();
    } else if (isWindy) {
        animationBgHist.classList.add('windy');
    }
};

searchFormHist.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = cityInputHist.value.trim();
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

const applyThemeHist = (theme) => {
    const bodyHist = document.body;
    const themeToggleIconHist = themeToggleButtonHist.querySelector('i');
    if (theme === 'dark') {
        bodyHist.classList.add('dark');
        themeToggleIconHist.className = 'bi bi-sun-fill';
    } else {
        bodyHist.classList.remove('dark');
        themeToggleIconHist.className = 'bi bi-moon-fill';
    }
};

themeToggleButtonHist.addEventListener('click', () => {
    const isDarkMode = document.body.classList.contains('dark');
    const newTheme = isDarkMode ? 'light' : 'dark';
    applyThemeHist(newTheme);
    localStorage.setItem('theme', newTheme);
    setTimeout(updateBackgroundFromStorageHist, 50);
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyThemeHist(savedTheme);
    updateBackgroundFromStorageHist();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    dateInput.value = yesterday.toISOString().split('T')[0];
    dateInput.max = yesterday.toISOString().split('T')[0];
    const lastCity = sessionStorage.getItem('lastSearchedCity') || "Presidente Prudente";
    cityInputHist.value = lastCity;
    if(lastCity && dateInput.value) {
        searchHistoricalWeather(lastCity, dateInput.value);
    }
});
