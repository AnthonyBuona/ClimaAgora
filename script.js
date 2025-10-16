const searchForm = document.querySelector("form");
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

const searchCity = async (city) => {
    cityNameElement.textContent = "Carregando...";
    dailyForecastContainer.innerHTML = `<div class="d-flex justify-content-center align-items-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`; 
    hourlyForecastContainer.innerHTML = "";
    const location = await getCoordinates(city);
    if (location) {
        getWeatherData(location);
    }
};

const getCoordinates = async (city) => {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=pt&format=json`;
    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        if (!data.results) {
            throw new Error("Cidade não encontrada.");
        }
        const { latitude, longitude, name, admin1 } = data.results[0];
        return { latitude, longitude, name, state: admin1 };
    } catch (error) {
        alert(error.message);
        cityNameElement.textContent = "Erro ao buscar cidade";
        console.error(error);
        return null;
    }
};

const getWeatherData = async (location) => {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=kmh&timezone=auto`;

    try {
        const response = await fetch(weatherUrl);
        const data = await response.json();
        console.log("Resposta da API:", data);

        if (!data || (!data.current && !data.current_weather)) {
            throw new Error("A resposta da API não contém os dados do clima atual.");
        }
        
        updateUI(data, location);
    } catch (error) {
        alert("Ocorreu um erro ao buscar os dados do clima. Verifique o console.");
        console.error(error);
    }
};

const updateUI = (weatherData, locationData) => {
    const currentSource = weatherData.current || weatherData.current_weather;

    const current = {
        temperature: currentSource.temperature_2m ?? currentSource.temperature,
        apparent_temperature: currentSource.apparent_temperature,
        humidity: currentSource.relative_humidity_2m,
        pressure: currentSource.surface_pressure,
        wind_speed: currentSource.wind_speed_10m ?? currentSource.windspeed,
        weather_code: currentSource.weather_code ?? currentSource.weathercode
    };
    
    cityNameElement.textContent = `${locationData.name}, ${locationData.state}`;
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    temperatureElement.textContent = `${Math.round(current.temperature)}°C`;
    descriptionElement.textContent = getWeatherDescription(current.weather_code);
    feelsLikeElement.textContent = `${Math.round(current.apparent_temperature ?? current.temperature)}°C`;
    humidityElement.textContent = `${current.humidity ?? '- '}%`;
    windElement.textContent = `${(current.wind_speed ?? 0).toFixed(1)} km/h`;
    pressureElement.textContent = `${Math.round(current.pressure ?? 0)} hPa`;
    mainIconElement.className = `bi ${getWeatherIcon(current.weather_code)} main-weather-icon me-4`;

    updateDailyForecast(weatherData.daily);
    updateHourlyForecast(weatherData.hourly);
};


const updateHourlyForecast = (hourly) => {
    hourlyForecastContainer.innerHTML = "";
    if (!hourly || !hourly.time) return;

    const now = new Date();
    
    const startIndex = hourly.time.findIndex(time => new Date(time) > now);

    if (startIndex === -1) return; 

    for (let i = startIndex; i < startIndex + 10 && i < hourly.time.length; i++) {
        const date = new Date(hourly.time[i]);
        const hour = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const temp = Math.round(hourly.temperature_2m[i]);
        const iconClass = getWeatherIcon(hourly.weather_code[i]);

        const hourlyItemHTML = `
            <div class="hourly-forecast-item">
                <p class="mb-1">${hour}</p>
                <i class="bi ${iconClass} fs-2"></i>
                <p class="fw-bold fs-5 mb-0">${temp}°C</p>
            </div>
        `;
        hourlyForecastContainer.innerHTML += hourlyItemHTML;
    }
};

const updateDailyForecast = (daily) => {
    dailyForecastContainer.innerHTML = "";
    if (!daily || !daily.time) return;

    for (let i = 1; i < 6 && i < daily.time.length; i++) {
        const date = new Date(daily.time[i] + "T00:00:00");
        const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
        
        const iconClass = getWeatherIcon(daily.weather_code[i]);
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);

        const sunrise = new Date(daily.sunrise[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const sunset = new Date(daily.sunset[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const precipitation = daily.precipitation_probability_max[i];
        const wind = daily.wind_speed_10m_max[i].toFixed(1);

        const collapseId = `collapse-${i}`;

        const forecastItemHTML = `
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
                            <div class="col-6 mb-2">
                                <i class="bi bi-cloud-drizzle-fill me-2"></i><strong>Chuva:</strong> ${precipitation}%
                            </div>
                            <div class="col-6 mb-2">
                                <i class="bi bi-wind me-2"></i><strong>Vento:</strong> ${wind} km/h
                            </div>
                            <div class="col-6">
                                <i class="bi bi-sunrise-fill me-2"></i><strong>Nascer do Sol:</strong> ${sunrise}
                            </div>
                            <div class="col-6">
                                <i class="bi bi-sunset-fill me-2"></i><strong>Pôr do Sol:</strong> ${sunset}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        dailyForecastContainer.innerHTML += forecastItemHTML;
    }
};

const getWeatherDescription = (code) => {
    const descriptions = {
        0: "Céu limpo", 1: "Principalmente limpo", 2: "Parcialmente nublado", 3: "Nublado",
        45: "Nevoeiro", 48: "Nevoeiro com geada",
        51: "Garoa leve", 53: "Garoa moderada", 55: "Garoa densa",
        61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte",
        80: "Pancadas de chuva leves", 81: "Pancadas de chuva moderadas", 82: "Pancadas de chuva violentas",
        95: "Trovoada", 96: "Trovoada com granizo leve", 99: "Trovoada com granizo forte"
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
    if (city) {
        searchCity(city);
        cityInput.value = "";
    }
});

const themeToggleButton = document.getElementById('theme-toggle');
const themeToggleIcon = themeToggleButton.querySelector('i');
const body = document.body;

// Função para aplicar o tema (claro ou escuro)
const applyTheme = (theme) => {
    if (theme === 'dark') {
        body.classList.add('dark');
        themeToggleIcon.className = 'bi bi-sun-fill';
    } else {
        body.classList.remove('dark');
        themeToggleIcon.className = 'bi bi-moon-fill';
    }
};

// Evento de clique no botão
themeToggleButton.addEventListener('click', () => {
    // Verifica se o corpo JÁ TEM a classe 'dark'
    const isDarkMode = body.classList.contains('dark');
    // Se tiver, o novo tema será 'light', senão, será 'dark'
    const newTheme = isDarkMode ? 'light' : 'dark';
    
    // Aplica o novo tema
    applyTheme(newTheme);
    // Salva a preferência no armazenamento local do navegador
    localStorage.setItem('theme', newTheme);
});


// Verifica se há um tema salvo no localStorage quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    // Carrega o tema salvo ou usa 'light' como padrão
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // Mantém a busca inicial pela cidade
    searchCity("Presidente Prudente");
});
