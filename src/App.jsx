import React, { useEffect, useRef, useState } from 'react'
import './App.css'
// import { calculateTotalDistance } from './utils/distance'
const App = () => {
  const canvasRef = useRef(null);
  const [positions, setPositions] = useState([]);
  const [networkType, setNetworkType] = useState('');
  const [status, setStatus] = useState('Waiting for location...');
  const observerRef = useRef(null);
  const totalDistance = calculateTotalDistance(positions);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }


    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPositions((prev) => [...prev, { latitude, longitude }]);
        setStatus(`Tracking: ${latitude.toFixed(5)},${longitude.toFixed(5)}`);
      },
      (err) => {
        console.error(err);
        setStatus('Error fetching location')
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Draw path on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || positions.length < 2) return;



    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lats = positions.map(p => p.latitude);
    const lons = positions.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const minLon = Math.min(...lons);
    const scale = 100000;

    ctx.beginPath();
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 2;

    positions.forEach((pos, i) => {
      const x = (pos.longitude - minLon) * scale + 50;
      const y = (pos.latitude - minLat) * -scale + 400;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    positions.forEach((pos, i) => {
      const x = (pos.longitude - minLon) * scale + 50;
      const y = (pos.latitude - minLat) * -scale + 400;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      if (i === 0) ctx.fillStyle = 'blue';              // Start point
      else if (i === positions.length - 1) ctx.fillStyle = 'red'; // Latest point
      else ctx.fillStyle = '#2c3e50';
      ctx.fill();
    });

  }, [positions]);

  // Network Information API
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const updateConnectionStatus = () => {
        setNetworkType(`${connection.effectiveType}`);
      };

      connection.addEventListener('change', updateConnectionStatus);
      updateConnectionStatus();
      return () => connection.removeEventListener('change', updateConnectionStatus);
    }
  }, []);

  //Intersection Observer API to warn if user strays outside view
  useEffect(() => {
    if (!canvasRef.current) return;
    const target = canvasRef.current;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          alert('You moved out of map view. Stay on track!');
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(target);
    return () => observerRef.current.disconnect();
  }, []);


  return (
    <div className='App'>
      <h1>🏃‍♂️ Smart Jogger</h1>
      <p>{status}</p>
      <p><strong>Network:</strong> {networkType || 'Unknown'}</p>
      <canvas ref={canvasRef} width={500} height={500} style={{ border: '2px solid #444' }}></canvas>
      <p><em>Move around to see your jogging path!</em></p>
      <p><strong>Distance:</strong> {(totalDistance / 1000).toFixed(2)} km</p>

    </div>
  )
}


function calculateTotalDistance(coords) {
  if (coords.length < 2) return 0;
  const R = 6371e3; // Radius of Earth in meters

  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];

    const φ1 = prev.latitude * Math.PI / 180;
    const φ2 = curr.latitude * Math.PI / 180;
    const Δφ = (curr.latitude - prev.latitude) * Math.PI / 180;
    const Δλ = (curr.longitude - prev.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    total += R * c;
  }

  return total; // in meters
}

export default App