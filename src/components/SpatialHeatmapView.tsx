import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { Layers, Flame, MapPin, Eye, ExternalLink, Navigation, Sparkles, Map as MapIcon, Satellite } from 'lucide-react';

interface SpatialHeatmapViewProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
  selectedCity?: string;
}

export const SpatialHeatmapView: React.FC<SpatialHeatmapViewProps> = ({
  spots,
  onSelectSpot,
  selectedCity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [heatmapMetric, setHeatmapMetric] = useState<'impressions' | 'traffic' | 'cpm'>('impressions');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [googleMapType, setGoogleMapType] = useState<'roadmap' | 'satellite' | 'traffic' | 'terrain'>('roadmap');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Leaflet Map with Google Maps as default basemap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-6.9175, 107.6191], // Center Bandung
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Default Standard Google Maps (Roadmap) - No API Key Required
      const googleRoadmap = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
      }).addTo(map);

      tileLayerRef.current = googleRoadmap;
      heatLayerGroupRef.current = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update base tile layer when Google Maps layer type changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    let attr = '&copy; Google Maps';

    if (googleMapType === 'satellite') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      attr = '&copy; Google Maps Satelit & Imaging';
    } else if (googleMapType === 'traffic') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}';
      attr = '&copy; Google Maps Real-Time Traffic';
    } else if (googleMapType === 'terrain') {
      tileUrl = 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
      attr = '&copy; Google Maps Topografi';
    }

    const newTile = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: attr
    }).addTo(map);

    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }, [googleMapType]);

  // Update Markers & Heatmap Circles whenever spots or settings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const markersGroup = markersLayerGroupRef.current;
    const heatGroup = heatLayerGroupRef.current;
    if (!markersGroup || !heatGroup) return;

    markersGroup.clearLayers();
    heatGroup.clearLayers();

    if (spots.length === 0) return;

    // Add Heatmap Aura Circles
    if (showHeatmap) {
      spots.forEach((spot) => {
        let weightFactor = 1;
        let color = '#3b82f6'; // default blue
        let fillColor = '#60a5fa';

        if (heatmapMetric === 'impressions') {
          // based on daily impressions
          const imp = spot.dailyImpressions;
          if (imp >= 300000) {
            color = '#ef4444'; // Red intense
            fillColor = '#f87171';
            weightFactor = 1.6;
          } else if (imp >= 200000) {
            color = '#f97316'; // Orange
            fillColor = '#fb923c';
            weightFactor = 1.3;
          } else if (imp >= 150000) {
            color = '#eab308'; // Amber
            fillColor = '#facc15';
            weightFactor = 1.1;
          } else {
            color = '#10b981'; // Green
            fillColor = '#34d399';
            weightFactor = 0.9;
          }
        } else if (heatmapMetric === 'traffic') {
          // based on vehicle density
          if (spot.trafficDensity === 'Sangat Padat') {
            color = '#dc2626';
            fillColor = '#ef4444';
            weightFactor = 1.5;
          } else if (spot.trafficDensity === 'Padat') {
            color = '#d97706';
            fillColor = '#f59e0b';
            weightFactor = 1.2;
          } else {
            color = '#059669';
            fillColor = '#10b981';
            weightFactor = 0.9;
          }
        } else {
          // Commercial value (1 month price)
          if (spot.pricing.oneMonth >= 90000000) {
            color = '#8b5cf6'; // Purple prime
            fillColor = '#a78bfa';
            weightFactor = 1.7;
          } else if (spot.pricing.oneMonth >= 50000000) {
            color = '#3b82f6';
            fillColor = '#60a5fa';
            weightFactor = 1.2;
          } else {
            color = '#10b981';
            fillColor = '#34d399';
            weightFactor = 0.8;
          }
        }

        const baseRadius = 350 * weightFactor;

        // Outer heat aura
        const outerCircle = L.circle([spot.coordinates.lat, spot.coordinates.lng], {
          radius: baseRadius * 1.5,
          color: 'transparent',
          fillColor: fillColor,
          fillOpacity: 0.18,
          interactive: false
        });

        // Core heat circle
        const coreCircle = L.circle([spot.coordinates.lat, spot.coordinates.lng], {
          radius: baseRadius,
          color: color,
          weight: 1.5,
          opacity: 0.4,
          fillColor: color,
          fillOpacity: 0.28,
          interactive: false
        });

        heatGroup.addLayer(outerCircle);
        heatGroup.addLayer(coreCircle);
      });
    }

    // Add Interactive Spot Markers
    if (showMarkers) {
      spots.forEach((spot) => {
        const isDooh = spot.category === 'DOOH_DIGITAL';
        const isAvail = spot.isAvailable;

        let badgeBg = isAvail ? '#10b981' : '#f43f5e';
        let borderColor = isAvail ? '#059669' : '#e11d48';
        let iconHtml = isDooh ? '⚡' : isAvail ? '✓' : '✕';

        if (isDooh) {
          badgeBg = '#8b5cf6';
          borderColor = '#7c3aed';
        }

        const customIcon = L.divIcon({
          className: 'custom-ooh-marker',
          html: `
            <div style="
              position: relative;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: ${badgeBg};
              border: 2px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              border-radius: 50%;
              color: white;
              font-weight: bold;
              font-size: 11px;
              cursor: pointer;
              transition: transform 0.2s;
            ">
              ${iconHtml}
              ${isDooh ? '<span style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#a855f7;border-radius:50%;border:1.5px solid white;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>' : ''}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([spot.coordinates.lat, spot.coordinates.lng], {
          icon: customIcon
        });

        // Popup HTML content
        const popupContent = document.createElement('div');
        popupContent.className = 'ooh-popup-card p-1 text-slate-900 text-xs font-sans';
        popupContent.innerHTML = `
          <div style="font-family: inherit; width: 230px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 4px;">
              <span style="background: ${isDooh ? '#f3e8ff' : '#ecfdf5'}; color: ${isDooh ? '#7e22ce' : '#047857'}; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                ${isDooh ? 'DOOH VIDEOTRON' : 'OOH STATIS'}
              </span>
              <span style="font-weight: 600; color: ${isAvail ? '#16a34a' : '#e11d48'}; font-size: 10px;">
                ${isAvail ? 'Tersedia' : 'Tersewa'}
              </span>
            </div>
            <div style="font-weight: 700; font-size: 12px; line-height: 1.3; color: #0f172a; margin-bottom: 2px;">
              ${spot.name}
            </div>
            <div style="color: #64748b; font-size: 10px; margin-bottom: 6px;">
              ${spot.city} • Kec. ${spot.district}
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span style="color: #64748b;">Format & Ukuran:</span>
                <span style="font-weight: 600; color: #1e293b;">${spot.size} (${spot.layout})</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span style="color: #64748b;">Est. Impresi:</span>
                <span style="font-weight: 700; color: #d97706;">${formatCompactNumber(spot.dailyImpressions)} OTS/hari</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color: #64748b;">Tarif 1 Bln:</span>
                <span style="font-weight: 700; color: #0f172a;">${formatIDR(spot.pricing.oneMonth)}</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${spot.coordinates.lat},${spot.coordinates.lng}" target="_blank" rel="noreferrer" style="
                background: #f1f5f9;
                color: #1e293b;
                padding: 4px 6px;
                border: 1px solid #cbd5e1;
                border-radius: 5px;
                font-size: 10px;
                font-weight: 600;
                text-decoration: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 3px;
              ">
                <span>📍 Google Maps</span>
                <span style="font-size: 9px;">↗</span>
              </a>
              <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${spot.coordinates.lat},${spot.coordinates.lng}" target="_blank" rel="noreferrer" style="
                background: #f1f5f9;
                color: #1e293b;
                padding: 4px 6px;
                border: 1px solid #cbd5e1;
                border-radius: 5px;
                font-size: 10px;
                font-weight: 600;
                text-decoration: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 3px;
              ">
                <span>🚶 Street View</span>
                <span style="font-size: 9px;">↗</span>
              </a>
            </div>

            <button id="btn-detail-${spot.id}" style="
              width: 100%;
              background: #059669;
              color: white;
              padding: 6px 0;
              border: none;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            ">
              Buka Spesifikasi Lengkap
            </button>
          </div>
        `;

        popupContent.querySelector(`#btn-detail-${spot.id}`)?.addEventListener('click', () => {
          onSelectSpot(spot);
        });

        marker.bindPopup(popupContent, {
          closeButton: true,
          offset: [0, -10]
        });

        markersGroup.addLayer(marker);
      });
    }

    // Auto fit bounds if filtered spots are available
    if (spots.length > 0) {
      const bounds = L.latLngBounds(spots.map((s) => [s.coordinates.lat, s.coordinates.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [spots, showHeatmap, showMarkers, heatmapMetric, onSelectSpot]);

  // Quick Fly-To Locations
  const flyTo = (lat: number, lng: number, zoom: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[650px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Control Panel: Heatmap Layer & Metric Controls */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-slate-200/80 max-w-xs text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2 pb-1.5 border-b border-slate-100">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Visualisasi Heatmap Impresi</span>
        </div>

        {/* Metric Selector */}
        <div className="space-y-1.5 mb-2.5">
          <div className="text-[11px] text-slate-500 font-medium">Dasar Heatmap Spasial:</div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setHeatmapMetric('impressions')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                heatmapMetric === 'impressions'
                  ? 'bg-amber-500 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              OTS Impresi
            </button>
            <button
              onClick={() => setHeatmapMetric('traffic')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                heatmapMetric === 'traffic'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Traffic
            </button>
            <button
              onClick={() => setHeatmapMetric('cpm')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                heatmapMetric === 'cpm'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tarif Sewa
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            Lapisan Heatmap
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            Titik Marker
          </label>
        </div>

        {/* Legend */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Tersedia ({spots.filter(s => s.isAvailable && s.category !== 'DOOH_DIGITAL').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Tersewa / Kontrak ({spots.filter(s => !s.isAvailable).length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block ring-1 ring-purple-300 animate-pulse" />
            <span>DOOH Videotron ({spots.filter(s => s.category === 'DOOH_DIGITAL').length})</span>
          </div>
        </div>
      </div>

      {/* Floating Google Maps Layer Mode Switcher */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-slate-200/90 text-xs">
          <div className="flex items-center gap-1 px-2 text-[11px] font-bold text-slate-800 border-r border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-blue-600 font-extrabold">Google</span>
            <span>Maps</span>
          </div>
          <button
            onClick={() => setGoogleMapType('roadmap')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              googleMapType === 'roadmap'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Google Maps Tampilan Standar Jalan & Bangunan"
          >
            Standar
          </button>
          <button
            onClick={() => setGoogleMapType('satellite')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              googleMapType === 'satellite'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Google Maps Citra Satelit Hybrid dengan Label Jalan"
          >
            Satelit
          </button>
          <button
            onClick={() => setGoogleMapType('traffic')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              googleMapType === 'traffic'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Google Maps dengan Lapisan Kepadatan Lalu Lintas Real-Time"
          >
            Traffic
          </button>
          <button
            onClick={() => setGoogleMapType('terrain')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              googleMapType === 'terrain'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Google Maps Kontur Medan & Topografi"
          >
            Medan
          </button>
        </div>

        {/* Floating Quick Navigation Pills (Fly to Cities) */}
        <div className="hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl p-1.5 shadow-md border border-slate-200/80 text-xs">
          <span className="text-[10px] text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-emerald-600" />
            Fokus:
          </span>
          <button
            onClick={() => flyTo(-6.9175, 107.6191, 13)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors"
          >
            Bandung
          </button>
          <button
            onClick={() => flyTo(-6.885, 107.545, 12)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors"
          >
            Cimahi
          </button>
          <button
            onClick={() => flyTo(-7.3392, 108.2145, 12)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors"
          >
            Tasikmalaya
          </button>
          <button
            onClick={() => flyTo(-7.2152, 107.9042, 13)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors"
          >
            Garut
          </button>
          <button
            onClick={() => flyTo(-6.9212, 106.9298, 13)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors"
          >
            Sukabumi
          </button>
        </div>
      </div>

      {/* Floating Bottom Card: Hotspot Spotlight */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-10 bg-slate-900/90 backdrop-blur-md text-white rounded-xl p-3 shadow-xl border border-slate-700/80 max-w-sm text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Spotlight Koridor Tertinggi
          </span>
          <span className="text-[10px] text-slate-400">Peak Traffic Zone</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          Koridor <strong className="text-white">Jl. Sukajadi (PVJ)</strong>, <strong className="text-white">Tol Pasteur</strong>, dan <strong className="text-white">Jl. Merdeka BIP</strong> mencatat densitas spasial di atas 160.000 kendaraan/hari dengan impresi &gt;350.000 OTS.
        </p>
      </div>

    </div>
  );
};
