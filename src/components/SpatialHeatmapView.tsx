import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import Supercluster, { PointFeature } from 'supercluster';
import { MediaSpot } from '../types/ooh';
import { formatCompactNumber, formatIDR } from '../utils/formatters';
import { 
  Flame, 
  MapPin, 
  ExternalLink, 
  Navigation, 
  Sparkles, 
  Layers, 
  Eye, 
  DollarSign, 
  Check, 
  Info,
  TrendingUp,
  CircleDot,
  Network,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface SpatialHeatmapViewProps {
  spots: MediaSpot[];
  onSelectSpot: (spot: MediaSpot) => void;
  selectedCity?: string;
}

export type HeatmapLayerMode = 'ots_density' | 'price_intensity';

// GeoJSON property structure for clustering with Supercluster
export interface SpotClusterProperties {
  spotId?: string;
  spot?: MediaSpot;
  totalOts: number;
  totalPrice: number;
  doohCount: number;
  availCount: number;
}

// Palette specifications for OTS Density
export interface PaletteTier {
  key: string;
  label: string;
  sublabel: string;
  color: string;
  fillColor: string;
  borderColor: string;
  textColor: string;
  weightFactor: number;
}

const OTS_PALETTE: PaletteTier[] = [
  {
    key: 'ultra',
    label: '≥ 300k OTS',
    sublabel: 'Ultra High OTS',
    color: '#dc2626', // Red 600
    fillColor: '#f87171',
    borderColor: '#991b1b',
    textColor: '#ffffff',
    weightFactor: 1.65
  },
  {
    key: 'high',
    label: '200k - 300k OTS',
    sublabel: 'High OTS',
    color: '#ea580c', // Orange 600
    fillColor: '#fb923c',
    borderColor: '#9a3412',
    textColor: '#ffffff',
    weightFactor: 1.35
  },
  {
    key: 'medium',
    label: '150k - 200k OTS',
    sublabel: 'Moderate High',
    color: '#d97706', // Amber 600
    fillColor: '#facc15',
    borderColor: '#b45309',
    textColor: '#ffffff',
    weightFactor: 1.1
  },
  {
    key: 'standard',
    label: '< 150k OTS',
    sublabel: 'Standard OTS',
    color: '#059669', // Emerald 600
    fillColor: '#34d399',
    borderColor: '#047857',
    textColor: '#ffffff',
    weightFactor: 0.85
  }
];

// Palette specifications for Price Intensity
const PRICE_PALETTE: PaletteTier[] = [
  {
    key: 'ultra_prime',
    label: '≥ 90 Jt / bln',
    sublabel: 'Ultra Prime',
    color: '#7c3aed', // Purple 600
    fillColor: '#c084fc',
    borderColor: '#5b21b6',
    textColor: '#ffffff',
    weightFactor: 1.7
  },
  {
    key: 'prime',
    label: '50 - 90 Jt / bln',
    sublabel: 'Prime Commercial',
    color: '#2563eb', // Blue 600
    fillColor: '#60a5fa',
    borderColor: '#1e40af',
    textColor: '#ffffff',
    weightFactor: 1.35
  },
  {
    key: 'mid',
    label: '25 - 50 Jt / bln',
    sublabel: 'Mid Tier Value',
    color: '#0284c7', // Sky 600
    fillColor: '#38bdf8',
    borderColor: '#0369a1',
    textColor: '#ffffff',
    weightFactor: 1.05
  },
  {
    key: 'affordable',
    label: '< 25 Jt / bln',
    sublabel: 'Affordable / Budget',
    color: '#059669', // Emerald 600
    fillColor: '#34d399',
    borderColor: '#047857',
    textColor: '#ffffff',
    weightFactor: 0.85
  }
];

export const SpatialHeatmapView: React.FC<SpatialHeatmapViewProps> = ({
  spots,
  onSelectSpot,
  selectedCity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Clustering & Visualization State
  const [heatmapLayerMode, setHeatmapLayerMode] = useState<HeatmapLayerMode>('ots_density');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [enableClustering, setEnableClustering] = useState<boolean>(true);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const [clusterStats, setClusterStats] = useState<{ activeClusters: number; clusteredSpots: number }>({
    activeClusters: 0,
    clusteredSpots: 0
  });
  const [colorizeMarkersWithPalette, setColorizeMarkersWithPalette] = useState<boolean>(true);
  const [googleMapType, setGoogleMapType] = useState<'roadmap' | 'satellite' | 'traffic' | 'terrain'>('roadmap');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Helper to determine spot tier and styling for OTS Density
  const getOtsTier = (impressions: number): PaletteTier => {
    if (impressions >= 300000) return OTS_PALETTE[0];
    if (impressions >= 200000) return OTS_PALETTE[1];
    if (impressions >= 150000) return OTS_PALETTE[2];
    return OTS_PALETTE[3];
  };

  // Helper to determine spot tier and styling for Price Intensity
  const getPriceTier = (oneMonthPrice: number): PaletteTier => {
    if (oneMonthPrice >= 90000000) return PRICE_PALETTE[0];
    if (oneMonthPrice >= 50000000) return PRICE_PALETTE[1];
    if (oneMonthPrice >= 25000000) return PRICE_PALETTE[2];
    return PRICE_PALETTE[3];
  };

  // Distribution counters for the active palette legend
  const tierStats = useMemo(() => {
    if (heatmapLayerMode === 'ots_density') {
      const counts: Record<string, number> = { ultra: 0, high: 0, medium: 0, standard: 0 };
      spots.forEach((s) => {
        const tier = getOtsTier(s.dailyImpressions);
        counts[tier.key] = (counts[tier.key] || 0) + 1;
      });
      return { counts, palette: OTS_PALETTE };
    } else {
      const counts: Record<string, number> = { ultra_prime: 0, prime: 0, mid: 0, affordable: 0 };
      spots.forEach((s) => {
        const tier = getPriceTier(s.pricing.oneMonth);
        counts[tier.key] = (counts[tier.key] || 0) + 1;
      });
      return { counts, palette: PRICE_PALETTE };
    }
  }, [spots, heatmapLayerMode]);

  // Average metrics for current filtered dataset
  const datasetSummary = useMemo(() => {
    if (spots.length === 0) return { avgOts: 0, avgPrice: 0 };
    const totalOts = spots.reduce((acc, s) => acc + (s.dailyImpressions || 0), 0);
    const totalPrice = spots.reduce((acc, s) => acc + (s.pricing?.oneMonth || 0), 0);
    return {
      avgOts: Math.round(totalOts / spots.length),
      avgPrice: Math.round(totalPrice / spots.length)
    };
  }, [spots]);

  // GeoJSON features for Supercluster engine
  const geojsonPoints = useMemo(() => {
    return spots.map((spot) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [spot.coordinates.lng, spot.coordinates.lat] as [number, number]
      },
      properties: {
        spotId: spot.id,
        spot: spot,
        totalOts: spot.dailyImpressions || 0,
        totalPrice: spot.pricing?.oneMonth || 0,
        doohCount: spot.category === 'DOOH_DIGITAL' ? 1 : 0,
        availCount: spot.isAvailable ? 1 : 0
      }
    }));
  }, [spots]);

  // Initialize Supercluster instance whenever spots change
  const superclusterIndex = useMemo(() => {
    if (geojsonPoints.length === 0) return null;
    const index = new Supercluster<SpotClusterProperties, SpotClusterProperties>({
      radius: 65, // Cluster search radius in pixels
      maxZoom: 16, // Maximum zoom level where clusters are generated
      minPoints: 2, // Minimum points required to form a cluster
      map: (props) => ({
        totalOts: props.totalOts,
        totalPrice: props.totalPrice,
        doohCount: props.doohCount,
        availCount: props.availCount
      }),
      reduce: (accumulated, props) => {
        accumulated.totalOts += props.totalOts;
        accumulated.totalPrice += props.totalPrice;
        accumulated.doohCount += props.doohCount;
        accumulated.availCount += props.availCount;
      }
    });
    index.load(geojsonPoints);
    return index;
  }, [geojsonPoints]);

  // Factory to create individual spot markers with rich styling
  const createSingleSpotMarker = useCallback((spot: MediaSpot): L.Marker => {
    const isDooh = spot.category === 'DOOH_DIGITAL';
    const isAvail = spot.isAvailable;

    let markerBg: string;
    let badgeText: string;
    let badgeTitle: string;
    let activeTier: PaletteTier;

    if (colorizeMarkersWithPalette) {
      if (heatmapLayerMode === 'ots_density') {
        activeTier = getOtsTier(spot.dailyImpressions);
        markerBg = activeTier.color;
        badgeText = formatCompactNumber(spot.dailyImpressions);
        badgeTitle = `OTS: ${formatCompactNumber(spot.dailyImpressions)} / hari (${activeTier.label})`;
      } else {
        activeTier = getPriceTier(spot.pricing.oneMonth);
        markerBg = activeTier.color;
        const jtVal = Math.round(spot.pricing.oneMonth / 1000000);
        badgeText = `${jtVal}jt`;
        badgeTitle = `Tarif 1 Bln: ${formatIDR(spot.pricing.oneMonth)} (${activeTier.label})`;
      }
    } else {
      markerBg = isDooh ? '#7c3aed' : isAvail ? '#10b981' : '#f43f5e';
      badgeText = isDooh ? 'DOOH' : isAvail ? '✓' : '✕';
      badgeTitle = `${isDooh ? 'DOOH' : 'OOH'} - ${isAvail ? 'Tersedia' : 'Tersewa'}`;
      activeTier = heatmapLayerMode === 'ots_density' ? getOtsTier(spot.dailyImpressions) : getPriceTier(spot.pricing.oneMonth);
    }

    const isHighestTier = activeTier.weightFactor >= 1.6;

    const customIcon = L.divIcon({
      className: 'custom-ooh-marker',
      html: `
        <div 
          title="${badgeTitle}"
          style="
            position: relative;
            min-width: 32px;
            height: 32px;
            padding: 0 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${markerBg};
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            border-radius: 16px;
            color: white;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: -0.2px;
            cursor: pointer;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            user-select: none;
          "
          onmouseover="this.style.transform='scale(1.15) translateY(-2px)'"
          onmouseout="this.style.transform='scale(1) translateY(0)'"
        >
          ${isDooh ? '<span style="font-size: 10px; margin-right: 2px;">⚡</span>' : ''}
          <span>${badgeText}</span>
          ${isHighestTier ? `
            <span style="
              position: absolute;
              top: -3px;
              right: -3px;
              width: 9px;
              height: 9px;
              background: #facc15;
              border-radius: 50%;
              border: 1.5px solid white;
              box-shadow: 0 0 6px #facc15;
              animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;
            "></span>
          ` : ''}
          <div style="
            position: absolute;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid ${markerBg};
          "></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 34]
    });

    const marker = L.marker([spot.coordinates.lat, spot.coordinates.lng], {
      icon: customIcon
    });

    // Popup HTML content with highlighted metrics based on active layer
    const popupContent = document.createElement('div');
    popupContent.className = 'ooh-popup-card p-1 text-slate-900 text-xs font-sans';
    
    const otsTier = getOtsTier(spot.dailyImpressions);
    const priceTier = getPriceTier(spot.pricing.oneMonth);

    popupContent.innerHTML = `
      <div style="font-family: inherit; width: 245px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 5px;">
          <span style="background: ${isDooh ? '#f3e8ff' : '#ecfdf5'}; color: ${isDooh ? '#7e22ce' : '#047857'}; font-weight: 700; padding: 2px 7px; border-radius: 4px; font-size: 10px;">
            ${isDooh ? 'DOOH VIDEOTRON' : 'OOH STATIS'}
          </span>
          <span style="font-weight: 700; color: ${isAvail ? '#16a34a' : '#e11d48'}; font-size: 11px;">
            ${isAvail ? '● Tersedia' : '● Tersewa'}
          </span>
        </div>

        <div style="font-weight: 700; font-size: 12px; line-height: 1.3; color: #0f172a; margin-bottom: 2px;">
          ${spot.name}
        </div>
        <div style="color: #64748b; font-size: 10.5px; margin-bottom: 6px;">
          ${spot.roadName ? `${spot.roadName}, ` : ''}${spot.city} • Kec. ${spot.district}
        </div>
        
        <!-- Heatmap Context Banner -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          border-radius: 6px;
          margin-bottom: 6px;
          background: ${heatmapLayerMode === 'ots_density' ? '#fff7ed' : '#f5f3ff'};
          border: 1px solid ${heatmapLayerMode === 'ots_density' ? '#fed7aa' : '#ddd6fe'};
        ">
          <span style="font-size: 10.5px; font-weight: 600; color: ${heatmapLayerMode === 'ots_density' ? '#c2410c' : '#6d28d9'};">
            ${heatmapLayerMode === 'ots_density' ? '🔥 Tingkat Densitas OTS' : '💎 Intensitas Tarif Sewa'}
          </span>
          <span style="
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            background: ${heatmapLayerMode === 'ots_density' ? otsTier.color : priceTier.color};
            color: white;
          ">
            ${heatmapLayerMode === 'ots_density' ? otsTier.label : priceTier.label}
          </span>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Format & Ukuran:</span>
            <span style="font-weight: 600; color: #1e293b;">${spot.size} (${spot.layout})</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Est. Impresi (OTS):</span>
            <span style="font-weight: 700; color: #ea580c;">${formatCompactNumber(spot.dailyImpressions)} / hari</span>
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
      offset: [0, -22]
    });

    return marker;
  }, [colorizeMarkersWithPalette, heatmapLayerMode, onSelectSpot]);

  // Factory to create cluster node markers with grouped metrics and click expansion
  const createClusterMarker = useCallback((clusterFeature: any): L.Marker => {
    const [lng, lat] = clusterFeature.geometry.coordinates;
    const count = clusterFeature.properties.point_count as number;
    const clusterId = clusterFeature.properties.cluster_id as number;
    const totalOts = clusterFeature.properties.totalOts || 0;
    const totalPrice = clusterFeature.properties.totalPrice || 0;
    const doohCount = clusterFeature.properties.doohCount || 0;
    const availCount = clusterFeature.properties.availCount || 0;
    const avgOts = Math.round(totalOts / count);
    const avgPrice = Math.round(totalPrice / count);

    // Dynamic sizing based on cluster spot count
    let clusterSize = 42;
    let fontSizeCount = 13;
    let fontSizeMetric = 9;
    if (count >= 15) {
      clusterSize = 56;
      fontSizeCount = 15;
      fontSizeMetric = 10;
    } else if (count >= 6) {
      clusterSize = 48;
      fontSizeCount = 14;
      fontSizeMetric = 9.5;
    }

    // Styling based on active heatmapLayerMode
    let gradientBg: string;
    let borderColor = '#ffffff';
    let haloColor: string;
    let metricLabel: string;
    let tierLabel: string;

    if (heatmapLayerMode === 'ots_density') {
      metricLabel = `${formatCompactNumber(totalOts)} OTS`;
      if (avgOts >= 250000) {
        gradientBg = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
        haloColor = 'rgba(239, 68, 68, 0.38)';
        tierLabel = 'Ultra High OTS';
      } else if (avgOts >= 180000) {
        gradientBg = 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)';
        haloColor = 'rgba(249, 115, 22, 0.38)';
        tierLabel = 'High OTS';
      } else if (avgOts >= 140000) {
        gradientBg = 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)';
        haloColor = 'rgba(245, 158, 11, 0.32)';
        tierLabel = 'Moderate OTS';
      } else {
        gradientBg = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
        haloColor = 'rgba(16, 185, 129, 0.32)';
        tierLabel = 'Standard OTS';
      }
    } else {
      const jtTotal = Math.round(totalPrice / 1000000);
      metricLabel = `${jtTotal}Jt/bln`;
      if (avgPrice >= 80000000) {
        gradientBg = 'linear-gradient(135deg, #8b5cf6 0%, #581c87 100%)';
        haloColor = 'rgba(139, 92, 246, 0.38)';
        tierLabel = 'Ultra Prime';
      } else if (avgPrice >= 45000000) {
        gradientBg = 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
        haloColor = 'rgba(59, 130, 246, 0.38)';
        tierLabel = 'Prime Commercial';
      } else if (avgPrice >= 25000000) {
        gradientBg = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
        haloColor = 'rgba(2, 132, 199, 0.32)';
        tierLabel = 'Mid Tier';
      } else {
        gradientBg = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
        haloColor = 'rgba(16, 185, 129, 0.32)';
        tierLabel = 'Affordable';
      }
    }

    const haloSize = clusterSize + 12;

    const clusterIcon = L.divIcon({
      className: 'custom-cluster-marker',
      html: `
        <div 
          title="Kluster ${count} Titik Media (${metricLabel})"
          style="
            position: relative;
            width: ${clusterSize}px;
            height: ${clusterSize}px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            user-select: none;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          "
          onmouseover="this.style.transform='scale(1.15) translateY(-2px)'"
          onmouseout="this.style.transform='scale(1) translateY(0)'"
        >
          <!-- Glowing Outer Pulsing Halo -->
          <div style="
            position: absolute;
            top: -6px;
            left: -6px;
            width: ${haloSize}px;
            height: ${haloSize}px;
            border-radius: 50%;
            background: ${haloColor};
            z-index: 1;
            pointer-events: none;
            animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          "></div>

          <!-- Core Cluster Disc -->
          <div style="
            position: relative;
            z-index: 2;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: ${gradientBg};
            border: 2.5px solid ${borderColor};
            box-shadow: 0 4px 14px rgba(0,0,0,0.38);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
          ">
            <div style="
              font-weight: 800;
              font-size: ${fontSizeCount}px;
              line-height: 1.1;
              letter-spacing: -0.3px;
              text-shadow: 0 1px 2px rgba(0,0,0,0.4);
            ">
              ${count}
            </div>
            <div style="
              font-weight: 700;
              font-size: ${fontSizeMetric}px;
              line-height: 1;
              opacity: 0.95;
              letter-spacing: -0.2px;
              white-space: nowrap;
              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
              margin-top: 1px;
            ">
              ${metricLabel}
            </div>
          </div>

          <!-- DOOH Flash Badge if any DOOH in cluster -->
          ${doohCount > 0 ? `
            <div style="
              position: absolute;
              top: -3px;
              right: -3px;
              z-index: 3;
              background: #7e22ce;
              color: #fef08a;
              border: 1.5px solid white;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: 900;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              ⚡
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [clusterSize, clusterSize],
      iconAnchor: [clusterSize / 2, clusterSize / 2]
    });

    const marker = L.marker([lat, lng], { icon: clusterIcon });

    // Informative Tooltip on Hover
    marker.bindTooltip(`
      <div style="font-family: inherit; font-size: 11px; padding: 2px 4px; color: #0f172a; text-align: left;">
        <div style="font-weight: 800; color: #0f172a; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
          <span>📍 Kluster ${count} Titik Media</span>
          <span style="font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: #e0f2fe; color: #0369a1;">
            ${tierLabel}
          </span>
        </div>
        <div style="color: #475569; font-size: 10px; margin-bottom: 2px;">
          Total Impresi: <strong style="color: #ea580c;">${formatCompactNumber(totalOts)} OTS/hari</strong>
        </div>
        <div style="color: #475569; font-size: 10px; margin-bottom: 3px;">
          Tarif Sewa: <strong style="color: #0f172a;">${formatIDR(totalPrice)}/bln</strong> (${availCount} tersedia)
        </div>
        <div style="font-size: 9.5px; font-weight: 700; color: #059669;">
          🔍 Klik untuk perbesar & pecah kluster
        </div>
      </div>
    `, {
      direction: 'top',
      offset: [0, -clusterSize / 2 - 4],
      opacity: 0.96
    });

    // Click: Smooth Zoom In to Expand Cluster OR Show Leaves List if max zoom reached
    marker.on('click', () => {
      if (!mapInstanceRef.current || !superclusterIndex) return;
      const map = mapInstanceRef.current;
      const currentMapZoom = map.getZoom();

      let expansionZoom: number;
      try {
        expansionZoom = superclusterIndex.getClusterExpansionZoom(clusterId);
      } catch {
        expansionZoom = currentMapZoom + 2;
      }

      if (expansionZoom > currentMapZoom && expansionZoom <= 18) {
        map.flyTo([lat, lng], expansionZoom, { duration: 0.75 });
      } else {
        // Points are at identical or very close coordinates: show interactive leaves popup
        const leaves = superclusterIndex.getLeaves(clusterId, 30);
        const popupCard = document.createElement('div');
        popupCard.className = 'cluster-leaves-popup p-1 text-xs font-sans text-slate-800';
        popupCard.style.width = '255px';

        let listHtml = `
          <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; display: flex; align-items: center; justify-content: space-between;">
              <span>Kluster Area (${leaves.length} Titik)</span>
              <span style="font-size: 10px; background: #ecfdf5; color: #047857; font-weight: 700; padding: 1px 6px; border-radius: 4px;">
                ${formatCompactNumber(totalOts)} OTS
              </span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              Titik berdekatan di koridor yang sama
            </div>
          </div>
          <div style="max-height: 190px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
        `;

        leaves.forEach((leaf) => {
          const sp = (leaf.properties as any).spot as MediaSpot;
          if (!sp) return;
          const isDooh = sp.category === 'DOOH_DIGITAL';
          listHtml += `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="font-size: 9px; font-weight: 700; color: ${isDooh ? '#7e22ce' : '#047857'}; background: ${isDooh ? '#f3e8ff' : '#ecfdf5'}; padding: 1px 5px; border-radius: 3px;">
                  ${isDooh ? 'DOOH' : 'OOH'}
                </span>
                <span style="font-weight: 700; font-size: 10px; color: #ea580c;">
                  ${formatCompactNumber(sp.dailyImpressions)} OTS
                </span>
              </div>
              <div style="font-weight: 700; font-size: 11px; color: #1e293b; line-height: 1.3;">
                ${sp.name}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px; margin-bottom: 4px;">
                ${formatIDR(sp.pricing?.oneMonth || 0)}/bln
              </div>
              <button id="btn-cluster-leaf-${sp.id}" style="
                width: 100%;
                background: #059669;
                color: white;
                padding: 4px 0;
                border: none;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
              ">
                Buka Detail Titik
              </button>
            </div>
          `;
        });

        listHtml += `</div>`;
        popupCard.innerHTML = listHtml;

        leaves.forEach((leaf) => {
          const sp = (leaf.properties as any).spot as MediaSpot;
          if (!sp) return;
          popupCard.querySelector(`#btn-cluster-leaf-${sp.id}`)?.addEventListener('click', () => {
            onSelectSpot(sp);
          });
        });

        marker.bindPopup(popupCard, { maxWidth: 280, offset: [0, -clusterSize / 2] }).openPopup();
      }
    });

    return marker;
  }, [heatmapLayerMode, onSelectSpot, superclusterIndex]);

  // Recalculate clusters and markers based on current bounding box & zoom
  const updateMarkersAndClusters = useCallback(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (!showMarkers || spots.length === 0) {
      setClusterStats({ activeClusters: 0, clusteredSpots: 0 });
      return;
    }

    const currentMapZoom = Math.floor(map.getZoom());
    setCurrentZoom(currentMapZoom);

    if (enableClustering && superclusterIndex) {
      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ];

      const clusters = superclusterIndex.getClusters(bbox, currentMapZoom);

      let activeClustersCount = 0;
      let clusteredSpotsCount = 0;

      clusters.forEach((feature) => {
        if (feature.properties.cluster) {
          activeClustersCount++;
          clusteredSpotsCount += (feature.properties as any).point_count || 0;
          const clusterMarker = createClusterMarker(feature);
          markersGroup.addLayer(clusterMarker);
        } else {
          const spot = (feature.properties as any).spot as MediaSpot;
          if (spot) {
            const singleMarker = createSingleSpotMarker(spot);
            markersGroup.addLayer(singleMarker);
          }
        }
      });

      setClusterStats({
        activeClusters: activeClustersCount,
        clusteredSpots: clusteredSpotsCount
      });
    } else {
      // Clustering disabled: render all individual spots directly
      spots.forEach((spot) => {
        const singleMarker = createSingleSpotMarker(spot);
        markersGroup.addLayer(singleMarker);
      });
      setClusterStats({ activeClusters: 0, clusteredSpots: 0 });
    }
  }, [
    showMarkers,
    spots,
    enableClustering,
    superclusterIndex,
    createClusterMarker,
    createSingleSpotMarker
  ]);

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

      // Default Standard Google Maps (Roadmap)
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

  // Update Heatmap Circles whenever spots or mode changes
  useEffect(() => {
    const heatGroup = heatLayerGroupRef.current;
    if (!heatGroup) return;

    heatGroup.clearLayers();
    if (!showHeatmap || spots.length === 0) return;

    spots.forEach((spot) => {
      let tier: PaletteTier;
      if (heatmapLayerMode === 'ots_density') {
        tier = getOtsTier(spot.dailyImpressions);
      } else {
        tier = getPriceTier(spot.pricing.oneMonth);
      }

      const baseRadius = 360 * tier.weightFactor;

      // Outer ambient heat glow
      const outerCircle = L.circle([spot.coordinates.lat, spot.coordinates.lng], {
        radius: baseRadius * 1.6,
        color: 'transparent',
        fillColor: tier.fillColor,
        fillOpacity: 0.22,
        interactive: false
      });

      // Core thermal concentration circle
      const coreCircle = L.circle([spot.coordinates.lat, spot.coordinates.lng], {
        radius: baseRadius,
        color: tier.color,
        weight: 1.5,
        opacity: 0.45,
        fillColor: tier.color,
        fillOpacity: 0.32,
        interactive: false
      });

      heatGroup.addLayer(outerCircle);
      heatGroup.addLayer(coreCircle);
    });
  }, [spots, showHeatmap, heatmapLayerMode]);

  // Attach moveend and zoomend listeners to trigger dynamic clustering updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const onMapChange = () => {
      updateMarkersAndClusters();
    };

    map.on('moveend', onMapChange);
    map.on('zoomend', onMapChange);

    // Initial render call
    updateMarkersAndClusters();

    return () => {
      map.off('moveend', onMapChange);
      map.off('zoomend', onMapChange);
    };
  }, [updateMarkersAndClusters]);

  // Auto fit bounds when spots change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || spots.length === 0) return;

    const bounds = L.latLngBounds(spots.map((s) => [s.coordinates.lat, s.coordinates.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [spots]);

  // Quick Fly-To Locations
  const flyTo = (lat: number, lng: number, zoom: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[680px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Control Panel: Heatmap Layer Overlay (OTS Density vs Price Intensity) */}
      <div 
        id="heatmap-layer-control"
        data-testid="heatmap-layer-control"
        className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-xl border border-slate-200/90 w-80 text-xs transition-all"
      >
        {/* Header with Title & Main Overlay Toggle */}
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <div className={`p-1.5 rounded-lg ${heatmapLayerMode === 'ots_density' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold leading-none">Heatmap Layer</span>
              <span className="text-[10px] text-slate-400 font-normal">Visualisasi Spasial OOH</span>
            </div>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-slate-700">
            <input
              id="toggle-heatmap-layer"
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className={showHeatmap ? 'text-emerald-700' : 'text-slate-400'}>
              {showHeatmap ? 'Aktif' : 'Nonaktif'}
            </span>
          </label>
        </div>

        {/* Heatmap Layer Mode Selector: OTS Density vs Price Intensity */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Mode Visualisasi Marker:</span>
            <span className="text-[10px] font-semibold text-slate-400">
              {heatmapLayerMode === 'ots_density' ? 'Palet Audiens' : 'Palet Komersial'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            {/* Mode 1: OTS Density */}
            <button
              id="btn-mode-ots-density"
              data-testid="btn-mode-ots-density"
              type="button"
              onClick={() => setHeatmapLayerMode('ots_density')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                heatmapLayerMode === 'ots_density'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Visualisasi kepadatan impresi & eksposur audiens (OTS Density)"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>OTS Density</span>
            </button>

            {/* Mode 2: Price Intensity */}
            <button
              id="btn-mode-price-intensity"
              data-testid="btn-mode-price-intensity"
              type="button"
              onClick={() => setHeatmapLayerMode('price_intensity')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                heatmapLayerMode === 'price_intensity'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Visualisasi intensitas tarif sewa komersial (Price Intensity)"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Price Intensity</span>
            </button>
          </div>
        </div>

        {/* Sub-toggles: Marker Coloring & Marker Visibility */}
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/60 mb-2.5 space-y-1.5 text-[11px]">
          <label className="flex items-center justify-between cursor-pointer select-none text-slate-700">
            <span className="flex items-center gap-1.5">
              <CircleDot className="w-3 h-3 text-emerald-600" />
              <span>Warnai Marker sesuai Palet</span>
            </span>
            <input
              id="toggle-colorize-markers"
              type="checkbox"
              checked={colorizeMarkersWithPalette}
              onChange={(e) => setColorizeMarkersWithPalette(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer select-none text-slate-700 pt-1 border-t border-slate-200/50">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>Tampilkan Pin Marker</span>
            </span>
            <input
              id="toggle-show-markers"
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
            />
          </label>
        </div>

        {/* Marker Clustering & Level Zoom Control */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/60 mb-3 space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <Network className="w-3.5 h-3.5 text-blue-600" />
              <span>Marker Clustering</span>
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                id="toggle-marker-clustering"
                data-testid="toggle-marker-clustering"
                type="checkbox"
                checked={enableClustering}
                onChange={(e) => setEnableClustering(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                enableClustering ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {enableClustering ? 'Aktif' : 'Mati'}
              </span>
            </label>
          </div>

          {/* Dynamic Clustering Feedback Badge */}
          {enableClustering ? (
            <div className="bg-blue-50/80 border border-blue-200/70 rounded-md p-1.5 text-[10px] text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Zoom: <strong>{currentZoom}</strong></span>
              </div>
              <span className="font-semibold text-blue-700">
                {clusterStats.activeClusters > 0
                  ? `${clusterStats.activeClusters} Kluster (${clusterStats.clusteredSpots} Titik)`
                  : 'Terurai per titik'}
              </span>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded-md p-1.5 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Semua marker berdiri sendiri</span>
              <span className="font-bold">{spots.length} Pin</span>
            </div>
          )}

          {/* Quick Zoom Presets */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
            <span className="text-[10px] text-slate-500 font-medium">Preset Zoom:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.setZoom(8);
                }}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                  currentZoom <= 9 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                title="Zoom Out Regional Jawa Barat (Kelompok Besar)"
              >
                Jabar (8)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.setZoom(12);
                }}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                  currentZoom >= 11 && currentZoom <= 13 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                title="Zoom Level Bandung Raya"
              >
                Bandung (12)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.setZoom(16);
                }}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                  currentZoom >= 15 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                title="Zoom In Detail Jalan & Titik Konstruksi"
              >
                Jalan (16)
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Color Palette Legend */}
        <div className="border-t border-slate-100 pt-2.5">
          <div className="flex items-center justify-between mb-1.5 text-[11px]">
            <span className="font-semibold text-slate-700">
              Palet {heatmapLayerMode === 'ots_density' ? 'OTS Impresi' : 'Tarif Komersial'}
            </span>
            <span className="text-[10px] text-slate-400">
              Rerata: {heatmapLayerMode === 'ots_density' ? `${formatCompactNumber(datasetSummary.avgOts)} OTS` : formatIDR(datasetSummary.avgPrice)}
            </span>
          </div>

          <div className="space-y-1.5">
            {tierStats.palette.map((tier) => {
              const count = tierStats.counts[tier.key] || 0;
              return (
                <div 
                  key={tier.key} 
                  className="flex items-center justify-between text-[10.5px] py-0.5 px-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full border shadow-2xs shrink-0" 
                      style={{ backgroundColor: tier.color, borderColor: tier.borderColor }} 
                    />
                    <span className="font-medium text-slate-700">{tier.label}</span>
                    <span className="text-[9.5px] text-slate-400">({tier.sublabel})</span>
                  </div>
                  <span className="font-bold text-slate-600 tabular-nums">
                    {count} <span className="font-normal text-[9.5px] text-slate-400">titik</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Floating Google Maps Basemap Mode Switcher */}
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

        {/* Quick Fly-To Navigation Pills */}
        <div className="hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl p-1.5 shadow-md border border-slate-200/80 text-xs">
          <span className="text-[10px] text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-emerald-600" />
            Fokus:
          </span>
          <button
            onClick={() => flyTo(-6.9218, 107.6071, 9)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
            title="Lihat Kluster Se-Jawa Barat (Zoom 9)"
          >
            Jawa Barat
          </button>
          <button
            onClick={() => flyTo(-6.9175, 107.6191, 13)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
          >
            Bandung
          </button>
          <button
            onClick={() => flyTo(-6.885, 107.545, 12)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
          >
            Cimahi
          </button>
          <button
            onClick={() => flyTo(-7.3392, 108.2145, 12)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
          >
            Tasikmalaya
          </button>
          <button
            onClick={() => flyTo(-7.2152, 107.9042, 13)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
          >
            Garut
          </button>
          <button
            onClick={() => flyTo(-6.9212, 106.9298, 13)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
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
            {heatmapLayerMode === 'ots_density' ? 'Spotlight Impresi Tertinggi' : 'Spotlight Koridor Prime Premium'}
          </span>
          <span className="text-[10px] text-slate-400">
            {heatmapLayerMode === 'ots_density' ? 'Peak OTS Density' : 'Highest Yield Corridor'}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          {heatmapLayerMode === 'ots_density' ? (
            <>
              Koridor <strong className="text-white">Jl. Sukajadi (PVJ)</strong>, <strong className="text-white">Tol Pasteur</strong>, dan <strong className="text-white">Jl. Merdeka BIP</strong> mencatat densitas spasial di atas 160.000 kendaraan/hari dengan impresi &gt;350.000 OTS.
            </>
          ) : (
            <>
              Titik videotron digital prime di <strong className="text-white">Jl. Merdeka BIP</strong> dan <strong className="text-white">Jl. Sukajadi PVJ</strong> mencatat intensitas tarif tertinggi (Rp 90jt - 150jt/bulan) dengan nilai konversi komersial tertinggi.
            </>
          )}
        </p>
      </div>

    </div>
  );
};

