// 使用你的 Mapbox Access Token
mapboxgl.accessToken =
  "pk.eyJ1IjoibGl1aGFvcmFuMzAyNTgyOCIsImEiOiJjbTc2cjM4ZmcwZmx1Mm9yMzZkdzA0aWxpIn0.pYqgJAPqzWKYFwZAyinBMQ";

const map = new mapboxgl.Map({
  container: "map", // 容器 ID
  style: "mapbox://styles/mapbox/light-v10", // 使用 Mapbox Light 样式
  center: [-0.089932, 51.514442], // 伦敦坐标
  zoom: 14
});
// 添加比例尺控件
const scale = new mapboxgl.ScaleControl({
  maxWidth: 80,
  unit: 'metric'
});
map.addControl(scale);

// 添加放大缩小控件
const nav = new mapboxgl.NavigationControl();
map.addControl(nav, 'top-right');

// 添加指北针控件
const compass = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true
  },
  trackUserLocation: true
});
map.addControl(compass, 'top-right');
// ✅ 使用你的 Dataset ID
const data_url =
  "https://api.mapbox.com/datasets/v1/liuhaoran3025828/cm783fsc99wyx1mmx0jbgr0w0/features?access_token=" + mapboxgl.accessToken;

map.on("load", () => {
  // 🔵 添加点图层
  map.addLayer({
    id: "crimes",
    type: "circle",
    source: {
      type: "geojson",
      data: data_url
    },
    paint: {
      "circle-radius": 10,
      "circle-color": "#eb4d4b",
      "circle-opacity": 0.9
    }
  });

  // 🔥 添加热力图层（默认隐藏）
  map.addLayer({
    id: "crimes-heatmap",
    type: "heatmap",
    source: {
      type: "geojson",
      data: data_url
    },
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "Crime type"], 0, 0, 5, 1],
      "heatmap-intensity": 1,
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(33,102,172,0)",
        0.2, "blue",
        0.4, "cyan",
        0.6, "lime",
        0.8, "yellow",
        1, "red"
      ],
      "heatmap-radius": 20,
      "heatmap-opacity": 0.7
    },
    layout: { visibility: "none" } // 默认隐藏热力图
  });

  // ✅ 初始化过滤条件（默认显示所有数据）
  let filterType = ["!=", ["get", "Crime type"], "placeholder"];
  let filterMonth = ["!=", ["get", "Month"], "2024-01"];

  map.setFilter("crimes", ["all", filterMonth, filterType]);
  map.setFilter("crimes-heatmap", ["all", filterMonth, filterType]);

  // ✅ 监听热力图切换
  document.getElementById("toggle-heatmap").addEventListener("change", (event) => {
    const showHeatmap = event.target.checked;
    map.setLayoutProperty("crimes-heatmap", "visibility", showHeatmap ? "visible" : "none");
    map.setLayoutProperty("crimes", "visibility", showHeatmap ? "none" : "visible");
  });

  // ✅ 监听滑块（月份选择）
  document.getElementById("slider").addEventListener("input", (event) => {
    const month = parseInt(event.target.value);
    const formatted_month = "2024-" + ("0" + month).slice(-2);

    filterMonth = ["==", ["get", "Month"], formatted_month];

    map.setFilter("crimes", ["all", filterMonth, filterType]);
    map.setFilter("crimes-heatmap", ["all", filterMonth, filterType]);

    // 更新 UI 显示月份
    document.getElementById("active-month").innerText = month;
    updateCrimeChart();
  });

  // ✅ 监听犯罪类型筛选
  document.getElementById("filters").addEventListener("change", (event) => {
    const type = event.target.value;
    console.log("选择的犯罪类型:", type);

    // ✅ 修正犯罪类型过滤逻辑
    if (type == "all") {
      filterType = ["!=", ["get", "Crime type"], "placeholder"];
    } else if (type == "bicycle_theft") {
      filterType = ["==", ["get", "Crime type"], "Bicycle theft"];
    } else if (type == "drugs") {
      filterType = ["==", ["get", "Crime type"], "Drugs"];
    } else if (type == "robbery") {
      filterType = ["==", ["get", "Crime type"], "Robbery"];
    } else {
      console.log("错误: 未知犯罪类型");
    }

    map.setFilter("crimes", ["all", filterMonth, filterType]);
    map.setFilter("crimes-heatmap", ["all", filterMonth, filterType]);
    updateCrimeChart();
  });

  // ✅ 添加点击交互（仅适用于点图模式）
  map.on("click", "crimes", (e) => {
    if (!e.features || e.features.length === 0) return;

    const coordinates = e.features[0].geometry.coordinates.slice();
    const crimeType = e.features[0].properties["Crime type"];
    const month = e.features[0].properties["Month"];
    const location = e.features[0].properties["Location"];
    const outcome = e.features[0].properties["Last outcome category"];

    // 确保弹窗在地图视野内
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(
        `<strong>Type of crime:</strong> ${crimeType}<br>
        <strong>Time:</strong> ${month}<br>
        <strong>Location:</strong> ${location}<br>
        <strong>outcome:</strong> ${outcome}`
      )
      .addTo(map);
  });

  // ✅ 鼠标悬停效果（仅适用于点图）
  map.on("mouseenter", "crimes", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "crimes", () => {
    map.getCanvas().style.cursor = "";
  });

  // 初始化犯罪统计图表
  const ctx = document.getElementById('crimeChart').getContext('2d');
  const crimeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Crime Count',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // 更新犯罪统计图表
  function updateCrimeChart() {
    const selectedTypes = Array.from(document.querySelectorAll('#filters input:checked')).map(input => input.value);
    const month = document.getElementById("active-month").innerText;

    fetch(data_url)
      .then(response => response.json())
      .then(data => {
        const filteredData = data.features.filter(feature => {
          const crimeType = feature.properties['Crime type'];
          const crimeMonth = feature.properties['Month'];
          return (selectedTypes.includes("all") || selectedTypes.includes(crimeType)) && crimeMonth === `2024-${("0" + month).slice(-2)}`;
        });

        const crimeCounts = filteredData.reduce((acc, feature) => {
          const crimeType = feature.properties['Crime type'];
          acc[crimeType] = (acc[crimeType] || 0) + 1;
          return acc;
        }, {});

        crimeChart.data.labels = Object.keys(crimeCounts);
        crimeChart.data.datasets[0].data = Object.values(crimeCounts);
        crimeChart.update();
      });
  }

  // 初始调用以显示默认数据
  updateCrimeChart();
});