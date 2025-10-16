const searchForm = document.querySelector("#search-form-aq");
const cityInput = searchForm.querySelector("input[type='search']");
const cityNameElement = document.querySelector("#city-name");
const aqiValueElement = document.querySelector("#aqi-value");
const aqiLevelElement = document.querySelector("#aqi-level");
const needle = document.getElementById('gauge-needle');
const healthRec = document.getElementById('health-recommendation');
const pm2_5_value = document.getElementById('pm2_5_value');
const pm2_5_progress = document.getElementById('pm2_5_progress');
const pm10_value = document.getElementById('pm10_value');
const pm10_progress = document.getElementById('pm10_progress');
const ozone_value = document.getElementById('ozone_value');
const ozone_progress = document.getElementById('ozone_progress');
const nitrogen_dioxide_value = document.getElementById('nitrogen_dioxide_value');
const nitrogen_dioxide_progress = document.getElementById('nitrogen_dioxide_progress');

const searchCity = async (city) => {
    sessionStorage.setItem('lastSearchedCity', city);
    cityNameElement.textContent = "Carregando...";
    aqiValueElement.textContent = "-";
    aqiLevelElement.textContent = "...";
    healthRec.textContent = "Buscando dados da cidade para exibir as recomendações.";
    
    const location = await getCoordinates(city);
    if (location) {
        getAirQualityData(location);
    } else {
        cityNameElement.textContent = "Cidade não encontrada";
        healthRec.textContent = "Não foi possível encontrar dados para a cidade informada."
    }
};

const getCoordinates = async (city) => {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        if (!data.results) throw new Error("Cidade não encontrada.");
        const { latitude, longitude, name, admin1 } = data.results[0];
        return { latitude, longitude, name, state: admin1 || '' };
    } catch (error) {
        console.error(error);
        return null;
    }
};

const getAirQualityData = async (location) => {
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi&timezone=auto`;

    try {
        const response = await fetch(airQualityUrl);
        const data = await response.json();
        updateAirQualityUI(data, location);
    } catch (error) {
        alert("Ocorreu um erro ao buscar os dados de qualidade do ar.");
        console.error(error);
    }
};

const updateAirQualityUI = (data, location) => {
    cityNameElement.textContent = `${location.name}, ${location.state}`;
    
    const now = new Date();
    now.setMinutes(0, 0, 0); 
    const currentTimeISO = now.toISOString().slice(0, 16); 
    const currentIndex = data.hourly.time.findIndex(time => time.startsWith(currentTimeISO.slice(0, 13)));

    if (currentIndex === -1) {
        aqiLevelElement.textContent = "Dados indisponíveis para a hora atual.";
        return;
    }

    const aqi = Math.round(data.hourly.european_aqi[currentIndex]);
    aqiValueElement.textContent = aqi;

    const aqi_capped = Math.min(aqi, 100);
    const rotation = (aqi_capped / 100) * 180 - 90;
    needle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;

    let level = "";
    let recommendation = "";

    if (aqi <= 20) {
        level = "Bom";
        recommendation = "A qualidade do ar está ótima. Aproveite para praticar atividades ao ar livre!";
    } else if (aqi <= 40) {
        level = "Razoável";
        recommendation = "A qualidade do ar é aceitável. Pessoas muito sensíveis podem sentir algum desconforto.";
    } else if (aqi <= 60) {
        level = "Moderado";
        recommendation = "Pessoas de grupos sensíveis (crianças, idosos, grávidas) devem reduzir atividades ao ar livre.";
    } else if (aqi <= 80) {
        level = "Ruim";
        recommendation = "Evite esforço físico prolongado ao ar livre. População em geral pode sentir efeitos na saúde.";
    } else {
        level = "Muito Ruim";
        recommendation = "Alerta de saúde: evite qualquer atividade ao ar livre. Mantenha janelas e portas fechadas.";
    }
    aqiLevelElement.textContent = level;
    healthRec.textContent = recommendation;
    
    const pm2_5 = data.hourly.pm2_5[currentIndex];
    pm2_5_value.textContent = pm2_5.toFixed(2);
    updateProgressBar(pm2_5_progress, pm2_5, [10, 20, 25, 50]);
    
    const pm10 = data.hourly.pm10[currentIndex];
    pm10_value.textContent = pm10.toFixed(2);
    updateProgressBar(pm10_progress, pm10, [20, 40, 50, 100]);

    const ozone = data.hourly.ozone[currentIndex];
    ozone_value.textContent = ozone.toFixed(2);
    updateProgressBar(ozone_progress, ozone, [60, 120, 180, 240]);
    
    const no2 = data.hourly.nitrogen_dioxide[currentIndex];
    nitrogen_dioxide_value.textContent = no2.toFixed(2);
    updateProgressBar(nitrogen_dioxide_progress, no2, [40, 100, 200, 400]);
};

const updateProgressBar = (progressBarElement, value, thresholds) => {
    const max_val = thresholds[3] * 1.25; 
    const percentage = Math.min((value / max_val) * 100, 100);
    
    let colorClass = 'bg-good';
    if (value > thresholds[0]) colorClass = 'bg-fair';
    if (value > thresholds[1]) colorClass = 'bg-moderate';
    if (value > thresholds[2]) colorClass = 'bg-poor';
    if (value > thresholds[3]) colorClass = 'bg-very-poor';

    progressBarElement.style.width = `${percentage}%`;
    progressBarElement.className = `progress-bar ${colorClass}`;
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
});

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    const lastCity = sessionStorage.getItem('lastSearchedCity') || "Presidente Prudente";
    searchCity(lastCity);
});

