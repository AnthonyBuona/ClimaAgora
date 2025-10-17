const searchForm = document.querySelector("#search-form-main");
const cityInput = document.querySelector("input[type='search']");
const cityNameElement = document.querySelector(".weather-card h1");
const dateElement = document.querySelector(".weather-card .lead");
const mainIconElement = document.querySelector(".main-weather-icon");
const temperatureElement = document.querySelector(".main-temp");
const descriptionElement = document.querySelector(".weather-card .fs-4");
const feelsLikeElement = document.querySelector("#feels-like");
const humidityElement = document.querySelector("#humidity");
const windElement = document.querySelector("#wind");
const pressureElement = document.querySelector("#pressure");
const dailyForecastContainer = document.querySelector("#daily-forecast-container");
const hourlyForecastContainer = document.querySelector(".hourly-forecast-container");
const animationBg = document.getElementById('animation-bg');

let lastCurrentWeather = null;
let starsGenerated = false;

const searchCity = async (city) => {
    sessionStorage.setItem('lastSearchedCity', city);
    cityNameElement.textContent = "Carregando...";
    dateElement.textContent = "";
    dailyForecastContainer.innerHTML = `<div class="d-flex justify-content-center align-items-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    hourlyForecastContainer.innerHTML = `<div class="d-flex justify-content-center align-items-center p-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    const location = await getCoordinates(city);
    if (location) {
        getWeatherData(location);
    } else {
        cityNameElement.textContent = "Cidade não encontrada";
        hourlyForecastContainer.innerHTML = "";
        dailyForecastContainer.innerHTML = "<p class='text-center'>Não foi possível encontrar dados para a cidade informada.</p>";
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

const getWeatherData = async (location) => {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=kmh&timezone=auto`;
    try {
        const response = await fetch(weatherUrl);
        const data = await response.json();
        updateUI(data, location);
    } catch (error) {
        alert("Ocorreu um erro ao buscar os dados do clima.");
        console.error(error);
    }
};

const updateUI = (weatherData, locationData) => {
    const current = weatherData.current;
    lastCurrentWeather = current;

    sessionStorage.setItem('lastWeatherCode', current.weather_code);
    sessionStorage.setItem('lastWindSpeed', current.wind_speed_10m);
    sessionStorage.setItem('lastIsDay', current.is_day);

    cityNameElement.textContent = `${locationData.name}, ${locationData.state}`;
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    temperatureElement.textContent = `${Math.round(current.temperature_2m)}°C`;
    descriptionElement.textContent = getWeatherDescription(current.weather_code);
    feelsLikeElement.textContent = `${Math.round(current.apparent_temperature)}°C`;
    humidityElement.textContent = `${current.relative_humidity_2m}%`;
    windElement.textContent = `${current.wind_speed_10m.toFixed(1)} km/h`;
    pressureElement.textContent = `${Math.round(current.surface_pressure)} hPa`;
    mainIconElement.className = `bi ${getWeatherIcon(current.weather_code, current.is_day)} main-weather-icon me-4`;
    updateDailyForecast(weatherData.daily);
    updateHourlyForecast(weatherData.hourly);
    updateBackground(current.weather_code, current.wind_speed_10m, current.is_day);
};

const generateStarLayers = () => {
    if (starsGenerated) return;
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
    starsGenerated = true;
};

const updateBackground = (code, windSpeed, isDay) => {
    animationBg.className = '';
    const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
    const isSkyVisible = [0, 1, 2, 3].includes(code);
    const isWindy = windSpeed > 15;
    const isNight = isDay === 0;

    if (isRain) {
        animationBg.classList.add('rain');
    } else if (isSkyVisible && isNight) {
        animationBg.classList.add('stars');
        generateStarLayers();
    } else if (isSkyVisible && !isNight) {
        animationBg.classList.add('sunny');
    } else if (isWindy) {
        animationBg.classList.add('windy');
    }
};

const updateHourlyForecast = (hourly) => {
    hourlyForecastContainer.innerHTML = "";
    const now = new Date();
    const startIndex = hourly.time.findIndex(time => new Date(time) > now);
    if (startIndex === -1) return;
    for (let i = startIndex; i < startIndex + 12 && i < hourly.time.length; i++) {
        const date = new Date(hourly.time[i]);
        const hour = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const temp = Math.round(hourly.temperature_2m[i]);
        const isDayTime = new Date(hourly.time[i]).getHours() >= 6 && new Date(hourly.time[i]).getHours() < 18;
        const iconClass = getWeatherIcon(hourly.weather_code[i], isDayTime ? 1 : 0);
        hourlyForecastContainer.innerHTML += `
            <div class="hourly-forecast-item">
                <p class="mb-1">${hour}</p>
                <i class="bi ${iconClass} fs-2"></i>
                <p class="fw-bold fs-5 mb-0">${temp}°C</p>
            </div>
        `;
    }
};

const updateDailyForecast = (daily) => {
    dailyForecastContainer.innerHTML = "";
    for (let i = 1; i < 6 && i < daily.time.length; i++) {
        const date = new Date(daily.time[i] + "T00:00:00");
        const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
        const iconClass = getWeatherIcon(daily.weather_code[i], 1);
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const sunrise = new Date(daily.sunrise[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const sunset = new Date(daily.sunset[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const precipitation = daily.precipitation_probability_max[i];
        const wind = daily.wind_speed_10m_max[i].toFixed(1);
        const collapseId = `collapse-${i}`;
        dailyForecastContainer.innerHTML += `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <span class="fw-bold col-4">${dayOfWeek}</span>
                            <i class="bi ${iconClass} fs-3 col-4 text-center"></i>
                            <span class="col-4 text-end">${minTemp}°C / <strong>${maxTemp}°C</strong></span>
                        </div>
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#daily-forecast-container">
                    <div class="accordion-body">
                        <div class="row">
                            <div class="col-6 mb-2"><i class="bi bi-cloud-drizzle-fill me-2"></i><strong>Chuva:</strong> ${precipitation}%</div>
                            <div class="col-6 mb-2"><i class="bi bi-wind me-2"></i><strong>Vento:</strong> ${wind} km/h</div>
                            <div class="col-6"><i class="bi bi-sunrise-fill me-2"></i><strong>Nascer do Sol:</strong> ${sunrise}</div>
                            <div class="col-6"><i class="bi bi-sunset-fill me-2"></i><strong>Pôr do Sol:</strong> ${sunset}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

const getWeatherDescription = (code) => {
    const descriptions = {0: "Céu limpo", 1: "Principalmente limpo", 2: "Parcialmente nublado", 3: "Nublado", 45: "Nevoeiro", 48: "Nevoeiro com geada", 51: "Garoa leve", 53: "Garoa moderada", 55: "Garoa densa", 61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte", 80: "Pancadas de chuva leves", 81: "Pancadas de chuva moderadas", 82: "Pancadas de chuva violentas", 95: "Trovoada", 96: "Trovoada com granizo leve", 99: "Trovoada com granizo forte"};
    return descriptions[code] || "Condição desconhecida";
};

const getWeatherIcon = (code, isDay) => {
    const isNight = isDay === 0;
    if ([0, 1].includes(code)) return isNight ? "bi-moon-stars-fill" : "bi-sun-fill";
    if ([2].includes(code)) return isNight ? "bi-cloud-moon-fill" : "bi-cloud-sun-fill";
    if ([3].includes(code)) return "bi-cloud-fill";
    if ([45, 48].includes(code)) return "bi-cloud-fog2-fill";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "bi-cloud-rain-heavy-fill";
    if ([95, 96, 99].includes(code)) return "bi-cloud-lightning-rain-fill";
    return "bi-question-circle-fill";
};

searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        searchCity(city);
        cityInput.value = "";
    }
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
    if (lastCurrentWeather) {
        updateBackground(lastCurrentWeather.weather_code, lastCurrentWeather.wind_speed_10m, lastCurrentWeather.is_day);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    const lastCity = sessionStorage.getItem('lastSearchedCity') || "Presidente Prudente";
    searchCity(lastCity);
});

